"use client";

import { Building2, Home, Activity, ChevronRight, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import type { EquipmentAccess } from "@/lib/onboarding/validation";
import type { OnboardingFormValues } from "./types";

interface StepWorkoutEnvProps {
  formValues: OnboardingFormValues;
  updateFormField: <K extends keyof OnboardingFormValues>(key: K, value: OnboardingFormValues[K]) => void;
  onNext: () => void;
  onBack: () => void;
  isSaving: boolean;
}

const EQUIPMENT_OPTIONS: {
  id: EquipmentAccess;
  title: string;
  desc: string;
  icon: typeof Building2;
}[] = [
  {
    id: "commercial_gym",
    title: "Commercial / Full Gym",
    desc: "Barbells, dumbbells, cable machines, squat racks, and weight machines.",
    icon: Building2,
  },
  {
    id: "home_dumbbells",
    title: "Home with Dumbbells & Bench",
    desc: "Adjustable or fixed dumbbells, resistance bands, and a flat bench.",
    icon: Home,
  },
  {
    id: "bodyweight_only",
    title: "Anywhere / Bodyweight",
    desc: "No equipment required. Calisthenics, core exercises, and floor movements.",
    icon: Activity,
  },
];

export function StepWorkoutEnv({
  formValues,
  updateFormField,
  onNext,
  onBack,
  isSaving,
}: StepWorkoutEnvProps) {
  const selectedEquip = formValues.equipmentAccess;
  const canProceed = Boolean(selectedEquip);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center space-y-2">
        <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
          Where will you do your workouts?
        </h1>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 max-w-md mx-auto">
          We tailor your exercise selection and movement progressions to match your equipment.
        </p>
      </div>

      <div className="space-y-3 max-w-xl mx-auto">
        {EQUIPMENT_OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const isSelected = selectedEquip === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => updateFormField("equipmentAccess", opt.id)}
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
                <div className="font-bold text-sm text-gray-900 dark:text-white">
                  {opt.title}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium">
                  {opt.desc}
                </div>
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

        <button
          type="button"
          onClick={onNext}
          disabled={!canProceed || isSaving}
          className="px-6 py-2.5 rounded-xl bg-primary-600 text-white font-bold text-sm shadow-md hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-2"
        >
          <span>{isSaving ? "Saving..." : "Continue"}</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
