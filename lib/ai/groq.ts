/**
 * lib/ai/groq.ts
 *
 * Single Groq wrapper used by all API routes.
 *
 * Features:
 * - 25s hard timeout (AbortController)
 * - One retry on HTTP 429, honouring Retry-After header (capped at 3s)
 * - finish_reason === "length" treated as distinct INVALID_OUTPUT, logged,
 *   and retried once with a 1.5x token cap before failing
 * - Typed error codes: RATE_LIMITED | MODEL_UNAVAILABLE | INVALID_OUTPUT | TIMEOUT | UNKNOWN
 * - reasoning_effort: "low" for gpt-oss models; "none" for qwen models (turns off thinking)
 * - JSON output requested; response validated with a caller-supplied Zod schema;
 *   one JSON-repair attempt on parse failure before throwing
 * - Structured usage logging via console.info({ type: "ai_usage", feature, model, ... }) with zero user content
 * - Returns usage (promptTokens, completionTokens, totalTokens, latencyMs, model)
 */

import Groq from "groq-sdk";
import { ZodType } from "zod";
import { isGptOss, isQwen, AiFeature } from "./models";

// ── Types ─────────────────────────────────────────────────────────────────────

export type AiErrorCode =
  | "RATE_LIMITED"
  | "MODEL_UNAVAILABLE"
  | "INVALID_OUTPUT"
  | "TIMEOUT"
  | "UNKNOWN";

export class AiError extends Error {
  constructor(
    public readonly code: AiErrorCode,
    message: string,
    public readonly retryAfterMs?: number,
  ) {
    super(message);
    this.name = "AiError";
  }
}

export interface AiUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  latencyMs: number;
  model: string;
}

export interface AiResult<T> {
  data: T;
  usage: AiUsage;
  raw: string;
}

// ── Singleton Groq client ─────────────────────────────────────────────────────

let _groq: Groq | null = null;

function groqClient(): Groq {
  if (!_groq) {
    const key = process.env.GROQ_API_KEY;
    if (!key) throw new AiError("UNKNOWN", "GROQ_API_KEY env var is not set");
    _groq = new Groq({ apiKey: key });
  }
  return _groq;
}

// ── Internal helpers ──────────────────────────────────────────────────────────

const CALL_TIMEOUT_MS = 25_000;
const MAX_RETRY_AFTER_MS = 3_000;

function classifyError(err: unknown): AiError {
  if (err instanceof AiError) return err;

  const e = err as Record<string, unknown>;
  const status = typeof e["status"] === "number" ? e["status"] : 0;
  const msg = String(e["message"] ?? e["error"] ?? err);

  if (status === 429) {
    let retryAfterMs: number | undefined;
    const headers = e["headers"] as Record<string, string> | undefined;
    if (headers?.["retry-after"]) {
      const secs = parseFloat(headers["retry-after"]);
      if (!Number.isNaN(secs)) retryAfterMs = Math.min(secs * 1000, MAX_RETRY_AFTER_MS);
    }
    return new AiError("RATE_LIMITED", `Rate limited: ${msg}`, retryAfterMs ?? MAX_RETRY_AFTER_MS);
  }

  if (
    status === 404 ||
    msg.includes("model_not_found") ||
    msg.includes("model_decommissioned") ||
    msg.includes("does not exist")
  ) {
    return new AiError("MODEL_UNAVAILABLE", `Model unavailable: ${msg}`);
  }

  const isAbort = err instanceof Error && (err.name === "AbortError" || err.message.includes("aborted"));
  if (isAbort) {
    return new AiError("TIMEOUT", `Request timed out after ${CALL_TIMEOUT_MS}ms`);
  }

  return new AiError("UNKNOWN", msg);
}

/** Strip markdown code fences and extract the first JSON object or array. */
function extractJson(raw: string): string {
  const stripped = raw.replace(/```(?:json)?\n?/g, "").replace(/\n?```/g, "").trim();
  const objIdx = stripped.indexOf("{");
  const arrIdx = stripped.indexOf("[");
  if (objIdx === -1 && arrIdx === -1) return stripped;
  const startIdx =
    objIdx === -1 ? arrIdx
    : arrIdx === -1 ? objIdx
    : Math.min(objIdx, arrIdx);
  return stripped.slice(startIdx);
}

// ── Core single-call primitive ────────────────────────────────────────────────

type ChatMessage = Groq.Chat.Completions.ChatCompletionMessageParam;

interface CoreCallOptions {
  model: string;
  messages: ChatMessage[];
  maxTokens: number;
  temperature?: number;
  jsonMode?: boolean;
}

