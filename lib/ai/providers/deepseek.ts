/**
 * lib/ai/providers/deepseek.ts
 *
 * Experimental Stage 1 (Vision) Provider for Meal Photo Analysis using DeepSeek V4.1 Flash.
 * Built with the OpenAI-compatible SDK targeting https://api.deepseek.com.
 *
 * Features:
 * - Model: deepseek-flash (configurable via DEEPSEEK_VISION_MODEL)
 * - Base URL: https://api.deepseek.com (configurable via DEEPSEEK_BASE_URL)
 * - Uses existing preprocessed JPEG image buffer (no separate image pipeline)
 * - Low-latency non-thinking mode by default (configurable via DEEPSEEK_THINKING_MODE)
 * - Configurable image detail (default: "low" for speed and cost efficiency)
 * - Strict Zod schema validation matching Gemini
 * - Per-user circuit breaker isolation (completely separated from Gemini)
 * - Resilient error handling: 1 bounded retry on 500/503/timeouts within 15s budget
 * - Telemetry with token usage and estimated API cost
 * - Zero logging of raw images or API keys
 */

import OpenAI from "openai";
import {
  MealVisionInput,
  MealVisionResult,
  MealVisionProvider,
  PhotoUnavailableError,
  CircuitBreakerState,
} from "./types";
import {
  VISION_SYSTEM_PROMPT,
  STATIC_INSTRUCTIONS_AND_VOCAB,
  cleanDishName,
  computeEffectiveAmbiguity,
  createUserCircuitBreaker,
  parseVisionJsonWithDefaults,
  VisionAnalysis,
} from "./common";
import { calculateApiCost, ApiCallTraceRecord, ApiCallErrorCategory } from "../cost-accounting";

// ── Circuit Breaker (DeepSeek-Specific, Per-User Scoped) ──────────────────────

const circuitBreaker = createUserCircuitBreaker("deepseek");

export const isCircuitOpen = circuitBreaker.isCircuitOpen;
export const recordSuccess = circuitBreaker.recordSuccess;
export const recordFailure = circuitBreaker.recordFailure;
export const resetCircuitBreaker = circuitBreaker.resetCircuitBreaker;
export const getCircuitBreakerState = circuitBreaker.getCircuitBreakerState;

// ── Error Helpers ─────────────────────────────────────────────────────────────

function isRetryableServerError(err: any): boolean {
  if (!err) return false;
  const status = err.status || err.statusCode || err.code;
  if (status === 500 || status === 502 || status === 503 || status === 504) return true;
  if (err.name === "AbortError" || err.name === "TimeoutError") return true;
  if (/timeout|connection reset|econnreset|socket hang up|unexpected end of json|empty response|empty output/i.test(err.message || "")) return true;
  return false;
}

function classifyErrorCategory(err: any): ApiCallErrorCategory {
  if (!err) return "network";
  if (err.name === "AbortError" || err.name === "TimeoutError" || /timeout/i.test(err.message || "")) {
    return "timeout";
  }
  const status = err.status || err.statusCode || err.code;
  if (status === 429 || /rate limit|quota/i.test(err.message || "")) {
    return "429";
  }
  if (typeof status === "number" && status >= 500 && status < 600) {
    return "5xx";
  }
  if (typeof status === "number" && status >= 400 && status < 500) {
    return "client_error";
  }
  if (/parse|syntax|invalid json/i.test(err.message || "")) {
    return "parse_error";
  }
  return "network";
}

// ── Pricing Constants (DeepSeek published rates) ──────────────────────────────
// DeepSeek standard vision/chat pricing: $0.14 per 1M input tokens, $0.28 per 1M output tokens
const COST_PER_1M_INPUT_USD = 0.14;
const COST_PER_1M_OUTPUT_USD = 0.28;

function calculateEstimatedCost(
  promptTokens: number,
  completionTokens: number,
  model = "deepseek-flash",
  operation = "analyzeMeal"
) {
  return calculateApiCost({
    provider: "deepseek",
    model,
    operation,
    promptTokens,
    completionTokens,
    latencyMs: 0,
  });
}

// ── Core Provider Implementation ──────────────────────────────────────────────

