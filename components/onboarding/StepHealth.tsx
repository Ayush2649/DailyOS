"use client";

import { AlertTriangle, Shield, HeartPulse, ChevronRight, ChevronLeft, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import type { HealthCondition } from "@/lib/onboarding/validation";

interface StepHealthProps {
  healthConditions: HealthCondition[];
  setHealthConditions: (conditions: HealthCondition[]) => void;
  onNext: () => void;
  onBack: () => void;
  isSaving: boolean;
  error: string | null;
}

const HEALTH_OPTIONS: {
  id: HealthCondition;
  label: string;
  isClinical: boolean;
}[] = [
  { id: "pregnant_breastfeeding", label: "Currently pregnant or breastfeeding", isClinical: true },
  { id: "diabetes", label: "Diagnosed Type 1 or Type 2 Diabetes", isClinical: true },
  { id: "cardiovascular", label: "Cardiovascular or heart condition", isClinical: true },
  { id: "disordered_eating", label: "History of disordered eating", isClinical: true },
  { id: "physical_injury", label: "Physical injury limiting movement", isClinical: false },
  { id: "none", label: "None of the above", isClinical: false },
];

export function StepHealth({
  healthConditions,
  setHealthConditions,
  onNext,
  onBack,
  isSaving,
  error,
}: StepHealthProps) {
  const handleToggle = (id: HealthCondition) => {
    if (id === "none") {
      // Selecting none clears all others
      setHealthConditions(["none"]);
      return;
    }

    // Selecting a specific condition removes "none"
    const next = healthConditions.filter((c) => c !== "none");
    if (next.includes(id)) {
      setHealthConditions(next.filter((c) => c !== id));
    } else {
      setHealthConditions([...next, id]);
    }
  };

  const hasClinicalCondition = healthConditions.some((c) =>
    ["pregnant_breastfeeding", "diabetes", "cardiovascular", "disordered_eating"].includes(c)
  );
  const hasPhysicalInjury = healthConditions.includes("physical_injury");
  const hasSelection = healthConditions.length > 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center space-y-2">
        <div className="inline-flex p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 mb-2">
          <HeartPulse className="w-8 h-8" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
          Do you have any conditions requiring gentle, supervised guidance?
        </h1>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 max-w-md mx-auto">
          Held strictly in memory for safety checks and immediately discarded. Never saved to drafts or logged.
        </p>
      </div>

      <div className="space-y-3 max-w-md mx-auto pt-2">
        {HEALTH_OPTIONS.map((opt) => {
          const isChecked = healthConditions.includes(opt.id);
          return (
            <label
              key={opt.id}
              className={cn(
                "flex items-start gap-3 p-3.5 rounded-xl border transition-all cursor-pointer",
                isChecked
                  ? "border-primary-600 bg-primary-50/60 dark:bg-primary-950/30 ring-2 ring-primary-500"
                  : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600"
              )}
            >
              <input
                type="checkbox"
                checked={isChecked}
                onChange={() => handleToggle(opt.id)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
              />
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                {opt.label}
              </span>
            </label>
          );
        })}
      </div>

      {/* Dynamic guidance notices */}
      {hasClinicalCondition && (
        <div className="max-w-md mx-auto p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 flex items-start gap-3 animate-fade-in">
          <Shield className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-900 dark:text-amber-200 font-medium leading-relaxed">
            Satat prioritizes your safety. Single-point calorie targets and intensive deficit paces will be withheld, pivoting to mindful habit tracking and whole-food nourishment.
          </p>
        </div>
      )}

      {hasPhysicalInjury && !hasClinicalCondition && (
        <div className="max-w-md mx-auto p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 flex items-start gap-3 animate-fade-in">
          <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-900 dark:text-blue-200 font-medium leading-relaxed">
            Automated starter workout routines will be withheld to protect your recovery. Please consult your physiotherapist for rehabilitation exercises. Daily nutrition tracking remains active.
          </p>
        </div>
      )}

      {error && (
        <div className="max-w-md mx-auto p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-xs text-red-600 dark:text-red-300 font-medium text-center">
          {error}
        </div>
      )}

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
          disabled={!hasSelection || isSaving}
          className="px-6 py-2.5 rounded-xl bg-primary-600 text-white font-bold text-sm shadow-md hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-2"
        >
          <span>{isSaving ? "Completing Setup..." : "Generate System Baseline"}</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
