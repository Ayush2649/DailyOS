// tests/diet/nutrition-manual-review.test.ts
import { describe, it, expect } from "vitest";
import { calculateMealNutrition } from "@/lib/ai/nutrition/calculator";

describe("Manual Review Flag Behavior", () => {
  it("sets requiresManualReview for low-confidence estimated food", () => {
    const result = calculateMealNutrition([
      {
        name: "Mystery Food",
        quantity: 100,
        unit: "g",
        confidence: 0.65,
        estimatedNutrition: {
          calories: 350,
          proteinG: 4,
          carbsG: 45,
          fatG: 15,
          fiberG: 2,
          source: "ai_estimate",
        },
      },
    ]);
    // Low confidence (0.65 < 0.70) triggers manual review
    expect(result.estimatedCount).toBe(1);
    expect(result.unresolvedCount).toBe(0);
    const item = result.items[0];
    expect(item.nutritionStatus).toBe("estimated");
    expect(item.verified).toBe(false);
    expect(result.requiresManualReview).toBe(true);
  });

  it("does NOT set requiresManualReview for high-confidence estimated food", () => {
    const result = calculateMealNutrition([
      {
        name: "Mystery Food",
        quantity: 100,
        unit: "g",
        confidence: 0.8,
        estimatedNutrition: {
          calories: 350,
          proteinG: 4,
          carbsG: 45,
          fatG: 15,
          fiberG: 2,
          source: "ai_estimate",
        },
      },
    ]);
    expect(result.estimatedCount).toBe(1);
    expect(result.unresolvedCount).toBe(0);
    const item = result.items[0];
    expect(item.nutritionStatus).toBe("estimated");
    expect(item.verified).toBe(false);
    expect(result.requiresManualReview).toBe(false);
  });

  it("marks food with confidence 0.50 as unresolved", () => {
    const result = calculateMealNutrition([
      { name: "Alien Space Stew", quantity: 1, unit: "serving", confidence: 0.5 },
    ]);
    expect(result.estimatedCount).toBe(0);
    expect(result.unresolvedCount).toBe(1);
    const item = result.items[0];
    expect(item.nutritionStatus).toBe("unresolved");
    expect(item.verified).toBe(false);
    expect(item.calories).toBeNull();
    expect(result.requiresManualReview).toBe(true);
  });

  it("requires manual review when estimated and unresolved foods are mixed", () => {
    const result = calculateMealNutrition([
      {
        name: "Mystery Food",
        quantity: 100,
        unit: "g",
        confidence: 0.65,
        estimatedNutrition: {
          calories: 350,
          proteinG: 4,
          carbsG: 45,
          fatG: 15,
          fiberG: 2,
          source: "ai_estimate",
        },
      },
      { name: "Alien Space Stew", quantity: 1, unit: "serving", confidence: 0.5 },
    ]);
    expect(result.estimatedCount).toBe(1);
    expect(result.unresolvedCount).toBe(1);
    expect(result.requiresManualReview).toBe(true);
    const est = result.items.find((i) => i.name === "Mystery Food");
    const unresolved = result.items.find((i) => i.name === "Alien Space Stew");
    expect(est?.nutritionStatus).toBe("estimated");
    expect(unresolved?.nutritionStatus).toBe("unresolved");
  });

  // ── Phase 2B.1 Correctness Invariants (Existential Review Logic) ─────────────

  it("Test A: triggers manual review when ANY estimated item has confidence < 0.70 (0.92, 0.70, 0.62 -> true)", () => {
    // McDonald's scenario: French fries (0.92), Burger (0.70), Coffee (0.62)
    // Average confidence is (0.92 + 0.70 + 0.62) / 3 = 0.7467 (>= 0.70)
    // But Coffee (0.62 < 0.70) MUST existentially trigger manual review!
    const result = calculateMealNutrition([
      {
        name: "French Fries",
        quantity: 115,
        unit: "g",
        confidence: 0.92,
        estimatedNutrition: { calories: 365, proteinG: 4, carbsG: 48, fatG: 17, source: "ai_estimate" },
      },
      {
        name: "Burger",
        quantity: 160,
        unit: "g",
        confidence: 0.70,
        estimatedNutrition: { calories: 410, proteinG: 20, carbsG: 38, fatG: 20, source: "ai_estimate" },
      },
      {
        name: "Coffee",
        quantity: 190,
        unit: "ml",
        confidence: 0.62,
        estimatedNutrition: { calories: 25, proteinG: 1, carbsG: 3, fatG: 1, source: "ai_estimate" },
      },
    ]);

    expect(result.estimatedCount).toBe(3);
    expect(result.requiresManualReview).toBe(true);
  });

  it("Test B: does NOT trigger manual review when ALL estimated items are >= 0.70 (0.95, 0.90, 0.71 -> false)", () => {
    const result = calculateMealNutrition([
      {
        name: "Item A",
        quantity: 100,
        unit: "g",
        confidence: 0.95,
        estimatedNutrition: { calories: 200, proteinG: 10, carbsG: 20, fatG: 5, source: "ai_estimate" },
      },
      {
        name: "Item B",
        quantity: 100,
        unit: "g",
        confidence: 0.90,
        estimatedNutrition: { calories: 150, proteinG: 5, carbsG: 15, fatG: 5, source: "ai_estimate" },
      },
      {
        name: "Item C",
        quantity: 100,
        unit: "g",
        confidence: 0.71,
        estimatedNutrition: { calories: 100, proteinG: 2, carbsG: 10, fatG: 2, source: "ai_estimate" },
      },
    ]);

    expect(result.estimatedCount).toBe(3);
    expect(result.unresolvedCount).toBe(0);
    expect(result.requiresManualReview).toBe(false);
  });

  it("Test C: single estimated item at 0.69 triggers manual review (0.69 < 0.70)", () => {
    const result = calculateMealNutrition([
      {
        name: "Single Item",
        quantity: 100,
        unit: "g",
        confidence: 0.69,
        estimatedNutrition: { calories: 250, proteinG: 8, carbsG: 30, fatG: 8, source: "ai_estimate" },
      },
    ]);

    expect(result.estimatedCount).toBe(1);
    expect(result.items[0].nutritionStatus).toBe("estimated");
    expect(result.requiresManualReview).toBe(true);
  });

  it("Test D: single estimated item at 0.70 does NOT trigger manual review (0.70 >= 0.70)", () => {
    const result = calculateMealNutrition([
      {
        name: "Single Item",
        quantity: 100,
        unit: "g",
        confidence: 0.70,
        estimatedNutrition: { calories: 250, proteinG: 8, carbsG: 30, fatG: 8, source: "ai_estimate" },
      },
    ]);

    expect(result.estimatedCount).toBe(1);
    expect(result.items[0].nutritionStatus).toBe("estimated");
    expect(result.requiresManualReview).toBe(false);
  });

  it("Test E: single estimated item at 0.59 is unresolved and triggers manual review", () => {
    const result = calculateMealNutrition([
      {
        name: "Low Conf Item",
        quantity: 1,
        unit: "serving",
        confidence: 0.59,
      },
    ]);

    expect(result.estimatedCount).toBe(0);
    expect(result.unresolvedCount).toBe(1);
    expect(result.items[0].nutritionStatus).toBe("unresolved");
    expect(result.items[0].calories).toBeNull();
    expect(result.requiresManualReview).toBe(true);
  });

  it("Test F: mixed estimated + unresolved triggers manual review", () => {
    const result = calculateMealNutrition([
      {
        name: "High Conf Estimated",
        quantity: 100,
        unit: "g",
        confidence: 0.85,
        estimatedNutrition: { calories: 200, proteinG: 5, carbsG: 20, fatG: 5, source: "ai_estimate" },
      },
      {
        name: "Sub-threshold Unresolved",
        quantity: 1,
        unit: "serving",
        confidence: 0.45,
      },
    ]);

    expect(result.estimatedCount).toBe(1);
    expect(result.unresolvedCount).toBe(1);
    expect(result.requiresManualReview).toBe(true);
  });
});
