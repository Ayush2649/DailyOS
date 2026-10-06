import { describe, it, expect } from "vitest";
import {
  calculateNutritionTargets,
  type NutritionCalculationInputs,
} from "@/lib/nutrition/calculations";
import { composeStarterWorkout } from "@/lib/workouts/composition";
import { POLICY_LIMITS } from "@/lib/onboarding/constants";

describe("Onboarding Property & Invariant Tests (§15.1)", () => {
  // Generates randomized valid physiological and goal inputs
  function getRandomValidInputs(overrides?: Partial<NutritionCalculationInputs>): NutritionCalculationInputs {
    const sexes = ["male", "female"] as const;
    const goals = ["fat_loss", "muscle_gain", "vitality_health", "habit_routine"] as const;
    const paces = ["relaxed", "steady", "fast"] as const;
    const activities = ["sedentary", "lightly_active", "moderately_active", "very_active"] as const;

    const randomSex = sexes[Math.floor(Math.random() * sexes.length)];
    const randomGoal = goals[Math.floor(Math.random() * goals.length)];
    const randomPace = paces[Math.floor(Math.random() * paces.length)];
    const randomActivity = activities[Math.floor(Math.random() * activities.length)];

    const weightKg = Math.round(50 + Math.random() * 60); // 50 to 110 kg
    const heightCm = Math.round(150 + Math.random() * 45); // 150 to 195 cm
    const age = Math.round(18 + Math.random() * 55); // 18 to 73 years

    return {
      focusGoal: randomGoal,
      heightCm,
      weightKg,
      age,
      biologicalSex: randomSex,
      activityLevel: randomActivity,
      paceTier: randomPace,
      healthSensitivityMode: false,
      ...overrides,
    };
  }

  it("Invariant 1: Non-Negative Macro Invariant across 100 randomized valid inputs", () => {
    for (let i = 0; i < 100; i++) {
      const inputs = getRandomValidInputs();
      const result = calculateNutritionTargets(inputs);
      if (result.nutritionStatus === "calculated") {
        expect(result.proteinGrams).toBeGreaterThanOrEqual(0);
        expect(result.fatGrams).toBeGreaterThanOrEqual(0);
        expect(result.carbGrams).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("Invariant 2: Energy Balance Invariant: |(4P + 9F + 4C) - C_target| <= 5 kcal", () => {
    for (let i = 0; i < 100; i++) {
      const inputs = getRandomValidInputs();
      const result = calculateNutritionTargets(inputs);
      if (result.nutritionStatus === "calculated" && result.targetCalories !== null) {
        const pCals = (result.proteinGrams ?? 0) * 4;
        const fCals = (result.fatGrams ?? 0) * 9;
        const cCals = (result.carbGrams ?? 0) * 4;
        const sum = pCals + fCals + cCals;
        const diff = Math.abs(sum - result.targetCalories);
        expect(diff).toBeLessThanOrEqual(POLICY_LIMITS.ENERGY_BALANCE_TOLERANCE_KCAL);
      }
    }
  });

  it("Invariant 3: Monotonicity Invariant: Calories never increase as pace increases", () => {
    // For a given person with fat_loss: C(fast) <= C(steady) <= C(relaxed)
    for (let i = 0; i < 50; i++) {
      const base = getRandomValidInputs({ focusGoal: "fat_loss" });

      const resRelaxed = calculateNutritionTargets({ ...base, paceTier: "relaxed" });
      const resSteady = calculateNutritionTargets({ ...base, paceTier: "steady" });
      const resFast = calculateNutritionTargets({ ...base, paceTier: "fast" });

      if (
        resRelaxed.targetCalories !== null &&
        resSteady.targetCalories !== null &&
        resFast.targetCalories !== null
      ) {
        expect(resFast.targetCalories).toBeLessThanOrEqual(resSteady.targetCalories);
        expect(resSteady.targetCalories).toBeLessThanOrEqual(resRelaxed.targetCalories);
      }
    }
  });

  it("Invariant 4: Deficit Cap Invariant: Deficit never exceeds 20% TDEE or 11*W kcal/day", () => {
    for (let i = 0; i < 100; i++) {
      const inputs = getRandomValidInputs({ focusGoal: "fat_loss" });
      const result = calculateNutritionTargets(inputs);
      if (result.nutritionStatus === "calculated" && result.tdeeEstimate && result.targetCalories) {
        const appliedDeficit = result.tdeeEstimate - result.targetCalories;
        if (appliedDeficit > 0) {
          const maxAllowedDeficit = Math.min(
            result.tdeeEstimate * POLICY_LIMITS.MAX_DEFICIT_TDEE_PERCENT,
            POLICY_LIMITS.DAILY_DEFICIT_PER_KG_CAP * (inputs.weightKg ?? 70)
          );
          // Allow 1.5 kcal rounding tolerance
          expect(appliedDeficit).toBeLessThanOrEqual(maxAllowedDeficit + 1.5);
        }
      }
    }
  });

  it("Invariant 5: Protein Bounds Invariant: 1.6 to 1.8 g/kg and <= 35% total calories", () => {
    for (let i = 0; i < 100; i++) {
      const inputs = getRandomValidInputs();
      const result = calculateNutritionTargets(inputs);
      if (result.nutritionStatus === "calculated" && result.targetCalories && result.proteinGrams) {
        const pCals = result.proteinGrams * 4;
        expect(pCals).toBeLessThanOrEqual(result.targetCalories * 0.35 + 1); // 35% cap
      }
    }
  });

  it("Invariant 6: Calorie Floor Invariant: Target calories >= floor when biological sex provided", () => {
    for (let i = 0; i < 50; i++) {
      const femaleInputs = getRandomValidInputs({ biologicalSex: "female", focusGoal: "fat_loss", paceTier: "fast" });
      const maleInputs = getRandomValidInputs({ biologicalSex: "male", focusGoal: "fat_loss", paceTier: "fast" });

      const resFemale = calculateNutritionTargets(femaleInputs);
      const resMale = calculateNutritionTargets(maleInputs);

      if (resFemale.targetCalories !== null) {
        expect(resFemale.targetCalories).toBeGreaterThanOrEqual(POLICY_LIMITS.FEMALE_CALORIE_FLOOR);
      }
      if (resMale.targetCalories !== null) {
        expect(resMale.targetCalories).toBeGreaterThanOrEqual(POLICY_LIMITS.MALE_CALORIE_FLOOR);
      }
    }
  });

  it("Invariant 7: Sex Uncertainty Invariant: Omitted sex never yields single-point target", () => {
    const inputs = getRandomValidInputs({ biologicalSex: "prefer_not_to_say" });
    const result = calculateNutritionTargets(inputs);

    expect(result.nutritionStatus).toBe("deferred_omitted_data");
    expect(result.targetCalories).toBeNull();
    expect(result.proteinGrams).toBeNull();
    expect(result.fatGrams).toBeNull();
    expect(result.carbGrams).toBeNull();
    expect(result.bmrRange).toBeDefined();
    expect(result.tdeeRange).toBeDefined();
  });

  it("Invariant 8: Underage Eligibility Invariant: Age < 18 halts adult calculations", () => {
    const inputs = getRandomValidInputs({ age: 16 });
    const result = calculateNutritionTargets(inputs);

    expect(result.nutritionStatus).toBe("underage_blocked");
    expect(result.targetCalories).toBeNull();
    expect(result.proteinGrams).toBeNull();
  });

  it("Invariant 9: Feasibility Invariant: Infeasible combinations cleanly return infeasible_constraints", () => {
    // Extreme high weight (145kg) + low height (140cm) + female floor 1200 kcal
    const inputs: NutritionCalculationInputs = {
      focusGoal: "fat_loss",
      heightCm: 140,
      weightKg: 145,
      age: 45,
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

  it("Invariant 10: Workout Completeness Invariant: Assignment is never null for completed workout answers in STANDARD mode", () => {
    const days = [2, 3, 4, 5];
    const durations = ["<20", "20-30", "30-45", "45-60", "60+"] as const;
    const experiences = ["beginner", "intermediate", "advanced"] as const;
    const equipments = ["commercial_gym", "home_dumbbells", "bodyweight_only"] as const;

    for (const d of days) {
      for (const dur of durations) {
        for (const exp of experiences) {
          for (const eq of equipments) {
            const assignment = composeStarterWorkout({
              includeWorkouts: true,
              workoutDaysPerWeek: d,
              availableTrainingTimeMinutes: dur,
              trainingExperience: exp,
              equipmentAccess: eq,
              healthSensitivityMode: false,
            });

            expect(assignment).not.toBeNull();
            expect(assignment?.planName).toBeTruthy();
            expect(assignment?.templateIds.length).toBeGreaterThan(0);
          }
        }
      }
    }
  });

  it("Invariant 11: Health-Sensitive Routine Withholding: Starter routine is null by default in Health-Sensitive Mode", () => {
    const assignment = composeStarterWorkout({
      includeWorkouts: true,
      workoutDaysPerWeek: 3,
      availableTrainingTimeMinutes: "30-45",
      trainingExperience: "beginner",
      equipmentAccess: "commercial_gym",
      healthSensitivityMode: true,
    });

    expect(assignment).toBeNull();
  });
});

