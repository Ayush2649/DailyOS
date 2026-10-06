"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, ChevronLeft, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BiologicalSex } from "@/lib/onboarding/validation";
import type { OnboardingFormValues } from "./types";

interface StepPhysicalProps {
  formValues: OnboardingFormValues;
  updateFormField: <K extends keyof OnboardingFormValues>(key: K, value: OnboardingFormValues[K]) => void;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
  isSaving: boolean;
}

export function StepPhysical({
  formValues,
  updateFormField,
  onNext,
  onBack,
  onSkip,
  isSaving,
}: StepPhysicalProps) {
  const router = useRouter();
  const [unitSystem, setUnitSystem] = useState<"metric" | "imperial">("metric");

  // Local state for inputs to allow smooth editing
  const [heightCmInput, setHeightCmInput] = useState<string>(
    formValues.heightCm ? String(formValues.heightCm) : ""
  );
  const [weightKgInput, setWeightKgInput] = useState<string>(
    formValues.weightKg ? String(formValues.weightKg) : ""
  );

  // Imperial sub-inputs
  const initialFeet = formValues.heightCm
    ? Math.floor(formValues.heightCm / 2.54 / 12)
    : "";
  const initialInches = formValues.heightCm
    ? Math.round((formValues.heightCm / 2.54) % 12)
    : "";
  const [heightFeetInput, setHeightFeetInput] = useState<string>(
    initialFeet !== "" ? String(initialFeet) : ""
  );
  const [heightInchesInput, setHeightInchesInput] = useState<string>(
    initialInches !== "" ? String(initialInches) : ""
  );
  const [weightLbsInput, setWeightLbsInput] = useState<string>(
    formValues.weightKg ? String(Math.round(formValues.weightKg * 2.20462)) : ""
  );

  const [ageInput, setAgeInput] = useState<string>(
    formValues.age ? String(formValues.age) : ""
  );
  const [ageError, setAgeError] = useState<string | null>(null);

  const sexSelected = formValues.biologicalSex;

  // Sync metric height
  const handleHeightCmChange = (val: string) => {
    setHeightCmInput(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0) {
      updateFormField("heightCm", Math.round(num * 10) / 10);
      const totalInches = num / 2.54;
      setHeightFeetInput(String(Math.floor(totalInches / 12)));
      setHeightInchesInput(String(Math.round(totalInches % 12)));
    } else {
      updateFormField("heightCm", null);
    }
  };

  // Sync imperial height
  const handleImperialHeightChange = (feet: string, inches: string) => {
    setHeightFeetInput(feet);
    setHeightInchesInput(inches);
    const f = parseFloat(feet) || 0;
    const i = parseFloat(inches) || 0;
    if (f > 0 || i > 0) {
      const cm = Math.round((f * 12 + i) * 2.54 * 10) / 10;
      setHeightCmInput(String(cm));
      updateFormField("heightCm", cm);
    } else {
      updateFormField("heightCm", null);
    }
  };

  // Sync metric weight
  const handleWeightKgChange = (val: string) => {
    setWeightKgInput(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0) {
      updateFormField("weightKg", Math.round(num * 10) / 10);
      setWeightLbsInput(String(Math.round(num * 2.20462)));
    } else {
      updateFormField("weightKg", null);
    }
  };

  // Sync imperial weight
  const handleWeightLbsChange = (val: string) => {
    setWeightLbsInput(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0) {
      const kg = Math.round((num / 2.20462) * 10) / 10;
      setWeightKgInput(String(kg));
      updateFormField("weightKg", kg);
    } else {
      updateFormField("weightKg", null);
    }
  };

  // Handle Age input - allow typing intermediate values without navigation
  const handleAgeChange = (val: string) => {
    setAgeInput(val);
    if (!val.trim()) {
      setAgeError(null);
      updateFormField("age", null);
      return;
    }

    const num = parseInt(val, 10);
    if (isNaN(num)) {
      setAgeError(null);
      updateFormField("age", null);
      return;
    }

    if (num > 100) {
      setAgeError("Please enter an age between 18 and 100.");
      updateFormField("age", null);
      return;
    }

    setAgeError(null);
    updateFormField("age", num);
  };

  const handleContinue = () => {
    if (ageInput.trim()) {
      const num = parseInt(ageInput, 10);
      if (isNaN(num)) {
        setAgeError("Please enter a valid age.");
        return;
      }
      if (num < 18) {
        // Validation boundary: commit under-18 exit
        router.replace("/onboarding/under-18");
        return;
      }
      if (num > 100) {
        setAgeError("Please enter an age between 18 and 100.");
        return;
      }
      updateFormField("age", num);
    } else {
      updateFormField("age", null);
    }
    onNext();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center space-y-2">
        <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
          What is your current physical baseline?
        </h1>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 max-w-md mx-auto">
          Used strictly to estimate resting energy expenditure and baseline protein targets. Never displayed publicly or shared.
        </p>
      </div>

      {/* Unit Toggle */}
      <div className="flex justify-center">
        <div className="inline-flex p-1 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700/80">
          <button
            type="button"
            onClick={() => setUnitSystem("metric")}
            className={cn(
              "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all",
              unitSystem === "metric"
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-xs"
                : "text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
            )}
          >
            Metric (cm, kg)
          </button>
          <button
            type="button"
            onClick={() => setUnitSystem("imperial")}
            className={cn(
              "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all",
              unitSystem === "imperial"
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-xs"
                : "text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
            )}
          >
            Imperial (ft/in, lbs)
          </button>
        </div>
      </div>

      <div className="space-y-4 max-w-md mx-auto">
        {/* Height Input */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-1.5">
            Height {unitSystem === "metric" ? "(cm)" : "(ft / in)"}
          </label>
          {unitSystem === "metric" ? (
            <input
              type="number"
              placeholder="e.g. 175"
              value={heightCmInput}
              onChange={(e) => handleHeightCmChange(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-medium text-sm focus:ring-2 focus:ring-primary-500 outline-hidden"
            />
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                placeholder="Feet (e.g. 5)"
                value={heightFeetInput}
                onChange={(e) => handleImperialHeightChange(e.target.value, heightInchesInput)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-medium text-sm focus:ring-2 focus:ring-primary-500 outline-hidden"
              />
              <input
                type="number"
                placeholder="Inches (e.g. 9)"
                value={heightInchesInput}
                onChange={(e) => handleImperialHeightChange(heightFeetInput, e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-medium text-sm focus:ring-2 focus:ring-primary-500 outline-hidden"
              />
            </div>
          )}
        </div>

        {/* Weight Input */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-1.5">
            Current Body Weight {unitSystem === "metric" ? "(kg)" : "(lbs)"}
          </label>
          {unitSystem === "metric" ? (
            <input
              type="number"
              placeholder="e.g. 70"
              value={weightKgInput}
              onChange={(e) => handleWeightKgChange(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-medium text-sm focus:ring-2 focus:ring-primary-500 outline-hidden"
            />
          ) : (
            <input
              type="number"
              placeholder="e.g. 154"
              value={weightLbsInput}
              onChange={(e) => handleWeightLbsChange(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-medium text-sm focus:ring-2 focus:ring-primary-500 outline-hidden"
            />
          )}
        </div>

        {/* Age Input */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-1.5">
            Age (years)
          </label>
          <input
            type="number"
            placeholder="e.g. 28"
            value={ageInput}
            onChange={(e) => handleAgeChange(e.target.value)}
            className={cn(
              "w-full px-4 py-2.5 rounded-xl border bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-medium text-sm outline-hidden",
              ageError
                ? "border-red-500 focus:ring-2 focus:ring-red-500"
                : "border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-primary-500"
            )}
          />
          {ageError && (
            <p className="mt-1 text-xs text-red-500 font-medium">{ageError}</p>
          )}
        </div>

        {/* Biological Sex */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300">
              Biological Sex
            </label>
            <span className="text-[11px] text-gray-400">For metabolic formula</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: "female" as BiologicalSex, label: "Female" },
              { id: "male" as BiologicalSex, label: "Male" },
              { id: "prefer_not_to_say" as BiologicalSex, label: "Prefer not to say" },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => updateFormField("biologicalSex", opt.id)}
                className={cn(
                  "p-2.5 rounded-xl border text-xs font-bold transition-all text-center",
                  sexSelected === opt.id
                    ? "border-primary-600 bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300 ring-2 ring-primary-500"
                    : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {sexSelected === "prefer_not_to_say" && (
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <HelpCircle className="w-3.5 h-3.5 text-primary-500 shrink-0" />
              <span>Satat will estimate an energy range rather than a fixed target.</span>
            </p>
          )}
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
            onClick={handleContinue}
            disabled={isSaving || Boolean(ageError)}
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

