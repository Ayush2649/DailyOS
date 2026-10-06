"use client";

import { Dumbbell, UtensilsCrossed, Clock, Sun, Sunset, Moon, Sparkles, Compass, Award, ChevronRight, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  WorkoutDaysPerWeek,
  AvailableTrainingTimeMinutes,
  PreferredTrainingWindow,
  TrainingExperience,
} from "@/lib/onboarding/validation";
import type { OnboardingFormValues } from "./types";

interface StepWorkoutRhythmProps {
  formValues: OnboardingFormValues;
  updateFormField: <K extends keyof OnboardingFormValues>(key: K, value: OnboardingFormValues[K]) => void;
  onNext: () => void;
  onBack: () => void;
  isSaving: boolean;
}

const TIME_OPTIONS: { id: AvailableTrainingTimeMinutes; label: string; desc: string }[] = [
  { id: "<20", label: "<20 min", desc: "Express micro-sessions" },
  { id: "20-30", label: "20–30 min", desc: "Efficient, focused workouts" },
  { id: "30-45", label: "30–45 min", desc: "Standard balanced training" },
  { id: "45-60", label: "45–60 min", desc: "Comprehensive sessions" },
  { id: "60+", label: "60+ min", desc: "Extended volume & pacing" },
];

const EXPERIENCE_OPTIONS: {
  id: TrainingExperience;
  title: string;
  desc: string;
  icon: typeof Compass;
}[] = [
  {
    id: "beginner",
    title: "Beginner",
    desc: "New to lifting or returning after a long break (< 6 months consistent).",
    icon: Compass,
  },
  {
    id: "intermediate",
    title: "Intermediate",
    desc: "Familiar with progressive overload and main compound forms (6 months – 2 years).",
    icon: Sparkles,
  },
  {
    id: "advanced",
    title: "Advanced",
    desc: "Confident with form, intensity, and self-directed programming (2+ years).",
    icon: Award,
  },
];

const WINDOW_OPTIONS: { id: PreferredTrainingWindow; label: string; time: string; icon: typeof Sun }[] = [
  { id: "morning", label: "Morning", time: "07:00", icon: Sun },
  { id: "afternoon", label: "Afternoon", time: "12:30", icon: Sparkles },
  { id: "evening", label: "Evening", time: "18:00", icon: Sunset },
  { id: "flexible", label: "Flexible", time: "No fixed reminder", icon: Moon },
];

