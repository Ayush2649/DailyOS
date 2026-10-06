/**
 * Satat Nutrition Calculation Engine
 * Pure, deterministic, server-authoritative calculations.
 * Source: docs/features/onboarding.md (v2.3)
 */

import { POLICY_LIMITS } from "@/lib/onboarding/constants";

export interface NutritionCalculationInputs {
  focusGoal: "fat_loss" | "muscle_gain" | "vitality_health" | "habit_routine";
  heightCm: number | null;
  weightKg: number | null;
  age: number | null;
  biologicalSex: "female" | "male" | "prefer_not_to_say" | null;
  activityLevel: "sedentary" | "lightly_active" | "moderately_active" | "very_active" | null;
  paceTier?: "relaxed" | "steady" | "fast" | null;
  healthSensitivityMode?: boolean;
  withholdNutritionDueToHealth?: boolean;
}

export type NutritionStatus =
  | "calculated"
  | "deferred_omitted_data"
  | "withheld_health_sensitive"
  | "infeasible_constraints"
  | "underage_blocked";

export interface NutritionCalculationResult {
  nutritionStatus: NutritionStatus;
  bmrEstimate: number | null;
  bmrRange?: [number, number];
  tdeeEstimate: number | null;
  tdeeRange?: [number, number];
  targetCalories: number | null;
  proteinGrams: number | null;
  fatGrams: number | null;
  carbGrams: number | null;
  deficitCapped: boolean;
  calorieFloorApplied: boolean;
  weeklyRateKg?: string;
  paceApplied?: "relaxed" | "steady" | "fast";
}

/**
 * Calculates Basal Metabolic Rate using Mifflin-St Jeor (1990)
 */
export function calculateBmr(
  weightKg: number | null,
  heightCm: number | null,
  age: number | null,
  sex: "female" | "male" | "prefer_not_to_say" | null
): number | { range: [number, number] } | null {
  if (weightKg === null || heightCm === null || age === null) {
    return null;
  }

  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;

  if (sex === "male") {
    return base + 5;
  }
  if (sex === "female") {
    return base - 161;
  }

  // Sex omitted / prefer not to say: uncertainty range [female, male]
  const femaleBmr = base - 161;
  const maleBmr = base + 5;
  return { range: [femaleBmr, maleBmr] };
}

/**
 * Calculates Total Daily Energy Expenditure using activity multipliers
 */
export function calculateTdee(
  bmr: number | { range: [number, number] } | null,
  activityLevel: "sedentary" | "lightly_active" | "moderately_active" | "very_active" | null
): number | { range: [number, number] } | null {
  if (bmr === null || activityLevel === null) {
    return null;
  }

  const multiplier = POLICY_LIMITS.ACTIVITY_MULTIPLIERS[activityLevel];

  if (typeof bmr === "number") {
    return bmr * multiplier;
  }

  return {
    range: [bmr.range[0] * multiplier, bmr.range[1] * multiplier],
  };
}

/**
 * Main Pure Calculation Engine for Nutrition & Macros
 */
