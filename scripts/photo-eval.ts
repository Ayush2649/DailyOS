#!/usr/bin/env ts-node
/**
 * scripts/photo-eval.ts
 *
 * Vision Model Accuracy Evaluation & Comparison Harness.
 * Supports Groq (qwen/qwen3.8-27b) and Google Gemini (gemini-3.8-flash via @google/genai SDK).
 *
 * Flags:
 *   --provider groq|gemini      (default: groq)
 *   --reasoning none|low        (default: none)
 *   --vocab                     (injects compact Indian dish vocabulary list into the prompt)
 *   --force                     (re-runs all images even if cached in results file)
 *
 * Usage:
 *   npm run eval:photos -- --provider gemini
 *   npm run eval:photos -- --provider groq --reasoning low
 *   npm run eval:photos -- --provider gemini --vocab
 */

import * as fs from "fs";
import * as path from "path";
import { z } from "zod";
import sharp from "sharp";

// ── Environment Loading ───────────────────────────────────────────────────────

if (!process.env.GROQ_API_KEY || !process.env.GEMINI_API_KEY) {
  const envPath = path.resolve(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf-8").split("\n");
    for (const line of lines) {
      const match = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)?\s*$/);
      if (match && !process.env[match[1]]) {
        process.env[match[1]] = (match[2] || "").trim().replace(/^['"]|['"]$/g, "");
      }
    }
  }
}

import Groq from "groq-sdk";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import { MODELS, MAX_TOKENS } from "../lib/ai/models";
import { estimateMealWithUsage } from "../lib/ai/nutrition-calculator";

// ── Pacing Constants ──────────────────────────────────────────────────────────

/**
 * Free-tier pacing:
 * Gemini 3.8 Flash free tier is 5 requests/minute = 12s interval.
 * We pause 13 seconds (12s + 1s safety margin).
 * Groq free tier has 8,000 TPM limit. We pause 15 seconds.
 */
export const PAUSE_MS_GEMINI = 13_000;
export const PAUSE_MS_GROQ   = 15_000;

// ── CLI Arguments ─────────────────────────────────────────────────────────────

interface CliOptions {
  provider: "groq" | "gemini";
  reasoning: "none" | "low";
  vocab: boolean;
  force: boolean;
}

function parseCliArgs(): CliOptions {
  const args = process.argv.slice(2);
  let provider: "groq" | "gemini" = "groq";
  let reasoning: "none" | "low" = "none";
  let vocab = false;
  let force = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i].toLowerCase();
    if (arg === "--provider" && args[i + 1]) {
      const val = args[i + 1].toLowerCase();
      if (val === "gemini" || val === "groq") {
        provider = val;
        i++;
      }
    } else if (arg.startsWith("--provider=")) {
      const val = arg.split("=")[1].toLowerCase();
      if (val === "gemini" || val === "groq") {
        provider = val;
      }
    } else if (arg === "--reasoning" && args[i + 1]) {
      const val = args[i + 1].toLowerCase();
      if (val === "none" || val === "low") {
        reasoning = val;
        i++;
      }
    } else if (arg.startsWith("--reasoning=")) {
      const val = arg.split("=")[1].toLowerCase();
      if (val === "none" || val === "low") {
        reasoning = val;
      }
    } else if (arg === "--vocab") {
      vocab = true;
    } else if (arg === "--force") {
      force = true;
    }
  }

  return { provider, reasoning, vocab, force };
}

// ── Types & Zod Schemas (Resilient Defaults) ──────────────────────────────────

interface LabelItem {
  file: string;
  mustContain: string[];
  expectClarification?: boolean;
  expectedDishes: string[];
  expectedItems: string[];
  expectedKcalRange: [number, number] | { low: number; high: number };
}

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

type VisionAnalysis = z.infer<typeof VisionAnalysisSchema>;

