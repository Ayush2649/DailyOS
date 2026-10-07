"use client";

import { useState } from "react";
import { Dumbbell, Clock, Sun, Target, Sparkles, RefreshCw, Apple, CheckCircle2, ArrowRight, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import type { OnboardingFormValues } from "./types";

interface StepRevealProps {
  formValues: OnboardingFormValues;
  completedResult: {
    systemRhythm?: {
      focusGoal?: string;
      nutritionStatus?: string;
      targetCalories?: number | null;
      proteinGrams?: number | null;
      carbGrams?: number | null;
      fatGrams?: number | null;
      healthSensitivityMode?: boolean;
    };
    starterRoutine?: {
      name: string;
      templateIds: string[];
    } | null;
  } | null;
  isUpdateMode?: boolean;
  onConfirmUpdate?: () => Promise<void> | void;
  onBack?: () => void;
  isSaving?: boolean;
}

export function StepReveal({
  formValues,
  completedResult,
  isUpdateMode = false,
  onConfirmUpdate,
  onBack,
  isSaving = false,
}: StepRevealProps) {
  const [isActivating, setIsActivating] = useState(false);

  const handleActivate = () => {
    setIsActivating(true);
    // Mark tour as dismissed so freshly onboarded user is not hit with an immediate modal on arrival
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("satat_tour_v1", "1");
        localStorage.setItem("dailyos_tour_v1", "1");
      } catch { /* storage restricted */ }
    }
    // Hard navigate to dashboard so layout server component re-checks session/firestore
    window.location.href = "/dashboard";
  };

  const rhythm = completedResult?.systemRhythm;
  const routine = completedResult?.starterRoutine;

  // Window label lookup
  const windowLabels: Record<string, string> = {
    morning: "Morning (Reminder: 07:00)",
    afternoon: "Afternoon (Reminder: 12:30)",
    evening: "Evening (Reminder: 18:00)",
    flexible: "Flexible (Self-scheduled)",
  };

  const timeLabels: Record<string, string> = {
    "<20": "<20 min per session",
    "20-30": "20–30 min per session",
    "30-45": "30–45 min per session",
    "45-60": "45–60 min per session",
    "60+": "60+ min per session",
  };

  return (
    <div className="space-y-6 max-w-xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-100 dark:bg-primary-950/60 text-primary-700 dark:text-primary-300 text-xs font-black tracking-widest uppercase">
          {isUpdateMode ? "✦ Satat · Setup Update" : "✦ Satat"}
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight uppercase">
          {isUpdateMode ? "Update your SATAT setup?" : "Your Satat System Is Ready"}
        </h1>
        <p className="text-sm font-medium italic text-gray-500 dark:text-gray-400 max-w-md mx-auto">
          {isUpdateMode
            ? "SATAT will recalculate your plan based on your updated goals and preferences. Your existing activity history will remain intact."
            : "\u201cContinuity is the catalyst. You are building a sustainable, energizing lifestyle.\u201d"}
        </p>
      </div>

      <div className="space-y-4">
        {/* 1. Starting Rhythm */}
        <div className="p-5 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/80 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400">
            <Sparkles className="w-4 h-4" />
            <span>1. Your Starting Rhythm</span>
          </div>
          <div className="space-y-2.5 text-sm">
            <div className="flex items-start gap-3">
              <Dumbbell className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-gray-700 dark:text-gray-300">Movement: </span>
                <span className="font-bold text-gray-900 dark:text-white">
                  {routine ? routine.name : "Intuitive daily movement & habit focus"}
                </span>
              </div>
            </div>

            {formValues.includeWorkouts && formValues.availableTrainingTimeMinutes && (
              <div className="flex items-start gap-3">
                <Clock className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-gray-700 dark:text-gray-300">Time: </span>
                  <span className="font-bold text-gray-900 dark:text-white">
                    {timeLabels[formValues.availableTrainingTimeMinutes] || "30–45 min per session"}
                  </span>
                </div>
              </div>
            )}

            {formValues.preferredTrainingWindow && (
              <div className="flex items-start gap-3">
                <Sun className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-gray-700 dark:text-gray-300">Preferred Window: </span>
                  <span className="font-bold text-gray-900 dark:text-white">
                    {windowLabels[formValues.preferredTrainingWindow] || "Flexible"}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 2. First Consistency Goal */}
        <div className="p-5 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/80 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            <Target className="w-4 h-4" />
            <span>2. Your First Consistency Goal</span>
          </div>
          <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed font-medium">
            🎯 <span className="font-bold text-gray-900 dark:text-white">Today&apos;s Mission: </span>
            {formValues.includeWorkouts
              ? "Log your first meal or review Session A in your workout board."
              : "Log your first meal and establish your daily meal routine."}
          </p>
        </div>

        {/* 3. How Satat Will Adapt With You */}
        <div className="p-5 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/60 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400">
              <RefreshCw className="w-3.5 h-3.5" />
              <span>3. How Satat Will Adapt With You</span>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
              Coming Soon
            </span>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed font-medium">
            Over time, Satat&apos;s weekly reflection (Sundays 19:00) will learn from your consistency to tune your plan.
          </p>
        </div>

        {/* 4. Nutrition Baseline (Secondary) */}
        <div className="p-5 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/80 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
            <Apple className="w-4 h-4" />
            <span>4. Nutrition Baseline (Estimate)</span>
          </div>

          {rhythm?.nutritionStatus === "calculated" && rhythm.targetCalories ? (
            <div className="space-y-2 text-sm">
              <p className="font-bold text-gray-900 dark:text-white text-base">
                Daily Energy Baseline: ~{rhythm.targetCalories} kcal / day
              </p>
              <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                <p>• Protein Baseline: ~{rhythm.proteinGrams}g / day</p>
                <p>• Balanced Carbohydrates & Fats for daily energy</p>
              </div>
            </div>
          ) : rhythm?.nutritionStatus === "deferred_omitted_data" && (!formValues.biologicalSex || formValues.biologicalSex === "prefer_not_to_say") ? (
            <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
              <p className="font-bold text-gray-800 dark:text-gray-200 text-sm">
                Uncertainty Range Active
              </p>
              <p>
                Because biological sex was omitted, Satat established an estimated range rather than a single fixed target.
              </p>
            </div>
          ) : rhythm?.healthSensitivityMode ? (
            <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
              <p className="font-bold text-gray-800 dark:text-gray-200 text-sm">
                Intuitive Baseline Active
              </p>
              <p>
                Numerical targets are withheld for your health and safety. Focus on nourishing whole foods and daily rhythm.
              </p>
            </div>
          ) : (
            <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
              <p className="font-bold text-gray-800 dark:text-gray-200 text-sm">
                Intuitive Tracking Active
              </p>
              <p>
                Personal numerical targets are not set. You can establish targets anytime in Settings.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="pt-2">
        {isUpdateMode ? (
          <div className="flex flex-col-reverse sm:flex-row items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              disabled={isSaving}
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-bold text-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition-all flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Go back</span>
            </button>
            <button
              type="button"
              onClick={onConfirmUpdate}
              disabled={isSaving}
              className="w-full sm:flex-1 py-3.5 px-6 rounded-2xl bg-primary-600 text-white font-black text-sm tracking-wide uppercase shadow-lg hover:bg-primary-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              <span>{isSaving ? "Updating your setup..." : "Update my setup"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleActivate}
            disabled={isActivating}
            className="w-full py-3.5 px-6 rounded-2xl bg-primary-600 text-white font-black text-sm tracking-wide uppercase shadow-lg hover:bg-primary-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            <span>{isActivating ? "Entering Dashboard..." : "Activate My System & Enter Dashboard"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
