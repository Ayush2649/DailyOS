"use client";

import { Flame, Dumbbell, Heart, CalendarCheck, ChevronRight, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FocusGoal } from "@/lib/onboarding/validation";
import type { OnboardingFormValues } from "./types";

interface StepFocusProps {
  formValues: OnboardingFormValues;
  updateFormField: <K extends keyof OnboardingFormValues>(key: K, value: OnboardingFormValues[K]) => void;
  onNext: () => void;
  onBack: () => void;
  isSaving: boolean;
}

const FOCUS_OPTIONS: {
  id: FocusGoal;
  title: string;
  description: string;
  icon: typeof Flame;
  color: string;
}[] = [
  {
    id: "fat_loss",
    title: "Build a Leaner Body",
    description: "Reduce body fat sustainably while protecting energy and muscle.",
    icon: Flame,
    color: "text-amber-500 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/40",
  },
  {
    id: "muscle_gain",
    title: "Build Strength & Muscle",
    description: "Fuel training performance and progressive overload.",
    icon: Dumbbell,
    color: "text-blue-500 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800/40",
  },
  {
    id: "vitality_health",
    title: "Boost Daily Energy & Health",
    description: "Maintain a steady weight, eat cleaner, and move consistently.",
    icon: Heart,
    color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/40",
  },
  {
    id: "habit_routine",
    title: "Build Consistent Habits",
    description: "Establish a structured daily rhythm for meals, workouts, and sleep.",
    icon: CalendarCheck,
    color: "text-purple-500 bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800/40",
  },
];

export function StepFocus({
  formValues,
  updateFormField,
  onNext,
  onBack,
  isSaving,
}: StepFocusProps) {
  const selected = formValues.focusGoal;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center space-y-2">
        <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
          What is your main focus for the next 12 weeks?
        </h1>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 max-w-md mx-auto">
          This helps Satat shape your starting routine and daily energy estimates.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
        {FOCUS_OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const isSelected = selected === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => updateFormField("focusGoal", opt.id)}
              className={cn(
                "p-4 rounded-2xl border text-left transition-all duration-200 flex flex-col justify-between gap-3",
                isSelected
                  ? "border-primary-600 bg-primary-50/60 dark:bg-primary-950/30 ring-2 ring-primary-500 shadow-sm"
                  : "border-gray-200 dark:border-gray-700/80 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-xs"
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn("p-2.5 rounded-xl border", opt.color)}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="font-bold text-gray-900 dark:text-white text-base">
                  {opt.title}
                </div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium leading-relaxed">
                {opt.description}
              </p>
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

        <button
          type="button"
          onClick={onNext}
          disabled={!selected || isSaving}
          className="px-6 py-2.5 rounded-xl bg-primary-600 text-white font-bold text-sm shadow-md hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-2"
        >
          <span>{isSaving ? "Saving..." : "Continue"}</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