interface CoreResult {
  content: string;
  finishReason: string | null;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

async function coreCall(opts: CoreCallOptions): Promise<CoreResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CALL_TIMEOUT_MS);

  try {
    const hasJsonWord = opts.messages.some(
      (m) => typeof m.content === "string" && /json/i.test(m.content)
    );
    const callMessages = (opts.jsonMode && !hasJsonWord)
      ? [{ role: "system" as const, content: "You must output valid JSON." }, ...opts.messages]
      : opts.messages;

    const params: Record<string, unknown> = {
      model: opts.model,
      messages: callMessages,
      max_tokens: opts.maxTokens,
      ...(opts.jsonMode ? { response_format: { type: "json_object" } } : {}),
    };

    if (isGptOss(opts.model)) {
      params["reasoning_effort"] = "low";
    } else if (isQwen(opts.model)) {
      // Disable Qwen thinking mode to prevent burning reasoning tokens on image analysis
      params["reasoning_effort"] = "none";
      params["temperature"] = opts.temperature ?? 0;
    } else {
      params["temperature"] = opts.temperature ?? 0;
    }

    const completion = await (groqClient().chat.completions.create as unknown as (
      body: Record<string, unknown>,
      opts?: Record<string, unknown>,
    ) => Promise<Groq.Chat.ChatCompletion>)(params, { signal: controller.signal as AbortSignal });

    const choice = completion.choices[0];
    const content = choice?.message?.content ?? "";
    const finishReason = choice?.finish_reason ?? null;
    const u = completion.usage;

    return {
      content,
      finishReason,
      promptTokens: u?.prompt_tokens ?? 0,
      completionTokens: u?.completion_tokens ?? 0,
      totalTokens: u?.total_tokens ?? 0,
    };
  } finally {
    clearTimeout(timer);
  }
}

function logUsage(feature: string, model: string, result: CoreResult, latencyMs: number) {
  // Structured log with NO user content or prompt data
  console.info(
    JSON.stringify({
      type: "ai_usage",
      feature,
      provider: "groq",
      model,
      promptTokens: result.promptTokens,
      completionTokens: result.completionTokens,
      totalTokens: result.totalTokens,
      cachedTokens: 0,
      latencyMs,
    })
  );
}

// ── Public API: plain text ────────────────────────────────────────────────────

export interface TextCallOptions {
  feature?: AiFeature | string;
  model: string;
  messages: ChatMessage[];
  maxTokens: number;
  temperature?: number;
}

export async function callText(opts: TextCallOptions): Promise<AiResult<string>> {
  const t0 = Date.now();
  const featureName = opts.feature ?? "text";
  let currentMaxTokens = opts.maxTokens;
  let hasRetriedLength = false;
  let lastErr: AiError | null = null;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await coreCall({ ...opts, maxTokens: currentMaxTokens });

      if (res.finishReason === "length") {
        console.warn(
          `[ai/groq] Model ${opts.model} hit token limit (finish_reason === "length") with cap ${currentMaxTokens}.`
        );
        if (!hasRetriedLength) {
          hasRetriedLength = true;
          currentMaxTokens = Math.round(currentMaxTokens * 1.5);
          console.warn(`[ai/groq] Retrying with 1.5x cap (${currentMaxTokens} tokens)...`);
          continue;
        }
        throw new AiError(
          "INVALID_OUTPUT",
          `Output truncated: model reached max_tokens limit of ${currentMaxTokens}`
        );
      }

      const latencyMs = Date.now() - t0;
      logUsage(featureName, opts.model, res, latencyMs);

      return {
        data: res.content,
        raw: res.content,
        usage: {
          promptTokens: res.promptTokens,
          completionTokens: res.completionTokens,
          totalTokens: res.totalTokens,
          latencyMs,
          model: opts.model,
        },
      };
    } catch (err) {
      const ae = classifyError(err);
      lastErr = ae;
      if (ae.code === "RATE_LIMITED" && attempt === 0) {
        await new Promise((r) => setTimeout(r, ae.retryAfterMs ?? MAX_RETRY_AFTER_MS));
        continue;
      }
      throw ae;
    }
  }

  throw lastErr!;
}

// ── Public API: validated JSON ────────────────────────────────────────────────

export interface JsonCallOptions<T> {
  feature?: AiFeature | string;
  model: string;
  messages: ChatMessage[];
  maxTokens: number;
  temperature?: number;
  schema: ZodType<T>;
  schemaName: string;
}

