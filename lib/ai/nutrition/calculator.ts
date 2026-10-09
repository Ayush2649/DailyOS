/**
 * lib/ai/nutrition/calculator.ts
 * 
 * Deterministic Nutrition Engine.
 * Calculates nutrition macros using standard Indian food composition references
 * and serving-size assumptions (zero LLM dependency for final numbers).
 * 
 * Guarantees:
 * - Deterministic, reproducible macro calculations (< 1ms execution)
 * - Zero LLM dependency for final macros
 * - Zero hallucination of fake values for unknown foods
 * - Handles Indian culinary units (piece, katori/bowl, plate, gram)
 * - Realistic calorie ranges reflecting preparation variance
 */

import { INDIAN_FOOD_DATABASE, FoodCompositionItem } from "./database";

export interface InputFoodItem {
  name: string;
  quantity?: number;
  unit?: string;
  confidence?: number;
}

export interface CalculatedFoodItem {
  name: string;
  matchedFoodId: string | null;
  matchedCanonicalName: string | null;
  quantity: number;
  unit: string;
  grams: number;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  confidence: number;
  verified: boolean;
}

export interface MealNutritionResult {
  name: string;
  calories: number;
  calorieRange: { low: number; high: number };
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  confidence: "high" | "medium" | "low";
  rawConfidence: number;
  items: CalculatedFoodItem[];
  unknownFoods: string[];
  allFoodsVerified: boolean;
  requiresManualReview: boolean;
}

// ── Alias and Food Matching ───────────────────────────────────────────────────