function parseVisionJsonWithDefaults(rawJsonStr: string): VisionAnalysis {
  let parsed: any;
  try {
    parsed = JSON.parse(rawJsonStr);
  } catch (err: any) {
    throw new Error(`JSON parse error: ${err.message}. Raw output: ${rawJsonStr.slice(0, 150)}`);
  }

  const defaultsLogged: string[] = [];
  if (!parsed.candidates || !Array.isArray(parsed.candidates) || parsed.candidates.length === 0) {
    defaultsLogged.push("candidates");
  }
  if (!parsed.visibleItems || !Array.isArray(parsed.visibleItems)) {
    defaultsLogged.push("visibleItems -> []");
  }
  if (!parsed.ambiguity) {
    defaultsLogged.push("ambiguity -> 'high'");
  }
  if (parsed.notes === undefined || parsed.notes === null) {
    defaultsLogged.push("notes -> ''");
  }

  if (defaultsLogged.length > 0) {
    console.warn(`  [SCHEMA DEFAULT APPLIED] Missing field(s): ${defaultsLogged.join(", ")}`);
  }

  const validated = VisionAnalysisSchema.parse(parsed);

  if (validated.candidates.length === 0) {
    validated.candidates.push({ name: "Unknown Indian Dish", confidence: 0.2 });
  }

  return validated;
}

interface SavedEvalRecord {
  file: string;
  provider: string;
  model: string;
  reasoning: string;
  vocabUsed: boolean;
  mustContain: string[];
  expectedDishes: string[];
  expectedKcalRangeStr: string;
  candidates: { name: string; confidence: number }[];
  visibleItems: string[];
  topDish: string;
  topConfidence: number;
  dishCorrect: boolean;
  top3Correct: boolean;
  predictedKcal: number;
  rangeHit: boolean;
  ambiguity: string;
  confidentlyWrong: boolean;
  notes: string;
  usage: {
    promptTokens: number;
    outputTokens: number;
    thinkingTokens: number;
  };
  evaluatedAt: string;
}

const MAX_PX = 768;

// ── Shared Vision Prompts (No Flatbread Priming, Numeric 0-1 Confidence) ──────

