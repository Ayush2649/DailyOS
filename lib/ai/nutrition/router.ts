/**
 * lib/ai/nutrition/router.ts
 *
 * Pure synchronous router/classifier for meal food items.
 *
 * Categorizes foods into:
 * 1. canonical: Items resolved in the deterministic Indian food database (resolveFoodItem) -> VERIFIED
 * 2. components: Items with `isComponentOf` referencing another identified dish -> Prevents double-counting
 * 3. aiEligible: Non-canonical items with vision confidence >= 0.60 -> AI nutrition estimation candidates
 * 4. unresolved: Non-canonical items with vision confidence < 0.60 or invalid names -> UNRESOLVED
 *
 * Guarantees:
 * - Pure, synchronous, deterministic (zero async, zero I/O, zero network calls)
 * - Safe portion/quantity preservation
 */

import { InputFoodItem, resolveFoodItem } from "./calculator";

export const MIN_ESTIMATION_CONFIDENCE = 0.60;

export interface RoutedFoodItems {
  canonical: InputFoodItem[];
  components: InputFoodItem[];
  aiEligible: InputFoodItem[];
  unresolved: InputFoodItem[];
}

export function routeFoodItems(foods: InputFoodItem[]): RoutedFoodItems {
  const canonical: InputFoodItem[] = [];
  const components: InputFoodItem[] = [];
  const aiEligible: InputFoodItem[] = [];
  const unresolved: InputFoodItem[] = [];

  for (const food of foods) {
    const rawName = (food.name || "").trim();
    if (!rawName) {
      continue;
    }

    // 1. Component dishes (preserves isComponentOf semantics, prevented from independent estimation)
    if (
      food.isComponentOf &&
      foods.some((parent) => parent !== food && parent.name.toLowerCase() === food.isComponentOf?.toLowerCase())
    ) {
      components.push(food);
      continue;
    }

    // 2. Canonical match against the deterministic database
    const matched = resolveFoodItem(rawName);
    if (matched) {
      canonical.push(food);
      continue;
    }

    // 3. Confidence thresholding for non-canonical items
    const confidence = typeof food.confidence === "number" ? food.confidence : 0;
    if (confidence >= MIN_ESTIMATION_CONFIDENCE) {
      aiEligible.push(food);
    } else {
      unresolved.push(food);
    }
  }

  return {
    canonical,
    components,
    aiEligible,
    unresolved,
  };
}

