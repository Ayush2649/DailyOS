/**
 * lib/ai/nutrition/aiEstimator.ts
 *
 * Phase 2B: Asynchronous AI Nutrition Estimation Layer for Non-Canonical Foods.
 *
 * Responsibilities:
 * - Batches all non-canonical, AI-eligible foods into a single provider call
 * - Invokes DeepSeek using existing client, circuit-breaker, retry, and telemetry
 * - Validates provider responses strictly against Zod schema and nutrition sanity rules
 * - Deterministically maps results back to requested foods (no fuzzy or substring mapping)
 * - Safely degrades any failed/unmappable items or provider errors to UNRESOLVED
 * - Merges results into InputFoodItem[] for the deterministic nutrition calculator
 */

import { z } from "zod";
import { InputFoodItem } from "./calculator";
import { RoutedFoodItems } from "./router";
import {
  estimateNutritionWithDeepSeek,
  DeepSeekEstimateNutritionInput,
  DeepSeekEstimateNutritionOutput,
} from "../providers/deepseek";

export const NUTRITION_ESTIMATION_SYSTEM_PROMPT = `You are an expert culinary nutrition estimator.
Given a list of identified food items with quantities and units, estimate realistic nutritional values for each item based on standard preparation methods.

CRITICAL RULES:
- Provide estimates for ONLY the requested foods.
- For each food, return realistic calories, proteinG, carbsG, fatG, and optional fiberG (all non-negative numbers).
- Return a realistic calorieRange {low, high} reflecting cooking and oil variance (low > 0, high >= low).
- Ensure calories are physically consistent with macros (~4 kcal/g protein, ~4 kcal/g carbs, ~9 kcal/g fat).
- Do NOT include any personal user info or extraneous conversational text.

Return ONLY a JSON object matching this schema:
{
  "items": [
    {
      "foodName": "<exact name from the request>",
      "calories": <positive number>,
      "proteinG": <non-negative number>,
      "carbsG": <non-negative number>,
      "fatG": <non-negative number>,
      "fiberG": <non-negative number>,
      "calorieRange": {"low": <positive number>, "high": <positive number>},
      "confidence": <float 0.0 to 1.0>
    }
  ]
}`;

// ── Strict Zod Schema ─────────────────────────────────────────────────────────

export const AiNutritionItemSchema = z.object({
  foodName: z.string().min(1),
  calories: z.number().finite().positive(),
  proteinG: z.number().finite().nonnegative(),
  carbsG: z.number().finite().nonnegative(),
  fatG: z.number().finite().nonnegative(),
  fiberG: z.number().finite().nonnegative().optional(),
  calorieRange: z
    .object({
      low: z.number().finite().positive(),
      high: z.number().finite().positive(),
    })
    .optional(),
  confidence: z.number().finite().min(0).max(1).optional(),
});

export const AiNutritionBatchSchema = z.object({
  items: z.array(z.unknown()),
});

export type AiNutritionItem = z.infer<typeof AiNutritionItemSchema>;

// ── Sanity & Consistency Checks ───────────────────────────────────────────────

/**
 * Validates macro/calorie sanity as a guard against obviously invalid outputs.
 * Allows reasonable rounding variance, but rejects physically absurd responses.
 */
export function validateNutritionSanity(item: AiNutritionItem): boolean {
  if (!Number.isFinite(item.calories) || item.calories <= 0) return false;
  if (!Number.isFinite(item.proteinG) || item.proteinG < 0) return false;
  if (!Number.isFinite(item.carbsG) || item.carbsG < 0) return false;
  if (!Number.isFinite(item.fatG) || item.fatG < 0) return false;
  if (item.fiberG !== undefined && (!Number.isFinite(item.fiberG) || item.fiberG < 0)) return false;

  if (item.confidence !== undefined) {
    if (!Number.isFinite(item.confidence) || item.confidence < 0 || item.confidence > 1) {
      return false;
    }
  }

  if (item.calorieRange) {
    if (
      !Number.isFinite(item.calorieRange.low) ||
      !Number.isFinite(item.calorieRange.high) ||
      item.calorieRange.low <= 0 ||
      item.calorieRange.high < item.calorieRange.low
    ) {
      return false;
    }
  }

  // Energy consistency guard: reject clearly absurd outputs
  // derived = 4 * P + 4 * C + 9 * F
  const derived = 4 * item.proteinG + 4 * item.carbsG + 9 * item.fatG;
  if (derived > 0) {
    const ratio = item.calories / derived;
    // Allow generous bounds (0.35 to 3.0) for cooking, rounding, and fiber differences
    // Rejects extreme absurdities (e.g. 100g protein with 20 kcal, or 0 macros with 500 kcal)
    if (ratio < 0.35 || ratio > 3.0) {
      return false;
    }
  } else if (item.calories > 50) {
    // 0 macros but > 50 kcal -> absurd
    return false;
  }

  return true;
}

// ── Normalized Food Name Matching ─────────────────────────────────────────────

