/**
 * tests/diet/nutrition-estimation.test.ts
 *
 * Comprehensive Vitest suite for Phase 2B Real AI Nutrition Estimation.
 *
 * Verifies:
 * 1. Canonical food does NOT call AI.
 * 2. confidence < 0.60 (e.g. 0.59) -> unresolved (router skips AI).
 * 3. confidence = 0.60 -> estimation attempted.
 * 4. confidence = 0.65 -> estimated + manual review (avgConfidence < 0.70).
 * 5. confidence = 0.69 -> estimated + manual review (avgConfidence < 0.70).
 * 6. confidence = 0.70 -> estimated without manual review (avgConfidence >= 0.70).
 * 7. confidence = 0.80 -> estimated without manual review.
 * 8. Valid AI response -> estimated.
 * 9. Missing nutrition fields -> unresolved.
 * 10. Negative calories -> unresolved.
 * 11. Negative macros -> unresolved.
 * 12. calories = 0 -> unresolved.
 * 13. Invalid confidence (e.g. 2.0 or -0.5) -> unresolved.
 * 14. Invalid calorie range (high < low, low <= 0) -> unresolved.
 * 15. Malformed JSON -> unresolved.
 * 16. Provider timeout -> unresolved.
 * 17. Provider 429 -> unresolved.
 * 18. Provider 5xx -> unresolved.
 * 19. Missing API key -> unresolved.
 * 20. Circuit breaker open -> unresolved.
 * 21. Partial batch success (item A valid, item B invalid).
 * 22. Complete batch failure.
 * 23. Unmappable AI food result (name not matching requested).
 * 24. Duplicate AI result for the same food item.
 * 25. Canonical + estimated + unresolved mixed meal.
 * 26. Component food handling (isComponentOf) without double-counting.
 * 27. No fabricated zero-calorie fallback on failure (calories remain null).
 * 28. Correct source field (canonical, ai_estimate, unresolved).
 * 29. Correct verified flag (true for canonical, false for estimated/unresolved).
 * 30. Correct manual-review flag across confidence tiers.
 * 31. Batch request sends multiple items in exactly 1 provider call instead of N calls.
 *
 * Mocks the provider boundary so zero real DeepSeek API calls occur.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { routeFoodItems, MIN_ESTIMATION_CONFIDENCE } from "@/lib/ai/nutrition/router";
import {
  estimateNutritionBatch,
  mergeRoutedNutrition,
  validateNutritionSanity,
  normalizeMatchKey,
} from "@/lib/ai/nutrition/aiEstimator";
import { calculateMealNutrition, InputFoodItem } from "@/lib/ai/nutrition/calculator";
import { estimateNutritionWithDeepSeek } from "@/lib/ai/providers/deepseek";

describe("Phase 2B: Real AI Nutrition Estimation Pipeline", () => {
  // ── 1. Nutrition Router Unit Tests ──────────────────────────────────────────

  describe("Nutrition Router (router.ts)", () => {
    it("routes canonical database foods to canonical, bypassing AI estimation", () => {
      const foods: InputFoodItem[] = [
        { name: "Plain Roti", quantity: 2, unit: "piece", confidence: 0.95 },
        { name: "Dal Tadka", quantity: 1, unit: "bowl", confidence: 0.9 },
      ];
      const routed = routeFoodItems(foods);
      expect(routed.canonical).toHaveLength(2);
      expect(routed.aiEligible).toHaveLength(0);
      expect(routed.unresolved).toHaveLength(0);
      expect(routed.components).toHaveLength(0);
    });

    it("routes food with confidence 0.59 to unresolved (below threshold)", () => {
      const foods: InputFoodItem[] = [
        { name: "Unknown Street Chaat", quantity: 1, unit: "plate", confidence: 0.59 },
      ];
      const routed = routeFoodItems(foods);
      expect(routed.canonical).toHaveLength(0);
      expect(routed.aiEligible).toHaveLength(0);
      expect(routed.unresolved).toHaveLength(1);
      expect(routed.unresolved[0].name).toBe("Unknown Street Chaat");
    });

    it("routes food with confidence 0.60 to aiEligible (meets threshold)", () => {
      const foods: InputFoodItem[] = [
        { name: "Cucumber Raita", quantity: 1, unit: "katori", confidence: 0.60 },
      ];
      const routed = routeFoodItems(foods);
      expect(routed.canonical).toHaveLength(0);
      expect(routed.aiEligible).toHaveLength(1);
      expect(routed.unresolved).toHaveLength(0);
    });

    it("routes component dish with isComponentOf to components", () => {
      const foods: InputFoodItem[] = [
        { name: "Vegetable Biryani", quantity: 1, unit: "plate", confidence: 0.9 },
        { name: "Green Peas", quantity: 1, unit: "serving", isComponentOf: "Vegetable Biryani" },
      ];
      const routed = routeFoodItems(foods);
      expect(routed.canonical).toHaveLength(1);
      expect(routed.components).toHaveLength(1);
      expect(routed.components[0].name).toBe("Green Peas");
      expect(routed.aiEligible).toHaveLength(0);
    });

    it("correctly segregates mixed meal with canonical, AI-eligible, unresolved, and components", () => {
      const foods: InputFoodItem[] = [
        { name: "Plain Roti", quantity: 2, unit: "piece", confidence: 0.95 }, // canonical
        { name: "Cucumber Raita", quantity: 1, unit: "katori", confidence: 0.75 }, // aiEligible
        { name: "Mystery Blob", quantity: 1, unit: "serving", confidence: 0.45 }, // unresolved (< 0.60)
        { name: "Garnish Mint", quantity: 1, unit: "serving", isComponentOf: "Cucumber Raita" }, // component
      ];
      const routed = routeFoodItems(foods);
      expect(routed.canonical).toHaveLength(1);
      expect(routed.aiEligible).toHaveLength(1);
      expect(routed.unresolved).toHaveLength(1);
      expect(routed.components).toHaveLength(1);
    });
  });

  // ── 2. Nutrition Sanity Validator Tests ──────────────────────────────────────

  describe("Sanity & Energy Consistency Validator (validateNutritionSanity)", () => {
    it("accepts valid, physically realistic nutrition values", () => {
      const valid = {
        foodName: "Cucumber Raita",
        calories: 75,
        proteinG: 3,
        carbsG: 6,
        fatG: 4,
        fiberG: 1,
        calorieRange: { low: 60, high: 90 },
        confidence: 0.8,
      };
      expect(validateNutritionSanity(valid)).toBe(true);
    });

    it("rejects negative calories", () => {
      expect(
        validateNutritionSanity({
          foodName: "Bad Item",
          calories: -50,
          proteinG: 5,
          carbsG: 10,
          fatG: 2,
        })
      ).toBe(false);
    });

    it("rejects zero calories", () => {
      expect(
        validateNutritionSanity({
          foodName: "Bad Item",
          calories: 0,
          proteinG: 0,
          carbsG: 0,
          fatG: 0,
        })
      ).toBe(false);
    });

    it("rejects negative macros", () => {
      expect(
        validateNutritionSanity({
          foodName: "Bad Item",
          calories: 100,
          proteinG: -2,
          carbsG: 10,
          fatG: 2,
        })
      ).toBe(false);
    });

    it("rejects non-finite numbers (NaN, Infinity)", () => {
      expect(
        validateNutritionSanity({
          foodName: "Bad Item",
          calories: NaN,
          proteinG: 5,
          carbsG: 10,
          fatG: 2,
        })
      ).toBe(false);

      expect(
        validateNutritionSanity({
          foodName: "Bad Item",
          calories: 100,
          proteinG: Infinity,
          carbsG: 10,
          fatG: 2,
        })
      ).toBe(false);
    });

    it("rejects invalid confidence (< 0 or > 1)", () => {
      expect(
        validateNutritionSanity({
          foodName: "Bad Item",
          calories: 100,
          proteinG: 5,
          carbsG: 10,
          fatG: 2,
          confidence: 1.5,
        })
      ).toBe(false);

      expect(
        validateNutritionSanity({
          foodName: "Bad Item",
          calories: 100,
          proteinG: 5,
          carbsG: 10,
          fatG: 2,
          confidence: -0.1,
        })
      ).toBe(false);
    });

    it("rejects invalid calorie range (high < low or low <= 0)", () => {
      expect(
        validateNutritionSanity({
          foodName: "Bad Item",
          calories: 100,
          proteinG: 5,
          carbsG: 10,
          fatG: 2,
          calorieRange: { low: 120, high: 80 }, // high < low
        })
      ).toBe(false);

      expect(
        validateNutritionSanity({
          foodName: "Bad Item",
          calories: 100,
          proteinG: 5,
          carbsG: 10,
          fatG: 2,
          calorieRange: { low: -10, high: 100 }, // low <= 0
        })
      ).toBe(false);
    });

    it("rejects absurd energy discrepancies (e.g. 100g protein with 20 kcal)", () => {
      // 100g protein alone is 400 kcal; 20 kcal is absurd
      expect(
        validateNutritionSanity({
          foodName: "Impossible Dish",
          calories: 20,
          proteinG: 100,
          carbsG: 0,
          fatG: 0,
        })
      ).toBe(false);
    });

    it("rejects absurd energy discrepancies (0 macros with 500 kcal)", () => {
      expect(
        validateNutritionSanity({
          foodName: "Ghost Dish",
          calories: 500,
          proteinG: 0,
          carbsG: 0,
          fatG: 0,
        })
      ).toBe(false);
    });
  });

  // ── 3. Exact Normalized Name Matching ───────────────────────────────────────

  describe("Normalized Exact Name Matching (normalizeMatchKey)", () => {
    it("distinguishes distinct dishes and prevents substring matching", () => {
      const k1 = normalizeMatchKey("cucumber");
      const k2 = normalizeMatchKey("cucumber raita");
      expect(k1).not.toBe(k2);

      const red = normalizeMatchKey("red chutney");
      const green = normalizeMatchKey("green chutney");
      expect(red).not.toBe(green);

      const rasam = normalizeMatchKey("rasam");
      const sambar = normalizeMatchKey("sambar");
      expect(rasam).not.toBe(sambar);
    });

    it("handles casing, whitespace, and numbering variations for identical dishes", () => {
      const key1 = normalizeMatchKey("1. Cucumber Raita");
      const key2 = normalizeMatchKey("cucumber raita");
      const key3 = normalizeMatchKey("  CUCUMBER   RAITA  ");
      expect(key1).toBe(key2);
      expect(key2).toBe(key3);
    });
  });

  // ── 4. Batch AI Estimation Tests ────────────────────────────────────────────

  describe("Batch AI Nutrition Estimator (estimateNutritionBatch)", () => {
    it("makes zero provider calls when food list is empty", async () => {
      const mockProvider = vi.fn();
      const result = await estimateNutritionBatch([], { providerFn: mockProvider });
      expect(result.size).toBe(0);
      expect(mockProvider).not.toHaveBeenCalled();
    });

    it("sends a single batch request for multiple foods instead of N calls", async () => {
      const mockProvider = vi.fn().mockResolvedValue({
        rawContent: JSON.stringify({
          items: [
            {
              foodName: "Cucumber Raita",
              calories: 75,
              proteinG: 3,
              carbsG: 6,
              fatG: 4,
            },
            {
              foodName: "Rasam",
              calories: 60,
              proteinG: 2,
              carbsG: 10,
              fatG: 1,
            },
            {
              foodName: "Onion Pakora",
              calories: 180,
              proteinG: 4,
              carbsG: 20,
              fatG: 9,
            },
          ],
        }),
        usage: { promptTokens: 300, completionTokens: 80, totalTokens: 380, latencyMs: 400, estimatedCostUsd: 0.0001 },
      });

      const items: InputFoodItem[] = [
        { name: "Cucumber Raita", quantity: 1, unit: "katori", confidence: 0.75 },
        { name: "Rasam", quantity: 1, unit: "bowl", confidence: 0.8 },
        { name: "Onion Pakora", quantity: 2, unit: "piece", confidence: 0.7 },
      ];

      const result = await estimateNutritionBatch(items, { providerFn: mockProvider });

      // Exactly ONE provider call for all 3 items
      expect(mockProvider).toHaveBeenCalledTimes(1);
      expect(result.size).toBe(3);
      expect(result.get("Cucumber Raita")?.calories).toBe(75);
      expect(result.get("Rasam")?.calories).toBe(60);
      expect(result.get("Onion Pakora")?.calories).toBe(180);
      expect(result.get("Cucumber Raita")?.source).toBe("ai_estimate");
    });

    it("supports partial batch success when one item has invalid nutrition", async () => {
      const mockProvider = vi.fn().mockResolvedValue({
        rawContent: JSON.stringify({
          items: [
            {
              foodName: "Cucumber Raita",
              calories: 75,
              proteinG: 3,
              carbsG: 6,
              fatG: 4,
            },
            {
              foodName: "Bad Dish",
              calories: -100, // Invalid: negative calories!
              proteinG: 10,
              carbsG: 10,
              fatG: 5,
            },
          ],
        }),
        usage: { promptTokens: 250, completionTokens: 60, totalTokens: 310, latencyMs: 300, estimatedCostUsd: 0.0001 },
      });

      const items: InputFoodItem[] = [
        { name: "Cucumber Raita", quantity: 1, unit: "katori", confidence: 0.75 },
        { name: "Bad Dish", quantity: 1, unit: "serving", confidence: 0.7 },
      ];

      const result = await estimateNutritionBatch(items, { providerFn: mockProvider });

      // Valid item succeeded
      expect(result.has("Cucumber Raita")).toBe(true);
      expect(result.get("Cucumber Raita")?.calories).toBe(75);

      // Invalid item was rejected and not included
      expect(result.has("Bad Dish")).toBe(false);
    });

    it("safely degrades when provider response contains unmappable food name", async () => {
      const mockProvider = vi.fn().mockResolvedValue({
        rawContent: JSON.stringify({
          items: [
            {
              foodName: "Completely Hallucinated Dish",
              calories: 200,
              proteinG: 5,
              carbsG: 20,
              fatG: 5,
            },
          ],
        }),
        usage: { promptTokens: 200, completionTokens: 50, totalTokens: 250, latencyMs: 250, estimatedCostUsd: 0.0001 },
      });

      const items: InputFoodItem[] = [
        { name: "Cucumber Raita", quantity: 1, unit: "katori", confidence: 0.75 },
      ];

      const result = await estimateNutritionBatch(items, { providerFn: mockProvider });
      expect(result.size).toBe(0);
    });

    it("safely rejects duplicate response items for the same food", async () => {
      const mockProvider = vi.fn().mockResolvedValue({
        rawContent: JSON.stringify({
          items: [
            { foodName: "Cucumber Raita", calories: 75, proteinG: 3, carbsG: 6, fatG: 4 },
            { foodName: "Cucumber Raita", calories: 150, proteinG: 6, carbsG: 12, fatG: 8 },
          ],
        }),
        usage: { promptTokens: 200, completionTokens: 50, totalTokens: 250, latencyMs: 250, estimatedCostUsd: 0.0001 },
      });

      const items: InputFoodItem[] = [
        { name: "Cucumber Raita", quantity: 1, unit: "katori", confidence: 0.75 },
      ];

      const result = await estimateNutritionBatch(items, { providerFn: mockProvider });
      // Duplicates are rejected for ambiguity
      expect(result.has("Cucumber Raita")).toBe(false);
    });

    it("safely degrades to empty map on malformed JSON response", async () => {
      const mockProvider = vi.fn().mockResolvedValue({
        rawContent: "Not JSON at all! Internal server snippet",
        usage: { promptTokens: 100, completionTokens: 10, totalTokens: 110, latencyMs: 100, estimatedCostUsd: 0.0001 },
      });

      const items: InputFoodItem[] = [
        { name: "Cucumber Raita", quantity: 1, unit: "katori", confidence: 0.75 },
      ];

      const result = await estimateNutritionBatch(items, { providerFn: mockProvider });
      expect(result.size).toBe(0);
    });

    it("safely degrades to empty map when required fields are missing", async () => {
      const mockProvider = vi.fn().mockResolvedValue({
        rawContent: JSON.stringify({
          items: [
            {
              foodName: "Cucumber Raita",
              calories: 75,
              // Missing proteinG, carbsG, fatG!
            },
          ],
        }),
        usage: { promptTokens: 150, completionTokens: 30, totalTokens: 180, latencyMs: 150, estimatedCostUsd: 0.0001 },
      });

      const items: InputFoodItem[] = [
        { name: "Cucumber Raita", quantity: 1, unit: "katori", confidence: 0.75 },
      ];

      const result = await estimateNutritionBatch(items, { providerFn: mockProvider });
      expect(result.size).toBe(0);
    });

    // ── Failure modes: Provider level ─────────────────────────────────────────

    it("handles provider timeout gracefully", async () => {
      const mockProvider = vi.fn().mockRejectedValue(new Error("Request timed out after 10000ms"));
      const items: InputFoodItem[] = [{ name: "Cucumber Raita", quantity: 1, unit: "katori", confidence: 0.75 }];
      const result = await estimateNutritionBatch(items, { providerFn: mockProvider });
      expect(result.size).toBe(0);
    });

    it("handles provider 401 Unauthorized gracefully", async () => {
      const mockProvider = vi.fn().mockRejectedValue(new Error("401 Unauthorized: Invalid API Key"));
      const items: InputFoodItem[] = [{ name: "Cucumber Raita", quantity: 1, unit: "katori", confidence: 0.75 }];
      const result = await estimateNutritionBatch(items, { providerFn: mockProvider });
      expect(result.size).toBe(0);
    });

    it("handles provider 429 Rate Limit gracefully", async () => {
      const mockProvider = vi.fn().mockRejectedValue(new Error("429 Too Many Requests"));
      const items: InputFoodItem[] = [{ name: "Cucumber Raita", quantity: 1, unit: "katori", confidence: 0.75 }];
      const result = await estimateNutritionBatch(items, { providerFn: mockProvider });
      expect(result.size).toBe(0);
    });

    it("handles provider 5xx Server Error gracefully", async () => {
      const mockProvider = vi.fn().mockRejectedValue(new Error("503 Service Unavailable"));
      const items: InputFoodItem[] = [{ name: "Cucumber Raita", quantity: 1, unit: "katori", confidence: 0.75 }];
      const result = await estimateNutritionBatch(items, { providerFn: mockProvider });
      expect(result.size).toBe(0);
    });

    it("handles circuit breaker open error gracefully", async () => {
      const mockProvider = vi.fn().mockRejectedValue(new Error("DeepSeek circuit breaker is OPEN"));
      const items: InputFoodItem[] = [{ name: "Cucumber Raita", quantity: 1, unit: "katori", confidence: 0.75 }];
      const result = await estimateNutritionBatch(items, { providerFn: mockProvider });
      expect(result.size).toBe(0);
    });

    it("handles missing DEEPSEEK_API_KEY gracefully", async () => {
      const mockProvider = vi.fn().mockRejectedValue(new Error("DEEPSEEK_API_KEY is not configured on the server."));
      const items: InputFoodItem[] = [{ name: "Cucumber Raita", quantity: 1, unit: "katori", confidence: 0.75 }];
      const result = await estimateNutritionBatch(items, { providerFn: mockProvider });
      expect(result.size).toBe(0);
    });
  });

  // ── 5. End-to-End Pipeline & Confidence Tiers ───────────────────────────────

  describe("End-to-End Pipeline: Routing -> Estimation -> Calculator", () => {
    // Helper to simulate the full Stage 2 pipeline
    async function runPipeline(
      foods: InputFoodItem[],
      mockProviderResponse?: any
    ) {
      const routed = routeFoodItems(foods);
      const mockProvider = mockProviderResponse
        ? vi.fn().mockResolvedValue(mockProviderResponse)
        : vi.fn();
      const estimatedMap =
        routed.aiEligible.length > 0
          ? await estimateNutritionBatch(routed.aiEligible, { providerFn: mockProvider })
          : new Map();
      const finalFoods = mergeRoutedNutrition(routed, estimatedMap);
      const result = calculateMealNutrition(finalFoods);
      return { result, mockProvider, routed };
    }

    it("CANONICAL FOOD: does NOT call AI, verified = true, requiresManualReview = false", async () => {
      const foods: InputFoodItem[] = [
        { name: "Plain Roti", quantity: 2, unit: "piece", confidence: 0.95 },
      ];
      const { result, mockProvider } = await runPipeline(foods);

      expect(mockProvider).not.toHaveBeenCalled();
      expect(result.verifiedCount).toBe(1);
      expect(result.estimatedCount).toBe(0);
      expect(result.unresolvedCount).toBe(0);
      expect(result.allFoodsVerified).toBe(true);
      expect(result.requiresManualReview).toBe(false);
      expect(result.items[0].nutritionStatus).toBe("verified");
      expect(result.items[0].source).toBe("canonical");
      expect(result.items[0].verified).toBe(true);
      expect(result.calories).toBe(160);
    });

    it("CONFIDENCE < 0.60 (0.59): router marks unresolved, 0 AI calls, manual review = true", async () => {
      const foods: InputFoodItem[] = [
        { name: "Mystery Dish", quantity: 1, unit: "serving", confidence: 0.59 },
      ];
      const { result, mockProvider } = await runPipeline(foods);

      expect(mockProvider).not.toHaveBeenCalled();
      expect(result.estimatedCount).toBe(0);
      expect(result.unresolvedCount).toBe(1);
      expect(result.requiresManualReview).toBe(true);
      expect(result.items[0].nutritionStatus).toBe("unresolved");
      expect(result.items[0].source).toBe("unresolved");
      expect(result.items[0].calories).toBeNull(); // Never fake 0!
    });

    it("CONFIDENCE = 0.60: attempts estimation, succeeds, triggers manual review (0.60 < 0.70)", async () => {
      const foods: InputFoodItem[] = [
        { name: "Cucumber Raita", quantity: 1, unit: "katori", confidence: 0.60 },
      ];
      const providerRes = {
        rawContent: JSON.stringify({
          items: [
            { foodName: "Cucumber Raita", calories: 75, proteinG: 3, carbsG: 6, fatG: 4 },
          ],
        }),
        usage: { promptTokens: 100, completionTokens: 30, totalTokens: 130, latencyMs: 150, estimatedCostUsd: 0.0001 },
      };
      const { result, mockProvider } = await runPipeline(foods, providerRes);

      expect(mockProvider).toHaveBeenCalledTimes(1);
      expect(result.estimatedCount).toBe(1);
      expect(result.unresolvedCount).toBe(0);
      expect(result.items[0].nutritionStatus).toBe("estimated");
      expect(result.items[0].source).toBe("ai_estimate");
      expect(result.items[0].verified).toBe(false);
      expect(result.items[0].calories).toBe(75);
      // avgConfidence is 0.60 < 0.70 -> requires manual review
      expect(result.requiresManualReview).toBe(true);
    });

    it("CONFIDENCE = 0.65: estimated successfully, triggers manual review (0.65 < 0.70)", async () => {
      const foods: InputFoodItem[] = [
        { name: "Cucumber Raita", quantity: 1, unit: "katori", confidence: 0.65 },
      ];
      const providerRes = {
        rawContent: JSON.stringify({
          items: [
            { foodName: "Cucumber Raita", calories: 75, proteinG: 3, carbsG: 6, fatG: 4 },
          ],
        }),
        usage: { promptTokens: 100, completionTokens: 30, totalTokens: 130, latencyMs: 150, estimatedCostUsd: 0.0001 },
      };
      const { result } = await runPipeline(foods, providerRes);

      expect(result.estimatedCount).toBe(1);
      expect(result.items[0].nutritionStatus).toBe("estimated");
      expect(result.items[0].verified).toBe(false);
      expect(result.requiresManualReview).toBe(true);
    });

    it("CONFIDENCE = 0.69: estimated successfully, triggers manual review (0.69 < 0.70)", async () => {
      const foods: InputFoodItem[] = [
        { name: "Cucumber Raita", quantity: 1, unit: "katori", confidence: 0.69 },
      ];
      const providerRes = {
        rawContent: JSON.stringify({
          items: [
            { foodName: "Cucumber Raita", calories: 75, proteinG: 3, carbsG: 6, fatG: 4 },
          ],
        }),
        usage: { promptTokens: 100, completionTokens: 30, totalTokens: 130, latencyMs: 150, estimatedCostUsd: 0.0001 },
      };
      const { result } = await runPipeline(foods, providerRes);

      expect(result.estimatedCount).toBe(1);
      expect(result.requiresManualReview).toBe(true);
    });

    it("CONFIDENCE = 0.70: estimated successfully, bypasses manual review (0.70 >= 0.70)", async () => {
      const foods: InputFoodItem[] = [
        { name: "Cucumber Raita", quantity: 1, unit: "katori", confidence: 0.70 },
      ];
      const providerRes = {
        rawContent: JSON.stringify({
          items: [
            { foodName: "Cucumber Raita", calories: 75, proteinG: 3, carbsG: 6, fatG: 4 },
          ],
        }),
        usage: { promptTokens: 100, completionTokens: 30, totalTokens: 130, latencyMs: 150, estimatedCostUsd: 0.0001 },
      };
      const { result } = await runPipeline(foods, providerRes);

      expect(result.estimatedCount).toBe(1);
      expect(result.unresolvedCount).toBe(0);
      expect(result.items[0].nutritionStatus).toBe("estimated");
      expect(result.items[0].verified).toBe(false);
      // avgConfidence is 0.70 >= 0.70 -> no manual review required!
      expect(result.requiresManualReview).toBe(false);
    });

    it("CONFIDENCE = 0.80: estimated successfully, bypasses manual review", async () => {
      const foods: InputFoodItem[] = [
        { name: "Cucumber Raita", quantity: 1, unit: "katori", confidence: 0.80 },
      ];
      const providerRes = {
        rawContent: JSON.stringify({
          items: [
            { foodName: "Cucumber Raita", calories: 75, proteinG: 3, carbsG: 6, fatG: 4 },
          ],
        }),
        usage: { promptTokens: 100, completionTokens: 30, totalTokens: 130, latencyMs: 150, estimatedCostUsd: 0.0001 },
      };
      const { result } = await runPipeline(foods, providerRes);

      expect(result.estimatedCount).toBe(1);
      expect(result.unresolvedCount).toBe(0);
      expect(result.requiresManualReview).toBe(false);
    });

    it("PROVIDER COMPLETE FAILURE: all AI-eligible foods degrade to unresolved with null calories", async () => {
      const foods: InputFoodItem[] = [
        { name: "Cucumber Raita", quantity: 1, unit: "katori", confidence: 0.8 },
      ];
      // Provider fails with timeout or 500
      const mockProvider = vi.fn().mockRejectedValue(new Error("500 Internal Server Error"));
      const routed = routeFoodItems(foods);
      const estimatedMap = await estimateNutritionBatch(routed.aiEligible, { providerFn: mockProvider });
      const finalFoods = mergeRoutedNutrition(routed, estimatedMap);
      const result = calculateMealNutrition(finalFoods);

      expect(result.estimatedCount).toBe(0);
      expect(result.unresolvedCount).toBe(1);
      expect(result.items[0].nutritionStatus).toBe("unresolved");
      expect(result.items[0].source).toBe("unresolved");
      expect(result.items[0].calories).toBeNull(); // Safety: never fake 0!
      expect(result.requiresManualReview).toBe(true);
    });

    it("MIXED MEAL: Canonical (Roti) + Estimated (Raita) + Unresolved (Stew)", async () => {
      const foods: InputFoodItem[] = [
        { name: "Plain Roti", quantity: 2, unit: "piece", confidence: 0.95 }, // Canonical: 160 kcal
        { name: "Cucumber Raita", quantity: 1, unit: "katori", confidence: 0.65 }, // AI-eligible: 75 kcal
        { name: "Alien Space Stew", quantity: 1, unit: "serving", confidence: 0.35 }, // Unresolved: null
      ];
      const providerRes = {
        rawContent: JSON.stringify({
          items: [
            { foodName: "Cucumber Raita", calories: 75, proteinG: 3, carbsG: 6, fatG: 4 },
          ],
        }),
        usage: { promptTokens: 120, completionTokens: 40, totalTokens: 160, latencyMs: 180, estimatedCostUsd: 0.0001 },
      };
      const { result, mockProvider } = await runPipeline(foods, providerRes);

      // Provider was only called with Cucumber Raita (1 item)
      expect(mockProvider).toHaveBeenCalledTimes(1);
      expect(result.calories).toBe(235); // 160 + 75 (only sums known!)
      expect(result.verifiedCount).toBe(1);
      expect(result.estimatedCount).toBe(1);
      expect(result.unresolvedCount).toBe(1);
      expect(result.hasUnresolvedItems).toBe(true);
      expect(result.hasIncompleteNutrition).toBe(true);
      expect(result.requiresManualReview).toBe(true);

      const roti = result.items.find((i) => i.name === "Plain Roti");
      expect(roti?.nutritionStatus).toBe("verified");
      expect(roti?.source).toBe("canonical");
      expect(roti?.verified).toBe(true);

      const raita = result.items.find((i) => i.name === "Cucumber Raita");
      expect(raita?.nutritionStatus).toBe("estimated");
      expect(raita?.source).toBe("ai_estimate");
      expect(raita?.verified).toBe(false);

      const stew = result.items.find((i) => i.name === "Alien Space Stew");
      expect(stew?.nutritionStatus).toBe("unresolved");
      expect(stew?.source).toBe("unresolved");
      expect(stew?.calories).toBeNull();
    });

    it("COMPONENT DISH: does not double-count or trigger AI for internal component", async () => {
      const foods: InputFoodItem[] = [
        { name: "Vegetable Biryani", quantity: 1, unit: "plate", confidence: 0.9 },
        { name: "Carrot Pieces", quantity: 1, unit: "serving", isComponentOf: "Vegetable Biryani" },
      ];
      const { result, mockProvider } = await runPipeline(foods);

      expect(mockProvider).not.toHaveBeenCalled();
      const carrot = result.items.find((i) => i.name === "Carrot Pieces");
      expect(carrot?.calories).toBe(0);
      expect(carrot?.verified).toBe(true);
      expect(carrot?.matchedCanonicalName).toBe("Carrot Pieces (in Vegetable Biryani)");
    });
  });
});

