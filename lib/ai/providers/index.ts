/**
 * lib/ai/providers/index.ts
 *
 * Provider Registry and Factory for Stage 1 (Vision) Meal Analysis.
 *
 * Default provider: "gemini"
 * Experimental provider: "deepseek"
 * Controlled via MEAL_VISION_PROVIDER environment variable.
 */

import { MealVisionProvider } from "./types";
import { geminiVisionProvider, analyzeMealWithGemini } from "./gemini";
import { deepseekVisionProvider, analyzeMealWithDeepSeek } from "./deepseek";
import { nemotronVisionProvider, analyzeMealWithNemotron } from "./nemotron";

export * from "./types";
export { geminiVisionProvider, analyzeMealWithGemini } from "./gemini";
export { deepseekVisionProvider, analyzeMealWithDeepSeek } from "./deepseek";
export { nemotronVisionProvider, analyzeMealWithNemotron } from "./nemotron";

/**
 * Returns the configured Meal Vision Provider.
 * Production default is strictly "gemini".
 * Experimental providers: "deepseek", "nemotron" (activated via MEAL_VISION_PROVIDER).
 */
export function getMealVisionProvider(providerName?: string): MealVisionProvider {
  const selected = (
    providerName ||
    process.env.MEAL_VISION_PROVIDER ||
    "gemini"
  ).trim().toLowerCase();

  if (selected === "nemotron") {
    return nemotronVisionProvider;
  }

  if (selected === "deepseek") {
    return deepseekVisionProvider;
  }

  // Default is strictly Gemini
  return {
    ...geminiVisionProvider,
    analyzeMeal: (opts) => analyzeMealWithGemini(opts),
  };
}