export function calculateNutritionTargets(
  inputs: NutritionCalculationInputs
): NutritionCalculationResult {
  const {
    focusGoal,
    heightCm,
    weightKg,
    age,
    biologicalSex,
    activityLevel,
    paceTier = null,
    healthSensitivityMode = false,
    withholdNutritionDueToHealth = false,
  } = inputs;

  // 1. Age Safety Check
  if (age !== null && age < POLICY_LIMITS.MIN_ADULT_AGE) {
    return {
      nutritionStatus: "underage_blocked",
      bmrEstimate: null,
      tdeeEstimate: null,
      targetCalories: null,
      proteinGrams: null,
      fatGrams: null,
      carbGrams: null,
      deficitCapped: false,
      calorieFloorApplied: false,
    };
  }

  // 2. Health-Sensitive Clinical Withholding
  if (healthSensitivityMode && withholdNutritionDueToHealth) {
    return {
      nutritionStatus: "withheld_health_sensitive",
      bmrEstimate: null,
      tdeeEstimate: null,
      targetCalories: null,
      proteinGrams: null,
      fatGrams: null,
      carbGrams: null,
      deficitCapped: false,
      calorieFloorApplied: false,
    };
  }

  // 3. Compute BMR
  const bmrResult = calculateBmr(weightKg, heightCm, age, biologicalSex);

  if (bmrResult === null) {
    return {
      nutritionStatus: "deferred_omitted_data",
      bmrEstimate: null,
      tdeeEstimate: null,
      targetCalories: null,
      proteinGrams: null,
      fatGrams: null,
      carbGrams: null,
      deficitCapped: false,
      calorieFloorApplied: false,
    };
  }

  // 4. Compute TDEE
  const tdeeResult = calculateTdee(bmrResult, activityLevel);

  // If sex is omitted, preserve uncertainty range and defer single-point targets
  if (typeof bmrResult === "object" && "range" in bmrResult) {
    const tdeeRange =
      tdeeResult && typeof tdeeResult === "object" && "range" in tdeeResult
        ? tdeeResult.range
        : undefined;

    return {
      nutritionStatus: "deferred_omitted_data",
      bmrEstimate: null,
      bmrRange: bmrResult.range,
      tdeeEstimate: null,
      ...(tdeeRange ? { tdeeRange } : {}),
      targetCalories: null,
      proteinGrams: null,
      fatGrams: null,
      carbGrams: null,
      deficitCapped: false,
      calorieFloorApplied: false,
    };
  }

  // If activity level was omitted or missing
  if (tdeeResult === null || typeof tdeeResult !== "number") {
    return {
      nutritionStatus: "deferred_omitted_data",
      bmrEstimate: bmrResult as number,
      tdeeEstimate: null,
      targetCalories: null,
      proteinGrams: null,
      fatGrams: null,
      carbGrams: null,
      deficitCapped: false,
      calorieFloorApplied: false,
    };
  }

  const bmr = bmrResult as number;
  const tdee = tdeeResult as number;
  const weight = weightKg as number;

  // 5. Goal Offsets & Deficit Capping
  if ((focusGoal === "fat_loss" || focusGoal === "muscle_gain") && !paceTier) {
    return {
      nutritionStatus: "deferred_omitted_data",
      bmrEstimate: bmr,
      tdeeEstimate: tdee,
      targetCalories: null,
      proteinGrams: null,
      fatGrams: null,
      carbGrams: null,
      deficitCapped: false,
      calorieFloorApplied: false,
    };
  }

  let effectivePace = paceTier ?? "steady";
  if (healthSensitivityMode && effectivePace === "fast") {
    // In Health-Sensitive Mode, aggressive fast pace is disabled; downgraded to steady
    effectivePace = "steady";
  }

  let delta = 0;
  let deficitCapped = false;

  if (focusGoal === "fat_loss") {
    const nominalDelta = POLICY_LIMITS.FAT_LOSS_OFFSETS[effectivePace];
    const maxDeficitTdee = tdee * POLICY_LIMITS.MAX_DEFICIT_TDEE_PERCENT;
    const maxDeficitWeight = POLICY_LIMITS.DAILY_DEFICIT_PER_KG_CAP * weight;
    const maxAllowedDeficit = Math.min(maxDeficitTdee, maxDeficitWeight);

    if (Math.abs(nominalDelta) > maxAllowedDeficit) {
      delta = -Math.round(maxAllowedDeficit);
      deficitCapped = true;
    } else {
      delta = nominalDelta;
    }
  } else if (focusGoal === "muscle_gain") {
    delta = POLICY_LIMITS.MUSCLE_GAIN_OFFSETS[effectivePace];
  } else {
    delta = POLICY_LIMITS.VITALITY_OFFSET;
  }

  let targetCalories = Math.round(tdee + delta);

  // 6. Calorie Safety Floors & Ceilings
  let calorieFloorApplied = false;
  const floor =
    biologicalSex === "female"
      ? POLICY_LIMITS.FEMALE_CALORIE_FLOOR
      : POLICY_LIMITS.MALE_CALORIE_FLOOR;

  if (targetCalories < floor) {
    targetCalories = floor;
    calorieFloorApplied = true;
  }
  if (targetCalories > POLICY_LIMITS.MAX_CALORIE_CEILING) {
    targetCalories = POLICY_LIMITS.MAX_CALORIE_CEILING;
  }

  // 7. Protein Factor Selection (PROPOSED)
  const isSedentary = activityLevel === "sedentary";
  let protFactor: number = POLICY_LIMITS.PROTEIN_MIN_FACTOR;

  if (focusGoal === "muscle_gain") {
    protFactor = POLICY_LIMITS.PROTEIN_MAX_FACTOR; // 1.8 g/kg
  } else if (focusGoal === "fat_loss") {
    protFactor = isSedentary || effectivePace === "relaxed"
      ? POLICY_LIMITS.PROTEIN_MIN_FACTOR // 1.6 g/kg
      : POLICY_LIMITS.PROTEIN_MAX_FACTOR; // 1.8 g/kg
  } else if (focusGoal === "vitality_health") {
    protFactor = isSedentary
      ? POLICY_LIMITS.PROTEIN_MIN_FACTOR // 1.6 g/kg
      : POLICY_LIMITS.PROTEIN_MAX_FACTOR; // 1.8 g/kg
  } else {
    protFactor = POLICY_LIMITS.PROTEIN_MIN_FACTOR; // 1.6 g/kg
  }

  const minProteinGrams = Math.round(weight * POLICY_LIMITS.PROTEIN_MIN_FACTOR);
  const minProteinCalories = minProteinGrams * 4;

  let proteinGrams = Math.round(weight * protFactor);
  let proteinCalories = proteinGrams * 4;

  // Apply protein calorie cap (<= 35% total calories)
  const maxProteinCalories = targetCalories * POLICY_LIMITS.PROTEIN_MAX_CALORIE_PERCENT;

  // Feasibility Check 1: Protein floor (1.6 g/kg) cannot exceed the 35% protein cap
  if (minProteinCalories > maxProteinCalories) {
    return {
      nutritionStatus: "infeasible_constraints",
      bmrEstimate: bmr,
      tdeeEstimate: tdee,
      targetCalories: null,
      proteinGrams: null,
      fatGrams: null,
      carbGrams: null,
      deficitCapped,
      calorieFloorApplied,
      ...(effectivePace ? { paceApplied: effectivePace } : {}),
    };
  }

  if (proteinCalories > maxProteinCalories) {
    proteinGrams = Math.floor(maxProteinCalories / 4);
    proteinCalories = proteinGrams * 4;
  }

  // 8. Fat Calculation
  let fatGrams = Math.round((targetCalories * POLICY_LIMITS.FAT_DEFAULT_PERCENT) / 9);
  const minFatGrams = Math.round(weight * POLICY_LIMITS.FAT_MIN_PER_KG);
  const minFatCalories = Math.max(
    targetCalories * POLICY_LIMITS.FAT_MIN_CALORIE_PERCENT,
    minFatGrams * 9
  );

  // Feasibility Check 2: Protein + Min Fat + Min Carbs (50g / 200 kcal) cannot exceed target calories
  const carbFloorCalories = POLICY_LIMITS.CARB_MIN_GRAMS * 4; // 200 kcal
  if (proteinCalories + minFatCalories + carbFloorCalories > targetCalories) {
    return {
      nutritionStatus: "infeasible_constraints",
      bmrEstimate: bmr,
      tdeeEstimate: tdee,
      targetCalories: null,
      proteinGrams: null,
      fatGrams: null,
      carbGrams: null,
      deficitCapped,
      calorieFloorApplied,
      ...(effectivePace ? { paceApplied: effectivePace } : {}),
    };
  }

  if (fatGrams * 9 < minFatCalories) {
    fatGrams = Math.round(minFatCalories / 9);
  }
  let fatCalories = fatGrams * 9;

  // 9. Carb Remainder & Feasibility Check 3
  const carbCalories = targetCalories - (proteinCalories + fatCalories);
  const carbGrams = Math.round(carbCalories / 4);

  // Feasibility Rule: Carb floor requires >= 50g (200 kcal), and no negative macros
  if (carbGrams < POLICY_LIMITS.CARB_MIN_GRAMS || proteinGrams < 0 || fatGrams < 0) {
    return {
      nutritionStatus: "infeasible_constraints",
      bmrEstimate: bmr,
      tdeeEstimate: tdee,
      targetCalories: null,
      proteinGrams: null,
      fatGrams: null,
      carbGrams: null,
      deficitCapped,
      calorieFloorApplied,
      ...(effectivePace ? { paceApplied: effectivePace } : {}),
    };
  }

  // 10. Weekly Rate of Change
  const weeklyRateKg =
    focusGoal === "fat_loss"
      ? (Math.abs(delta) / 1100).toFixed(2)
      : undefined;

  return {
    nutritionStatus: "calculated",
    bmrEstimate: bmr,
    tdeeEstimate: tdee,
    targetCalories,
    proteinGrams,
    fatGrams,
    carbGrams,
    deficitCapped,
    calorieFloorApplied,
    ...(weeklyRateKg ? { weeklyRateKg } : {}),
    ...(effectivePace ? { paceApplied: effectivePace } : {}),
  };
}

