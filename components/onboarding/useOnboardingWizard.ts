"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { CANONICAL_STEPS, CanonicalStep, CONSENT_VERSION } from "@/lib/onboarding/constants";
import type { OnboardingFormValues, OnboardingWizardState } from "./types";
import type { HealthCondition } from "@/lib/onboarding/validation";

const initialFormValues: OnboardingFormValues = {
  consentGivenAt: null,
  consentVersion: null,
  confirmedAge18Plus: false,
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

export function getNextStep(
  current: CanonicalStep,
  values: OnboardingFormValues
): CanonicalStep | null {
  const currentIndex = CANONICAL_STEPS.indexOf(current);
  for (let i = currentIndex + 1; i < CANONICAL_STEPS.length; i++) {
    const candidate = CANONICAL_STEPS[i];
    // Branch: pace step is only for fat loss and muscle gain
    if (
      candidate === "step_3_pace" &&
      values.focusGoal !== "fat_loss" &&
      values.focusGoal !== "muscle_gain"
    ) {
      continue;
    }
    // Branch: workout env is only for users including workouts
    if (
      candidate === "step_6_workout_env" &&
      values.includeWorkouts !== true
    ) {
      continue;
    }
    return candidate;
  }
  return null;
}

export function getPrevStep(
  current: CanonicalStep,
  values: OnboardingFormValues
): CanonicalStep | null {
  const currentIndex = CANONICAL_STEPS.indexOf(current);
  for (let i = currentIndex - 1; i >= 0; i--) {
    const candidate = CANONICAL_STEPS[i];
    if (
      candidate === "step_3_pace" &&
      values.focusGoal !== "fat_loss" &&
      values.focusGoal !== "muscle_gain"
    ) {
      continue;
    }
    if (
      candidate === "step_6_workout_env" &&
      values.includeWorkouts !== true
    ) {
      continue;
    }
    return candidate;
  }
  return null;
}

export function useOnboardingWizard() {
  const router = useRouter();

  const [state, setState] = useState<OnboardingWizardState>({
    currentStep: "step_0_consent",
    formValues: initialFormValues,
    healthConditions: [],
    isLoading: true,
    isSaving: false,
    error: null,
    completedResult: null,
  });

  // Fetch initial status and draft from API
  useEffect(() => {
    let isMounted = true;

    async function loadStatus() {
      try {
        const res = await fetch("/api/onboarding/status");
        if (!res.ok) {
          if (res.status === 401) {
            router.replace("/login");
            return;
          }
          throw new Error("Failed to load onboarding status");
        }

        const data = await res.json();
        if (!isMounted) return;

        const isCompleted = Boolean(data.completed ?? data.onboarded);
        if (isCompleted) {
          router.replace("/dashboard");
          return;
        }

        const restoredStep = data.lastStep ?? data.canonicalStep ?? "step_0_consent";
        const restoredDraft = data.draftBaseline ?? data.draft ?? null;

        if (restoredDraft) {
          const hasConfirmedAge = Boolean(restoredDraft.confirmedAge18Plus);
          const hasConsentTimestamp =
            typeof restoredDraft.consentGivenAt === "number" && restoredDraft.consentGivenAt > 0;
          const hasConsent = hasConfirmedAge && hasConsentTimestamp;

          // If consent is missing in draft, return user to step_0_consent
          const effectiveStep =
            hasConsent && restoredStep !== "step_0_consent"
              ? restoredStep
              : "step_0_consent";

          setState((prev) => ({
            ...prev,
            currentStep: effectiveStep,
            formValues: {
              ...prev.formValues,
              ...restoredDraft,
              confirmedAge18Plus: hasConsent ? true : false,
              consentGivenAt: hasConsent ? restoredDraft.consentGivenAt : null,
              consentVersion: hasConsent ? (restoredDraft.consentVersion || CONSENT_VERSION) : null,
            },
            isLoading: false,
          }));
        } else {
          setState((prev) => ({
            ...prev,
            currentStep: "step_0_consent",
            isLoading: false,
          }));
        }
      } catch (err: any) {
        if (isMounted) {
          setState((prev) => ({
            ...prev,
            isLoading: false,
            error: err.message || "Failed to initialize onboarding",
          }));
        }
      }
    }

    loadStatus();

    return () => {
      isMounted = false;
    };
  }, [router]);

  // Update a single form field
  const updateFormField = useCallback(
    <K extends keyof OnboardingFormValues>(key: K, value: OnboardingFormValues[K]) => {
      setState((prev) => ({
        ...prev,
        formValues: {
          ...prev.formValues,
          [key]: value,
        },
        error: null,
      }));
    },
    []
  );

  // Update health screening selection (strictly in-memory)
  const setHealthConditions = useCallback((conditions: HealthCondition[]) => {
    setState((prev) => ({
      ...prev,
      healthConditions: conditions,
      error: null,
    }));
  }, []);

  // Save intermediate draft to /api/onboarding/progress
  const saveDraftProgress = useCallback(
    async (nextStep: CanonicalStep, updatedValues: OnboardingFormValues) => {
      try {
        setState((prev) => ({ ...prev, isSaving: true, error: null }));

        // Privacy assertion: zero health data in draft payload
        const payload = {
          currentStep: nextStep,
          draft: {
            consentGivenAt: updatedValues.consentGivenAt ?? undefined,
            consentVersion: updatedValues.consentVersion ?? undefined,
            confirmedAge18Plus: updatedValues.confirmedAge18Plus ?? undefined,
            focusGoal: updatedValues.focusGoal ?? undefined,
            heightCm: updatedValues.heightCm ?? undefined,
            weightKg: updatedValues.weightKg ?? undefined,
            age: updatedValues.age ?? undefined,
            biologicalSex: updatedValues.biologicalSex ?? undefined,
            targetWeightKg: updatedValues.targetWeightKg ?? undefined,
            paceTier: updatedValues.paceTier ?? undefined,
            activityLevel: updatedValues.activityLevel ?? undefined,
            dietaryPattern: updatedValues.dietaryPattern ?? undefined,
            foodAvoidances: updatedValues.foodAvoidances,
            includeWorkouts: updatedValues.includeWorkouts ?? undefined,
            workoutDaysPerWeek: updatedValues.workoutDaysPerWeek ?? undefined,
            availableTrainingTimeMinutes: updatedValues.availableTrainingTimeMinutes ?? undefined,
            preferredTrainingWindow: updatedValues.preferredTrainingWindow ?? undefined,
            trainingExperience: updatedValues.trainingExperience ?? undefined,
            equipmentAccess: updatedValues.equipmentAccess ?? undefined,
          },
        };

        const res = await fetch("/api/onboarding/progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || "Failed to save progress");
        }

        setState((prev) => ({
          ...prev,
          currentStep: nextStep,
          isSaving: false,
        }));
      } catch (err: any) {
        setState((prev) => ({
          ...prev,
          isSaving: false,
          error: err.message || "Failed to save draft progress",
        }));
      }
    },
    []
  );

  // Go to next step
  const handleNext = useCallback(
    async (overrides?: Partial<OnboardingFormValues>) => {
      const currentStep = state.currentStep;
      const formValues = overrides ? { ...state.formValues, ...overrides } : state.formValues;
      const healthConditions = state.healthConditions;

      if (overrides) {
        setState((prev) => ({
          ...prev,
          formValues: { ...prev.formValues, ...overrides },
        }));
      }

      // Check age bounds for under-18 exit
      if (formValues.age !== null && formValues.age < 18) {
        router.replace("/onboarding/under-18");
        return;
      }

      // Step 8 -> Step 9 requires completion submission
      if (currentStep === "step_8_health") {
        if (healthConditions.length === 0) {
          setState((prev) => ({
            ...prev,
            error: "Please select an applicable condition or 'None of the above'.",
          }));
          return;
        }

        // Legal consent verification: user MUST have explicitly confirmed on Step 0
        // Never manufacture consent! If not confirmed, route back to Step 0 consent.
        if (!formValues.confirmedAge18Plus) {
          setState((prev) => ({
            ...prev,
            currentStep: "step_0_consent",
            isSaving: false,
            error: "You must confirm that you are 18 years of age or older before proceeding.",
          }));
          return;
        }

        try {
          setState((prev) => ({ ...prev, isSaving: true, error: null }));

          const consentTimestamp =
            typeof formValues.consentGivenAt === "number" && formValues.consentGivenAt > 0
              ? formValues.consentGivenAt
              : Date.now();

          const completePayload = {
            consentGivenAt: consentTimestamp,
            consentVersion: formValues.consentVersion || CONSENT_VERSION,
            confirmedAge18Plus: formValues.confirmedAge18Plus,
            baseline: {
              focusGoal: formValues.focusGoal,
              heightCm: formValues.heightCm,
              weightKg: formValues.weightKg,
              age: formValues.age,
              biologicalSex: formValues.biologicalSex,
              targetWeightKg: formValues.targetWeightKg,
              paceTier: formValues.paceTier,
              activityLevel: formValues.activityLevel,
              dietaryPattern: formValues.dietaryPattern,
              foodAvoidances: formValues.foodAvoidances,
              includeWorkouts: formValues.includeWorkouts ?? false,
              workoutDaysPerWeek: formValues.workoutDaysPerWeek,
              availableTrainingTimeMinutes: formValues.availableTrainingTimeMinutes,
              preferredTrainingWindow: formValues.preferredTrainingWindow,
              trainingExperience: formValues.trainingExperience,
              equipmentAccess: formValues.equipmentAccess,
            },
            healthScreening: {
              selectedConditions: healthConditions,
            },
          };

          const res = await fetch("/api/onboarding/complete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(completePayload),
          });

          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            if (res.status === 422) {
              router.replace("/onboarding/under-18");
              return;
            }
            throw new Error(errData.error || "Failed to complete onboarding");
          }

          const result = await res.json();

          setState((prev) => ({
            ...prev,
            currentStep: "step_9_reveal",
            completedResult: result,
            isSaving: false,
          }));
        } catch (err: any) {
          setState((prev) => ({
            ...prev,
            isSaving: false,
            error: err.message || "Failed to complete onboarding",
          }));
        }
        return;
      }

      const nextStep = getNextStep(currentStep, formValues);
      if (!nextStep) return;

      await saveDraftProgress(nextStep, formValues);
    },
    [state, router, saveDraftProgress]
  );

  // Go to previous step
  const handleBack = useCallback(() => {
    const { currentStep, formValues } = state;
    if (currentStep === "step_0_consent" || currentStep === "step_9_reveal") {
      return;
    }

    const prevStep = getPrevStep(currentStep, formValues);
    if (prevStep) {
      setState((prev) => ({
        ...prev,
        currentStep: prevStep,
        error: null,
      }));
    }
  }, [state]);

  // Skip step (sets optional fields to null and moves to next)
  const handleSkip = useCallback(async () => {
    const { currentStep, formValues } = state;
    const nextStep = getNextStep(currentStep, formValues);
    if (!nextStep) return;

    await saveDraftProgress(nextStep, formValues);
  }, [state, saveDraftProgress]);

  return {
    state,
    updateFormField,
    setHealthConditions,
    handleNext,
    handleBack,
    handleSkip,
  };
}
