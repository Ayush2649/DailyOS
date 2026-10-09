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
import dishVocab from "../data/dish-vocab.json";
import { MealVisionProvider } from "./types";

// ── Circuit Breaker State (Per-User Scoped) ──────────────────────────────────

interface UserCircuitState {
  consecutiveFailures: number;
  circuitOpenUntil: number;
  halfOpenInFlight: boolean;
  lastUpdated: number;
}

// Bounded in-memory map keyed by user identifier (e.g. userId or "anonymous")
const userCircuitMap = new Map<string, UserCircuitState>();

// Maximum inactive duration before pruning stale entries (1 hour)
const PRUNE_INTERVAL_MS = 60 * 60 * 1000;
let lastPruneTime = Date.now();

function getOrCreateUserState(userKey: string): UserCircuitState {
  const now = Date.now();
  if (now - lastPruneTime > PRUNE_INTERVAL_MS) {
    userCircuitMap.forEach((state, key) => {
      if (now - state.lastUpdated > PRUNE_INTERVAL_MS) {
        userCircuitMap.delete(key);
      }
    });
    lastPruneTime = now;
  }

  let state = userCircuitMap.get(userKey);
  if (!state) {
    state = {
      consecutiveFailures: 0,
      circuitOpenUntil: 0,
      halfOpenInFlight: false,
      lastUpdated: now,
    };
    userCircuitMap.set(userKey, state);
  }
  state.lastUpdated = now;
  return state;
}

export function isCircuitOpen(userKey = "global"): boolean {
  const state = getOrCreateUserState(userKey);
  const now = Date.now();
  if (state.circuitOpenUntil === 0) {
    return false;
  }
  if (now < state.circuitOpenUntil) {
    return true;
  }
  // Cooldown has elapsed -> Half-open state
  if (state.halfOpenInFlight) {
    return true; // Another probe request is already testing the circuit for this user
  }
  // Allow this single probe request through
  state.halfOpenInFlight = true;
  return false;
}

export function recordSuccess(userKey = "global"): void {
  const state = getOrCreateUserState(userKey);
  state.consecutiveFailures = 0;
  state.circuitOpenUntil = 0;
  state.halfOpenInFlight = false;
}

export function recordFailure(userKey = "global"): void {
  const state = getOrCreateUserState(userKey);
  state.halfOpenInFlight = false;
  state.consecutiveFailures++;
  if (state.consecutiveFailures >= 3 || state.circuitOpenUntil > 0) {
    state.circuitOpenUntil = Date.now() + 30 * 1000; // 30s cooldown
    console.warn(
      `[ai/gemini] Circuit breaker TRIPPED for user '${userKey}' after ${state.consecutiveFailures} failures. Skipping Gemini until ${new Date(
        state.circuitOpenUntil
      ).toISOString()}`
    );
  }
}

export function resetCircuitBreaker(userKey?: string): void {
  if (userKey) {
    userCircuitMap.delete(userKey);
  } else {
    userCircuitMap.clear();
  }
}