const VISION_SYSTEM_PROMPT = `You are an expert visual food classifier specializing in Indian cuisine.
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

const VISION_USER_PROMPT = `Identify all visible food items with approximate gram weights and up to 3 distinct candidate dishes with numeric confidence (0.0 to 1.0).`;

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
  if (top2 && (top1.confidence - top2.confidence) <= 0.15) {
    return "high";
  }

  return modelReportedAmbiguity;
}

// ── Error Classification Helpers ──────────────────────────────────────────────

interface RateLimitInfo {
  isRateLimit: boolean;
  isDaily: boolean;
  isPerMinute: boolean;
  retryDelayMs: number;
  quotaId?: string;
  details?: string;
}

function isInvalidArgument400(err: any): boolean {
  const status = err?.status || err?.code || err?.error?.code;
  const msg = String(err?.message || err?.error?.message || err);
  return (
    status === 400 ||
    status === "INVALID_ARGUMENT" ||
    msg.includes("400") ||
    msg.includes("INVALID_ARGUMENT") ||
    msg.includes("invalid_request_error")
  );
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
  let retryDelayMs = 15_000;

  // Extract from Google GenAI details array if present
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

  // Regex fallback for quota ID
  if (!quotaId) {
    const match =
      fullText.match(/quota[_\s]?id['":\s]+([a-z0-9_]+)/i) ||
      fullText.match(/(generatecontentrequestsper[a-z]+)/i) ||
      fullText.match(/quota metric '([^']+)'/i);
    if (match) quotaId = match[1];
  }

  // Extract retry delay from headers or message
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
    details: errMsg,
  };
}

// ── Provider Implementations ──────────────────────────────────────────────────

interface ProviderResult {
  data: VisionAnalysis;
  usage: {
    promptTokens: number;
    outputTokens: number;
    thinkingTokens: number;
  };
}

async function callGroqVision(
  base64: string,
  mimeType: string,
  userPromptText: string,
  reasoning: "none" | "low",
): Promise<ProviderResult> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY env var is not set in environment or .env");

  const groq = new Groq({ apiKey: key });
  const modelId = MODELS.analyzeMeal; // "qwen/qwen3.8-27b"

  const params: Record<string, unknown> = {
    model: modelId,
    messages: [
      { role: "system", content: VISION_SYSTEM_PROMPT },
      {
        role: "user",
        content: [
          { type: "text", text: userPromptText },
          {
            type: "image_url",
            image_url: { url: `data:${mimeType};base64,${base64}` },
          },
        ],
      },
    ],
    max_tokens: MAX_TOKENS.analyzeMeal,
    temperature: 0,
    response_format: { type: "json_object" },
    reasoning_effort: reasoning === "low" ? "low" : "none",
  };

  const completion = await (groq.chat.completions.create as any)(params);
  const raw = completion.choices[0]?.message?.content || "";
  const cleaned = raw.replace(/```(?:json)?\n?/g, "").replace(/\n?```/g, "").trim();

  const data = parseVisionJsonWithDefaults(cleaned);

  const u = completion.usage;
  const promptTokens = u?.prompt_tokens ?? 0;
  const outputTokens = u?.completion_tokens ?? 0;
  const thinkingTokens = (u as any)?.reasoning_tokens ?? 0;

  return {
    data,
    usage: { promptTokens, outputTokens, thinkingTokens },
  };
}

async function callGeminiVision(
  base64: string,
  mimeType: string,
  userPromptText: string,
): Promise<ProviderResult> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY env var is not set in environment or .env");

  const ai = new GoogleGenAI({ apiKey: key });
  const modelId = process.env.GEMINI_VISION_MODEL || "gemini-3.8-flash";

  // gemini-3.8-flash supports LOW, MEDIUM, HIGH (MINIMAL is unsupported and returns 400).
  // We use ThinkingLevel.LOW for lowest latency / minimal thinking token overhead.
  const response = await ai.models.generateContent({
    model: modelId,
    contents: [
      {
        inlineData: {
          data: base64,
          mimeType,
        },
      },
      userPromptText,
    ],
    config: {
      systemInstruction: VISION_SYSTEM_PROMPT,
      responseMimeType: "application/json",
      thinkingConfig: {
        thinkingLevel: ThinkingLevel.LOW,
      },
    },
  });

  const raw = response.text || "";
  const cleaned = raw.replace(/```(?:json)?\n?/g, "").replace(/\n?```/g, "").trim();

  const data = parseVisionJsonWithDefaults(cleaned);

  const um = response.usageMetadata;
  const promptTokens = um?.promptTokenCount ?? 0;
  const outputTokens = um?.candidatesTokenCount ?? 0;
  const thinkingTokens = (um as any)?.thoughtsTokenCount ?? 0;

  return {
    data,
    usage: { promptTokens, outputTokens, thinkingTokens },
  };
}

// ── Pre-flight Check ──────────────────────────────────────────────────────────

function runPreflightChecks(photosDir: string, labels: LabelItem[]) {
  console.log("=== PRE-FLIGHT CHECK: PHOTOS & LABELS ===");

  const diskFiles = fs.readdirSync(photosDir);
  const imageExtensions = new Set([".jpg", ".jpeg", ".png", ".webp"]);
  const diskImageFiles = diskFiles.filter((f) =>
    imageExtensions.has(path.extname(f).toLowerCase())
  );

  let hasMismatch = false;

  for (const item of labels) {
    if (!diskImageFiles.includes(item.file)) {
      hasMismatch = true;
      console.warn(`[MISMATCH WARNING] Configured file "${item.file}" does not exist in ${photosDir}`);

      const baseCandidate = item.file.toLowerCase().replace(/[^a-z0-9]/g, "");
      const suggestion = diskImageFiles.find(
        (df) => df.toLowerCase().replace(/[^a-z0-9]/g, "") === baseCandidate
      );
      if (suggestion) {
        console.warn(`  -> Found similar file on disk: "${suggestion}". Please update labels.json.`);
      }
    }
  }

  const labeledFiles = new Set(labels.map((l) => l.file));
  for (const diskFile of diskImageFiles) {
    if (!labeledFiles.has(diskFile)) {
      console.info(`[UNLABELED IMAGE] "${diskFile}" exists in photos directory but is not in labels.json.`);
    }
  }

  if (!hasMismatch) {
    console.log(`[PASS] All ${labels.length} labeled files verified on disk.`);
  }
  console.log("=========================================\n");
}

// ── Main Runner ───────────────────────────────────────────────────────────────

async function main() {
  const options = parseCliArgs();
  const photosDir = path.resolve(__dirname, "photos");
  const labelsFile = path.join(photosDir, "labels.json");
  const resultsFilename = options.vocab
    ? `results.${options.provider}.vocab.json`
    : `results.${options.provider}.json`;
  const resultsFile = path.join(photosDir, resultsFilename);

  if (!fs.existsSync(labelsFile)) {
    console.error(`Labels file not found at ${labelsFile}`);
    process.exit(1);
  }

  const rawLabels = JSON.parse(fs.readFileSync(labelsFile, "utf-8")) as LabelItem[];
  // Respect maximum 12 images constraint
  const items = rawLabels.slice(0, 12);

  // Pre-flight check
  runPreflightChecks(photosDir, items);

  // Load existing results for skipping
  const savedMap = new Map<string, SavedEvalRecord>();
  if (fs.existsSync(resultsFile) && !options.force) {
    try {
      const existing = JSON.parse(fs.readFileSync(resultsFile, "utf-8")) as SavedEvalRecord[];
      for (const rec of existing) {
        savedMap.set(rec.file, rec);
      }
      console.log(`Loaded ${savedMap.size} cached results from ${resultsFilename} (use --force to re-run).`);
    } catch {
      // ignore parse error on fresh/corrupt file
    }
  }

  const modelName =
    options.provider === "gemini"
      ? (process.env.GEMINI_VISION_MODEL || "gemini-3.8-flash")
      : MODELS.analyzeMeal;

  // Build prompt with optional vocabulary list
  let userPrompt = VISION_USER_PROMPT;
  if (options.vocab) {
    const vocabFile = fs.existsSync(path.resolve(__dirname, "../lib/ai/data/dish-vocab.json"))
      ? path.resolve(__dirname, "../lib/ai/data/dish-vocab.json")
      : path.resolve(process.cwd(), "lib/ai/data/dish-vocab.json");
    if (fs.existsSync(vocabFile)) {
      const vocabData = JSON.parse(fs.readFileSync(vocabFile, "utf-8")) as { name: string }[];
      const namesList = vocabData.map((d) => d.name).join(", ");
      userPrompt += `\n\nDISH VOCABULARY LIST: [${namesList}]\nRULE: Pick the closest name from this vocabulary list; if none fits, return your best name prefixed with 'other:'.`;
    }
  }

  const pauseMs = options.provider === "gemini" ? PAUSE_MS_GEMINI : PAUSE_MS_GROQ;

  console.log(`Starting Vision Evaluation:`);
  console.log(`- Provider:     ${options.provider.toUpperCase()} (${modelName})`);
  console.log(`- Reasoning:    ${options.provider === "gemini" ? "LOW (gemini-3.8-flash default)" : options.reasoning.toUpperCase()}`);
  console.log(`- Vocab:        ${options.vocab ? "ENABLED (--vocab)" : "DISABLED"}`);
  console.log(`- Pacing Pause: ${pauseMs / 1000}s between calls`);
  console.log(`- Total Images: ${items.length}`);
  console.log(`- Save File:    ${resultsFilename}\n`);

  const completedResults: SavedEvalRecord[] = [];
  let fatalStop = false;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const imagePath = path.join(photosDir, item.file);

    // Skip finished images unless --force
    if (!options.force && savedMap.has(item.file)) {
      const cached = savedMap.get(item.file)!;
      completedResults.push(cached);
      console.log(
        `[${i + 1}/${items.length}] Skipping cached: ${item.file} | Top: "${cached.topDish}" (${cached.topConfidence.toFixed(2)}) | Correct: ${cached.dishCorrect ? "YES" : "NO"}`
      );
      continue;
    }

    if (!fs.existsSync(imagePath)) {
      console.warn(`[${i + 1}/${items.length}] File not found on disk: ${imagePath}. Skipping.`);
      continue;
    }

    console.log(`---------------------------------------------------------------------------------------------------`);
    console.log(`[${i + 1}/${items.length}] Evaluating: ${item.file}`);
    console.log(`Must Contain:    [${item.mustContain.join(", ")}]`);
    console.log(`Expected Dishes: [${item.expectedDishes.join(", ")}]`);

    let low = 0;
    let high = 0;
    if (Array.isArray(item.expectedKcalRange)) {
      [low, high] = item.expectedKcalRange;
    } else if (item.expectedKcalRange && typeof item.expectedKcalRange === "object") {
      low = item.expectedKcalRange.low;
      high = item.expectedKcalRange.high;
    }
    console.log(`Expected Range:  ${low}–${high} kcal`);

    try {
      // 1. Image preparation: max 768px, JPEG 75
      const rawBuf = fs.readFileSync(imagePath);
      const resizedBuf = await sharp(rawBuf)
        .resize(MAX_PX, MAX_PX, { fit: "inside", withoutEnlargement: true })
        .flatten({ background: "#ffffff" })
        .jpeg({ quality: 75 })
        .toBuffer();

      const base64 = resizedBuf.toString("base64");
      const mimeType = "image/jpeg";

      // 2. Vision Call with 400 check and PerMinute 429 single-retry
      let callResult: ProviderResult | null = null;
      let attempts = 0;
      const maxAttempts = 2; // initial call + at most 1 retry for PerMinute 429

      while (attempts < maxAttempts) {
        attempts++;
        try {
          if (options.provider === "gemini") {
            callResult = await callGeminiVision(base64, mimeType, userPrompt);
          } else {
            callResult = await callGroqVision(base64, mimeType, userPrompt, options.reasoning);
          }
          break; // call succeeded
        } catch (err: any) {
          // Check for 400 INVALID_ARGUMENT: STOP IMMEDIATELY ON FIRST PHOTO
          if (isInvalidArgument400(err)) {
            console.error(`\n===================================================================================================`);
            console.error(`[FATAL 400 INVALID_ARGUMENT] Stopping evaluation run immediately on ${item.file}.`);
            console.error(`Error details: ${err?.message || JSON.stringify(err)}`);
            console.error(`===================================================================================================\n`);
            fatalStop = true;
            break;
          }

          // Check for 429 / Rate Limit
          const rl = parseRateLimitInfo(err);
          if (rl.isRateLimit) {
            console.warn(`\n[429 RATE LIMIT EXCEEDED on ${item.file}]`);
            console.warn(`  Quota ID:        ${rl.quotaId}`);
            console.warn(`  Quota Type:      ${rl.isDaily ? "PerDay (Daily Limit)" : rl.isPerMinute ? "PerMinute (RPM/TPM Limit)" : "General Rate Limit"}`);
            console.warn(`  Suggested Delay: ${rl.retryDelayMs} ms`);

            // If violated quota contains PerDay: stop immediately
            if (rl.isDaily) {
              console.warn(`[DAILY QUOTA EXCEEDED] Daily limit reached (${rl.quotaId}). Stopping evaluation immediately.`);
              fatalStop = true;
              break;
            }

            // If violated quota contains PerMinute: wait retryDelay + 1 second, retry THAT image once
            if (rl.isPerMinute && attempts === 1) {
              const waitMs = rl.retryDelayMs + 1000;
              console.warn(`[PER-MINUTE LIMIT] Waiting ${(waitMs / 1000).toFixed(1)}s (retryDelay + 1s) to retry ${item.file} once...`);
              await new Promise((resolve) => setTimeout(resolve, waitMs));
              continue; // retry this image once
            }

            // Rate limit not recoverable or retry failed
            console.warn(`[RATE LIMIT EXCEEDED] Single retry failed or limit unrecoverable. Stopping.`);
            fatalStop = true;
            break;
          }

          // Other error
          console.error(`\n[ERROR on ${item.file}]:`, err?.message || err);
          break;
        }
      }

      if (fatalStop) {
        console.warn(`Evaluation halted. Saving all completed results so far to ${resultsFile}...`);
        break;
      }

      if (!callResult) {
        console.warn(`[SKIP] Could not retrieve analysis for ${item.file}. Skipping.`);
        continue;
      }

      const visionData = callResult.data;
      const usage = callResult.usage;

      // Print usage per call clearly
      console.log(`Usage: ${usage.promptTokens} prompt tokens, ${usage.outputTokens} output tokens, ${usage.thinkingTokens} thinking tokens`);

      // Evaluate Ambiguity
      const effectiveAmbiguity = computeEffectiveAmbiguity(visionData.candidates, visionData.ambiguity);

      // Clean Candidates
      const candidates = visionData.candidates.map((c) => ({
        name: cleanDishName(c.name),
        confidence: c.confidence,
      }));

      const topCandidate = candidates[0] || { name: "Unknown", confidence: 0 };
      const topDish = topCandidate.name;
      const topConfidence = topCandidate.confidence;

      // Top-1 correct = top dish contains any keyword in mustContain
      const top1Correct = (item.mustContain || []).some((kw) =>
        topDish.toLowerCase().includes(kw.toLowerCase())
      );

      // Top-3 correct = any of top-3 candidates contains any keyword in mustContain
      const top3Correct = candidates.slice(0, 3).some((c) =>
        (item.mustContain || []).some((kw) => c.name.toLowerCase().includes(kw.toLowerCase()))
      );

      // 3. Stage 2: Macro Calculation (always openai/gpt-oss-120b for fair comparison)
      const dishDescription = `${topDish}: ${visionData.visibleItems.join(", ")}`;
      const macroRes = await estimateMealWithUsage(dishDescription);
      const predictedKcal = macroRes.data.calories;
      const rangeHit = predictedKcal >= low && predictedKcal <= high;

      // Confidently wrong = wrong Top-1 with ambiguity "low" OR top confidence >= 0.7
      const confidentlyWrong = !top1Correct && (effectiveAmbiguity === "low" || topConfidence >= 0.7);

      // Print per-image details
      console.log(`\nCandidates:`);
      candidates.forEach((c, idx) => {
        console.log(`  ${idx + 1}. ${c.name} (confidence: ${c.confidence.toFixed(2)})`);
      });
      console.log(`Visible Items (with portions): ${visionData.visibleItems.join(", ")}`);
      console.log(`Top Dish:           ${topDish}`);
      console.log(`Dish correct? (1):  ${top1Correct ? "\x1b[32mYES\x1b[0m" : "\x1b[31mNO\x1b[0m"}`);
      console.log(`Top-3 correct?:     ${top3Correct ? "\x1b[32mYES\x1b[0m" : "\x1b[31mNO\x1b[0m"}`);
      console.log(`Calories:           ${predictedKcal} kcal | Range hit: ${rangeHit ? "\x1b[32mYES\x1b[0m" : "\x1b[31mNO\x1b[0m"} [${low}–${high}]`);
      console.log(`Ambiguity:          ${effectiveAmbiguity}`);
      if (confidentlyWrong) {
        console.log(`\x1b[31m[CONFIDENTLY WRONG]\x1b[0m Top-1 mismatch with low ambiguity or confidence >= 0.7!`);
      }
      console.log(`Notes:              ${visionData.notes}`);
      console.log(`---------------------------------------------------------------------------------------------------`);

      const evalRecord: SavedEvalRecord = {
        file: item.file,
        provider: options.provider,
        model: modelName,
        reasoning: options.reasoning,
        vocabUsed: options.vocab,
        mustContain: item.mustContain,
        expectedDishes: item.expectedDishes,
        expectedKcalRangeStr: `${low}–${high}`,
        candidates,
        visibleItems: visionData.visibleItems,
        topDish,
        topConfidence,
        dishCorrect: top1Correct,
        top3Correct,
        predictedKcal,
        rangeHit,
        ambiguity: effectiveAmbiguity,
        confidentlyWrong,
        notes: visionData.notes,
        usage,
        evaluatedAt: new Date().toISOString(),
      };

      completedResults.push(evalRecord);
      savedMap.set(item.file, evalRecord);

      // Persist results immediately
      fs.writeFileSync(resultsFile, JSON.stringify(Array.from(savedMap.values()), null, 2));

      // Pause between calls (13s for Gemini, 15s for Groq)
      if (i < items.length - 1) {
        console.log(`Waiting ${pauseMs / 1000}s to respect provider pacing...`);
        await new Promise((resolve) => setTimeout(resolve, pauseMs));
      }
    } catch (err: any) {
      console.error(`\n[ERROR on ${item.file}]:`, err?.message || err);
      break;
    }
  }

  // ── Summary Metrics ───────────────────────────────────────────────────────────

  console.log(`\n` + "=".repeat(105));
  console.log(`EVALUATION SUMMARY`);
  console.log(`Provider:  ${options.provider.toUpperCase()} (${modelName})`);
  console.log(`Reasoning: ${options.provider === "gemini" ? "LOW (gemini-3.8-flash default)" : options.reasoning.toUpperCase()}`);
  console.log(`Vocab:     ${options.vocab ? "ENABLED (--vocab)" : "DISABLED"}`);
  console.log(`Evaluated: ${completedResults.length} / ${items.length} images`);
  console.log("=".repeat(105));

  const total = completedResults.length;
  if (total === 0) {
    console.log("No images were successfully evaluated.");
    return;
  }

  const top1Correct = completedResults.filter((r) => r.dishCorrect).length;
  const top3Correct = completedResults.filter((r) => r.top3Correct).length;
  const kcalInRange = completedResults.filter((r) => r.rangeHit).length;
  const confidentlyWrongList = completedResults.filter((r) => r.confidentlyWrong);

  const top1Pct = ((top1Correct / total) * 100).toFixed(1);
  const top3Pct = ((top3Correct / total) * 100).toFixed(1);
  const kcalPct = ((kcalInRange / total) * 100).toFixed(1);

  console.log(`Top-1 Accuracy:       ${top1Correct}/${total} (${top1Pct}%)`);
  console.log(`Top-3 Accuracy:       ${top3Correct}/${total} (${top3Pct}%)`);
  console.log(`Kcal-in-Range:        ${kcalInRange}/${total} (${kcalPct}%)`);
  console.log(`Confidently Wrong:    ${confidentlyWrongList.length}/${total}`);

  const wrongDishes = completedResults.filter((r) => !r.dishCorrect);
  console.log(`\nWrong Dishes (Top-1 Mismatches) [Count: ${wrongDishes.length}]:`);
  if (wrongDishes.length === 0) {
    console.log(`  None! All Top-1 predictions matched mustContain keywords.`);
  } else {
    wrongDishes.forEach((w) => {
      const isConf = w.confidentlyWrong ? " [CONFIDENTLY WRONG]" : "";
      console.log(
        `  - ${w.file}: Predicted "${w.topDish}" (conf: ${w.topConfidence.toFixed(2)}, amb: ${w.ambiguity})${isConf} | Must contain: [${w.mustContain.join(", ")}]`
      );
    });
  }

  console.log("=".repeat(105));
  console.log(`Results saved to: ${resultsFile}\n`);
}

main().catch((err) => {
  console.error("Evaluation aborted:", err);
  process.exit(1);
});
