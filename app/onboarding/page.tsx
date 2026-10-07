"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useOnboardingWizard } from "@/components/onboarding/useOnboardingWizard";
import { StepConsent } from "@/components/onboarding/StepConsent";
import { StepFocus } from "@/components/onboarding/StepFocus";
import { StepPhysical } from "@/components/onboarding/StepPhysical";
import { StepPace } from "@/components/onboarding/StepPace";
import { StepActivity } from "@/components/onboarding/StepActivity";
import { StepWorkoutRhythm } from "@/components/onboarding/StepWorkoutRhythm";
import { StepWorkoutEnv } from "@/components/onboarding/StepWorkoutEnv";
import { StepDiet } from "@/components/onboarding/StepDiet";
import { StepHealth } from "@/components/onboarding/StepHealth";
import { StepReveal } from "@/components/onboarding/StepReveal";
import { CANONICAL_STEPS } from "@/lib/onboarding/constants";
import { Loader2 } from "lucide-react";

function OnboardingContent() {
  const searchParams = useSearchParams();
  const isUpdateMode = searchParams.get("mode") === "update";

  const {
    state,
    updateFormField,
    setHealthConditions,
    handleNext,
    handleBack,
    handleSkip,
    handleConfirmUpdate,
  } = useOnboardingWizard({ isUpdateMode });

  if (state.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
          <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">
            {isUpdateMode ? "Loading your Satat setup..." : "Initializing Satat..."}
          </p>
        </div>
      </div>
    );
  }

  const currentStepIndex = CANONICAL_STEPS.indexOf(state.currentStep);
  const totalSteps = CANONICAL_STEPS.length;
  const isRevealStep = state.currentStep === "step_9_reveal";
  const progressPercent = Math.min(
    100,
    Math.round(((currentStepIndex + 1) / totalSteps) * 100)
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col justify-between py-6 px-4 sm:px-6">
      <div className="w-full max-w-2xl mx-auto space-y-6">
        {/* Top Progress Bar & Header (Hidden on reveal step) */}
        {!isRevealStep && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              <span className="text-primary-600 dark:text-primary-400 font-black">
                {isUpdateMode ? "Satat · Update" : "Satat"}
              </span>
              <span>
                Step {currentStepIndex + 1} of {totalSteps}
              </span>
            </div>
            <div className="h-1.5 w-full bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary-500 transition-all duration-300 ease-out rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Global Error Banner */}
        {state.error && (
          <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-600 dark:text-red-300 font-medium text-center">
            {state.error}
          </div>
        )}

        {/* Wizard Card Body */}
        <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200/80 dark:border-gray-800 p-6 sm:p-8 shadow-sm">
          {state.currentStep === "step_0_consent" && (
            <StepConsent
              formValues={state.formValues}
              updateFormField={updateFormField}
              onNext={handleNext}
              isSaving={state.isSaving}
            />
          )}

          {state.currentStep === "step_1_focus" && (
            <StepFocus
              formValues={state.formValues}
              updateFormField={updateFormField}
              onNext={handleNext}
              onBack={handleBack}
              isSaving={state.isSaving}
            />
          )}

          {state.currentStep === "step_2_physical" && (
            <StepPhysical
              formValues={state.formValues}
              updateFormField={updateFormField}
              onNext={handleNext}
              onBack={handleBack}
              onSkip={handleSkip}
              isSaving={state.isSaving}
            />
          )}

          {state.currentStep === "step_3_pace" && (
            <StepPace
              formValues={state.formValues}
              updateFormField={updateFormField}
              onNext={handleNext}
              onBack={handleBack}
              onSkip={handleSkip}
              isSaving={state.isSaving}
            />
          )}

          {state.currentStep === "step_4_activity" && (
            <StepActivity
              formValues={state.formValues}
              updateFormField={updateFormField}
              onNext={handleNext}
              onBack={handleBack}
              onSkip={handleSkip}
              isSaving={state.isSaving}
            />
          )}

          {state.currentStep === "step_5_workout_rhythm" && (
            <StepWorkoutRhythm
              formValues={state.formValues}
              updateFormField={updateFormField}
              onNext={handleNext}
              onBack={handleBack}
              isSaving={state.isSaving}
            />
          )}

          {state.currentStep === "step_6_workout_env" && (
            <StepWorkoutEnv
              formValues={state.formValues}
              updateFormField={updateFormField}
              onNext={handleNext}
              onBack={handleBack}
              isSaving={state.isSaving}
            />
          )}

          {state.currentStep === "step_7_diet" && (
            <StepDiet
              formValues={state.formValues}
              updateFormField={updateFormField}
              onNext={handleNext}
              onBack={handleBack}
              onSkip={handleSkip}
              isSaving={state.isSaving}
            />
          )}

          {state.currentStep === "step_8_health" && (
            <StepHealth
              healthConditions={state.healthConditions}
              setHealthConditions={setHealthConditions}
              onNext={handleNext}
              onBack={handleBack}
              isSaving={state.isSaving}
              error={state.error}
            />
          )}

          {state.currentStep === "step_9_reveal" && (
            <StepReveal
              formValues={state.formValues}
              completedResult={state.completedResult}
              isUpdateMode={isUpdateMode}
              onConfirmUpdate={handleConfirmUpdate}
              onBack={handleBack}
              isSaving={state.isSaving}
            />
          )}
        </div>
      </div>

      <footer className="w-full text-center py-4 text-xs text-gray-400 dark:text-gray-600">
        Satat System · Continuity is the Catalyst
      </footer>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
            <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">
              Initializing Satat...
            </p>
          </div>
        </div>
      }
    >
      <OnboardingContent />
    </Suspense>
  );
}
