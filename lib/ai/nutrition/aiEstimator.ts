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
- For items measured in grams ('g' or 'grams'), provide standard nutritional values per 100g and set basis="per_100g" (or provide values in nutritionPer100g).
- For items measured in milliliters ('ml'), provide nutritional values per 100ml and set basis="per_100ml".
- For countable or serving-based items (pieces, katori, bowl, plate, cup, serving), provide nutritional values per 1 unit/serving and set basis="per_unit" or "per_serving".
- For each food, return realistic calories, proteinG, carbsG, fatG, and optional fiberG (all non-negative numbers).
- Return a realistic calorieRange {low, high} reflecting cooking and oil variance (low > 0, high >= low).
- Ensure calories are physically consistent with macros (~4 kcal/g protein, ~4 kcal/g carbs, ~9 kcal/g fat).
- Do NOT include any personal user info, commentary, or extraneous text. Output compact JSON only.

Return ONLY a JSON object matching this schema:
{
  "items": [
    {
      "foodName": "<exact name from the request>",
      "basis": "per_100g"|"per_100ml"|"per_unit"|"per_serving",
      "calories": <positive number>,
      "proteinG": <non-negative number>,
      "carbsG": <non-negative number>,
      "fatG": <non-negative number>,
      "fiberG": <non-negative number>,
      "calorieRange": {"low": <positive number>, "high": <positive number>},
      "confidence": <float 0.0 to 1.0>,
      "nutritionPer100g": {
        "calories": <positive number>,
        "proteinG": <non-negative number>,
        "carbsG": <non-negative number>,
        "fatG": <non-negative number>,
        "fiberG": <non-negative number>
      }
    }
  ]
}`;

// ── Strict Zod Schema ─────────────────────────────────────────────────────────

export const AiNutritionItemSchema = z.object({
  foodName: z.string().min(1),
  basis: z.enum(["per_100g", "per_100ml", "per_unit", "per_serving"]).optional(),
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
  nutritionPer100g: z
    .object({
      calories: z.number().finite().positive(),
      proteinG: z.number().finite().nonnegative(),
      carbsG: z.number().finite().nonnegative(),
      fatG: z.number().finite().nonnegative(),
      fiberG: z.number().finite().nonnegative().optional(),
    })
    .optional(),
  nutritionPer100ml: z
    .object({
      calories: z.number().finite().positive(),
      proteinG: z.number().finite().nonnegative(),
      carbsG: z.number().finite().nonnegative(),
      fatG: z.number().finite().nonnegative(),
      fiberG: z.number().finite().nonnegative().optional(),
    })
    .optional(),
  nutritionPerUnit: z
    .object({
      calories: z.number().finite().positive(),
      proteinG: z.number().finite().nonnegative(),
      carbsG: z.number().finite().nonnegative(),
      fatG: z.number().finite().nonnegative(),
      fiberG: z.number().finite().nonnegative().optional(),
    })
    .optional(),
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
  grams?: number | null;
  basis?: "per_100g" | "per_100ml" | "per_unit" | "per_serving";
  nutritionPer100g?: {
    calories: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
    fiberG?: number;
  };
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
    .map((f, idx) => {
      const u = (f.unit || "serving").toLowerCase().trim();
      const isGram = u === "g" || u === "gram" || u === "grams";
      const isMl = u === "ml" || u === "milliliter" || u === "milliliters";
      const hint = isGram
        ? `[portion: ${f.quantity ?? 1}g - please estimate standard nutrition per 100g]`
        : isMl
        ? `[portion: ${f.quantity ?? 1}ml - please estimate standard nutrition per 100ml]`
        : `[quantity: ${f.quantity ?? 1} ${f.unit || "serving"}]`;
      return `${idx + 1}. "${f.name.trim()}" ${hint}`;
    })
    .join("\n");
  const userPrompt = `Estimate nutritional values for the following food items:\n${foodList}`;

  let rawOutput: DeepSeekEstimateNutritionOutput | undefined;
  try {
    rawOutput = await provider({
      systemPrompt: NUTRITION_ESTIMATION_SYSTEM_PROMPT,
      userPrompt,
      userKey: opts?.userKey,
      timeoutMs: opts?.timeoutMs,
    });
    if (rawOutput) {
      (resultMap as any).calls = rawOutput.calls || [];
      (resultMap as any).retryBackoffMs = rawOutput.retryBackoffMs || 0;
    }
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

    const u = (requested.unit || "serving").toLowerCase().trim();
    const isGram = u === "g" || u === "gram" || u === "grams";
    const isMl = u === "ml" || u === "milliliter" || u === "milliliters";

    if (isGram) {
      const detectedGrams = requested.quantity ?? 100;
      const factor = detectedGrams / 100;
      const p100 = matched.nutritionPer100g || {
        calories: matched.calories,
        proteinG: matched.proteinG,
        carbsG: matched.carbsG,
        fatG: matched.fatG,
        fiberG: matched.fiberG,
      };

      const scaledCals = Math.round(p100.calories * factor);
      const scaledProt = Math.round(p100.proteinG * factor);
      const scaledCarbs = Math.round(p100.carbsG * factor);
      const scaledFat = Math.round(p100.fatG * factor);
      const scaledFib = p100.fiberG !== undefined ? Math.round(p100.fiberG * factor) : undefined;
      const scaledRange = matched.calorieRange
        ? {
            low: Math.round(matched.calorieRange.low * factor),
            high: Math.round(matched.calorieRange.high * factor),
          }
        : undefined;

      resultMap.set(requested.name, {
        calories: scaledCals,
        proteinG: scaledProt,
        carbsG: scaledCarbs,
        fatG: scaledFat,
        fiberG: scaledFib,
        source: "ai_estimate",
        calorieRange: scaledRange,
        grams: detectedGrams,
        basis: "per_100g",
        nutritionPer100g: {
          calories: Math.round(p100.calories),
          proteinG: Math.round(p100.proteinG),
          carbsG: Math.round(p100.carbsG),
          fatG: Math.round(p100.fatG),
          fiberG: p100.fiberG !== undefined ? Math.round(p100.fiberG) : undefined,
        },
      });
    } else if (isMl) {
      const detectedMl = requested.quantity ?? 100;
      const factor = detectedMl / 100;
      const p100ml = matched.nutritionPer100ml || {
        calories: matched.calories,
        proteinG: matched.proteinG,
        carbsG: matched.carbsG,
        fatG: matched.fatG,
        fiberG: matched.fiberG,
      };

      const scaledCals = Math.round(p100ml.calories * factor);
      const scaledProt = Math.round(p100ml.proteinG * factor);
      const scaledCarbs = Math.round(p100ml.carbsG * factor);
      const scaledFat = Math.round(p100ml.fatG * factor);
      const scaledFib = p100ml.fiberG !== undefined ? Math.round(p100ml.fiberG * factor) : undefined;
      const scaledRange = matched.calorieRange
        ? {
            low: Math.round(matched.calorieRange.low * factor),
            high: Math.round(matched.calorieRange.high * factor),
          }
        : undefined;

      resultMap.set(requested.name, {
        calories: scaledCals,
        proteinG: scaledProt,
        carbsG: scaledCarbs,
        fatG: scaledFat,
        fiberG: scaledFib,
        source: "ai_estimate",
        calorieRange: scaledRange,
        grams: detectedMl,
        basis: "per_100ml",
      });
    } else {
      // Non-gram, non-ml (e.g. piece, plate, katori, serving)
      const qty = requested.quantity ?? 1;
      let scaledCals: number;
      let scaledProt: number;
      let scaledCarbs: number;
      let scaledFat: number;
      let scaledFib: number | undefined;
      let scaledRange: { low: number; high: number } | undefined;

      if (matched.nutritionPerUnit && qty !== 1) {
        scaledCals = Math.round(matched.nutritionPerUnit.calories * qty);
        scaledProt = Math.round(matched.nutritionPerUnit.proteinG * qty);
        scaledCarbs = Math.round(matched.nutritionPerUnit.carbsG * qty);
        scaledFat = Math.round(matched.nutritionPerUnit.fatG * qty);
        scaledFib =
          matched.nutritionPerUnit.fiberG !== undefined
            ? Math.round(matched.nutritionPerUnit.fiberG * qty)
            : undefined;
        scaledRange = matched.calorieRange
          ? {
              low: Math.round(matched.calorieRange.low * qty),
              high: Math.round(matched.calorieRange.high * qty),
            }
          : undefined;
      } else {
        scaledCals = Math.round(matched.calories);
        scaledProt = Math.round(matched.proteinG);
        scaledCarbs = Math.round(matched.carbsG);
        scaledFat = Math.round(matched.fatG);
        scaledFib = matched.fiberG !== undefined ? Math.round(matched.fiberG) : undefined;
        scaledRange = matched.calorieRange
          ? {
              low: Math.round(matched.calorieRange.low),
              high: Math.round(matched.calorieRange.high),
            }
          : undefined;
      }

      resultMap.set(requested.name, {
        calories: scaledCals,
        proteinG: scaledProt,
        carbsG: scaledCarbs,
        fatG: scaledFat,
        fiberG: scaledFib,
        source: "ai_estimate",
        calorieRange: scaledRange,
        grams: null, // Unknown non-canonical serving/unit -> grams must be null!
        basis: matched.basis ?? "per_serving",
      });
    }
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