export async function callJsonStrict<T>(opts: JsonCallOptions<T>): Promise<AiResult<T>> {
  const t0 = Date.now();
  const featureName = opts.feature ?? opts.schemaName;
  let currentMaxTokens = opts.maxTokens;
  let hasRetriedLength = false;
  let lastErr: AiError | null = null;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      let res = await coreCall({
        model: opts.model,
        messages: opts.messages,
        maxTokens: currentMaxTokens,
        temperature: opts.temperature ?? 0,
        jsonMode: true,
      });

      if (res.finishReason === "length") {
        console.warn(
          `[ai/groq] Model ${opts.model} hit token limit (finish_reason === "length") with cap ${currentMaxTokens}.`
        );
        if (!hasRetriedLength) {
          hasRetriedLength = true;
          currentMaxTokens = Math.round(currentMaxTokens * 1.5);
          console.warn(`[ai/groq] Retrying with 1.5x cap (${currentMaxTokens} tokens)...`);
          continue;
        }
        throw new AiError(
          "INVALID_OUTPUT",
          `Output truncated: model reached max_tokens limit of ${currentMaxTokens}`
        );
      }

      // --- Parse JSON ---
      let parsed: unknown;
      const extracted = extractJson(res.content);
      try {
        parsed = JSON.parse(extracted);
      } catch {
        // One repair round-trip
        const repairRes = await coreCall({
          model: opts.model,
          messages: [
            ...opts.messages,
            { role: "assistant" as const, content: res.content },
            {
              role: "user" as const,
              content: "The JSON you returned was malformed. Return ONLY valid JSON, nothing else.",
            },
          ],
          maxTokens: currentMaxTokens,
          temperature: 0,
          jsonMode: true,
        });

        if (repairRes.finishReason === "length") {
          throw new AiError(
            "INVALID_OUTPUT",
            `JSON repair truncated: model reached max_tokens limit of ${currentMaxTokens}`
          );
        }

        try {
          parsed = JSON.parse(extractJson(repairRes.content));
          res = repairRes; // update usage from repair
        } catch {
          throw new AiError(
            "INVALID_OUTPUT",
            `${opts.schemaName}: JSON parse failed after repair. Raw snippet: ${res.content.slice(0, 200)}`,
          );
        }
      }

      // --- Zod validation ---
      const result = opts.schema.safeParse(parsed);
      if (!result.success) {
        throw new AiError(
          "INVALID_OUTPUT",
          `${opts.schemaName}: schema mismatch — ${result.error.message.slice(0, 300)}`,
        );
      }

      const latencyMs = Date.now() - t0;
      logUsage(featureName, opts.model, res, latencyMs);

      return {
        data: result.data,
        raw: res.content,
        usage: {
          promptTokens: res.promptTokens,
          completionTokens: res.completionTokens,
          totalTokens: res.totalTokens,
          latencyMs,
          model: opts.model,
        },
      };
    } catch (err) {
      const ae = classifyError(err);
      lastErr = ae;
      if (ae.code === "RATE_LIMITED" && attempt === 0) {
        await new Promise((r) => setTimeout(r, ae.retryAfterMs ?? MAX_RETRY_AFTER_MS));
        continue;
      }
      throw ae;
    }
  }

  throw lastErr!;
}

// ── Multi-model fallback helpers ──────────────────────────────────────────────

export async function callTextWithFallback(
  modelChain: string[],
  opts: Omit<TextCallOptions, "model">,
): Promise<AiResult<string>> {
  let lastErr: AiError | null = null;
  for (const model of modelChain) {
    try {
      return await callText({ ...opts, model });
    } catch (err) {
      const ae = classifyError(err);
      if (ae.code === "MODEL_UNAVAILABLE") {
        console.warn(`[ai/groq] model ${model} unavailable, trying next`);
        lastErr = ae;
        continue;
      }
      throw ae;
    }
  }
  throw lastErr ?? new AiError("UNKNOWN", "All models in fallback chain failed");
}

export async function callJsonStrictWithFallback<T>(
  modelChain: string[],
  opts: Omit<JsonCallOptions<T>, "model">,
): Promise<AiResult<T>> {
  let lastErr: AiError | null = null;
  for (const model of modelChain) {
    try {
      return await callJsonStrict({ ...opts, model });
    } catch (err) {
      const ae = classifyError(err);
      if (ae.code === "MODEL_UNAVAILABLE") {
        console.warn(`[ai/groq] model ${model} unavailable, trying next`);
        lastErr = ae;
        continue;
      }
      throw ae;
    }
  }
  throw lastErr ?? new AiError("UNKNOWN", "All models in fallback chain failed");
}
