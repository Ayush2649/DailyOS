/**
 * lib/ai/providers/gemini.ts
 *
 * Production Stage 1 (Vision) Provider for Meal Photo Analysis using Google Gemini.
 * Built with the official @google/genai SDK, matching scripts/photo-eval.ts.
 *
 * Features:
 * - Primary model: gemini-3.8-flash with ThinkingLevel.LOW
 * - Fallback model: gemini-3.7-flash with ThinkingLevel.LOW
 * - Static instructions + dish-vocab.json placed FIRST, dynamic image LAST for implicit prefix caching
 * - Token caching telemetry: logs cachedContentTokenCount if exposed
 * - Resilient error handling:
 *     - Retries up to 2x on 503/500/timeouts with exponential backoff (1s, 2s + jitter) within 20s budget
 *     - Per-minute 429: waits suggested delay once if <= 5s, else fails fast
 *     - Daily-quota 429: fails immediately on primary model and falls back to gemini-3.7-flash
 *     - Fallback to gemini-3.7-flash if primary fails (non-daily)
 * - Circuit breaker: skips Gemini for 5 minutes after 5 consecutive failures
 * - Typed error: PHOTO_UNAVAILABLE
 */

import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import { z } from "zod";
import * as fs from "fs";
import * as path from "path";

// ── Circuit Breaker State (Module-Level) ──────────────────────────────────────

let consecutiveFailures = 0;
let circuitOpenUntil = 0; // timestamp ms

export function isCircuitOpen(): boolean {
  return Date.now() < circuitOpenUntil;
}

export function recordSuccess(): void {
  consecutiveFailures = 0;
  circuitOpenUntil = 0;
}

export function recordFailure(): void {
  consecutiveFailures++;
  if (consecutiveFailures >= 5) {
    circuitOpenUntil = Date.now() + 5 * 60 * 1000; // 5 minutes
    console.warn(
      `[ai/gemini] Circuit breaker TRIPPED after 5 consecutive failures. Skipping Gemini until ${new Date(
        circuitOpenUntil
      ).toISOString()}`
    );
  }
}

export function resetCircuitBreaker(): void {
  consecutiveFailures = 0;
  circuitOpenUntil = 0;
}

// ── Typed Error ───────────────────────────────────────────────────────────────

export class PhotoUnavailableError extends Error {
  readonly code = "PHOTO_UNAVAILABLE";
  constructor(message = "Photo scan is busy. Type or speak your meal instead.") {
    super(message);
    this.name = "PhotoUnavailableError";
  }
}

// ── Shared Vision Prompt & Vocabulary ─────────────────────────────────────────

export const VISION_SYSTEM_PROMPT = `You are an expert visual food classifier specializing in Indian cuisine.
Identify dishes and items in the photo. Do NOT calculate macros or calories.

CRITICAL RULES:
- The plate can be ANY Indian dish (cheela, dosa, uttapam, poha, upma, khichdi, halwa, rice dishes, thalis, street food, snacks, etc.). Do not assume it is a flatbread unless clearly visible.
- Chapati vs Paratha: Chapati is thin, soft, puffed with dry tawa spots; Paratha is thicker, layered, crisp or golden-brown with ghee/oil.
- When unsure or when dishes look visually similar, explain your uncertainty in notes and lower your confidence score.
- Give approximate gram weights for each visible item (e.g. "rice ~150g", "dal ~120g", "2 rotis ~60g", "poha ~150g").
- Candidates must be DISTINCT dishes with different calorie impacts. Return a numeric confidence from 0.0 to 1.0 for each candidate.
- Return up to 3 candidate dishes sorted by confidence descending.

Return ONLY raw JSON matching this schema:
{
  "candidates": [{"name": "<dish name>", "confidence": <float 0.0-1.0>}],
  "visibleItems": ["<item with approximate gram weight>"],
  "ambiguity": "low"|"medium"|"high",
  "notes": "<visual deduction explanation>"
}`;

