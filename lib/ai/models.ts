/**
 * lib/ai/models.ts
 *
 * Single source of truth for every Groq model ID used in this app.
 * Each feature maps to a default and an env-var override so individual
 * models can be swapped without a code deploy.
 *
 * Verified against GET https://api.groq.com/openai/v1/models (2026-10-02):
 *   openai/gpt-oss-120b    – 131 072 ctx, text only
 *   openai/gpt-oss-20b     – 131 072 ctx, text only  (fallback for text)
 *   qwen/qwen3.8-27b       – 131 072 ctx, multimodal (vision + text)
 *   whisper-large-v3-turbo – audio transcription
 */

export type AiFeature =
  | "aria"           // Orbit chat coach
  | "estimateMeal"   // text dish → macros
  | "voiceMeal"      // transcript → meals JSON
  | "voiceWorkout"   // transcript → exercises JSON
  | "summarizeNutrition"
  | "summarizeWorkout"
  | "analyzeMeal";   // vision: meal photo → macros

/** Max tokens cap per feature — raised ~50% to accommodate reasoning tokens */
export const MAX_TOKENS: Record<AiFeature, number> = {
  aria:               850,
  estimateMeal:       800,
  voiceMeal:          900,
  voiceWorkout:       1200,
  summarizeNutrition: 900,
  summarizeWorkout:   1050,
  analyzeMeal:        1000,
};

/** Groq model IDs, each overridable by env var at runtime. */
function resolve(envKey: string, defaultId: string): string {
  const override = process.env[envKey];
  return override?.trim() || defaultId;
}

export const MODELS: Record<AiFeature, string> = {
  // Text features — primary: openai/gpt-oss-120b
  aria:               resolve("GROQ_MODEL_ARIA",                "openai/gpt-oss-120b"),
  estimateMeal:       resolve("GROQ_MODEL_ESTIMATE_MEAL",       "openai/gpt-oss-120b"),
  voiceMeal:          resolve("GROQ_MODEL_VOICE_MEAL",          "openai/gpt-oss-120b"),
  voiceWorkout:       resolve("GROQ_MODEL_VOICE_WORKOUT",       "openai/gpt-oss-120b"),
  summarizeNutrition: resolve("GROQ_MODEL_SUMMARIZE_NUTRITION", "openai/gpt-oss-120b"),
  summarizeWorkout:   resolve("GROQ_MODEL_SUMMARIZE_WORKOUT",   "openai/gpt-oss-120b"),
  // Vision feature — qwen/qwen3.8-27b is the vision-capable model (kept behind GROQ_VISION_ENABLED flag)
  analyzeMeal:        resolve("GROQ_MODEL_ANALYZE_MEAL",        "qwen/qwen3.8-27b"),
};

/**
 * Whether to use Groq Qwen for vision instead of default Gemini.
 * Default: false (off). Production /api/analyze-meal uses Google Gemini by default.
 */
export const GROQ_VISION_ENABLED: boolean =
  process.env.GROQ_VISION_ENABLED === "true";

/** Fallback chain for text features only (no vision fallback — qwen is the only option). */
export const TEXT_FALLBACK: string[] = [
  resolve("GROQ_MODEL_TEXT_PRIMARY",  "openai/gpt-oss-120b"),
  resolve("GROQ_MODEL_TEXT_FALLBACK", "openai/gpt-oss-20b"),
];

/** Whisper transcription model. */
export const TRANSCRIPTION_MODEL: string = resolve(
  "GROQ_MODEL_TRANSCRIPTION",
  "whisper-large-v3-turbo",
);

/**
 * Whether a model is a gpt-oss variant — these accept
 * `reasoning_effort: "low"` but not temperature.
 */
export function isGptOss(modelId: string): boolean {
  return modelId.startsWith("openai/gpt-oss");
}

/**
 * Whether a model is a Qwen variant — supports `reasoning_effort: "none"`
 * to disable thinking mode and avoid generating reasoning tokens.
 */
export function isQwen(modelId: string): boolean {
  return modelId.startsWith("qwen/");
}
