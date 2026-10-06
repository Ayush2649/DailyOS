"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShieldCheck, ChevronRight } from "lucide-react";
import { CONSENT_VERSION } from "@/lib/onboarding/constants";
import type { OnboardingFormValues } from "./types";

interface StepConsentProps {
  formValues: OnboardingFormValues;
  updateFormField: <K extends keyof OnboardingFormValues>(key: K, value: OnboardingFormValues[K]) => void;
  onNext: (overrides?: Partial<OnboardingFormValues>) => void;
  isSaving: boolean;
}

export function StepConsent({
  formValues,
  updateFormField,
  onNext,
  isSaving,
}: StepConsentProps) {
  const router = useRouter();
  const [ageConfirmed, setAgeConfirmed] = useState(formValues.confirmedAge18Plus);
  const [termsAgreed, setTermsAgreed] = useState(
    typeof formValues.consentGivenAt === "number" && formValues.consentGivenAt > 0
  );

  const handleToggleAge = (checked: boolean) => {
    setAgeConfirmed(checked);
    updateFormField("confirmedAge18Plus", checked);
  };

  const handleToggleTerms = (checked: boolean) => {
    setTermsAgreed(checked);
    const now = checked ? Date.now() : null;
    updateFormField("consentGivenAt", now);
    updateFormField("consentVersion", checked ? CONSENT_VERSION : null);
  };

  const canProceed = ageConfirmed && termsAgreed;

  const handleBegin = () => {
    if (!canProceed) return;
    const timestamp =
      typeof formValues.consentGivenAt === "number" && formValues.consentGivenAt > 0
        ? formValues.consentGivenAt
        : Date.now();

    updateFormField("confirmedAge18Plus", true);
    updateFormField("consentGivenAt", timestamp);
    updateFormField("consentVersion", CONSENT_VERSION);
    onNext({
      confirmedAge18Plus: true,
      consentGivenAt: timestamp,
      consentVersion: CONSENT_VERSION,
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center space-y-2">
        <div className="inline-flex p-3 rounded-2xl bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 mb-2">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
          Welcome to Satat
        </h1>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 max-w-md mx-auto">
          Before we begin, please review how Satat supports your daily habits.
        </p>
      </div>

      <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/60 text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
        Satat is a daily habit companion designed for adults. Satat provides
        lifestyle estimates, habit tracking, and structured movement routines.
        Satat does not provide medical therapy, eating disorder treatment, or
        pediatric growth tracking.
      </div>

      <div className="space-y-4 pt-2">
        <label className="flex items-start gap-3 p-3.5 rounded-xl border border-gray-200 dark:border-gray-700/80 hover:border-primary-400 dark:hover:border-primary-500 transition-colors cursor-pointer bg-white dark:bg-gray-800">
          <input
            type="checkbox"
            checked={ageConfirmed}
            onChange={(e) => handleToggleAge(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
          />
          <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
            I confirm that I am 18 years of age or older.
          </span>
        </label>

        <label className="flex items-start gap-3 p-3.5 rounded-xl border border-gray-200 dark:border-gray-700/80 hover:border-primary-400 dark:hover:border-primary-500 transition-colors cursor-pointer bg-white dark:bg-gray-800">
          <input
            type="checkbox"
            checked={termsAgreed}
            onChange={(e) => handleToggleTerms(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
          />
          <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
            I agree to the{" "}
            <Link
              href="/terms"
              target="_blank"
              className="text-primary-600 dark:text-primary-400 underline underline-offset-2"
              onClick={(e) => e.stopPropagation()}
            >
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link
              href="/privacy"
              target="_blank"
              className="text-primary-600 dark:text-primary-400 underline underline-offset-2"
              onClick={(e) => e.stopPropagation()}
            >
              Privacy Policy
            </Link>
            , and consent to processing my entries to generate my baseline rhythm.
          </span>
        </label>
      </div>

      <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => router.replace("/onboarding/under-18")}
          className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 underline underline-offset-2"
        >
          I am under 18
        </button>

        <button
          type="button"
          onClick={handleBegin}
          disabled={!canProceed || isSaving}
          className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-primary-600 text-white font-bold text-sm shadow-md hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
        >
          <span>{isSaving ? "Saving..." : "Begin Onboarding"}</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

