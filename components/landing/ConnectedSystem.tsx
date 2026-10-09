"use client";

import React, { useState } from "react";

interface SystemPhase {
  id: string;
  number: string;
  title: string;
  action: string;
  outcome: string;
  connection: string;
}

const PHASES: SystemPhase[] = [
  {
    id: "goals",
    number: "01",
    title: "Goals",
    action: "Direction without anxiety",
    outcome: "Clear body composition, strength, and life milestones.",
    connection: "Feeds your weekly routines",
  },
  {
    id: "routines",
    number: "02",
    title: "Routines",
    action: "Habits that fit reality",
    outcome: "Mobility, hydration, and daily timeblocks that protect momentum.",
    connection: "Prepares your training window",
  },
  {
    id: "training",
    number: "03",
    title: "Training",
    action: "Progressive, structured work",
    outcome: "Compound lift telemetry, RPE tracking, and automatic volume curves.",
    connection: "Signals nutrition caloric demand",
  },
  {
    id: "nutrition",
    number: "04",
    title: "Nutrition",
    action: "Deterministic fuel matching",
    outcome: "Protein targets and calorie balances calculated against real expenditure.",
    connection: "Determines tonight's recovery quality",
  },
  {
    id: "recovery",
    number: "05",
    title: "Recovery",
    action: "Restitution of baseline",
    outcome: "Sleep duration, resting heart rate, and fatigue monitoring.",
    connection: "Synthesizes trajectory updates",
  },
  {
    id: "progress",
    number: "06",
    title: "Progress",
    action: "Continuous upward spiral",
    outcome: "Consistency streaks, weekly capacity, and adaptive baseline adjustments.",
    connection: "Refines tomorrow's starting plan",
  },
];

export default function ConnectedSystem() {
  const [activePhase, setActivePhase] = useState<string>("training");

  return (
    <section id="system" className="py-24 sm:py-32 px-5 sm:px-6 border-t border-[var(--border)] bg-[var(--background)]">
      <div className="max-w-5xl mx-auto">
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center mb-16 sm:mb-20">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--brand-subtle)] border border-[var(--border)] mb-4">
            <span className="type-eyebrow text-[var(--brand)]">
              THE UNBROKEN THREAD (सतत)
            </span>
          </div>

          <h2 className="type-display-l text-[var(--text-primary)]">
            Everything works better
            <br />
            <span className="text-[var(--brand)]">when it works together.</span>
          </h2>

          <p className="type-body-lg text-[var(--text-secondary)] mt-5 max-w-xl mx-auto">
            Instead of managing five separate silos, SATAT connects the complete cycle of human improvement 
            into a self-reinforcing continuous loop.
          </p>
        </div>

        {/* 6 Connected Phases Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {PHASES.map((phase) => {
            const isActive = activePhase === phase.id;

            return (
              <div
                key={phase.id}
                onClick={() => setActivePhase(phase.id)}
                className={`group p-6 sm:p-7 rounded-[24px] bg-[var(--surface)] border transition-all duration-300 cursor-pointer flex flex-col justify-between ${
                  isActive
                    ? "border-[var(--brand)] shadow-[var(--shadow-md)] ring-1 ring-[var(--brand)]"
                    : "border-[var(--border)] shadow-xs hover:border-[var(--border-strong)]"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-full bg-[var(--surface-subtle)] text-[var(--brand)]">
                      {phase.number}
                    </span>
                    <span className="text-[11px] font-mono text-[var(--text-muted)] group-hover:text-[var(--brand)] transition-colors">
                      {phase.action}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold tracking-tight text-[var(--text-primary)] mb-2">
                    {phase.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                    {phase.outcome}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs">
                  <span className="text-[var(--text-muted)] font-mono text-[11px]">
                    → {phase.connection}
                  </span>
                  <span className="w-2 h-2 rounded-full bg-[var(--brand)]" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Continuity Flow Visualization Bar */}
        <div className="mt-12 p-6 rounded-[24px] bg-[var(--surface)] border border-[var(--border)] flex flex-wrap items-center justify-center gap-2 sm:gap-4 text-xs font-mono text-[var(--text-secondary)]">
          {PHASES.map((p, idx) => (
            <React.Fragment key={p.id}>
              <span
                onClick={() => setActivePhase(p.id)}
                className={`cursor-pointer px-3 py-1.5 rounded-full transition-all ${
                  activePhase === p.id
                    ? "bg-[var(--brand)] text-white font-bold"
                    : "hover:bg-[var(--surface-subtle)] text-[var(--text-primary)]"
                }`}
              >
                {p.title}
              </span>
              {idx < PHASES.length - 1 && (
                <span className="text-[var(--brand)] select-none">→</span>
              )}
            </React.Fragment>
          ))}
          <span className="text-[var(--brand)] select-none">↺ repeat</span>
        </div>
      </div>
    </section>
  );
}

