"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Utensils, Dumbbell, CheckSquare, Scale, X, Loader2, Check } from "lucide-react";
import { logBodyWeight } from "@/lib/firestore";
import { useToast } from "@/components/ui/Toast";

interface TrackSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TrackSheet({ isOpen, onClose }: TrackSheetProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const userId = (session?.user as any)?.id ?? session?.user?.email ?? "";
  const { toast } = useToast();

  const [weightKg, setWeightKg] = useState("");
  const [loggingWeight, setLoggingWeight] = useState(false);
  const [showWeightInput, setShowWeightInput] = useState(false);
  const [weightSuccess, setWeightSuccess] = useState(false);

  if (!isOpen) return null;

  const handleAction = (route: string) => {
    onClose();
    router.push(route);
  };

  const handleQuickWeight = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(weightKg);
    if (isNaN(val) || val <= 0 || !userId) return;

    setLoggingWeight(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      await logBodyWeight({
        userId,
        weightKg: val,
        date: today,
        createdAt: Date.now(),
      });
      setWeightSuccess(true);
      toast("Weight logged successfully", "success");
      setTimeout(() => {
        setWeightSuccess(false);
        setShowWeightInput(false);
        setWeightKg("");
        onClose();
      }, 700);
    } catch {
      toast("Failed to log weight", "error");
    } finally {
      setLoggingWeight(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex flex-col justify-end lg:items-center lg:justify-center p-0 lg:p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet Content */}
      <div
        className="relative w-full lg:max-w-md rounded-t-2xl lg:rounded-2xl p-5 z-10 transition-transform animate-slide-up"
        style={{
          background: "var(--satat-surface, #0D0F11)",
          border: "1px solid var(--satat-border, rgba(255,255,255,0.08))",
          boxShadow: "0 24px 48px rgba(0,0,0,0.8)",
        }}
        role="dialog"
        aria-label="Quick Track Actions"
      >
        {/* Mobile handle indicator */}
        <div
          className="w-10 h-1 rounded-full mx-auto mb-4 lg:hidden"
          style={{ background: "var(--satat-border-strong)" }}
        />

        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>
              Quick Track
            </h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
              Fast logging without losing your flow
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close track sheet"
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-white/5"
            style={{ color: "var(--text-secondary)" }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Actions List */}
        {!showWeightInput ? (
          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={() => handleAction("/dashboard/diet")}
              className="flex flex-col items-start p-3.5 rounded-xl text-left transition-all hover:border-white/15"
              style={{
                background: "var(--satat-surface-elevated, #121519)",
                border: "1px solid var(--satat-border-subtle, rgba(255,255,255,0.05))",
              }}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center mb-2"
                style={{ background: "rgba(110, 139, 255, 0.12)", color: "var(--satat-brand, #6E8BFF)" }}
              >
                <Utensils className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
                Meal & Nutrition
              </span>
              <span className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                Snap or log calories
              </span>
            </button>

            <button
              onClick={() => handleAction("/dashboard/workout")}
              className="flex flex-col items-start p-3.5 rounded-xl text-left transition-all hover:border-white/15"
              style={{
                background: "var(--satat-surface-elevated, #121519)",
                border: "1px solid var(--satat-border-subtle, rgba(255,255,255,0.05))",
              }}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center mb-2"
                style={{ background: "rgba(99, 210, 184, 0.12)", color: "var(--satat-mint, #63D2B8)" }}
              >
                <Dumbbell className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
                Workout Session
              </span>
              <span className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                Log sets or cardio
              </span>
            </button>

            <button
              onClick={() => handleAction("/dashboard/tasks")}
              className="flex flex-col items-start p-3.5 rounded-xl text-left transition-all hover:border-white/15"
              style={{
                background: "var(--satat-surface-elevated, #121519)",
                border: "1px solid var(--satat-border-subtle, rgba(255,255,255,0.05))",
              }}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center mb-2"
                style={{ background: "rgba(242, 160, 128, 0.12)", color: "var(--satat-peach, #F2A080)" }}
              >
                <CheckSquare className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
                New Task
              </span>
              <span className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                Plan priority action
              </span>
            </button>

            <button
              onClick={() => setShowWeightInput(true)}
              className="flex flex-col items-start p-3.5 rounded-xl text-left transition-all hover:border-white/15"
              style={{
                background: "var(--satat-surface-elevated, #121519)",
                border: "1px solid var(--satat-border-subtle, rgba(255,255,255,0.05))",
              }}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center mb-2"
                style={{ background: "var(--surface-high)", color: "var(--text-primary)" }}
              >
                <Scale className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
                Body Weight
              </span>
              <span className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                Record today&apos;s check-in
              </span>
            </button>
          </div>
        ) : (
          <form onSubmit={handleQuickWeight} className="space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <button
                type="button"
                onClick={() => setShowWeightInput(false)}
                className="text-xs font-medium hover:underline"
                style={{ color: "var(--satat-brand, #6E8BFF)" }}
              >
                ← Back
              </button>
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                Record Body Weight
              </span>
            </div>

            <div className="relative">
              <input
                type="number"
                step="0.1"
                min="30"
                max="300"
                autoFocus
                placeholder="e.g. 74.5"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-brand"
                style={{
                  background: "var(--satat-surface-high, #181C21)",
                  border: "1px solid var(--satat-border, rgba(255,255,255,0.08))",
                  color: "var(--text-primary)",
                }}
              />
              <span className="absolute right-3.5 top-2.5 text-xs font-medium" style={{ color: "var(--text-muted)" }}>
                kg
              </span>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowWeightInput(false)}
                className="flex-1 py-2 rounded-xl text-xs font-semibold"
                style={{
                  background: "var(--satat-surface-elevated, #121519)",
                  color: "var(--text-secondary)",
                  border: "1px solid var(--satat-border-subtle, rgba(255,255,255,0.05))",
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!weightKg || loggingWeight || weightSuccess}
                className="flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                style={{
                  background: "var(--satat-brand, #6E8BFF)",
                  color: "var(--brand-text, #08090A)",
                }}
              >
                {loggingWeight ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : weightSuccess ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Saved</span>
                  </>
                ) : (
                  <span>Save Weight</span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
