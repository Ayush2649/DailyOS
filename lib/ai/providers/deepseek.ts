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
  if (/timeout|connection reset|econnreset|socket hang up/i.test(err.message || "")) return true;
  return false;
}

// ── Pricing Constants (DeepSeek published rates) ──────────────────────────────
// DeepSeek standard vision/chat pricing: $0.14 per 1M input tokens, $0.28 per 1M output tokens
const COST_PER_1M_INPUT_USD = 0.14;
const COST_PER_1M_OUTPUT_USD = 0.28;

function calculateEstimatedCost(promptTokens: number, completionTokens: number): number {
  const inputCost = (promptTokens / 1_000_000) * COST_PER_1M_INPUT_USD;
  const outputCost = (completionTokens / 1_000_000) * COST_PER_1M_OUTPUT_USD;
  return Math.round((inputCost + outputCost) * 100_000) / 100_000;
}

// ── Core Provider Implementation ──────────────────────────────────────────────

const BUDGET_MS = 15_000; // 15s strict total budget

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
    timeout: 10_000, // 10s timeout per call
  });

  const t0 = Date.now();

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
    const requestOptions: any = {
      model: modelName,
      messages,
      response_format: { type: "json_object" },
      temperature: 0,
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
    };
  }

  // Attempt up to 2 times (1 retry) on 5xx or timeouts within budget
  for (let attempt = 0; attempt < 2; attempt++) {
    const elapsed = Date.now() - t0;
    const remainingBudget = BUDGET_MS - elapsed;
    if (remainingBudget < 2000) break;

    const attemptTimeout = Math.min(10_000, remainingBudget);

    try {
      rawSuccess = await callDeepSeek(attemptTimeout);
      break;
    } catch (err: any) {
      console.warn(`[ai/deepseek] Attempt ${attempt + 1} failed:`, err?.message || err);

      if (isRetryableServerError(err) && attempt === 0) {
        retryCount++;
        const waitMs = 1000 + Math.floor(Math.random() * 300);
        if (Date.now() - t0 + waitMs < BUDGET_MS - 2000) {
          console.warn(`[ai/deepseek] Retryable server error. Retrying in ${waitMs}ms...`);
          await new Promise((r) => setTimeout(r, waitMs));
          continue;
        }
      }

      break;
    }
  }

  if (rawSuccess) {
    circuitBreaker.recordSuccess(userKey);
    const latencyMs = Date.now() - t0;
    const estimatedCostUsd = calculateEstimatedCost(
      rawSuccess.promptTokens,
      rawSuccess.completionTokens
    );

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
        retries: retryCount,
        thinkingMode: isThinkingEnabled,
        imageDetail,
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
      },
    };
  }

  // All attempts failed
  circuitBreaker.recordFailure(userKey);
  throw new PhotoUnavailableError("Photo scan is busy. Type or speak your meal instead.");
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

