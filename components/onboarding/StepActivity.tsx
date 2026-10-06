"use client";

import { Armchair, Footprints, Briefcase, Zap, ChevronRight, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ActivityLevel } from "@/lib/onboarding/validation";
import type { OnboardingFormValues } from "./types";

interface StepActivityProps {
  formValues: OnboardingFormValues;
  updateFormField: <K extends keyof OnboardingFormValues>(key: K, value: OnboardingFormValues[K]) => void;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
  isSaving: boolean;
}

const ACTIVITY_OPTIONS: {
  id: ActivityLevel;
  title: string;
  subtitle: string;
  description: string;
  icon: typeof Armchair;
}[] = [
  {
    id: "sedentary",
    title: "Mostly Seated",
    subtitle: "Desk job, remote work, driving, reading",
    description: "Typical daily movement is minimal outside intentional exercise sessions.",
    icon: Armchair,
  },
  {
    id: "lightly_active",
    title: "On Your Feet Part-Time",
    subtitle: "5,000 – 8,000 steps / day",
    description: "Teaching, retail, light household activities, walking errands.",
    icon: Footprints,
  },
  {
    id: "moderately_active",
    title: "Constantly Moving",
    subtitle: "10,000+ steps / day",
    description: "Active commute, hospitality, busy childcare, trades, regular standing.",
    icon: Briefcase,
  },
  {
    id: "very_active",
    title: "Physically Demanding",
    subtitle: "Heavy physical labor / high exertion",
    description: "Construction, agriculture, manual labor, or multi-hour daily athletic work.",
    icon: Zap,
  },
];

export function StepActivity({
  formValues,
  updateFormField,
  onNext,
  onBack,
  onSkip,
  isSaving,
}: StepActivityProps) {
  const selected = formValues.activityLevel;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center space-y-2">
        <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
          How does your body move during a typical day?
        </h1>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 max-w-md mx-auto">
          Your daily work and commuting routine accounts for far more energy burn than a 45-minute workout.
        </p>
      </div>

      <div className="space-y-3 max-w-xl mx-auto pt-2">
        {ACTIVITY_OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const isSelected = selected === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => updateFormField("activityLevel", opt.id)}
              className={cn(
                "w-full p-4 rounded-2xl border text-left transition-all duration-200 flex items-start gap-4",
                isSelected
                  ? "border-primary-600 bg-primary-50/60 dark:bg-primary-950/30 ring-2 ring-primary-500 shadow-xs"
                  : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600"
              )}
            >
              <div
                className={cn(
                  "p-2.5 rounded-xl border shrink-0 mt-0.5",
                  isSelected
                    ? "bg-primary-100 dark:bg-primary-900/60 text-primary-600 dark:text-primary-300 border-primary-200"
                    : "bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-600"
                )}
              >
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-gray-900 dark:text-white text-base">
                    {opt.title}
                  </span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                    {opt.subtitle}
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium">
                  {opt.description}
                </p>
              </div>
            </button>
          );
        })}
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
            Skip for now
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

