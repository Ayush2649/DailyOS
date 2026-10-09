"use client";

import React, { useState } from "react";

export default function AdaptationSection() {
  const [adapted, setAdapted] = useState<boolean>(true);

  return (
    <section id="adaptation" className="py-24 sm:py-32 px-5 sm:px-6 border-t border-[var(--border)] bg-[var(--surface-subtle)]">
      <div className="max-w-5xl mx-auto">
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center mb-16 sm:mb-20">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--surface)] border border-[var(--border)] mb-4">
            <span className="type-eyebrow text-[var(--brand)]">
              DYNAMIC REBALANCING
            </span>
          </div>

          <h2 className="type-display-l text-[var(--text-primary)]">
            Life changes.
            <br />
            <span className="text-[var(--brand)]">Your plan should too.</span>
          </h2>

          <p className="type-body-lg text-[var(--text-secondary)] mt-5 max-w-xl mx-auto">
            Traditional fitness apps make you feel guilty when life gets in the way. 
            SATAT detects disruptions and quietly recalculates so your weekly momentum stays unbroken.
          </p>
        </div>

        {/* Interactive Adaptation Simulation Container */}
        <div className="max-w-4xl mx-auto">
          {/* Toggle Control */}
          <div className="flex justify-center mb-8">
            <div className="p-1.5 rounded-full bg-[var(--surface)] border border-[var(--border)] shadow-xs flex items-center gap-2">
              <button
                onClick={() => setAdapted(false)}
                className={`px-4 py-2 rounded-full text-xs font-semibold transition-all ${
                  !adapted
                    ? "bg-[var(--surface-subtle)] text-[var(--text-primary)] shadow-xs"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                }`}
              >
                1. Disruption Occurs
              </button>
              <button
                onClick={() => setAdapted(true)}
                className={`px-4 py-2 rounded-full text-xs font-semibold transition-all ${
                  adapted
                    ? "bg-[var(--brand)] text-white shadow-xs"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                }`}
              >
                2. SATAT Adapts in Real Time ✨
              </button>
            </div>
          </div>

          {/* Morphing Scenario Surface */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Stage 1: The Original Plan */}
            <div className="p-6 rounded-[24px] bg-[var(--surface)] border border-[var(--border)] shadow-xs flex flex-col justify-between">
              <div>
                <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                  Step 01 · The Schedule
                </span>
                <h3 className="text-lg font-bold text-[var(--text-primary)] mt-1 mb-2">
                  Planned Session
                </h3>
                <div className="p-3.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-1.5 text-xs">
                  <div className="font-semibold text-[var(--text-primary)]">Upper Body A · 45 min</div>
                  <div className="text-[var(--text-secondary)]">Scheduled for 18:30</div>
                  <div className="text-[var(--text-muted)]">Target: 3 compounds + 2 accessories</div>
                </div>
              </div>
              <div className="mt-5 pt-3 border-t border-[var(--border-subtle)] text-[11px] font-mono text-[var(--text-muted)]">
                Initial baseline target
              </div>
            </div>

            {/* Stage 2: The Reality */}
            <div className="p-6 rounded-[24px] bg-[var(--surface)] border border-[var(--border)] shadow-xs flex flex-col justify-between">
              <div>
                <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--warning)]">
                  Step 02 · Reality
                </span>
                <h3 className="text-lg font-bold text-[var(--text-primary)] mt-1 mb-2">
                  Unplanned Disruption
                </h3>
                <div className="p-3.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-1.5 text-xs">
                  <div className="font-semibold text-[var(--warning)]">Urgent 3-hour client sprint</div>
                  <div className="text-[var(--text-secondary)]">Workout missed at 18:30</div>
                  <div className="text-[var(--text-muted)]">Energy drained · Sleep window preserved</div>
                </div>
              </div>
              <div className="mt-5 pt-3 border-t border-[var(--border-subtle)] text-[11px] font-mono text-[var(--warning)] flex items-center justify-between">
                <span>Workout Skipped</span>
                <span>⚡ Disruption</span>
              </div>
            </div>

            {/* Stage 3: The System Adaptation */}
            <div className={`p-6 rounded-[24px] border transition-all duration-300 flex flex-col justify-between ${
              adapted
                ? "bg-[var(--surface)] border-[var(--brand)] shadow-[var(--shadow-md)] ring-1 ring-[var(--brand)]"
                : "bg-[var(--surface-subtle)] border-[var(--border)] opacity-60"
            }`}>
              <div>
                <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--brand)] font-semibold">
                  Step 03 · Autonomous Response
                </span>
                <h3 className="text-lg font-bold text-[var(--text-primary)] mt-1 mb-2 flex items-center justify-between">
                  <span>SATAT Dynamic Pivot</span>
                  {adapted && <span className="w-2 h-2 rounded-full bg-[var(--brand)] animate-ping" />}
                </h3>

                {adapted ? (
                  <div className="p-3.5 rounded-xl bg-[var(--brand-subtle)] border border-[var(--brand)]/20 space-y-2 text-xs animate-fade-in">
                    <div className="font-semibold text-[var(--brand)]">
                      ✓ Tomorrow&apos;s routine rebalanced
                    </div>
                    <div className="text-[var(--text-primary)] leading-relaxed">
                      Upper Body volume safely merged into Thursday&apos;s pull workout. Tonight&apos;s calorie goal tapered by 350 kcal to protect recovery.
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-[var(--surface)] border border-[var(--border-subtle)] text-xs text-[var(--text-muted)]">
                    Toggle &quot;SATAT Adapts&quot; above to inspect the dynamic rebalancing algorithm.
                  </div>
                )}
              </div>

              <div className="mt-5 pt-3 border-t border-[var(--border-subtle)] text-[11px] font-mono text-[var(--brand)] flex items-center justify-between">
                <span>Streak Protected</span>
                <span>Zero Guilt</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