function loadDishNames(): string {
  try {
    const vocabPath = path.resolve(process.cwd(), "scripts", "dish-vocab.json");
    if (fs.existsSync(vocabPath)) {
      const data = JSON.parse(fs.readFileSync(vocabPath, "utf-8")) as { name: string }[];
      return data.map((d) => d.name).join(", ");
    }
  } catch (err) {
    console.warn("[ai/gemini] Failed to load scripts/dish-vocab.json:", err);
  }
  return "";
}

const DISH_NAMES_LIST = loadDishNames();

const STATIC_INSTRUCTIONS_AND_VOCAB = `Identify all visible food items with approximate gram weights and up to 3 distinct candidate dishes with numeric confidence (0.0 to 1.0).

DISH VOCABULARY LIST: [${DISH_NAMES_LIST}]
RULE: Pick the closest name from this vocabulary list; if none fits, return your best name prefixed with 'other:'.`;

// ── Zod Schema & Output Parsing (Resilient Defaults) ──────────────────────────

const VisionCandidateSchema = z.object({
  name: z.string().min(1),
  confidence: z.coerce.number().min(0).max(1).default(0.5),
});

const VisionAnalysisSchema = z.object({
  candidates: z.array(VisionCandidateSchema).default([]),
  visibleItems: z.array(z.string()).default([]),
  ambiguity: z.enum(["low", "medium", "high"]).default("high"),
  notes: z.string().default(""),
});

export type VisionAnalysis = z.infer<typeof VisionAnalysisSchema>;

function parseVisionJsonWithDefaults(rawJsonStr: string): VisionAnalysis {
  let parsed: any;
  try {
    parsed = JSON.parse(rawJsonStr);
  } catch (err: any) {
    throw new Error(`JSON parse error: ${err.message}. Raw output: ${rawJsonStr.slice(0, 150)}`);
  }

  const validated = VisionAnalysisSchema.parse(parsed);

  if (validated.candidates.length === 0) {
    validated.candidates.push({ name: "Unknown Indian Dish", confidence: 0.2 });
  }

  return validated;
}

function cleanDishName(name: string): string {
  return name.replace(/^other:\s*/i, "").trim();
}

function computeEffectiveAmbiguity(
  candidates: { name: string; confidence: number }[],
  modelReportedAmbiguity: "low" | "medium" | "high"
): "low" | "medium" | "high" {
  if (candidates.length === 0) return "high";
  const top1 = candidates[0];
  const top2 = candidates[1];

  // Ambiguity is high if top candidate confidence is below 0.6
  if (top1.confidence < 0.6) {
    return "high";
  }

  // Ambiguity is high if top two candidates are within 0.15 confidence
  if (top2 && top1.confidence - top2.confidence <= 0.15) {
    return "high";
  }

  return modelReportedAmbiguity;
}

// ── Rate Limit & Error Helpers ────────────────────────────────────────────────

interface RateLimitInfo {
  isRateLimit: boolean;
  isDaily: boolean;
  isPerMinute: boolean;
  retryDelayMs: number;
  quotaId?: string;
}

