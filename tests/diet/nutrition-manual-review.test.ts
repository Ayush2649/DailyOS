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
});
