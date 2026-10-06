/**
 * Satat Onboarding Validation Schemas
 * Strict Zod validation for client and server authority.
 * Source: docs/features/onboarding.md (v2.3)
 */

import { z } from "zod";
import { CANONICAL_STEPS, POLICY_LIMITS, CONSENT_VERSION } from "@/lib/onboarding/constants";

export const FocusGoalSchema = z.enum([
  "fat_loss",
  "muscle_gain",
  "vitality_health",
  "habit_routine",
]);

export const BiologicalSexSchema = z.enum([
  "female",
  "male",
  "prefer_not_to_say",
]);

export const ActivityLevelSchema = z.enum([
  "sedentary",
  "lightly_active",
  "moderately_active",
  "very_active",
]);

export const PaceTierSchema = z.enum(["relaxed", "steady", "fast"]);

export const TrainingTimeSchema = z.enum(["<20", "20-30", "30-45", "45-60", "60+"]);

export const TrainingWindowSchema = z.enum(["morning", "afternoon", "evening", "flexible"]);

export const EquipmentAccessSchema = z.enum([
  "commercial_gym",
  "home_dumbbells",
  "bodyweight_only",
]);

export const TrainingExperienceSchema = z.enum([
  "beginner",
  "intermediate",
  "advanced",
]);

export const DietaryPatternSchema = z.enum([
  "vegetarian",
  "eggetarian",
  "non_vegetarian",
  "vegan",
  "anything",
]);

export const KnownHealthConditions = [
  "pregnant_breastfeeding",
  "diabetes",
  "cardiovascular",
  "disordered_eating",
  "physical_injury",
  "none",
] as const;

export const HealthConditionEnum = z.enum(KnownHealthConditions);

/**
 * Draft Progress Payload Schema (POST /api/onboarding/progress)
 * Health answers are strictly forbidden from draft payloads.
 */
export const OnboardingProgressPayloadSchema = z
  .object({
    currentStep: z.enum(CANONICAL_STEPS),
    draft: z.object({
      consentGivenAt: z.number().positive().nullable().optional(),
      consentVersion: z.string().nullable().optional(),
      confirmedAge18Plus: z.boolean().optional(),
      focusGoal: FocusGoalSchema.optional(),
      heightCm: z.number().min(POLICY_LIMITS.MIN_HEIGHT_CM).max(POLICY_LIMITS.MAX_HEIGHT_CM).nullable().optional(),
      weightKg: z.number().min(POLICY_LIMITS.MIN_WEIGHT_KG).max(POLICY_LIMITS.MAX_WEIGHT_KG).nullable().optional(),
      age: z.number().int().min(POLICY_LIMITS.MIN_ADULT_AGE).max(POLICY_LIMITS.MAX_ADULT_AGE).nullable().optional(),
      biologicalSex: BiologicalSexSchema.nullable().optional(),
      targetWeightKg: z.number().min(POLICY_LIMITS.MIN_WEIGHT_KG).max(POLICY_LIMITS.MAX_WEIGHT_KG).nullable().optional(),
      paceTier: PaceTierSchema.nullable().optional(),
      activityLevel: ActivityLevelSchema.nullable().optional(),
      includeWorkouts: z.boolean().optional(),
      workoutDaysPerWeek: z.number().int().min(2).max(5).nullable().optional(),
      availableTrainingTimeMinutes: TrainingTimeSchema.nullable().optional(),
      preferredTrainingWindow: TrainingWindowSchema.nullable().optional(),
      equipmentAccess: EquipmentAccessSchema.nullable().optional(),
      trainingExperience: TrainingExperienceSchema.nullable().optional(),
      dietaryPattern: DietaryPatternSchema.nullable().optional(),
      foodAvoidances: z.array(z.string()).optional(),
    }),
    // Sensitive health keys explicitly rejected
    healthConditions: z.never({ message: "Health screening answers must never be saved to draft." }).optional(),
    healthScreening: z.never({ message: "Health screening answers must never be saved to draft." }).optional(),
  })
  .strict();

export type OnboardingProgressPayload = z.infer<typeof OnboardingProgressPayloadSchema>;

/**
 * Completion Payload Schema (POST /api/onboarding/complete)
 */
export const OnboardingCompletePayloadSchema = z
  .object({
    consentGivenAt: z.number().positive(),
    consentVersion: z.string().min(1),
    confirmedAge18Plus: z.literal(true, {
      errorMap: () => ({ message: "Must confirm age 18 or older to proceed." }),
    }),
    baseline: z.object({
      focusGoal: FocusGoalSchema,
      heightCm: z.number().min(POLICY_LIMITS.MIN_HEIGHT_CM).max(POLICY_LIMITS.MAX_HEIGHT_CM).nullable().optional(),
      weightKg: z.number().min(POLICY_LIMITS.MIN_WEIGHT_KG).max(POLICY_LIMITS.MAX_WEIGHT_KG).nullable().optional(),
      age: z.number().int().min(POLICY_LIMITS.MIN_ADULT_AGE).max(POLICY_LIMITS.MAX_ADULT_AGE).nullable().optional(),
      biologicalSex: BiologicalSexSchema.nullable().optional(),
      targetWeightKg: z.number().min(POLICY_LIMITS.MIN_WEIGHT_KG).max(POLICY_LIMITS.MAX_WEIGHT_KG).nullable().optional(),
      paceTier: PaceTierSchema.nullable().optional(),
      activityLevel: ActivityLevelSchema.nullable().optional(),
      includeWorkouts: z.boolean(),
      workoutDaysPerWeek: z.number().int().min(2).max(5).nullable().optional(),
      availableTrainingTimeMinutes: TrainingTimeSchema.nullable().optional(),
      preferredTrainingWindow: TrainingWindowSchema.nullable().optional(),
      equipmentAccess: EquipmentAccessSchema.nullable().optional(),
      trainingExperience: TrainingExperienceSchema.nullable().optional(),
      dietaryPattern: DietaryPatternSchema.nullable().optional(),
      foodAvoidances: z.array(z.string()).optional().default([]),
    }),
    healthScreening: z.object({
      selectedConditions: z
        .array(HealthConditionEnum)
        .min(1, { message: "Must select at least one condition or 'none'." })
        .refine(
          (arr) => {
            if (arr.includes("none") && arr.length > 1) {
              return false; // Cannot select 'none' along with conditions
            }
            return true;
          },
          { message: "Cannot select 'none' simultaneously with other conditions." }
        ),
    }),
  })
  .strict();

export type OnboardingCompletePayload = z.infer<typeof OnboardingCompletePayloadSchema>;

export type FocusGoal = z.infer<typeof FocusGoalSchema>;
export type BiologicalSex = z.infer<typeof BiologicalSexSchema>;
export type ActivityLevel = z.infer<typeof ActivityLevelSchema>;
export type PaceTier = z.infer<typeof PaceTierSchema>;
export type TrainingTime = z.infer<typeof TrainingTimeSchema>;
export type TrainingWindow = z.infer<typeof TrainingWindowSchema>;
export type EquipmentAccess = z.infer<typeof EquipmentAccessSchema>;
export type TrainingExperience = z.infer<typeof TrainingExperienceSchema>;
export type DietaryPattern = z.infer<typeof DietaryPatternSchema>;
export type HealthCondition = z.infer<typeof HealthConditionEnum>;
export type WorkoutDaysPerWeek = 2 | 3 | 4 | 5;
export type AvailableTrainingTimeMinutes = TrainingTime;
export type PreferredTrainingWindow = TrainingWindow;
