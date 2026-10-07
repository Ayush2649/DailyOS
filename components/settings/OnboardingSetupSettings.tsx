"use client";

import { useState } from "react";
import Link from "next/link";
import { Sliders, RotateCcw, AlertTriangle, Loader2, ArrowRight } from "lucide-react";

interface OnboardingSetupSettingsProps {
  isDevAuthorized?: boolean;
}

export default function OnboardingSetupSettings({
  isDevAuthorized = false,
}: OnboardingSetupSettingsProps) {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  const handleReset = async () => {
    setIsResetting(true);
    setResetError(null);

    try {
      const res = await fetch("/api/onboarding/reset", {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to reset onboarding state");
      }

      // Purge tour dismiss flags so fresh onboarding tour is reset
      if (typeof window !== "undefined") {
        try {
          localStorage.removeItem("satat_tour_v1");
          localStorage.removeItem("dailyos_tour_v1");
        } catch {
          /* storage restricted */
        }
      }

      // Navigate directly to onboarding to re-enter
      window.location.href = "/onboarding";
    } catch (err: any) {
      setResetError(err.message || "Failed to reset onboarding state");
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. Production Entry: Your SATAT Setup (§2) */}
      <div
        className="rounded-2xl p-5 sm:p-6 transition-all"
        style={{
          background: "var(--surface-2)",
          border: "1px solid var(--border)",
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <h3
              className="text-base font-bold tracking-tight"
              style={{ color: "var(--text-1)" }}
            >
              Your SATAT Setup
            </h3>
            <p
              className="text-xs sm:text-sm leading-relaxed max-w-xl"
              style={{ color: "var(--text-2)" }}
            >
              Review and update the information SATAT uses to personalize your experience.
            </p>
          </div>

          <Link
            href="/onboarding?mode=update"
            className="btn-primary inline-flex items-center justify-center gap-2 text-xs sm:text-sm px-5 py-2.5 rounded-xl font-bold shrink-0 shadow-sm"
          >
            <Sliders className="w-4 h-4" />
            <span>Review & Update Setup</span>
          </Link>
        </div>
      </div>

      {/* 2. Developer Tools: Reset Onboarding State (§11, §12) (Rendered ONLY when authorized) */}
      {isDevAuthorized && (
        <div
          className="rounded-2xl p-5 border border-dashed transition-all"
          style={{
            background: "var(--surface-1)",
            borderColor: "var(--status-warning, #f59e0b)",
          }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span
                  className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full"
                  style={{
                    background: "rgba(245, 158, 11, 0.15)",
                    color: "var(--status-warning, #d97706)",
                  }}
                >
                  Dev Tools
                </span>
                <h4
                  className="text-xs font-bold uppercase tracking-wider"
                  style={{ color: "var(--text-1)" }}
                >
                  Developer Tools
                </h4>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: "var(--text-3)" }}>
                Reset onboarding completion state for repeated testing. Historical meals, workouts, weights, and custom templates are preserved.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowConfirmModal(true)}
              className="btn-secondary text-xs px-4 py-2 rounded-xl font-bold shrink-0 hover:border-red-500/50 hover:text-red-500 transition-colors flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Onboarding State</span>
            </button>
          </div>

          {resetError && (
            <div className="mt-3 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-600 dark:text-red-300">
              {resetError}
            </div>
          )}
        </div>
      )}

      {/* Developer Reset Confirmation Modal (§12) */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div
            className="w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-5 animate-scale-in"
            style={{
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
            }}
          >
            <div className="flex items-start gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{
                  background: "rgba(239, 68, 68, 0.15)",
                  color: "var(--status-danger, #ef4444)",
                }}
              >
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3
                  className="text-base font-bold"
                  style={{ color: "var(--text-1)" }}
                >
                  Reset onboarding state for this account?
                </h3>
                <p className="text-xs font-medium" style={{ color: "var(--text-2)" }}>
                  Your historical activity will not be deleted.
                </p>
              </div>
            </div>

            <div
              className="p-3.5 rounded-xl text-xs space-y-1.5 leading-relaxed"
              style={{
                background: "var(--surface-3)",
                color: "var(--text-2)",
              }}
            >
              <p className="font-semibold" style={{ color: "var(--text-1)" }}>
                What this does:
              </p>
              <p>• Unsets onboarding completion flag and computed calorie/macro targets.</p>
              <p>• Removes starter workout templates generated by onboarding.</p>
              <p>• Preserves all meals, workouts, weights, tasks, projects, and custom templates.</p>
            </div>

            {resetError && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-600 dark:text-red-300">
                {resetError}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowConfirmModal(false);
                  setResetError(null);
                }}
                disabled={isResetting}
                className="btn-ghost text-xs px-4 py-2 rounded-xl font-bold"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleReset}
                disabled={isResetting}
                className="btn-danger text-xs px-4 py-2 rounded-xl font-bold flex items-center gap-1.5"
              >
                {isResetting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Resetting...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