export function StepWorkoutRhythm({
  formValues,
  updateFormField,
  onNext,
  onBack,
  isSaving,
}: StepWorkoutRhythmProps) {
  const includeWorkouts = formValues.includeWorkouts;

  const handleSelectInclude = (include: boolean) => {
    updateFormField("includeWorkouts", include);
    if (!include) {
      updateFormField("workoutDaysPerWeek", null);
      updateFormField("availableTrainingTimeMinutes", null);
      updateFormField("preferredTrainingWindow", null);
      updateFormField("trainingExperience", null);
      updateFormField("equipmentAccess", null);
    }
  };

  const canProceed =
    includeWorkouts === false ||
    (includeWorkouts === true &&
      formValues.workoutDaysPerWeek !== null &&
      formValues.availableTrainingTimeMinutes !== null &&
      formValues.trainingExperience !== null);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center space-y-2">
        <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
          What is a realistic training rhythm you can sustain?
        </h1>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 max-w-md mx-auto">
          A 30-minute session you complete every week beats a 90-minute plan you abandon.
        </p>
      </div>

      {/* Primary Opt-in Decision */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg mx-auto">
        <button
          type="button"
          onClick={() => handleSelectInclude(true)}
          className={cn(
            "p-4 rounded-2xl border text-left transition-all duration-200 flex items-center gap-3",
            includeWorkouts === true
              ? "border-primary-600 bg-primary-50/60 dark:bg-primary-950/30 ring-2 ring-primary-500 shadow-xs"
              : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600"
          )}
        >
          <div className="p-2.5 rounded-xl bg-primary-100 dark:bg-primary-900/60 text-primary-600 dark:text-primary-300">
            <Dumbbell className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-gray-900 dark:text-white text-sm">
              Yes, include starter routine
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Personalized workout schedule & plan
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => handleSelectInclude(false)}
          className={cn(
            "p-4 rounded-2xl border text-left transition-all duration-200 flex items-center gap-3",
            includeWorkouts === false
              ? "border-primary-600 bg-primary-50/60 dark:bg-primary-950/30 ring-2 ring-primary-500 shadow-xs"
              : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600"
          )}
        >
          <div className="p-2.5 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
            <UtensilsCrossed className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-gray-900 dark:text-white text-sm">
              Not right now
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Focus on nutrition & daily habits
            </p>
          </div>
        </button>
      </div>

      {/* Schedule Questions if Yes */}
      {includeWorkouts === true && (
        <div className="space-y-6 max-w-lg mx-auto pt-3 border-t border-gray-100 dark:border-gray-800 animate-slide-up">
          {/* Days per week */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-2">
              How many days per week do you want to train?
            </label>
            <div className="grid grid-cols-4 gap-2">
              {([2, 3, 4, 5] as WorkoutDaysPerWeek[]).map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => updateFormField("workoutDaysPerWeek", days)}
                  className={cn(
                    "py-2.5 rounded-xl border text-sm font-black transition-all",
                    formValues.workoutDaysPerWeek === days
                      ? "border-primary-600 bg-primary-500 text-white shadow-xs"
                      : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600"
                  )}
                >
                  {days} days
                </button>
              ))}
            </div>
          </div>

          {/* Time per session */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-2">
              Available Time per Session
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {TIME_OPTIONS.map((time) => (
                <button
                  key={time.id}
                  type="button"
                  onClick={() => updateFormField("availableTrainingTimeMinutes", time.id)}
                  className={cn(
                    "p-3 rounded-xl border text-left transition-all",
                    formValues.availableTrainingTimeMinutes === time.id
                      ? "border-primary-600 bg-primary-50/60 dark:bg-primary-950/30 ring-2 ring-primary-500 text-primary-700 dark:text-primary-300"
                      : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600"
                  )}
                >
                  <div className="font-bold text-sm">{time.label}</div>
                  <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">{time.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Training Experience */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-2">
              Training Experience
            </label>
            <div className="space-y-2">
              {EXPERIENCE_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const isSelected = formValues.trainingExperience === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => updateFormField("trainingExperience", opt.id)}
                    className={cn(
                      "w-full p-3 rounded-xl border text-left transition-all flex items-start gap-3",
                      isSelected
                        ? "border-primary-600 bg-primary-50/60 dark:bg-primary-950/30 ring-2 ring-primary-500 text-primary-700 dark:text-primary-300 shadow-xs"
                        : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600"
                    )}
                  >
                    <div
                      className={cn(
                        "p-2 rounded-lg shrink-0 mt-0.5",
                        isSelected
                          ? "bg-primary-100 dark:bg-primary-900/60 text-primary-600 dark:text-primary-300"
                          : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                      )}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-sm text-gray-900 dark:text-white">{opt.title}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">
                        {opt.desc}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Preferred Window (Optional reminder) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                Preferred Training Window (Optional)
              </label>
              <span className="text-[11px] text-gray-400">Sets push reminder</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {WINDOW_OPTIONS.map((win) => {
                const Icon = win.icon;
                const isSelected = formValues.preferredTrainingWindow === win.id;
                return (
                  <button
                    key={win.id}
                    type="button"
                    onClick={() => updateFormField("preferredTrainingWindow", win.id)}
                    className={cn(
                      "p-2.5 rounded-xl border text-center transition-all flex flex-col items-center gap-1",
                      isSelected
                        ? "border-primary-600 bg-primary-50/60 dark:bg-primary-950/30 ring-2 ring-primary-500 text-primary-700 dark:text-primary-300"
                        : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-xs font-bold">{win.label}</span>
                    <span className="text-[10px] text-gray-400">{win.time}</span>
                  </button>
                );
              })}
            </div>
          </div>
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