const BUDGET_MS = 25_000; // 25s total budget within route maxDuration 30s

export async function analyzeMealWithDeepSeek(
  opts: MealVisionInput
): Promise<MealVisionResult> {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) {
    throw new PhotoUnavailableError("DEEPSEEK_API_KEY is not configured on the server.");
  }

  const userKey = opts.userKey || "global";

  // 1. Check isolated per-user circuit breaker
  if (circuitBreaker.isCircuitOpen(userKey)) {
    const cbState = circuitBreaker.getCircuitBreakerState(userKey);
    console.warn(
      `[ai/deepseek] Circuit breaker is OPEN for user '${userKey}'. Skipping DeepSeek until ${new Date(
        cbState.circuitOpenUntil
      ).toISOString()}`
    );
    throw new PhotoUnavailableError("Photo scan is busy. Type or speak your meal instead.");
  }

  const baseURL = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com";
  const modelName = process.env.DEEPSEEK_VISION_MODEL || "deepseek-flash";
  const imageDetail = (process.env.DEEPSEEK_IMAGE_DETAIL as "low" | "high" | "auto") || "low";
  const isThinkingEnabled =
    process.env.DEEPSEEK_THINKING_MODE === "true" || process.env.DEEPSEEK_THINKING_MODE === "1";

  const client = new OpenAI({
    apiKey: key,
    baseURL,
    timeout: 25_000, // 25s timeout within route maxDuration 30s
  });

  const t0 = performance.now();
  const calls: ApiCallTraceRecord[] = [];
  let totalRetryBackoffMs = 0;

  // User text instructions with hint if provided
  const userTextPrompt = opts.hint && opts.hint.trim()
    ? `${STATIC_INSTRUCTIONS_AND_VOCAB}\n\nUSER HINT: "${opts.hint.trim()}" (Take this into account if compatible with the image)`
    : STATIC_INSTRUCTIONS_AND_VOCAB;

  // Single multimodal user message with base64 data URL
  const userContent: OpenAI.Chat.ChatCompletionContentPart[] = [
    { type: "text", text: userTextPrompt },
    {
      type: "image_url",
      image_url: {
        url: `data:${opts.mimeType};base64,${opts.base64}`,
        detail: imageDetail,
      },
    },
  ];

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: VISION_SYSTEM_PROMPT },
    { role: "user", content: userContent },
  ];

  let rawSuccess: any = null;
  let retryCount = 0;

  // Internal helper to call DeepSeek Chat Completion
  async function callDeepSeek(timeoutMs: number) {
    const maxTokens = parseInt(process.env.DEEPSEEK_MAX_TOKENS || "2000", 10) || 2000;
    const requestOptions: any = {
      model: modelName,
      messages,
      response_format: { type: "json_object" },
      temperature: 0,
      max_tokens: maxTokens,
    };

    // If thinking mode is specifically configured or requested
    if (isThinkingEnabled) {
      requestOptions.extra_body = {
        thinking: { type: "enabled" },
      };
    }

    const completion = await client.chat.completions.create(requestOptions, {
      timeout: timeoutMs,
    });

    const choice = completion.choices?.[0];
    const rawContent = choice?.message?.content || "";
    const cleaned = rawContent.replace(/```(?:json)?\n?/g, "").replace(/\n?```/g, "").trim();

    const validatedData = parseVisionJsonWithDefaults(cleaned);
    const usage = completion.usage;

    const promptTokens = usage?.prompt_tokens ?? 0;
    const completionTokens = usage?.completion_tokens ?? 0;
    const totalTokens = usage?.total_tokens ?? (promptTokens + completionTokens);

    return {
      data: validatedData,
      promptTokens,
      completionTokens,
      totalTokens,
      requestId: completion.id,
    };
  }

  // Attempt up to 2 times (1 retry) on 5xx or timeouts within budget
  for (let attempt = 0; attempt < 2; attempt++) {
    const elapsed = performance.now() - t0;
    const remainingBudget = BUDGET_MS - elapsed;
    if (remainingBudget < 2000) break;

    const attemptTimeout = Math.floor(Math.min(20_000, remainingBudget));
    const attemptStart = performance.now();

    try {
      rawSuccess = await callDeepSeek(attemptTimeout);
      const attemptDuration = performance.now() - attemptStart;
      const costRecord = calculateEstimatedCost(
        rawSuccess.promptTokens,
        rawSuccess.completionTokens,
        modelName,
        "analyzeMeal"
      );
      calls.push({
        provider: "deepseek",
        model: modelName,
        feature: "analyzeMeal",
        attempt: attempt + 1,
        durationMs: Math.round(attemptDuration * 10) / 10,
        outcome: "success",
        promptTokens: rawSuccess.promptTokens,
        completionTokens: rawSuccess.completionTokens,
        cachedTokens: 0,
        totalTokens: rawSuccess.totalTokens,
        costStatus: costRecord.costStatus,
        costUsd: costRecord.totalCostUsd,
        costInr: costRecord.totalCostInr,
        requestId: rawSuccess.requestId,
      });
      break;
    } catch (err: any) {
      const attemptDuration = performance.now() - attemptStart;
      const errorCat = classifyErrorCategory(err);
      console.warn(`[ai/deepseek] Attempt ${attempt + 1} failed:`, err?.message || err);

      calls.push({
        provider: "deepseek",
        model: modelName,
        feature: "analyzeMeal",
        attempt: attempt + 1,
        durationMs: Math.round(attemptDuration * 10) / 10,
        outcome: errorCat === "timeout" ? "timeout" : "error",
        errorCategory: errorCat,
        costStatus: "UNKNOWN",
        costUsd: null,
        costInr: null,
        requestId: err?.request_id || err?.response?.headers?.get?.("x-request-id") || undefined,
      });

      if (isRetryableServerError(err) && attempt === 0) {
        retryCount++;
        const waitMs = 1000 + Math.floor(Math.random() * 300);
        if (performance.now() - t0 + waitMs < BUDGET_MS - 2000) {
          console.warn(`[ai/deepseek] Retryable server error. Retrying in ${waitMs}ms...`);
          const backoffStart = performance.now();
          await new Promise((r) => setTimeout(r, waitMs));
          totalRetryBackoffMs += performance.now() - backoffStart;
          continue;
        }
      }

      break;
    }
  }

  if (rawSuccess) {
    circuitBreaker.recordSuccess(userKey);
    const latencyMs = Math.round(performance.now() - t0);
    const costRecord = calculateEstimatedCost(
      rawSuccess.promptTokens,
      rawSuccess.completionTokens,
      modelName,
      "analyzeMeal"
    );
    const estimatedCostUsd = costRecord.totalCostUsd ?? 0;
    const estimatedCostInr = costRecord.totalCostInr ?? 0;

    // Structured ai_usage log line (Zero user content or raw image)
    console.info(
      JSON.stringify({
        type: "ai_usage",
        feature: "analyzeMeal",
        provider: "deepseek",
        model: modelName,
        promptTokens: rawSuccess.promptTokens,
        completionTokens: rawSuccess.completionTokens,
        totalTokens: rawSuccess.totalTokens,
        latencyMs,
        estimatedCostUsd,
        estimatedCostInr,
        currency: "USD",
        currencySecondary: "INR",
        costStatus: costRecord.costStatus,
        retries: retryCount,
        thinkingMode: isThinkingEnabled,
        imageDetail,
        requestId: rawSuccess.requestId,
      })
    );

    const cleanedCandidates = rawSuccess.data.candidates.map((c: any) => {
      const rawConf = c.confidence;
      const catConf: "high" | "medium" | "low" =
        rawConf >= 0.75 ? "high" : rawConf >= 0.5 ? "medium" : "low";
      return {
        name: cleanDishName(c.name),
        confidence: catConf,
        rawConfidence: rawConf,
      };
    });

    const cleanedFoods = rawSuccess.data.foods.map((f: any) => ({
      name: cleanDishName(f.name),
      quantity: f.quantity,
      unit: f.unit,
      confidence: f.confidence,
    }));

    const effectiveAmbiguity = computeEffectiveAmbiguity(
      rawSuccess.data.candidates.map((c: any) => ({ name: c.name, confidence: c.confidence })),
      rawSuccess.data.ambiguity
    );

    return {
      provider: "deepseek",
      model: modelName,
      foods: cleanedFoods,
      candidates: cleanedCandidates,
      visibleItems: rawSuccess.data.visibleItems,
      ambiguity: effectiveAmbiguity,
      notes: rawSuccess.data.notes,
      usage: {
        promptTokens: rawSuccess.promptTokens,
        completionTokens: rawSuccess.completionTokens,
        totalTokens: rawSuccess.totalTokens,
        latencyMs,
        estimatedCostUsd,
        estimatedCostInr,
        costStatus: costRecord.costStatus,
      },
      calls,
      retryBackoffMs: Math.round(totalRetryBackoffMs * 10) / 10,
    };
  }

  // All attempts failed
  circuitBreaker.recordFailure(userKey);
  throw new PhotoUnavailableError("Photo scan is busy. Type or speak your meal instead.");
}

