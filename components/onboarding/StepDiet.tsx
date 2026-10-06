"use client";

import { Salad, Egg, Beef, Leaf, Utensils, ChevronRight, ChevronLeft, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DietaryPattern } from "@/lib/onboarding/validation";
import type { OnboardingFormValues } from "./types";

interface StepDietProps {
  formValues: OnboardingFormValues;
  updateFormField: <K extends keyof OnboardingFormValues>(key: K, value: OnboardingFormValues[K]) => void;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
  isSaving: boolean;
}

const DIET_OPTIONS: {
  id: DietaryPattern;
  title: string;
  desc: string;
  icon: typeof Salad;
}[] = [
  {
    id: "vegetarian",
    title: "Vegetarian",
    desc: "Dairy included, plant-forward. No meat or eggs.",
    icon: Salad,
  },
  {
    id: "eggetarian",
    title: "Eggetarian",
    desc: "Eggs and dairy included alongside plants. No meat.",
    icon: Egg,
  },
  {
    id: "non_vegetarian",
    title: "Non-Vegetarian",
    desc: "Includes poultry, fish, meat, dairy, and plants.",
    icon: Beef,
  },
  {
    id: "vegan",
    title: "Vegan",
    desc: "100% plant-based. No meat, dairy, eggs, or animal products.",
    icon: Leaf,
  },
  {
    id: "anything",
    title: "No Specific Restriction",
    desc: "Open to all cuisines, recipes, and ingredients.",
    icon: Utensils,
  },
];

const COMMON_AVOIDANCES = [
  "Lactose / Dairy",
  "Gluten",
  "Nuts",
  "Soy",
  "Seafood",
];

export function StepDiet({
  formValues,
  updateFormField,
  onNext,
  onBack,
  onSkip,
  isSaving,
}: StepDietProps) {
  const selectedPattern = formValues.dietaryPattern;
  const currentAvoidances = formValues.foodAvoidances || [];

  const handleToggleAvoidance = (tag: string) => {
    if (currentAvoidances.includes(tag)) {
      updateFormField(
        "foodAvoidances",
        currentAvoidances.filter((t) => t !== tag)
      );
    } else {
      updateFormField("foodAvoidances", [...currentAvoidances, tag]);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center space-y-2">
        <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
          What is your everyday eating style?
        </h1>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 max-w-md mx-auto">
          Helps Satat balance your protein sources and calibrate personalized meal suggestions.
        </p>
      </div>

      <div className="space-y-5 max-w-xl mx-auto">
        {/* Dietary Pattern */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-2">
            Everyday Diet
          </label>
          <div className="space-y-2">
            {DIET_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const isSelected = selectedPattern === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => updateFormField("dietaryPattern", opt.id)}
                  className={cn(
                    "w-full p-3.5 rounded-xl border text-left transition-all flex items-center gap-3.5",
                    isSelected
                      ? "border-primary-600 bg-primary-50/60 dark:bg-primary-950/30 ring-2 ring-primary-500 shadow-xs"
                      : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600"
                  )}
                >
                  <div
                    className={cn(
                      "p-2 rounded-lg shrink-0",
                      isSelected
                        ? "bg-primary-100 dark:bg-primary-900/60 text-primary-600 dark:text-primary-300"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-sm text-gray-900 dark:text-white">
                      {opt.title}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {opt.desc}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Food Avoidances */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-2">
            Common Food Avoidances (Optional)
          </label>
          <div className="flex flex-wrap gap-2">
            {COMMON_AVOIDANCES.map((tag) => {
              const isChecked = currentAvoidances.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleToggleAvoidance(tag)}
                  className={cn(
                    "px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5",
                    isChecked
                      ? "border-primary-600 bg-primary-500 text-white shadow-xs"
                      : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600"
                  )}
                >
                  {isChecked && <Check className="w-3.5 h-3.5" />}
                  <span>{tag}</span>
                </button>
              );
            })}
          </div>
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

