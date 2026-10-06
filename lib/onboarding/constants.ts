/**
 * Satat Onboarding Constants & Version Stamps
 * Source: docs/features/onboarding.md (v2.3)
 */

export const BRAND_NAME = "Satat";

// Versioning stamps (Server-Authoritative)
export const QUESTIONNAIRE_VERSION = 2;
export const FORMULA_VERSION = "mifflin_v2_audited";
export const NUTRITION_POLICY_VERSION = "satat_conservative_v1";
export const CONSENT_VERSION = "2026-10-v1";

// Pre-launch team accounts exempt from forced onboarding redirect
export const PRELAUNCH_EXEMPT_USER_IDS: string[] = [
  "test_user_uid_1",
  "test_user_uid_2",
  "test_user_uid_3",
];

// Canonical Step Identifiers (Single Source of Truth)
export const CANONICAL_STEPS = [
  "step_0_consent",
  "step_1_focus",
  "step_2_physical",
  "step_3_pace",
  "step_4_activity",
  "step_5_workout_rhythm",
  "step_6_workout_env",
  "step_7_diet",
  "step_8_health",
  "step_9_reveal",
] as const;

export type CanonicalStep = (typeof CANONICAL_STEPS)[number];

// PROPOSED Policy Limits & Coefficients
export const POLICY_LIMITS = {
  // Age bounds
  MIN_ADULT_AGE: 18,
  MAX_ADULT_AGE: 100,

  // Anatomical bounds
  MIN_HEIGHT_CM: 120.0,
  MAX_HEIGHT_CM: 230.0,
  MIN_WEIGHT_KG: 35.0,
  MAX_WEIGHT_KG: 250.0,

  // Calorie Safety Floors (PROPOSED)
  FEMALE_CALORIE_FLOOR: 1200,
  MALE_CALORIE_FLOOR: 1500,
  MAX_CALORIE_CEILING: 4200,

  // Deficit Caps (PROPOSED)
  MAX_DEFICIT_TDEE_PERCENT: 0.20, // 20% of TDEE
  MAX_WEEKLY_BODYWEIGHT_LOSS_PERCENT: 0.01, // 1% of body weight per week
  KCAL_PER_KG_FAT: 7700, // 7,700 kcal per kg fat mass
  // 1% body weight loss per week = 0.01 * W * 7700 / 7 = 11 * W kcal/day deficit cap
  DAILY_DEFICIT_PER_KG_CAP: 11,

  // Nominal Goal Offsets (PROPOSED)
  FAT_LOSS_OFFSETS: {
    relaxed: -250,
    steady: -400,
    fast: -600,
  },
  MUSCLE_GAIN_OFFSETS: {
    relaxed: 150,
    steady: 250,
    fast: 400,
  },
  VITALITY_OFFSET: 0,

  // Activity Multipliers (Mifflin / Harris-Benedict standard)
  ACTIVITY_MULTIPLIERS: {
    sedentary: 1.200,
    lightly_active: 1.375,
    moderately_active: 1.550,
    very_active: 1.725,
  },

  // Protein bounds & selection factors (PROPOSED)
  PROTEIN_MIN_FACTOR: 1.6, // g/kg
  PROTEIN_MAX_FACTOR: 1.8, // g/kg
  PROTEIN_MAX_CALORIE_PERCENT: 0.35, // 35% of total target calories

  // Fat bounds (PROPOSED)
  FAT_DEFAULT_PERCENT: 0.25, // 25% of target calories
  FAT_MIN_CALORIE_PERCENT: 0.20, // 20% of target calories
  FAT_MIN_PER_KG: 0.5, // 0.5 g/kg body weight

  // Carbohydrate floor (PROPOSED)
  CARB_MIN_GRAMS: 50, // 50g / day (200 kcal)

  // Energy balance tolerance
  ENERGY_BALANCE_TOLERANCE_KCAL: 5,

  // Draft TTL
  DRAFT_TTL_DAYS: 30,
} as const;

