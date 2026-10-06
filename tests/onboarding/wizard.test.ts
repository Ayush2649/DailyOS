import { describe, it, expect } from "vitest";
import { getNextStep, getPrevStep } from "@/components/onboarding/useOnboardingWizard";
import type { OnboardingFormValues } from "@/components/onboarding/types";

const baseValues: OnboardingFormValues = {
  consentGivenAt: 1760000000000,
  consentVersion: "2026-10-v1",
  confirmedAge18Plus: true,
  focusGoal: null,
  heightCm: null,
  weightKg: null,
  age: null,
  biologicalSex: null,
  targetWeightKg: null,
  paceTier: null,
  activityLevel: null,
  includeWorkouts: null,
  workoutDaysPerWeek: null,
  availableTrainingTimeMinutes: null,
  preferredTrainingWindow: null,
  equipmentAccess: null,
  trainingExperience: null,
  dietaryPattern: null,
  foodAvoidances: [],
};

describe("Onboarding Wizard Step Navigation & Branching Logic", () => {
  it("navigates forward through standard linear steps", () => {
    expect(getNextStep("step_0_consent", baseValues)).toBe("step_1_focus");
    expect(getNextStep("step_1_focus", baseValues)).toBe("step_2_physical");
  });

  describe("Branching: step_3_pace", () => {
    it("renders step_3_pace when focusGoal is fat_loss", () => {
      const values = { ...baseValues, focusGoal: "fat_loss" as const };
      expect(getNextStep("step_2_physical", values)).toBe("step_3_pace");
      expect(getNextStep("step_3_pace", values)).toBe("step_4_activity");
      expect(getPrevStep("step_4_activity", values)).toBe("step_3_pace");
      expect(getPrevStep("step_3_pace", values)).toBe("step_2_physical");
    });

    it("renders step_3_pace when focusGoal is muscle_gain", () => {
      const values = { ...baseValues, focusGoal: "muscle_gain" as const };
      expect(getNextStep("step_2_physical", values)).toBe("step_3_pace");
      expect(getNextStep("step_3_pace", values)).toBe("step_4_activity");
    });

    it("skips step_3_pace when focusGoal is vitality_health", () => {
      const values = { ...baseValues, focusGoal: "vitality_health" as const };
      expect(getNextStep("step_2_physical", values)).toBe("step_4_activity");
      expect(getPrevStep("step_4_activity", values)).toBe("step_2_physical");
    });

    it("skips step_3_pace when focusGoal is habit_routine", () => {
      const values = { ...baseValues, focusGoal: "habit_routine" as const };
      expect(getNextStep("step_2_physical", values)).toBe("step_4_activity");
      expect(getPrevStep("step_4_activity", values)).toBe("step_2_physical");
    });
  });

  describe("Branching: step_6_workout_env", () => {
    it("renders step_6_workout_env when includeWorkouts is true", () => {
      const values = { ...baseValues, includeWorkouts: true };
      expect(getNextStep("step_5_workout_rhythm", values)).toBe("step_6_workout_env");
      expect(getNextStep("step_6_workout_env", values)).toBe("step_7_diet");
      expect(getPrevStep("step_7_diet", values)).toBe("step_6_workout_env");
      expect(getPrevStep("step_6_workout_env", values)).toBe("step_5_workout_rhythm");
    });

    it("skips step_6_workout_env when includeWorkouts is false", () => {
      const values = { ...baseValues, includeWorkouts: false };
      expect(getNextStep("step_5_workout_rhythm", values)).toBe("step_7_diet");
      expect(getPrevStep("step_7_diet", values)).toBe("step_5_workout_rhythm");
    });

    it("skips step_6_workout_env when includeWorkouts is null", () => {
      const values = { ...baseValues, includeWorkouts: null };
      expect(getNextStep("step_5_workout_rhythm", values)).toBe("step_7_diet");
      expect(getPrevStep("step_7_diet", values)).toBe("step_5_workout_rhythm");
    });
  });

  describe("Terminal Steps Progression", () => {
    it("advances from diet to health and health to reveal", () => {
      expect(getNextStep("step_7_diet", baseValues)).toBe("step_8_health");
      expect(getNextStep("step_8_health", baseValues)).toBe("step_9_reveal");
      expect(getNextStep("step_9_reveal", baseValues)).toBeNull();
    });

    it("recedes backwards gracefully", () => {
      expect(getPrevStep("step_9_reveal", baseValues)).toBe("step_8_health");
      expect(getPrevStep("step_8_health", baseValues)).toBe("step_7_diet");
      expect(getPrevStep("step_0_consent", baseValues)).toBeNull();
    });
  });
});

