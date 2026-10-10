/**
 * lib/ai/providers/nemotron.ts
 *
 * Experimental Stage 1 (Vision) Provider for Meal Photo Analysis using NVIDIA Nemotron 3 Nano Omni 30B.
 * Targeted for controlled benchmarking against Gemini and DeepSeek.
 *
 * Architecture:
 * - Model: nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free (configurable via NEMOTRON_VISION_MODEL)
 * - Base URL: https://openrouter.ai/api/v1 (configurable via NEMOTRON_BASE_URL)
 * - Uses existing preprocessed JPEG image buffer (reusing server-side Sharp pipeline)
 * - Reuses shared system prompt and dish vocabulary from common.ts
 * - Reuses defensive JSON extraction and Zod schema validation (parseVisionJsonWithDefaults)
 * - Reuses authoritative per-user circuit breaker factory (createUserCircuitBreaker)
 * - 10s call timeout, 15s request budget, max 1 bounded retry on retryable server/upstream errors
 * - Robust handling of OpenRouter inline error payloads
 * - Privacy-safe telemetry with reasoning token tracking (zero raw image / API key logging)
 */

import OpenAI from "openai";
import {
  MealVisionInput,
  MealVisionResult,
  MealVisionProvider,
  PhotoUnavailableError,
} from "./types";
import {
  VISION_SYSTEM_PROMPT,
  STATIC_INSTRUCTIONS_AND_VOCAB,
  cleanDishName,
  computeEffectiveAmbiguity,
  createUserCircuitBreaker,
  parseVisionJsonWithDefaults,
} from "./common";

// ── Authoritative Circuit Breaker (Nemotron, Per-User Scoped) ───────────────

const circuitBreaker = createUserCircuitBreaker("nemotron");

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
  if (/timeout|connection reset|econnreset|socket hang up|upstream error|resourceexhausted/i.test(err.message || "")) {
    return true;
  }
  return false;
}

// ── Core Provider Implementation ──────────────────────────────────────────────

const BUDGET_MS = 15_000; // 15s strict total request budget