function parseRateLimitInfo(err: any): RateLimitInfo {
  const errMsg = String(err?.message || err?.error?.message || err);
  const errStr = JSON.stringify(err, Object.getOwnPropertyNames(err));
  const fullText = (errMsg + " " + errStr).toLowerCase();

  const isRateLimit =
    err?.status === 429 ||
    err?.code === 429 ||
    err?.status === "RESOURCE_EXHAUSTED" ||
    fullText.includes("429") ||
    fullText.includes("resource_exhausted") ||
    fullText.includes("quota exceeded") ||
    fullText.includes("rate limit");

  if (!isRateLimit) {
    return { isRateLimit: false, isDaily: false, isPerMinute: false, retryDelayMs: 0 };
  }

  let quotaId: string | undefined;
  let retryDelayMs = 5000;

  if (err?.error?.details && Array.isArray(err.error.details)) {
    for (const d of err.error.details) {
      if (d?.metadata?.quota_id) quotaId = d.metadata.quota_id;
      if (d?.violations?.[0]?.description && !quotaId) {
        quotaId = d.violations[0].description;
      }
      if (d?.retryDelay) {
        const sec = parseFloat(String(d.retryDelay).replace("s", ""));
        if (!isNaN(sec)) retryDelayMs = Math.round(sec * 1000);
      }
    }
  }

  if (!quotaId) {
    const match =
      fullText.match(/quota[_\s]?id['":\s]+([a-z0-9_]+)/i) ||
      fullText.match(/(generatecontentrequestsper[a-z]+)/i) ||
      fullText.match(/quota metric '([^']+)'/i);
    if (match) quotaId = match[1];
  }

  const retryAfterHeader = err?.headers?.["retry-after"] || err?.response?.headers?.["retry-after"];
  if (retryAfterHeader) {
    const sec = parseFloat(retryAfterHeader);
    if (!isNaN(sec)) retryDelayMs = Math.round(sec * 1000);
  } else {
    const retryMatch =
      fullText.match(/try again in ([\d\.]+)s/i) ||
      fullText.match(/retry in ([\d\.]+)s/i) ||
      fullText.match(/retry after ([\d\.]+)s/i);
    if (retryMatch) {
      const sec = parseFloat(retryMatch[1]);
      if (!isNaN(sec)) retryDelayMs = Math.round(sec * 1000);
    }
  }

  const idLower = (quotaId || fullText).toLowerCase();
  const isDaily = idLower.includes("perday") || idLower.includes("daily") || fullText.includes("perday");
  const isPerMinute =
    idLower.includes("perminute") ||
    idLower.includes("rpm") ||
    idLower.includes("tpm") ||
    fullText.includes("perminute");

  return {
    isRateLimit: true,
    isDaily,
    isPerMinute,
    retryDelayMs,
    quotaId: quotaId || (isDaily ? "PerDayQuota" : isPerMinute ? "PerMinuteQuota" : "RateLimitExceeded"),
  };
}

function isRetryableServerError(err: any): boolean {
  const status = err?.status || err?.code || err?.error?.code;
  const msg = String(err?.message || err?.error?.message || err).toLowerCase();
  return (
    status === 503 ||
    status === 500 ||
    status === 502 ||
    status === 504 ||
    msg.includes("503") ||
    msg.includes("500") ||
    msg.includes("service unavailable") ||
    msg.includes("internal server error") ||
    msg.includes("timeout") ||
    msg.includes("abort") ||
    err?.name === "AbortError"
  );
}

// ── Public Types ──────────────────────────────────────────────────────────────

export interface GeminiVisionOptions {
  base64: string;
  mimeType: string;
  hint?: string;
}

export interface CandidateItem {
  name: string;
  confidence: "high" | "medium" | "low";
  rawConfidence: number;
}

export interface GeminiVisionResult {
  candidates: CandidateItem[];
  visibleItems: string[];
  ambiguity: "low" | "medium" | "high";
  notes: string;
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    thinkingTokens: number;
    cachedTokens: number;
    totalTokens: number;
    latencyMs: number;
  };
}

// ── Provider Core ─────────────────────────────────────────────────────────────

const BUDGET_MS = 20_000; // 20s total budget

