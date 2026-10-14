"use client";

import React, { useEffect, useState, useRef } from "react";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { Check } from "lucide-react";

interface DayMomentumProgressProps {
  progressPct: number;
  statusText?: string;
}

/**
 * Day Momentum Progress Component
 *
 * Implements Phase 2 Signature Motion:
 * - Fluid progress rail fill from previous value to current value
 * - Synchronized numerical count-up with cubic ease-out deceleration
 * - Zero jump on initial load; smooth transitions on value changes
 * - Guards against restarting animation on unrelated React renders
 * - Fully accessible progressbar with ARIA attributes
 * - Strict prefers-reduced-motion enforcement (instant update, no motion)
 * - Zero external animation dependencies; cancels requestAnimationFrame on unmount
 */
export function DayMomentumProgress({
  progressPct,
  statusText,
}: DayMomentumProgressProps) {
  const reducedMotion = useReducedMotion();
  const clampedTarget = Math.max(0, Math.min(100, Math.round(progressPct)));

  // If reduced motion is requested, immediately jump to target; otherwise start at 0 on initial mount
  const [displayedPct, setDisplayedPct] = useState<number>(reducedMotion ? clampedTarget : 0);
  const [railWidth, setRailWidth] = useState<number>(reducedMotion ? clampedTarget : 0);

  const prevTargetRef = useRef<number>(reducedMotion ? clampedTarget : 0);
  const isFirstRender = useRef<boolean>(true);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    // If reduced motion is preferred, update immediately without animation
    if (reducedMotion) {
      setDisplayedPct(clampedTarget);
      setRailWidth(clampedTarget);
      prevTargetRef.current = clampedTarget;
      return;
    }

    // Skip if target hasn't changed and this isn't the initial mount
    if (!isFirstRender.current && clampedTarget === prevTargetRef.current) {
      return;
    }

    const startVal = isFirstRender.current ? 0 : prevTargetRef.current;
    const targetVal = clampedTarget;
    prevTargetRef.current = targetVal;
    isFirstRender.current = false;

    // Trigger CSS width transition for the rail
    // A single RAF ensures initial 0% is committed before animating to targetVal
    const scheduleRail = requestAnimationFrame(() => {
      setRailWidth(targetVal);
    });

    // Animate numerical counter via requestAnimationFrame
    const duration = 600; // ms, aligns with --duration-emphasis
    const startTime = performance.now();

    const animateNumber = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);

      // Deceleration curve: cubic ease-out (1 - (1 - t)^3)
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startVal + (targetVal - startVal) * easeOut);

      setDisplayedPct(current);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animateNumber);
      } else {
        setDisplayedPct(targetVal);
        rafRef.current = null;
      }
    };

    rafRef.current = requestAnimationFrame(animateNumber);

    return () => {
      cancelAnimationFrame(scheduleRail);
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [clampedTarget, reducedMotion]);

  // Meaningful status descriptor
  const computedStatus =
    statusText ||
    (clampedTarget === 100
      ? "All systems completed"
      : clampedTarget >= 66
      ? "Strong execution today"
      : clampedTarget > 0
      ? "Building daily momentum"
      : "Ready to start today");

  return (
    <div
      role="progressbar"
      aria-valuenow={displayedPct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`Daily momentum: ${displayedPct}% completed`}
      className="w-full select-none"
    >
      {/* Header Info Row */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)] shrink-0">
            Day Momentum
          </span>
          <span className="w-1 h-1 rounded-full bg-[var(--border)] shrink-0" />
          <span className="text-xs font-medium text-[var(--text-secondary)] truncate">
            {computedStatus}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 pl-2">
          {displayedPct === 100 && (
            <span className="w-4 h-4 rounded-full bg-[var(--success)] text-[var(--brand-text)] flex items-center justify-center animate-scale-in">
              <Check className="w-2.5 h-2.5 stroke-[3]" />
            </span>
          )}
          <span className="text-lg font-bold font-display tabular-nums text-[var(--brand)]">
            {displayedPct}%
          </span>
        </div>
      </div>

      {/* Visual Momentum Rail */}
      <div className="w-full h-2 rounded-full overflow-hidden bg-[var(--surface-inset)] mb-5 relative">
        <div
          className="h-full rounded-full bg-[var(--brand)]"
          style={{
            width: `${railWidth}%`,
            transitionProperty: "width",
            transitionDuration: reducedMotion ? "0ms" : "var(--duration-emphasis, 600ms)",
            transitionTimingFunction: "var(--ease-out, cubic-bezier(0.16, 1, 0.3, 1))",
          }}
        />
      </div>
    </div>
  );
}

export default DayMomentumProgress;