export async function analyzeMealWithNemotron(
  opts: MealVisionInput
): Promise<MealVisionResult> {
  const key = process.env.NEMOTRON_OMNI_API_KEY || process.env.NEMOTRON_API_KEY;
  if (!key) {
    throw new PhotoUnavailableError("NEMOTRON_OMNI_API_KEY is not configured on the server.");
  }

  const userKey = opts.userKey || "global";

  // 1. Check authoritative per-user circuit breaker
  if (circuitBreaker.isCircuitOpen(userKey)) {
    const cbState = circuitBreaker.getCircuitBreakerState(userKey);
    console.warn(
      `[ai/nemotron] Circuit breaker is OPEN for user '${userKey}'. Skipping Nemotron until ${new Date(
        cbState.circuitOpenUntil
      ).toISOString()}`
    );
    throw new PhotoUnavailableError("Photo scan is busy. Type or speak your meal instead.");
  }

  const baseURL = process.env.NEMOTRON_BASE_URL || "https://openrouter.ai/api/v1";
  const modelName =
    process.env.NEMOTRON_VISION_MODEL ||
    "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free";
  const maxTokens = parseInt(process.env.NEMOTRON_MAX_TOKENS || "8192", 10) || 8192;

  const client = new OpenAI({
    apiKey: key,
    baseURL,
    timeout: 10_000, // 10s per-call timeout budget
    defaultHeaders: {
      "HTTP-Referer": "https://satat.app",
      "X-Title": "SATAT Food Vision",
    },
  });

  const t0 = Date.now();

  // User text instructions with hint if provided (strictly reusing shared definition)
  const userTextPrompt =
    opts.hint && opts.hint.trim()
      ? `${STATIC_INSTRUCTIONS_AND_VOCAB}\n\nUSER HINT: "${opts.hint.trim()}" (Take this into account if compatible with the image)`
      : STATIC_INSTRUCTIONS_AND_VOCAB;

  // Single multimodal user message with base64 data URL
  const userContent: OpenAI.Chat.ChatCompletionContentPart[] = [
    { type: "text", text: userTextPrompt },
    {
      type: "image_url",
      image_url: {
        url: `data:${opts.mimeType};base64,${opts.base64}`,
      },
    },
  ];

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: VISION_SYSTEM_PROMPT },
    { role: "user", content: userContent },
  ];

  let rawSuccess: any = null;
  let retryCount = 0;
  let lastError: any = null;

  // Internal helper to call Nemotron Chat Completion
  async function callNemotron(timeoutMs: number) {
    const requestOptions: OpenAI.Chat.ChatCompletionCreateParamsNonStreaming = {
      model: modelName,
      messages,
      max_tokens: maxTokens,
      temperature: 0,
    };

    const completion: any = await client.chat.completions.create(requestOptions, {
      timeout: timeoutMs,
    });

    // Detect OpenRouter inline error payloads (e.g. 502 Worker limit reached inside 200 OK)
    if (completion?.error) {
      const errObj = completion.error;
      const err = new Error(errObj.message || "Upstream provider error from OpenRouter");
      (err as any).status = errObj.code || 502;
      throw err;
    }

    const choice = completion.choices?.[0];
    const rawContent = choice?.message?.content || "";
    if (!rawContent || !rawContent.trim()) {
      throw new Error("Empty response received from Nemotron model");
    }

    const cleaned = rawContent.replace(/```(?:json)?\n?/g, "").replace(/\n?```/g, "").trim();

    // Reusing existing defensive JSON extraction + Zod schema validation
    const validatedData = parseVisionJsonWithDefaults(cleaned);
    const usage = completion.usage;

    const promptTokens = usage?.prompt_tokens ?? 0;
    const completionTokens = usage?.completion_tokens ?? 0;
    const reasoningTokens = usage?.completion_tokens_details?.reasoning_tokens ?? 0;
    const totalTokens = usage?.total_tokens ?? (promptTokens + completionTokens);

    return {
      data: validatedData,
      promptTokens,
      completionTokens,
      reasoningTokens,
      totalTokens,
    };
  }

  // Attempt up to 2 times (1 retry) on retryable 5xx or timeouts within 15s total budget
  for (let attempt = 0; attempt < 2; attempt++) {
    const elapsed = Date.now() - t0;
    const remainingBudget = BUDGET_MS - elapsed;
    if (remainingBudget < 2000) break;

    const attemptTimeout = Math.min(10_000, remainingBudget);

    try {
      rawSuccess = await callNemotron(attemptTimeout);
      break;
    } catch (err: any) {
      lastError = err;
      console.warn(`[ai/nemotron] Attempt ${attempt + 1} failed:`, err?.message || err);

      if (isRetryableServerError(err) && attempt === 0) {
        retryCount++;
        const waitMs = 1000 + Math.floor(Math.random() * 300);
        if (Date.now() - t0 + waitMs < BUDGET_MS - 2000) {
          console.warn(`[ai/nemotron] Retryable server error. Retrying in ${waitMs}ms...`);
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

    // Structured ai_usage telemetry (Zero user content, prompt text, or raw images logged)
    console.info(
      JSON.stringify({
        type: "ai_usage",
        feature: "analyzeMeal",
        provider: "nemotron",
        model: modelName,
        promptTokens: rawSuccess.promptTokens,
        completionTokens: rawSuccess.completionTokens,
        reasoningTokens: rawSuccess.reasoningTokens,
        totalTokens: rawSuccess.totalTokens,
        latencyMs,
        retries: retryCount,
        maxTokensConfigured: maxTokens,
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
      provider: "nemotron",
      model: modelName,
      foods: cleanedFoods,
      candidates: cleanedCandidates,
      visibleItems: rawSuccess.data.visibleItems,
      ambiguity: effectiveAmbiguity,
      notes: rawSuccess.data.notes,
      usage: {
        promptTokens: rawSuccess.promptTokens,
        completionTokens: rawSuccess.completionTokens,
        reasoningTokens: rawSuccess.reasoningTokens,
        totalTokens: rawSuccess.totalTokens,
        latencyMs,
        estimatedCostUsd: 0, // Free endpoint on OpenRouter
      },
    };
  }

  // All attempts failed
  circuitBreaker.recordFailure(userKey);
  throw new PhotoUnavailableError("Photo scan is busy. Type or speak your meal instead.", { cause: lastError });
}

export const nemotronVisionProvider: MealVisionProvider = {
  id: "nemotron",
  analyzeMeal: analyzeMealWithNemotron,
  isCircuitOpen: circuitBreaker.isCircuitOpen,
  recordSuccess: circuitBreaker.recordSuccess,
  recordFailure: circuitBreaker.recordFailure,
  resetCircuitBreaker: circuitBreaker.resetCircuitBreaker,
  getCircuitBreakerState: circuitBreaker.getCircuitBreakerState,
};

