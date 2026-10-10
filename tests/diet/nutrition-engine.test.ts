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

  describe("Food Matching Semantics & Composite Invariants (Tasks A, B, C, D)", () => {
    it("proves true aliases resolve correctly to canonical records", () => {
      expect(resolveFoodItem("alu paratha")?.id).toBe("paratha_aloo");
      expect(resolveFoodItem("chapati")?.id).toBe("roti_plain");
      expect(resolveFoodItem("dahi")?.id).toBe("curd_plain");
      expect(resolveFoodItem("chawal")?.id).toBe("rice_steamed");
      expect(resolveFoodItem("cucumber salad")?.id).toBe("salad_kachumber");
      expect(resolveFoodItem("coconut chutney")?.id).toBe("chutney_coconut");
      expect(resolveFoodItem("boondi raita")?.id).toBe("raita_boondi");
    });

    it("proves different foods are NOT incorrectly mapped to one another", () => {
      // Must NOT alias Chicken Fry to Chicken Curry
      expect(resolveFoodItem("Chicken Fry")).toBeNull();

      // Must NOT alias Cucumber Raita to Plain Curd or Boondi Raita
      expect(resolveFoodItem("Cucumber Raita")).toBeNull();

      // Must NOT alias generic Chutney to Coconut Chutney
      expect(resolveFoodItem("Chutney")).toBeNull();
      expect(resolveFoodItem("Red Chutney")).toBeNull();

      // Missing foods must NOT match unrelated items
      expect(resolveFoodItem("Papad")).toBeNull();
      expect(resolveFoodItem("Rasam")).toBeNull();
      expect(resolveFoodItem("White Butter")).toBeNull();
      expect(resolveFoodItem("Red Pickle")).toBeNull();
      expect(resolveFoodItem("Onion Pakora")).toBeNull();
    });

    it("proves plain Cucumber does NOT resolve to Kachumber Salad merely because names overlap", () => {
      expect(resolveFoodItem("Cucumber")).toBeNull();
      expect(resolveFoodItem("Sliced Cucumber")).toBeNull();
      expect(resolveFoodItem("Raw Cucumber")).toBeNull();

      // Only actual salad alias matches
      expect(resolveFoodItem("Cucumber Salad")?.id).toBe("salad_kachumber");
      expect(resolveFoodItem("Kachumber")?.id).toBe("salad_kachumber");
    });

    it("ensures missing foods remain strictly unverified with zero fake calories", () => {
      const result = calculateMealNutrition([
        { name: "Papad", quantity: 2, unit: "piece" },
        { name: "Rasam", quantity: 1, unit: "bowl" },
      ]);

      expect(result.calories).toBe(0);
      expect(result.allFoodsVerified).toBe(false);
      expect(result.requiresManualReview).toBe(true);
      expect(result.unknownFoods).toContain("Papad");
      expect(result.unknownFoods).toContain("Rasam");
      expect(result.items.every((i) => !i.verified)).toBe(true);
    });

    it("does NOT double-count composite-dish ingredients when their relationship is established", () => {
      const result = calculateMealNutrition([
        { name: "Vegetable Biryani", quantity: 1, unit: "plate" },
        { name: "Diced Carrots", quantity: 1, unit: "serving", isComponentOf: "Vegetable Biryani" },
        { name: "Green Beans", quantity: 1, unit: "serving", isComponentOf: "Vegetable Biryani" },
      ]);

      // Vegetable Biryani is 280 kcal per plate
      expect(result.calories).toBe(280);
      expect(result.allFoodsVerified).toBe(true);
      expect(result.requiresManualReview).toBe(false);
      expect(result.unknownFoods).toHaveLength(0);

      // Verify that component items are marked verified inside the dish without adding duplicate calories
      const carrotItem = result.items.find((i) => i.name === "Diced Carrots");
      expect(carrotItem?.calories).toBe(0);
      expect(carrotItem?.verified).toBe(true);
      expect(carrotItem?.matchedCanonicalName).toBe("Diced Carrots (in Vegetable Biryani)");
    });

    it("retains separate side dishes and calculates them independently", () => {
      const result = calculateMealNutrition([
        { name: "Vegetable Biryani", quantity: 1, unit: "plate" },
        { name: "Kachumber Salad", quantity: 1, unit: "bowl / katori" }, // Separate side dish, no isComponentOf
      ]);

      // Biryani (280) + Kachumber Salad (20) = 300 kcal
      expect(result.calories).toBe(300);
      expect(result.items).toHaveLength(2);
      expect(result.allFoodsVerified).toBe(true);
      expect(result.items.find((i) => i.name === "Kachumber Salad")?.calories).toBe(20);
    });

    it("does NOT automatically discard additional cooking fat or toppings", () => {
      const result = calculateMealNutrition([
        { name: "Aloo Paratha", quantity: 2, unit: "piece" },
        { name: "White Butter", quantity: 1, unit: "tbsp" }, // Additional fat, no isComponentOf
      ]);

      // Paratha is 400 kcal; White Butter is not discarded, but preserved as unknown requiring manual review
      expect(result.calories).toBe(400);
      expect(result.items).toHaveLength(2);
      expect(result.unknownFoods).toContain("White Butter");
      expect(result.allFoodsVerified).toBe(false);
      expect(result.requiresManualReview).toBe(true);
    });
  });
});


