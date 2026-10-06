import { describe, it, expect } from "vitest";
import {
  calculateBmr,
  calculateTdee,
  calculateNutritionTargets,
  type NutritionCalculationInputs,
} from "@/lib/nutrition/calculations";

describe("Nutrition Calculation Engine — Unit & Fixture Tests", () => {
  describe("Mifflin-St Jeor BMR Calculations", () => {
    it("calculates male BMR correctly", () => {
      // 10*75 + 6.25*178 - 5*24 + 5 = 750 + 1112.5 - 120 + 5 = 1747.5
      const bmr = calculateBmr(75, 178, 24, "male");
      expect(bmr).toBe(1747.5);
    });

    it("calculates female BMR correctly", () => {
      // 10*65 + 6.25*162 - 5*28 - 161 = 650 + 1012.5 - 140 - 161 = 1361.5
      const bmr = calculateBmr(65, 162, 28, "female");
      expect(bmr).toBe(1361.5);
    });

    it("returns null if physiological inputs are missing", () => {
      expect(calculateBmr(null, 162, 28, "female")).toBeNull();
      expect(calculateBmr(65, null, 28, "female")).toBeNull();
      expect(calculateBmr(65, 162, null, "female")).toBeNull();
    });

    it("returns uncertainty range when sex is omitted or prefer_not_to_say", () => {
      // 70kg, 170cm, 30y:
      // Female: 700 + 1062.5 - 150 - 161 = 1451.5
      // Male: 700 + 1062.5 - 150 + 5 = 1617.5
      const bmrResult = calculateBmr(70, 170, 30, "prefer_not_to_say");
      expect(bmrResult).toEqual({ range: [1451.5, 1617.5] });

      const bmrOmitted = calculateBmr(70, 170, 30, null);
      expect(bmrOmitted).toEqual({ range: [1451.5, 1617.5] });
    });
  });

  describe("TDEE Calculations", () => {
    it("applies standard activity multipliers", () => {
      const bmr = 1500;
      expect(calculateTdee(bmr, "sedentary")).toBe(1800); // 1.500 * 1.2
      expect(calculateTdee(bmr, "lightly_active")).toBe(2062.5); // 1.500 * 1.375
      expect(calculateTdee(bmr, "moderately_active")).toBe(2325); // 1.500 * 1.550
      expect(calculateTdee(bmr, "very_active")).toBe(2587.5); // 1.500 * 1.725
    });

    it("returns range when bmr is a range", () => {
      const rangeTdee = calculateTdee({ range: [1451.5, 1617.5] }, "lightly_active");
      expect(rangeTdee).toEqual({
        range: [1995.8125, 2224.0625],
      });
    });

    it("returns null when activity level is missing or null", () => {
      expect(calculateTdee(1500, null)).toBeNull();
    });
  });

  describe("Specification Reference Personas (§8.5)", () => {
    it("matches Persona P1: Sedentary Female, Fat Loss (Capped at 20% TDEE)", () => {
      const inputs: NutritionCalculationInputs = {
        focusGoal: "fat_loss",
        heightCm: 162,
        weightKg: 65,
        age: 28,
        biologicalSex: "female",
        activityLevel: "sedentary",
        paceTier: "steady",
        healthSensitivityMode: false,
      };

      const result = calculateNutritionTargets(inputs);
      expect(result.nutritionStatus).toBe("calculated");
      expect(result.bmrEstimate).toBe(1361.5);
      expect(result.tdeeEstimate).toBeCloseTo(1633.8, 1);
      // Nominal -400 is capped to 20% of 1633.8 = 326.76 -> -327 kcal
      expect(result.deficitCapped).toBe(true);
      expect(result.targetCalories).toBe(1307);
      expect(result.proteinGrams).toBe(104); // 65 * 1.6 = 104g = 416 kcal (31.8% <= 35%)
      expect(result.fatGrams).toBe(36); // 25% of 1307 / 9 = 36g = 324 kcal
      expect(result.carbGrams).toBe(142); // 1307 - 416 - 324 = 567 / 4 = 142g
      expect(result.weeklyRateKg).toBe("0.30");
      // Energy balance invariant: 4*104 + 9*36 + 4*142 = 416 + 324 + 568 = 1308
      expect(Math.abs(104 * 4 + 36 * 9 + 142 * 4 - 1307)).toBeLessThanOrEqual(5);
    });

    it("matches Persona P2: Active Male, Muscle Gain", () => {
      const inputs: NutritionCalculationInputs = {
        focusGoal: "muscle_gain",
        heightCm: 178,
        weightKg: 75,
        age: 24,
        biologicalSex: "male",
        activityLevel: "moderately_active",
        paceTier: "steady",
        healthSensitivityMode: false,
      };

      const result = calculateNutritionTargets(inputs);
      expect(result.nutritionStatus).toBe("calculated");
      expect(result.bmrEstimate).toBe(1747.5);
      expect(result.tdeeEstimate).toBeCloseTo(2708.6, 1);
      expect(result.targetCalories).toBe(2959); // 2708.6 + 250 = 2958.6 -> 2959
      expect(result.proteinGrams).toBe(135); // 75 * 1.8 = 135g
      expect(result.fatGrams).toBe(82); // 25% of 2959 / 9 = 82g
      expect(result.carbGrams).toBe(420); // 2959 - 540 - 738 = 1681 / 4 = 420g
      expect(Math.abs(135 * 4 + 82 * 9 + 420 * 4 - 2959)).toBeLessThanOrEqual(5);
    });

    it("matches Persona P3: Lightly Active Female, Vitality & Health (Maintenance)", () => {
      const inputs: NutritionCalculationInputs = {
        focusGoal: "vitality_health",
        heightCm: 168,
        weightKg: 68,
        age: 32,
        biologicalSex: "female",
        activityLevel: "lightly_active",
        healthSensitivityMode: false,
      };

      const result = calculateNutritionTargets(inputs);
      expect(result.nutritionStatus).toBe("calculated");
      expect(result.bmrEstimate).toBe(1409.0);
      expect(result.tdeeEstimate).toBeCloseTo(1937.4, 1);
      expect(result.targetCalories).toBe(1937);
      expect(result.proteinGrams).toBe(122); // 68 * 1.8 = 122g
      expect(result.fatGrams).toBe(54); // 25% of 1937 / 9 = 54g
      expect(result.carbGrams).toBe(241);
      expect(Math.abs(122 * 4 + 54 * 9 + 241 * 4 - 1937)).toBeLessThanOrEqual(5);
    });

    it("matches Persona P4: High-Weight Male, Fast Loss (Capped at 20% TDEE & 1% BW)", () => {
      const inputs: NutritionCalculationInputs = {
        focusGoal: "fat_loss",
        heightCm: 180,
        weightKg: 100,
        age: 35,
        biologicalSex: "male",
        activityLevel: "sedentary",
        paceTier: "fast",
        healthSensitivityMode: false,
      };

      const result = calculateNutritionTargets(inputs);
      expect(result.nutritionStatus).toBe("calculated");
      expect(result.bmrEstimate).toBe(1955.0);
      expect(result.tdeeEstimate).toBe(2346.0);
      // Nominal -600 capped at 20% of 2346 = 469.2 -> -469 kcal (and 11 * 100 = 1100)
      expect(result.deficitCapped).toBe(true);
      expect(result.targetCalories).toBe(1877); // 2346 - 469 = 1877
      expect(result.proteinGrams).toBe(160); // 100 * 1.6 = 160g = 640 kcal (34.1% <= 35%)
      expect(result.fatGrams).toBe(52); // 25% = 52g (fat floor: 100 * 0.5 = 50g <= 52g)
      expect(result.carbGrams).toBe(192); // 1877 - 640 - 468 = 769 / 4 = 192g
      expect(result.weeklyRateKg).toBe("0.43");
      expect(Math.abs(160 * 4 + 52 * 9 + 192 * 4 - 1877)).toBeLessThanOrEqual(5);
    });

    it("matches Persona P5: Sex Omitted ('Prefer not to say') — uncertainty preserved", () => {
      const inputs: NutritionCalculationInputs = {
        focusGoal: "vitality_health",
        heightCm: 170,
        weightKg: 70,
        age: 30,
        biologicalSex: "prefer_not_to_say",
        activityLevel: "lightly_active",
        healthSensitivityMode: false,
      };

      const result = calculateNutritionTargets(inputs);
      expect(result.nutritionStatus).toBe("deferred_omitted_data");
      expect(result.bmrRange).toEqual([1451.5, 1617.5]);
      expect(result.tdeeRange?.[0]).toBeCloseTo(1995.8, 1);
      expect(result.tdeeRange?.[1]).toBeCloseTo(2224.1, 1);
      expect(result.targetCalories).toBeNull();
      expect(result.proteinGrams).toBeNull();
      expect(result.fatGrams).toBeNull();
      expect(result.carbGrams).toBeNull();
    });

    it("matches Persona P6: Infeasible Constraints Case", () => {
      // High body weight with 1200 floor:
      // Weight 140kg, target 1200 kcal:
      // Protein min cap = 420 kcal, Fat floor (140*0.5*9) = 630 kcal, Carb floor = 200 kcal
      // 420 + 630 + 200 = 1250 kcal > 1200 kcal -> infeasible!
      const inputs: NutritionCalculationInputs = {
        focusGoal: "fat_loss",
        heightCm: 145,
        weightKg: 140,
        age: 50,
        biologicalSex: "female",
        activityLevel: "sedentary",
        paceTier: "fast",
        healthSensitivityMode: false,
      };

      const result = calculateNutritionTargets(inputs);
      expect(result.nutritionStatus).toBe("infeasible_constraints");
      expect(result.targetCalories).toBeNull();
      expect(result.proteinGrams).toBeNull();
      expect(result.fatGrams).toBeNull();
      expect(result.carbGrams).toBeNull();
    });
  });

  describe("Health-Sensitive & Safety Withholding", () => {
    it("withholds nutrition targets when metabolic/clinical conditions are present", () => {
      const inputs: NutritionCalculationInputs = {
        focusGoal: "fat_loss",
        heightCm: 162,
        weightKg: 65,
        age: 28,
        biologicalSex: "female",
        activityLevel: "sedentary",
        paceTier: "steady",
        healthSensitivityMode: true,
        withholdNutritionDueToHealth: true,
      };

      const result = calculateNutritionTargets(inputs);
      expect(result.nutritionStatus).toBe("withheld_health_sensitive");
      expect(result.targetCalories).toBeNull();
      expect(result.proteinGrams).toBeNull();
      expect(result.fatGrams).toBeNull();
      expect(result.carbGrams).toBeNull();
    });

    it("disables fast pace in Health-Sensitive Mode", () => {
      const inputs: NutritionCalculationInputs = {
        focusGoal: "fat_loss",
        heightCm: 178,
        weightKg: 75,
        age: 25,
        biologicalSex: "male",
        activityLevel: "moderately_active",
        paceTier: "fast",
        healthSensitivityMode: true,
        withholdNutritionDueToHealth: false,
      };

      // In health sensitive mode, fast pace is downgraded or rejected
      const result = calculateNutritionTargets(inputs);
      // pace is downgraded to steady/relaxed or non-aggressive
      expect(result.paceApplied).not.toBe("fast");
    });
  });

  describe("Missing Physiological Data Graceful Deferral", () => {
    it("defers calorie targets when height or weight is omitted", () => {
      const inputs: NutritionCalculationInputs = {
        focusGoal: "fat_loss",
        heightCm: null,
        weightKg: 65,
        age: 28,
        biologicalSex: "female",
        activityLevel: "sedentary",
        healthSensitivityMode: false,
      };

      const result = calculateNutritionTargets(inputs);
      expect(result.nutritionStatus).toBe("deferred_omitted_data");
      expect(result.targetCalories).toBeNull();
      expect(result.proteinGrams).toBeNull();
    });

    it("defers calorie targets when activity level is omitted", () => {
      const inputs: NutritionCalculationInputs = {
        focusGoal: "muscle_gain",
        heightCm: 175,
        weightKg: 70,
        age: 25,
        biologicalSex: "male",
        activityLevel: null,
        healthSensitivityMode: false,
      };

      const result = calculateNutritionTargets(inputs);
      expect(result.nutritionStatus).toBe("deferred_omitted_data");
      expect(result.targetCalories).toBeNull();
    });

    it("defers calorie targets when pace is omitted for fat loss (zero fake steady default)", () => {
      const inputs: NutritionCalculationInputs = {
        focusGoal: "fat_loss",
        heightCm: 162,
        weightKg: 65,
        age: 28,
        biologicalSex: "female",
        activityLevel: "sedentary",
        paceTier: null, // explicitly omitted
        healthSensitivityMode: false,
      };

      const result = calculateNutritionTargets(inputs);
      expect(result.nutritionStatus).toBe("deferred_omitted_data");
      expect(result.targetCalories).toBeNull();
      expect(result.proteinGrams).toBeNull();
      expect(result.fatGrams).toBeNull();
      expect(result.carbGrams).toBeNull();
      expect(result.paceApplied).toBeUndefined();
    });

    it("defers calorie targets when pace is omitted for muscle gain", () => {
      const inputs: NutritionCalculationInputs = {
        focusGoal: "muscle_gain",
        heightCm: 178,
        weightKg: 75,
        age: 24,
        biologicalSex: "male",
        activityLevel: "moderately_active",
        paceTier: null,
        healthSensitivityMode: false,
      };

      const result = calculateNutritionTargets(inputs);
      expect(result.nutritionStatus).toBe("deferred_omitted_data");
      expect(result.targetCalories).toBeNull();
    });

    it("calculates maintenance targets for vitality_health when pace is null (step branched)", () => {
      const inputs: NutritionCalculationInputs = {
        focusGoal: "vitality_health",
        heightCm: 168,
        weightKg: 68,
        age: 32,
        biologicalSex: "female",
        activityLevel: "lightly_active",
        paceTier: null,
        healthSensitivityMode: false,
      };

      const result = calculateNutritionTargets(inputs);
      expect(result.nutritionStatus).toBe("calculated");
      expect(result.targetCalories).toBe(1937); // P3 Persona match
    });
  });
});