/**
 * Safe normalized exact matching key.
 * Strips numbering, punctuation, and extraneous spaces.
 * Strictly prevents substring matching (e.g. "cucumber" !== "cucumber raita").
 */
export function normalizeMatchKey(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/^[0-9]+[.)]\s*/, "") // remove leading numbering "1." or "1)"
    .replace(/[^\w\s]/g, " ")       // remove punctuation
    .replace(/\s+/g, " ")          // collapse whitespace
    .trim();
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface EstimatedNutritionResult {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG?: number;
  source: "ai_estimate";
  calorieRange?: { low: number; high: number };
}

// ── Batch Estimator ───────────────────────────────────────────────────────────

export async function estimateNutritionBatch(
  items: InputFoodItem[],
  opts?: {
    userKey?: string;
    timeoutMs?: number;
    providerFn?: (input: DeepSeekEstimateNutritionInput) => Promise<DeepSeekEstimateNutritionOutput>;
  }
): Promise<Map<string, EstimatedNutritionResult>> {
  const resultMap = new Map<string, EstimatedNutritionResult>();
  if (!items || items.length === 0) {
    return resultMap;
  }

  const provider = opts?.providerFn || estimateNutritionWithDeepSeek;

  // Build compact batch prompt without sending user PII
  const foodList = items
    .map((f, idx) => `${idx + 1}. "${f.name.trim()}" (quantity: ${f.quantity ?? 1} ${f.unit || "serving"})`)
    .join("\n");
  const userPrompt = `Estimate nutritional values for the following food items:\n${foodList}`;

  let rawOutput: DeepSeekEstimateNutritionOutput;
  try {
    rawOutput = await provider({
      systemPrompt: NUTRITION_ESTIMATION_SYSTEM_PROMPT,
      userPrompt,
      userKey: opts?.userKey,
      timeoutMs: opts?.timeoutMs,
    });
  } catch (err: any) {
    console.warn("[aiEstimator] Provider call failed:", err?.message || err);
    // Provider failure -> entire batch becomes unresolved
    return resultMap;
  }

  let parsedJson: any;
  try {
    parsedJson = JSON.parse(rawOutput.rawContent);
  } catch (err: any) {
    console.warn("[aiEstimator] Malformed JSON from provider:", err?.message);
    return resultMap;
  }

  const validation = AiNutritionBatchSchema.safeParse(parsedJson);
  if (!validation.success) {
    console.warn("[aiEstimator] Schema validation failed:", validation.error.message);
    return resultMap;
  }

  // Parse each item strictly; individual invalid items are discarded without dropping the entire batch
  const returnedItems: AiNutritionItem[] = [];
  for (const rawItem of validation.data.items) {
    const itemRes = AiNutritionItemSchema.safeParse(rawItem);
    if (itemRes.success) {
      returnedItems.push(itemRes.data);
    }
  }

  for (const requested of items) {
    const reqKey = normalizeMatchKey(requested.name);
    // Find all responses matching this requested item
    const matches = returnedItems.filter((ret) => normalizeMatchKey(ret.foodName) === reqKey);

    // If not exactly 1 match (missing or duplicate) -> reject that item
    if (matches.length !== 1) {
      continue;
    }

    const matched = matches[0];
    if (!validateNutritionSanity(matched)) {
      continue;
    }

    resultMap.set(requested.name, {
      calories: Math.round(matched.calories),
      proteinG: Math.round(matched.proteinG),
      carbsG: Math.round(matched.carbsG),
      fatG: Math.round(matched.fatG),
      fiberG: matched.fiberG !== undefined ? Math.round(matched.fiberG) : undefined,
      source: "ai_estimate",
      calorieRange: matched.calorieRange
        ? {
            low: Math.round(matched.calorieRange.low),
            high: Math.round(matched.calorieRange.high),
          }
        : undefined,
    });
  }

  return resultMap;
}

// ── Merge Function ────────────────────────────────────────────────────────────

export function mergeRoutedNutrition(
  routed: RoutedFoodItems,
  estimatedMap: Map<string, EstimatedNutritionResult>
): InputFoodItem[] {
  const merged: InputFoodItem[] = [];

  // 1. Canonical items (unchanged, will be verified in calculator)
  for (const item of routed.canonical) {
    merged.push(item);
  }

  // 2. Component items (unchanged, will be zeroed and marked component in calculator)
  for (const item of routed.components) {
    merged.push(item);
  }

  // 3. AI-Eligible items: attach estimatedNutrition if present in estimatedMap
  for (const item of routed.aiEligible) {
    const est = estimatedMap.get(item.name);
    if (est) {
      merged.push({
        ...item,
        estimatedNutrition: est,
      });
    } else {
      // Failed estimation or unmappable -> unresolved (no estimatedNutrition)
      merged.push({
        ...item,
        estimatedNutrition: undefined,
      });
    }
  }

  // 4. Low-confidence unresolved items (no estimatedNutrition)
  for (const item of routed.unresolved) {
    merged.push({
      ...item,
      estimatedNutrition: undefined,
    });
  }

  return merged;
}

