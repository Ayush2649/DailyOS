"use client";

import { useState } from "react";
import { ChevronRight, ChevronLeft, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PaceTier } from "@/lib/onboarding/validation";
import type { OnboardingFormValues } from "./types";

interface StepPaceProps {
  formValues: OnboardingFormValues;
  updateFormField: <K extends keyof OnboardingFormValues>(key: K, value: OnboardingFormValues[K]) => void;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
  isSaving: boolean;
}

const FAT_LOSS_TIERS: {
  id: PaceTier;
  title: string;
  rateLabel: string;
  description: string;
}[] = [
  {
    id: "relaxed",
    title: "Gentle Pace",
    rateLabel: "~0.23 kg / week",
    description: "Subtle energy shift with minimal hunger. Easiest to maintain indefinitely.",
  },
  {
    id: "steady",
    title: "Steady Pace",
    rateLabel: "~0.36 kg / week",
    description: "Balanced, sustainable fat loss protecting lean muscle and energy.",
  },
  {
    id: "fast",
    title: "Intensive Pace",
    rateLabel: "~0.55 kg / week",
    description: "Structured tracking capped safely at 20% TDEE and 1% body weight per week.",
  },
];

const MUSCLE_GAIN_TIERS: {
  id: PaceTier;
  title: string;
  rateLabel: string;
  description: string;
}[] = [
  {
    id: "relaxed",
    title: "Lean Growth",
    rateLabel: "~0.14 kg / week",
    description: "Focus on minimal fat gain while steadily increasing workout performance.",
  },
  {
    id: "steady",
    title: "Steady Hypertrophy",
    rateLabel: "~0.23 kg / week",
    description: "Balanced strength and hypertrophy supported by a moderate calorie surplus.",
  },
  {
    id: "fast",
    title: "Accelerated Surplus",
    rateLabel: "~0.36 kg / week",
    description: "Higher caloric support for hard-gainers or intensive training phases.",
  },
];

export function StepPace({
  formValues,
  updateFormField,
  onNext,
  onBack,
  onSkip,
  isSaving,
}: StepPaceProps) {
  const isFatLoss = formValues.focusGoal === "fat_loss";
  const tiers = isFatLoss ? FAT_LOSS_TIERS : MUSCLE_GAIN_TIERS;
  const selectedPace = formValues.paceTier;

  const [targetWeightInput, setTargetWeightInput] = useState<string>(
    formValues.targetWeightKg ? String(formValues.targetWeightKg) : ""
  );

  const handleTargetWeightChange = (val: string) => {
    setTargetWeightInput(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0) {
      updateFormField("targetWeightKg", Math.round(num * 10) / 10);
    } else {
      updateFormField("targetWeightKg", null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center space-y-2">
        <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
          How would you like to pace your journey?
        </h1>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 max-w-md mx-auto">
          Satat prioritizes consistency over aggressive speed. Slower paces protect lean muscle and hormone health.
        </p>
      </div>

      <div className="max-w-md mx-auto space-y-4">
        {/* Optional Target Weight */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-1.5">
            Target Body Weight (Optional, kg)
          </label>
          <input
            type="number"
            placeholder={formValues.weightKg ? `e.g. ${formValues.weightKg}` : "e.g. 68"}
            value={targetWeightInput}
            onChange={(e) => handleTargetWeightChange(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-medium text-sm focus:ring-2 focus:ring-primary-500 outline-hidden"
          />
          <p className="mt-1 text-[11px] text-gray-400">
            Leave blank if you prefer focusing purely on feeling and performance.
          </p>
        </div>

        {/* Pace Selection Cards */}
        <div className="space-y-3 pt-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300">
            Select Your Preferred Pace
          </label>
          {tiers.map((tier) => {
            const isSelected = selectedPace === tier.id;
            return (
              <button
                key={tier.id}
                type="button"
                onClick={() => updateFormField("paceTier", tier.id)}
                className={cn(
                  "w-full p-4 rounded-xl border text-left transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2",
                  isSelected
                    ? "border-primary-600 bg-primary-50/60 dark:bg-primary-950/30 ring-2 ring-primary-500 shadow-xs"
                    : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600"
                )}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900 dark:text-white text-sm">
                      {tier.title}
                    </span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-primary-100 dark:bg-primary-900/60 text-primary-700 dark:text-primary-300">
                      {tier.rateLabel}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {tier.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="pt-4 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 rounded-xl text-sm font-bold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white flex items-center gap-1.5 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onSkip}
            className="text-xs font-bold text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 underline underline-offset-2"
          >
            Skip pace setting
          </button>

          <button
            type="button"
            onClick={onNext}
            disabled={isSaving}
            className="px-6 py-2.5 rounded-xl bg-primary-600 text-white font-bold text-sm shadow-md hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-2"
          >
            <span>{isSaving ? "Saving..." : "Continue"}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

