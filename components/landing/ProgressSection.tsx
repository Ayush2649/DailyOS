"use client";

import React from "react";

export default function ProgressSection() {
  const WEEKS = [
    { label: "W1", count: 5, target: 5, fill: "w-full bg-[var(--brand)]" },
    { label: "W2", count: 4, target: 5, fill: "w-4/5 bg-[var(--brand)]" },
    { label: "W3", count: 5, target: 5, fill: "w-full bg-[var(--brand)]" },
    { label: "W4", count: 5, target: 5, fill: "w-full bg-[var(--brand)]" },
  ];

  return (
    <section id="progress" className="py-24 sm:py-32 px-5 sm:px-6 border-t border-[var(--border)] bg-[var(--surface-subtle)]">
      <div className="max-w-5xl mx-auto">
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center mb-16 sm:mb-20">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--surface)] border border-[var(--border)] mb-4">
            <span className="type-eyebrow text-[var(--brand)]">
              MOMENTUM VISUALIZATION
            </span>
          </div>

          <h2 className="type-display-l text-[var(--text-primary)]">
            Consistency becomes visible.
          </h2>

          <p className="type-body-lg text-[var(--text-secondary)] mt-4 max-w-xl mx-auto font-medium">
            Not perfection. Progress.
          </p>

          <p className="type-body text-[var(--text-muted)] mt-2 max-w-md mx-auto">
            Small, compounding habits captured with quiet precision. No noisy badges or gamified fireworks.
          </p>
        </div>

        {/* Progress Visualization Card */}
        <div className="max-w-4xl mx-auto p-7 sm:p-10 rounded-[28px] sm:rounded-[36px] bg-[var(--surface)] border border-[var(--border)] shadow-[var(--shadow-sm)]">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
            
            {/* Visual 1: Consistency Ring */}
            <div className="flex flex-col items-center text-center p-4">
              <div className="relative w-28 h-28 flex items-center justify-center mb-4">
                <svg className="w-28 h-28 -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-[var(--border-subtle)]"
                    strokeWidth="3"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-[var(--brand)]"
                    strokeDasharray="87, 100"
                    strokeWidth="3"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-2xl font-bold font-mono text-[var(--text-primary)]">
                    87%
                  </span>
                  <span className="text-[10px] uppercase font-mono text-[var(--text-muted)]">
                    Score
                  </span>
                </div>
              </div>
              <h3 className="font-semibold text-base text-[var(--text-primary)]">
                Rolling 28-Day Adherence
              </h3>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                Reflects planned vs completed consistency.
              </p>
            </div>

            {/* Visual 2: Weekly Cadence */}
            <div className="space-y-4 p-4 md:border-x md:border-[var(--border-subtle)]">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm text-[var(--text-primary)]">
                  Weekly Habit Cadence
                </span>
                <span className="font-mono text-xs text-[var(--brand)] font-medium">
                  19 / 20 target
                </span>
              </div>

              <div className="space-y-2.5">
                {WEEKS.map((w) => (
                  <div key={w.label} className="space-y-1">
                    <div className="flex justify-between text-xs text-[var(--text-muted)] font-mono">
                      <span>{w.label}</span>
                      <span>{w.count} / {w.target} sessions</span>
                    </div>
                    <div className="w-full bg-[var(--surface-subtle)] h-2 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${w.fill}`} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Visual 3: Compounding Outcome */}
            <div className="p-4 space-y-4">
              <div className="p-4 rounded-2xl bg-[var(--brand-subtle)] border border-[var(--brand)]/15">
                <div className="text-[11px] font-mono uppercase tracking-wider text-[var(--brand)] font-semibold">
                  Trajectory Synthesis
                </div>
                <div className="text-2xl font-bold text-[var(--text-primary)] mt-1 font-mono">
                  +12.4%
                </div>
                <div className="text-xs text-[var(--text-secondary)] mt-1">
                  Compound strength capacity over 60 days
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border)]">
                <div className="text-[11px] font-mono uppercase tracking-wider text-[var(--text-muted)]">
                  Active Momentum
                </div>
                <div className="text-xl font-bold text-[var(--text-primary)] mt-0.5">
                  24 Unbroken Days
                </div>
                <div className="text-xs text-[var(--text-secondary)] mt-1">
                  Zero skipped adaptation cycles
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}