function cleanName(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[0-9~]/g, "") // remove numbers and ~
    .replace(/\b(approx|approximate|about|bowl of|plate of|piece of|pieces of|serving of)\b/gi, "")
    .replace(/[^\w\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function resolveFoodItem(rawName: string): FoodCompositionItem | null {
  if (!rawName || typeof rawName !== "string") return null;
  const cleaned = cleanName(rawName);
  if (!cleaned) return null;

  // 1. Exact match on canonical name or aliases
  for (const item of INDIAN_FOOD_DATABASE) {
    if (item.name.toLowerCase() === cleaned) return item;
    if (item.aliases.some((alias) => alias.toLowerCase() === cleaned)) return item;
  }

  // 2. Substring / token inclusion match (e.g. "aloo parathas" -> "aloo paratha", "rotis" -> "roti")
  const singular = cleaned.replace(/s\b/g, "").trim();
  for (const item of INDIAN_FOOD_DATABASE) {
    if (item.name.toLowerCase() === singular) return item;
    if (item.aliases.some((alias) => alias.toLowerCase() === singular)) return item;
  }

  // 3. Fallback to category base match if specific variant isn't listed
  for (const item of INDIAN_FOOD_DATABASE) {
    if (item.aliases.some((alias) => cleaned.includes(alias.toLowerCase()))) {
      return item;
    }
  }

  return null;
}

// ── Unit Normalization ────────────────────────────────────────────────────────

export function normalizeQuantityToGrams(
  item: FoodCompositionItem | null,
  quantity = 1,
  unit = "serving"
): number {
  const q = Math.max(0.1, quantity);
  const u = (unit || "").toLowerCase().trim();

  // If user or model specified grams
  if (u === "g" || u === "gram" || u === "grams") {
    return Math.round(q);
  }

  // If user or model specified ml
  if (u === "ml" || u === "milliliter") {
    return Math.round(q * 1.0); // 1g/ml approx for liquid/gravy
  }

  // If matched to a known database item, use its default unit weight
  if (item) {
    if (u === "piece" || u === "pc" || u === "pieces" || u === "item" || u === "serving") {
      return Math.round(q * item.gramsPerDefaultUnit);
    }

    if (u === "bowl" || u === "katori" || u === "cup") {
      // For flatbreads, "bowl" doesn't make sense, use default unit
      if (item.category === "flatbread") {
        return Math.round(q * item.gramsPerDefaultUnit);
      }
      return Math.round(q * 150); // standard Indian katori ~150g
    }

    if (u === "plate" || u === "portion") {
      return Math.round(q * (item.gramsPerDefaultUnit >= 150 ? item.gramsPerDefaultUnit : 200));
    }

    if (u === "tbsp" || u === "tablespoon") {
      return Math.round(q * 15);
    }

    // Default unit weight
    return Math.round(q * item.gramsPerDefaultUnit);
  }

  // Fallback for unknown items: assume ~100g per unit
  return Math.round(q * 100);
}

// ── Deterministic Meal Nutrition Calculation ──────────────────────────────────

export function calculateMealNutrition(
  foods: InputFoodItem[],
  customMealName?: string
): MealNutritionResult {
  const calculatedItems: CalculatedFoodItem[] = [];
  const unknownFoods: string[] = [];

  let totalCalories = 0;
  let totalProteinG = 0;
  let totalCarbsG = 0;
  let totalFatG = 0;
  let totalFiberG = 0;
  let totalConfidenceSum = 0;

  for (const f of foods) {
    const rawName = (f.name || "").trim();
    if (!rawName) continue;

    const matched = resolveFoodItem(rawName);
    const itemConf = typeof f.confidence === "number" ? Math.max(0, Math.min(1, f.confidence)) : 0.7;
    const qty = typeof f.quantity === "number" && f.quantity > 0 ? f.quantity : 1;
    const unit = f.unit || (matched ? matched.defaultUnit : "serving");

    if (matched) {
      const grams = normalizeQuantityToGrams(matched, qty, unit);
      const cals = Math.round((matched.per100g.calories * grams) / 100);
      const prot = Math.round((matched.per100g.proteinG * grams) / 100);
      const carb = Math.round((matched.per100g.carbsG * grams) / 100);
      const fat = Math.round((matched.per100g.fatG * grams) / 100);
      const fib = Math.round((matched.per100g.fiberG * grams) / 100);

      calculatedItems.push({
        name: rawName,
        matchedFoodId: matched.id,
        matchedCanonicalName: matched.name,
        quantity: qty,
        unit,
        grams,
        calories: cals,
        proteinG: prot,
        carbsG: carb,
        fatG: fat,
        fiberG: fib,
        confidence: itemConf,
        verified: true,
      });

      totalCalories += cals;
      totalProteinG += prot;
      totalCarbsG += carb;
      totalFatG += fat;
      totalFiberG += fib;
      totalConfidenceSum += itemConf;
    } else {
      // Unknown food: DO NOT invent fake numbers.
      unknownFoods.push(rawName);
      calculatedItems.push({
        name: rawName,
        matchedFoodId: null,
        matchedCanonicalName: null,
        quantity: qty,
        unit,
        grams: normalizeQuantityToGrams(null, qty, unit),
        calories: 0,
        proteinG: 0,
        carbsG: 0,
        fatG: 0,
        fiberG: 0,
        confidence: Math.min(itemConf, 0.4), // lower confidence for unrecognized food
        verified: false,
      });
      totalConfidenceSum += Math.min(itemConf, 0.4);
    }
  }

  // Derive meal title
  let mealName = customMealName || "";
  if (!mealName && calculatedItems.length > 0) {
    const verifiedItems = calculatedItems.filter((i) => i.verified);
    if (verifiedItems.length > 0) {
      mealName = verifiedItems.map((i) => i.matchedCanonicalName).join(" with ");
    } else {
      mealName = calculatedItems.map((i) => i.name).join(", ");
    }
  }
  if (!mealName) mealName = "Custom Meal";

  // Calorie range (+/- 15% to account for oil/salt/cooking variation)
  const spread = Math.max(Math.round(totalCalories * 0.15), 30);
  const calorieRange = {
    low: Math.max(0, totalCalories - spread),
    high: totalCalories + spread,
  };

  const avgConfidence =
    calculatedItems.length > 0 ? totalConfidenceSum / calculatedItems.length : 0.5;
  const catConfidence: "high" | "medium" | "low" =
    avgConfidence >= 0.75 && unknownFoods.length === 0
      ? "high"
      : avgConfidence >= 0.5
      ? "medium"
      : "low";

  return {
    name: mealName,
    calories: totalCalories,
    calorieRange,
    proteinG: totalProteinG,
    carbsG: totalCarbsG,
    fatG: totalFatG,
    fiberG: totalFiberG,
    confidence: catConfidence,
    rawConfidence: Math.round(avgConfidence * 100) / 100,
    items: calculatedItems,
    unknownFoods,
    allFoodsVerified: unknownFoods.length === 0,
    requiresManualReview: unknownFoods.length > 0 || totalCalories === 0,
  };
}