// ── Text / Batch Nutrition Estimation ─────────────────────────────────────────

export interface DeepSeekEstimateNutritionInput {
  systemPrompt: string;
  userPrompt: string;
  userKey?: string;
  timeoutMs?: number;
}

export interface DeepSeekEstimateNutritionOutput {
  rawContent: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    latencyMs: number;
    estimatedCostUsd: number;
    estimatedCostInr?: number;
    costStatus?: string;
  };
  calls?: ApiCallTraceRecord[];
  retryBackoffMs?: number;
}

export async function estimateNutritionWithDeepSeek(
  opts: DeepSeekEstimateNutritionInput
): Promise<DeepSeekEstimateNutritionOutput> {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) {
    throw new Error("DEEPSEEK_API_KEY is not configured on the server.");
  }

  const userKey = opts.userKey || "global";

  if (circuitBreaker.isCircuitOpen(userKey)) {
    const cbState = circuitBreaker.getCircuitBreakerState(userKey);
    throw new Error(
      `DeepSeek circuit breaker is OPEN for user '${userKey}' until ${new Date(
        cbState.circuitOpenUntil
      ).toISOString()}`
    );
  }

  const baseURL = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com";
  const modelName = process.env.DEEPSEEK_NUTRITION_MODEL || process.env.DEEPSEEK_VISION_MODEL || "deepseek-flash";
  const client = new OpenAI({
    apiKey: key,
    baseURL,
    timeout: 25_000,
  });

  const t0 = performance.now();
  const calls: ApiCallTraceRecord[] = [];
  let totalRetryBackoffMs = 0;

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: opts.systemPrompt },
    { role: "user", content: opts.userPrompt },
  ];

  let rawSuccess: any = null;
  let retryCount = 0;

  for (let attempt = 0; attempt < 2; attempt++) {
    const elapsed = performance.now() - t0;
    const remainingBudget = BUDGET_MS - elapsed;
    if (remainingBudget < 2000) break;

    const attemptTimeout = Math.floor(Math.min(opts.timeoutMs || 20_000, remainingBudget));
    const attemptStart = performance.now();

    try {
      const maxTokens = parseInt(process.env.DEEPSEEK_NUTRITION_MAX_TOKENS || "1500", 10) || 1500;
      const timeoutInteger = Math.max(1000, attemptTimeout);
      const completion = await client.chat.completions.create(
        {
          model: modelName,
          messages,
          response_format: { type: "json_object" },
          temperature: 0,
          max_tokens: maxTokens,
        },
        { timeout: timeoutInteger }
      );

      const attemptDuration = performance.now() - attemptStart;
      const choice = completion.choices?.[0];
      const rawContent = choice?.message?.content || "";
      const cleaned = rawContent.replace(/```(?:json)?\n?/g, "").replace(/\n?```/g, "").trim();

      const promptTokens = completion.usage?.prompt_tokens ?? 0;
      const completionTokens = completion.usage?.completion_tokens ?? 0;
      const totalTokens = completion.usage?.total_tokens ?? (promptTokens + completionTokens);

      rawSuccess = {
        rawContent: cleaned,
        promptTokens,
        completionTokens,
        totalTokens,
        requestId: completion.id,
      };

      const costRecord = calculateEstimatedCost(
        promptTokens,
        completionTokens,
        modelName,
        "estimateNutrition"
      );

      calls.push({
        provider: "deepseek",
        model: modelName,
        feature: "estimateNutrition",
        attempt: attempt + 1,
        durationMs: Math.round(attemptDuration * 10) / 10,
        outcome: "success",
        promptTokens,
        completionTokens,
        cachedTokens: 0,
        totalTokens,
        costStatus: costRecord.costStatus,
        costUsd: costRecord.totalCostUsd,
        costInr: costRecord.totalCostInr,
        requestId: completion.id,
      });

      break;
    } catch (err: any) {
      const attemptDuration = performance.now() - attemptStart;
      const errorCat = classifyErrorCategory(err);
      console.warn(`[ai/deepseek] Nutrition estimation attempt ${attempt + 1} failed:`, err?.message || err);

      calls.push({
        provider: "deepseek",
        model: modelName,
        feature: "estimateNutrition",
        attempt: attempt + 1,
        durationMs: Math.round(attemptDuration * 10) / 10,
        outcome: errorCat === "timeout" ? "timeout" : "error",
        errorCategory: errorCat,
        costStatus: "UNKNOWN",
        costUsd: null,
        costInr: null,
        requestId: err?.request_id || err?.response?.headers?.get?.("x-request-id") || undefined,
      });

      if (isRetryableServerError(err) && attempt === 0) {
        retryCount++;
        const waitMs = 1000 + Math.floor(Math.random() * 300);
        if (performance.now() - t0 + waitMs < BUDGET_MS - 2000) {
          console.warn(`[ai/deepseek] Retryable server error. Retrying in ${waitMs}ms...`);
          const backoffStart = performance.now();
          await new Promise((r) => setTimeout(r, waitMs));
          totalRetryBackoffMs += performance.now() - backoffStart;
          continue;
        }
      }
      break;
    }
  }

  if (rawSuccess) {
    circuitBreaker.recordSuccess(userKey);
    const latencyMs = Math.round(performance.now() - t0);
    const costRecord = calculateEstimatedCost(
      rawSuccess.promptTokens,
      rawSuccess.completionTokens,
      modelName,
      "estimateNutrition"
    );
    const estimatedCostUsd = costRecord.totalCostUsd ?? 0;
    const estimatedCostInr = costRecord.totalCostInr ?? 0;

    console.info(
      JSON.stringify({
        type: "ai_usage",
        feature: "estimateNutrition",
        provider: "deepseek",
        model: modelName,
        promptTokens: rawSuccess.promptTokens,
        completionTokens: rawSuccess.completionTokens,
        totalTokens: rawSuccess.totalTokens,
        latencyMs,
        estimatedCostUsd,
        estimatedCostInr,
        currency: "USD",
        currencySecondary: "INR",
        costStatus: costRecord.costStatus,
        retries: retryCount,
        requestId: rawSuccess.requestId,
      })
    );

    return {
      rawContent: rawSuccess.rawContent,
      usage: {
        promptTokens: rawSuccess.promptTokens,
        completionTokens: rawSuccess.completionTokens,
        totalTokens: rawSuccess.totalTokens,
        latencyMs,
        estimatedCostUsd,
        estimatedCostInr,
        costStatus: costRecord.costStatus,
      },
      calls,
      retryBackoffMs: Math.round(totalRetryBackoffMs * 10) / 10,
    };
  }

  circuitBreaker.recordFailure(userKey);
  throw new Error("DeepSeek nutrition estimation failed after retries.");
}

export const deepseekVisionProvider: MealVisionProvider = {
  id: "deepseek",
  analyzeMeal: analyzeMealWithDeepSeek,
  isCircuitOpen: circuitBreaker.isCircuitOpen,
  recordSuccess: circuitBreaker.recordSuccess,
  recordFailure: circuitBreaker.recordFailure,
  resetCircuitBreaker: circuitBreaker.resetCircuitBreaker,
  getCircuitBreakerState: circuitBreaker.getCircuitBreakerState,
};


