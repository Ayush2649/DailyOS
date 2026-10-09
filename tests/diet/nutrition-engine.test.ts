import { describe, it, expect } from "vitest";
import { resolveFoodItem, calculateMealNutrition, normalizeQuantityToGrams } from "@/lib/ai/nutrition/calculator";

describe("Deterministic Nutrition Engine (Zero LLM Dependency)", () => {
  describe("resolveFoodItem and Aliases", () => {
    it("resolves canonical flatbreads and their regional aliases", () => {
      const roti = resolveFoodItem("Plain Roti");
      expect(roti?.id).toBe("roti_plain");

      const chapati = resolveFoodItem("chapati");
      expect(chapati?.id).toBe("roti_plain");

      const phulka = resolveFoodItem("phulka");
      expect(phulka?.id).toBe("roti_plain");

      const aluParatha = resolveFoodItem("alu paratha");
      expect(aluParatha?.id).toBe("paratha_aloo");

      const stuffedAloo = resolveFoodItem("stuffed aloo paratha");
      expect(stuffedAloo?.id).toBe("paratha_aloo");
    });

    it("resolves dals, rice, and dairy accompaniments", () => {
      const dalMakhani = resolveFoodItem("black dal");
      expect(dalMakhani?.id).toBe("dal_makhani");

      const curd = resolveFoodItem("dahi");
      expect(curd?.id).toBe("curd_plain");

      const rice = resolveFoodItem("chawal");
      expect(rice?.id).toBe("rice_steamed");
    });

    it("returns null for completely unknown foods without hallucinating", () => {
      const unknown = resolveFoodItem("Unobtainium Fruit Pie 9000");
      expect(unknown).toBeNull();
    });
  });

  describe("normalizeQuantityToGrams", () => {
    it("scales standard pieces correctly", () => {
      const roti = resolveFoodItem("roti")!;
      expect(normalizeQuantityToGrams(roti, 1, "piece")).toBe(30);
      expect(normalizeQuantityToGrams(roti, 3, "piece")).toBe(90);

      const paratha = resolveFoodItem("aloo paratha")!;
      expect(normalizeQuantityToGrams(paratha, 2, "piece")).toBe(200);
    });

    it("respects direct gram and ml units", () => {
      const curd = resolveFoodItem("curd")!;
      expect(normalizeQuantityToGrams(curd, 120, "g")).toBe(120);
      expect(normalizeQuantityToGrams(curd, 200, "grams")).toBe(200);
      expect(normalizeQuantityToGrams(curd, 150, "ml")).toBe(150);
    });
  });

  describe("calculateMealNutrition", () => {
    it("calculates exact deterministic macros for 2 Aloo Parathas + 100g Curd", () => {
      const result = calculateMealNutrition([
        { name: "Aloo Paratha", quantity: 2, unit: "piece", confidence: 0.9 },
        { name: "Plain Curd", quantity: 100, unit: "g", confidence: 0.85 },
      ]);

      // 2 Aloo Parathas (200g):
      // 200g * 200 kcal/100g = 400 kcal
      // 200g * 5g protein/100g = 10g protein
      // 200g * 28g carbs/100g = 56g carbs
      // 200g * 8g fat/100g = 16g fat
      // 200g * 3.5g fiber/100g = 7g fiber
      //
      // 100g Curd:
      // 60 kcal, 3.1g -> 3g protein, 4.5g -> 5g carbs, 3.1g -> 3g fat, 0g fiber
      //
      // Total: ~460 kcal, 13g protein, 61g carbs, 19g fat, 7g fiber
      expect(result.calories).toBe(460);
      expect(result.proteinG).toBe(13);
      expect(result.carbsG).toBe(61);
      expect(result.fatG).toBe(19);
      expect(result.fiberG).toBe(7);
      expect(result.confidence).toBe("high");
      expect(result.allFoodsVerified).toBe(true);
      expect(result.unknownFoods).toHaveLength(0);
      expect(result.calorieRange.low).toBeLessThan(460);
      expect(result.calorieRange.high).toBeGreaterThan(460);
    });

    it("calculates exact deterministic macros for Dal Makhani with 2 Plain Roti", () => {
      const result = calculateMealNutrition([
        { name: "Dal Makhani", quantity: 1, unit: "bowl / katori", confidence: 0.95 },
        { name: "Plain Roti", quantity: 2, unit: "piece", confidence: 0.92 },
      ]);

      // Dal Makhani (180g katori): ~240 kcal, 11g P, 25g C, 12g F, 6g fiber
      // 2 Rotis (60g): ~160 kcal, 6g P, 30g C, 2g F, 4g fiber
      // Total: 400 kcal, 17g P, 55g C, 14g F, 10g fiber
      expect(result.calories).toBe(399);
      expect(result.proteinG).toBe(17);
      expect(result.carbsG).toBe(55);
      expect(result.fatG).toBe(14);
      expect(result.fiberG).toBe(10);
      expect(result.allFoodsVerified).toBe(true);
    });

    it("flags unknown foods cleanly without inventing fake numbers", () => {
      const result = calculateMealNutrition([
        { name: "Plain Roti", quantity: 2, unit: "piece", confidence: 0.9 },
        { name: "Alien Space Stew", quantity: 1, unit: "serving", confidence: 0.7 },
      ]);

      expect(result.unknownFoods).toContain("Alien Space Stew");
      expect(result.allFoodsVerified).toBe(false);
      expect(result.requiresManualReview).toBe(true);

      const alienItem = result.items.find((i) => i.name === "Alien Space Stew");
      expect(alienItem?.verified).toBe(false);
      expect(alienItem?.calories).toBe(0); // Zero fake calories fabricated!
      expect(result.confidence).not.toBe("high");
    });

    it("proves unknown foods can NEVER be persisted as a valid 0-calorie meal", () => {
      // Meal consisting entirely of an unknown dish
      const result = calculateMealNutrition([
        { name: "Mysterious Dark Matter Shake", quantity: 1, unit: "glass", confidence: 0.8 },
      ]);

      expect(result.calories).toBe(0);
      expect(result.allFoodsVerified).toBe(false);
      expect(result.requiresManualReview).toBe(true);
      expect(result.unknownFoods).toEqual(["Mysterious Dark Matter Shake"]);

      // Data integrity invariant: An unverified result with unknown foods or 0 calories must require manual review
      const canPersistWithoutReview = result.allFoodsVerified && !result.requiresManualReview && result.calories > 0;
      expect(canPersistWithoutReview).toBe(false);
    });

    it("allows verified meals with positive calories to proceed without manual review", () => {
      const result = calculateMealNutrition([
        { name: "Plain Roti", quantity: 1, unit: "piece", confidence: 0.95 },
      ]);

      expect(result.calories).toBe(80);
      expect(result.allFoodsVerified).toBe(true);
      expect(result.requiresManualReview).toBe(false);
      expect(result.unknownFoods).toHaveLength(0);
    });
  });
});