/**
 * Maps nutrition calculation results strictly to the canonical
 * Firestore UserProfileDocument.computedTargets schema (§11.5).
 * Guarantees zero undefined properties reach Firestore.
 */
export interface CanonicalComputedTargets {
  nutritionStatus: "calculated" | "deferred_omitted_data" | "withheld_health_sensitive" | "infeasible_constraints";
  bmrEstimate: number | null;
  bmrRange?: [number, number];
  tdeeEstimate: number | null;
  tdeeRange?: [number, number];
  targetCalories: number | null;
  proteinGrams: number | null;
  fatGrams: number | null;
  carbGrams: number | null;
  deficitCapped: boolean;
  calorieFloorApplied: boolean;
}

export function toCanonicalComputedTargets(
  result: NutritionCalculationResult | null
): CanonicalComputedTargets | null {
  if (!result || result.nutritionStatus === "underage_blocked") {
    return null;
  }

  const canonical: CanonicalComputedTargets = {
    nutritionStatus: result.nutritionStatus,
    bmrEstimate: result.bmrEstimate ?? null,
    tdeeEstimate: result.tdeeEstimate ?? null,
    targetCalories: result.targetCalories ?? null,
    proteinGrams: result.proteinGrams ?? null,
    fatGrams: result.fatGrams ?? null,
    carbGrams: result.carbGrams ?? null,
    deficitCapped: Boolean(result.deficitCapped),
    calorieFloorApplied: Boolean(result.calorieFloorApplied),
  };

  if (result.bmrRange) {
    canonical.bmrRange = result.bmrRange;
  }
  if (result.tdeeRange) {
    canonical.tdeeRange = result.tdeeRange;
  }

  return canonical;
}