export async function analyzeMealWithGemini(
  opts: GeminiVisionOptions
): Promise<GeminiVisionResult> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new PhotoUnavailableError("GEMINI_API_KEY is not configured on the server.");
  }

  // 1. Circuit breaker check
  if (isCircuitOpen()) {
    console.warn(
      `[ai/gemini] Circuit breaker is OPEN. Skipping Gemini until ${new Date(circuitOpenUntil).toISOString()}`
    );
    throw new PhotoUnavailableError("Photo scan is busy. Type or speak your meal instead.");
  }

  const ai = new GoogleGenAI({ apiKey: key });
  const t0 = Date.now();

  const primaryModel = process.env.GEMINI_VISION_MODEL || "gemini-3.8-flash";
  const fallbackModel = process.env.GEMINI_VISION_FALLBACK_MODEL || "gemini-3.7-flash";

  // Build user prompt: static instructions & vocab FIRST, dynamic hint (if any), image LAST
  const userTextPrompt = opts.hint && opts.hint.trim()
    ? `${STATIC_INSTRUCTIONS_AND_VOCAB}\n\nUSER HINT: "${opts.hint.trim()}" (Take this into account if compatible with the image)`
    : STATIC_INSTRUCTIONS_AND_VOCAB;

  const contents = [
    userTextPrompt,
    {
      inlineData: {
        data: opts.base64,
        mimeType: opts.mimeType,
      },
    },
  ];

  let hasWaited429 = false;

  // Internal helper to call a specific model with timeout
  async function callModel(modelId: string, timeoutMs: number) {
    const response = await ai.models.generateContent({
      model: modelId,
      contents,
      config: {
        systemInstruction: VISION_SYSTEM_PROMPT,
        responseMimeType: "application/json",
        thinkingConfig: {
          thinkingLevel: ThinkingLevel.LOW,
        },
        abortSignal: AbortSignal.timeout(timeoutMs),
      },
    });

    const raw = response.text || "";
    const cleaned = raw.replace(/```(?:json)?\n?/g, "").replace(/\n?```/g, "").trim();
    const data = parseVisionJsonWithDefaults(cleaned);

    const um = response.usageMetadata;
    const promptTokens = um?.promptTokenCount ?? 0;
    const completionTokens = um?.candidatesTokenCount ?? 0;
    const thinkingTokens = (um as any)?.thoughtsTokenCount ?? 0;
    const cachedTokens = (um as any)?.cachedContentTokenCount ?? 0;
    const totalTokens = um?.totalTokenCount ?? (promptTokens + completionTokens);

    return { data, promptTokens, completionTokens, thinkingTokens, cachedTokens, totalTokens };
  }

  // Attempt primary model: up to 2 retries on 503/500/timeouts
  let primarySuccess: any = null;
  let primaryError: any = null;

  for (let attempt = 0; attempt < 3; attempt++) {
    const elapsed = Date.now() - t0;
    const remainingBudget = BUDGET_MS - elapsed;
    if (remainingBudget < 1500) {
      break; // Not enough budget remaining
    }

    // Call timeout: min(10s, remaining budget)
    const callTimeout = Math.min(10_000, remainingBudget);

    try {
      primarySuccess = await callModel(primaryModel, callTimeout);
      break; // Success!
    } catch (err: any) {
      primaryError = err;
      const rl = parseRateLimitInfo(err);

      // Daily quota on primary model: fail immediately on this model and proceed to fallback
      if (rl.isDaily) {
        console.warn(
          `[ai/gemini] Daily quota exceeded on primary model ${primaryModel} (${rl.quotaId}). Failing immediately on ${primaryModel} and falling back to ${fallbackModel}...`
        );
        break; // Break out of primary model loop immediately, do NOT retry primary model
      }

      // Per-minute rate limit: wait once if delay <= 5s, else fail fast
      if (rl.isPerMinute) {
        if (!hasWaited429 && rl.retryDelayMs <= 5000) {
          hasWaited429 = true;
          const waitMs = rl.retryDelayMs + 250;
          if (Date.now() - t0 + waitMs < BUDGET_MS - 2000) {
            console.warn(`[ai/gemini] 429 PerMinute on ${primaryModel}. Waiting ${(waitMs / 1000).toFixed(1)}s once...`);
            await new Promise((r) => setTimeout(r, waitMs));
            continue; // retry
          }
        }
        console.warn(`[ai/gemini] 429 PerMinute delay too long (${rl.retryDelayMs}ms) or already waited. Failing fast.`);
        break; // fail fast to fallback
      }

      // 503/500/timeout: retry up to 2 times with exponential backoff (1s, 2s + jitter)
      if (isRetryableServerError(err) && attempt < 2) {
        const baseDelay = attempt === 0 ? 1000 : 2000;
        const jitter = Math.floor(Math.random() * 300);
        const waitMs = baseDelay + jitter;

        if (Date.now() - t0 + waitMs < BUDGET_MS - 2000) {
          console.warn(`[ai/gemini] Retryable error (${err.message}) on attempt ${attempt + 1}. Retrying in ${waitMs}ms...`);
          await new Promise((r) => setTimeout(r, waitMs));
          continue;
        }
      }

      // Non-retryable error
      console.warn(`[ai/gemini] Primary model ${primaryModel} failed:`, err?.message || err);
      break;
    }
  }

  // If primary succeeded, format and return
  if (primarySuccess) {
    return handleSuccess(primaryModel, primarySuccess, t0);
  }

  // If primary failed, check remaining budget and try fallback model (gemini-3.7-flash)
  const remainingForFallback = BUDGET_MS - (Date.now() - t0);
  if (remainingForFallback >= 3000) {
    console.warn(`[ai/gemini] Primary model ${primaryModel} failed. Attempting fallback to ${fallbackModel}...`);
    for (let fbAttempt = 0; fbAttempt < 2; fbAttempt++) {
      const fbElapsed = Date.now() - t0;
      const fbRemaining = BUDGET_MS - fbElapsed;
      if (fbRemaining < 1500) break;
      const fbTimeout = Math.min(10_000, fbRemaining);

      try {
        const fallbackSuccess = await callModel(fallbackModel, fbTimeout);
        return handleSuccess(fallbackModel, fallbackSuccess, t0);
      } catch (fallbackErr: any) {
        console.warn(`[ai/gemini] Fallback model ${fallbackModel} attempt ${fbAttempt + 1} failed:`, fallbackErr?.message || fallbackErr);
        if (isRetryableServerError(fallbackErr) && fbAttempt === 0) {
          const waitMs = 1000 + Math.floor(Math.random() * 300);
          if (Date.now() - t0 + waitMs < BUDGET_MS - 1500) {
            console.warn(`[ai/gemini] Retrying fallback ${fallbackModel} in ${waitMs}ms...`);
            await new Promise((r) => setTimeout(r, waitMs));
            continue;
          }
        }
        break;
      }
    }
  }

  // All attempts and fallbacks failed
  recordFailure();
  throw new PhotoUnavailableError("Photo scan is busy. Type or speak your meal instead.");
}