export function getCircuitBreakerState(userKey = "global") {
  const state = getOrCreateUserState(userKey);
  return {
    consecutiveFailures: state.consecutiveFailures,
    circuitOpenUntil: state.circuitOpenUntil,
    halfOpenInFlight: state.halfOpenInFlight,
    isOpen: isCircuitOpen(userKey),
  };
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
- For each visible food item, specify the name, approximate numeric quantity, and unit (e.g. piece, katori, bowl, plate, cup, tbsp, grams, serving).
- Candidates must be DISTINCT dishes with different calorie impacts. Return a numeric confidence from 0.0 to 1.0 for each candidate.
- Return up to 3 candidate dishes sorted by confidence descending.

Return ONLY raw JSON matching this schema:
{
  "foods": [
    {"name": "<dish or item name>", "quantity": <number>, "unit": "<piece|katori|plate|bowl|cup|g|serving>", "confidence": <float 0.0-1.0>}
  ],
  "candidates": [{"name": "<dish name>", "confidence": <float 0.0-1.0>}],
  "visibleItems": ["<item with approximate gram weight>"],
  "ambiguity": "low"|"medium"|"high",
  "notes": "<visual deduction explanation>"
}`;

const DISH_NAMES_LIST = (dishVocab as { name: string }[]).map((d) => d.name).join(", ");

const STATIC_INSTRUCTIONS_AND_VOCAB = `Identify all visible food items with approximate quantities, units, and gram weights, and up to 3 distinct candidate dishes with numeric confidence (0.0 to 1.0).

DISH VOCABULARY LIST: [${DISH_NAMES_LIST}]
RULE: Pick the closest name from this vocabulary list; if none fits, return your best name prefixed with 'other:'.`;

// ── Zod Schema & Output Parsing (Resilient Defaults) ──────────────────────────

export const VisionFoodItemSchema = z.object({
  name: z.string().min(1),
  quantity: z.coerce.number().min(0.1).default(1),
  unit: z.string().default("serving"),
  confidence: z.coerce.number().min(0).max(1).default(0.7),
});

export type VisionFoodItem = z.infer<typeof VisionFoodItemSchema>;

export const VisionCandidateSchema = z.object({
  name: z.string().min(1),
  confidence: z.coerce.number().min(0).max(1).default(0.5),
});

export const VisionAnalysisSchema = z.object({
  foods: z.array(VisionFoodItemSchema).default([]),
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

  if (validated.foods.length === 0) {
    if (validated.visibleItems.length > 0) {
      validated.foods = validated.visibleItems.map((item) => ({
        name: cleanDishName(item),
        quantity: 1,
        unit: "serving",
        confidence: 0.6,
      }));
    } else {
      validated.foods = validated.candidates.map((c) => ({
        name: cleanDishName(c.name),
        quantity: 1,
        unit: "serving",
        confidence: c.confidence,
      }));
    }
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
  userKey?: string;
}

export interface CandidateItem {
  name: string;
  confidence: "high" | "medium" | "low";
  rawConfidence: number;
}

export interface GeminiVisionResult {
  foods: VisionFoodItem[];
  candidates: CandidateItem[];
  visibleItems: string[];
  ambiguity: "low" | "medium" | "high";
  notes: string;
  model: string;
  provider: "gemini";
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

const BUDGET_MS = 15_000; // 15s strict total budget

export async function analyzeMealWithGemini(
  opts: GeminiVisionOptions
): Promise<GeminiVisionResult> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new PhotoUnavailableError("GEMINI_API_KEY is not configured on the server.");
  }

  const userKey = opts.userKey || "global";

  // 1. Circuit breaker check (per-user)
  if (isCircuitOpen(userKey)) {
    console.warn(
      `[ai/gemini] Circuit breaker is OPEN for user '${userKey}'. Skipping Gemini until ${new Date(
        getCircuitBreakerState(userKey).circuitOpenUntil
      ).toISOString()}`
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

  // Attempt primary model: 1 retry max on 503/500/timeouts within budget
  let primarySuccess: any = null;
  let primaryError: any = null;

  for (let attempt = 0; attempt < 2; attempt++) {
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

      // Per-minute rate limit: wait once if delay <= 3s, else fail fast
      if (rl.isPerMinute) {
        if (!hasWaited429 && rl.retryDelayMs <= 3000) {
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

      // 503/500/timeout: retry 1 time with 1s backoff + jitter
      if (isRetryableServerError(err) && attempt === 0) {
        const waitMs = 1000 + Math.floor(Math.random() * 300);

        if (Date.now() - t0 + waitMs < BUDGET_MS - 2000) {
          console.warn(`[ai/gemini] Retryable error (${err.message}) on attempt 1. Retrying in ${waitMs}ms...`);
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
    return handleSuccess(primaryModel, primarySuccess, t0, userKey);
  }

  // If primary failed, check remaining budget and try fallback model (gemini-3.7-flash)
  const remainingForFallback = BUDGET_MS - (Date.now() - t0);
  if (remainingForFallback >= 2500) {
    console.warn(`[ai/gemini] Primary model ${primaryModel} failed. Attempting fallback to ${fallbackModel}...`);
    const fbTimeout = Math.min(8_000, remainingForFallback);

    try {
      const fallbackSuccess = await callModel(fallbackModel, fbTimeout);
      return handleSuccess(fallbackModel, fallbackSuccess, t0, userKey);
    } catch (fallbackErr: any) {
      console.warn(`[ai/gemini] Fallback model ${fallbackModel} failed:`, fallbackErr?.message || fallbackErr);
    }
  }

  // All attempts and fallbacks failed
  recordFailure(userKey);
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
  t0: number,
  userKey = "global"
): GeminiVisionResult {
  recordSuccess(userKey);
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

  const cleanedFoods = rawRes.data.foods.map((f) => ({
    name: cleanDishName(f.name),
    quantity: f.quantity,
    unit: f.unit,
    confidence: f.confidence,
  }));

  const effectiveAmbiguity = computeEffectiveAmbiguity(
    rawRes.data.candidates.map((c) => ({ name: c.name, confidence: c.confidence })),
    rawRes.data.ambiguity
  );

  return {
    foods: cleanedFoods,
    candidates: cleanedCandidates,
    visibleItems: rawRes.data.visibleItems,
    ambiguity: effectiveAmbiguity,
    notes: rawRes.data.notes,
    model,
    provider: "gemini",
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

export const geminiVisionProvider: MealVisionProvider = {
  id: "gemini",
  analyzeMeal: (opts) => analyzeMealWithGemini(opts),
  isCircuitOpen: (userKey) => isCircuitOpen(userKey),
  recordSuccess: (userKey) => recordSuccess(userKey),
  recordFailure: (userKey) => recordFailure(userKey),
  resetCircuitBreaker: (userKey) => resetCircuitBreaker(userKey),
  getCircuitBreakerState: (userKey) => getCircuitBreakerState(userKey),
};