function handleSuccess(
  model: string,
  rawRes: {
    data: VisionAnalysis;
    promptTokens: number;
    completionTokens: number;
    thinkingTokens: number;
    cachedTokens: number;
    totalTokens: number;
  },
  t0: number
): GeminiVisionResult {
  recordSuccess();
  const latencyMs = Date.now() - t0;

  if (rawRes.cachedTokens > 0) {
    console.info(`[ai/gemini] Cached tokens used: ${rawRes.cachedTokens}`);
  }

  // Structured ai_usage log line (Zero user content)
  console.info(
    JSON.stringify({
      type: "ai_usage",
      feature: "analyzeMeal",
      provider: "gemini",
      model,
      promptTokens: rawRes.promptTokens,
      completionTokens: rawRes.completionTokens,
      totalTokens: rawRes.totalTokens,
      cachedTokens: rawRes.cachedTokens,
      latencyMs,
    })
  );

  const cleanedCandidates = rawRes.data.candidates.map((c) => {
    const rawConf = c.confidence;
    const catConf: "high" | "medium" | "low" =
      rawConf >= 0.75 ? "high" : rawConf >= 0.5 ? "medium" : "low";
    return {
      name: cleanDishName(c.name),
      confidence: catConf,
      rawConfidence: rawConf,
    };
  });

  const effectiveAmbiguity = computeEffectiveAmbiguity(
    rawRes.data.candidates.map((c) => ({ name: c.name, confidence: c.confidence })),
    rawRes.data.ambiguity
  );

  return {
    candidates: cleanedCandidates,
    visibleItems: rawRes.data.visibleItems,
    ambiguity: effectiveAmbiguity,
    notes: rawRes.data.notes,
    model,
    usage: {
      promptTokens: rawRes.promptTokens,
      completionTokens: rawRes.completionTokens,
      thinkingTokens: rawRes.thinkingTokens,
      cachedTokens: rawRes.cachedTokens,
      totalTokens: rawRes.totalTokens,
      latencyMs,
    },
  };
}
