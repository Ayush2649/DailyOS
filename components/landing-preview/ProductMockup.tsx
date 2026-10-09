"use client";

import React, { useState } from "react";
import type { PreviewTheme } from "./types";

interface ProductMockupProps {
  theme: PreviewTheme;
}

export const ProductMockup: React.FC<ProductMockupProps> = ({ theme }) => {
  const [activeTab, setActiveTab] = useState<"overview" | "training" | "nutrition">("overview");
  const [completedTask, setCompletedTask] = useState<Record<string, boolean>>({
    task1: true,
    task2: true,
    task3: false,
  });

  const toggleTask = (id: string) => {
    setCompletedTask((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <section id="product-mockup" className="space-y-8 py-16 border-t border-[var(--lp-border)]">
      {/* Section Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="font-mono text-xs font-semibold uppercase tracking-wider text-[var(--lp-forest)]">
            Section F · Realism
          </span>
          <span className="text-xs text-[var(--lp-text-tertiary)]">/</span>
          <span className="text-xs text-[var(--lp-text-secondary)]">Product Dashboard Visualization</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--lp-text-primary)]">
          The Living Canvas: Product UI Preview
        </h2>
        <p className="mt-2 text-sm sm:text-base text-[var(--lp-text-secondary)] max-w-3xl leading-relaxed">
          The SATAT dashboard is engineered for psychological clarity. It trades visual clutter and chaotic analytics 
          for a grounded daily compass that synthesizes what matters right now: focus, fuel, and momentum.
        </p>
      </div>

      {/* Main Mockup Container (Simulated Window Frame) */}
      <div className="relative rounded-[24px] sm:rounded-[28px] bg-[var(--lp-surface)] border border-[var(--lp-border)] shadow-[var(--lp-shadow-md)] overflow-hidden transition-all duration-300">
        
        {/* Mockup Window Titlebar */}
        <div className="px-5 py-3.5 border-b border-[var(--lp-border-subtle)] bg-[var(--lp-bg-subtle)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--lp-border-strong)]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--lp-border-strong)]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--lp-border-strong)]" />
            <span className="ml-2 font-mono text-[11px] text-[var(--lp-text-tertiary)]">
              satat.app/today
            </span>
          </div>
          
          {/* Subtle Navigation Tab Pills inside Mockup */}
          <div className="hidden sm:flex items-center gap-1 p-0.5 rounded-full bg-[var(--lp-surface)] border border-[var(--lp-border)]">
            {(["overview", "training", "nutrition"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1 rounded-full text-xs font-medium capitalize transition-all ${
                  activeTab === tab
                    ? "bg-[var(--lp-forest)] text-white shadow-xs"
                    : "text-[var(--lp-text-secondary)] hover:text-[var(--lp-text-primary)]"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-[var(--lp-text-tertiary)]">Today, 07:15 AM</span>
          </div>
        </div>

        {/* Mockup Body Canvas */}
        <div className="p-6 sm:p-8 lg:p-10 space-y-8 bg-[var(--lp-bg)]">
          
          {/* Greeting & Daily Horizon Header */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-[var(--lp-border)]">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-xs uppercase tracking-widest text-[var(--lp-text-tertiary)]">
                  TODAY
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--lp-forest)] animate-pulse" />
              </div>
              <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--lp-text-primary)]">
                Good morning, Ayush
              </h3>
              <p className="text-xs sm:text-sm text-[var(--lp-text-secondary)] mt-0.5">
                Optimal energy window is between 09:00 and 11:30. Upper body session queued.
              </p>
            </div>

            {/* Consistency Ring Metric */}
            <div className="flex items-center gap-3 bg-[var(--lp-surface)] px-4 py-2.5 rounded-2xl border border-[var(--lp-border)] shadow-xs">
              <div className="relative w-11 h-11 flex items-center justify-center">
                <svg className="w-11 h-11 -rotate-90" viewBox="0 0 36 36">
                  {/* Track */}
                  <path
                    className="text-[var(--lp-border-subtle)]"
                    strokeWidth="3.5"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  {/* Progress Indicator (87%) */}
                  <path
                    className="text-[var(--lp-forest)]"
                    strokeDasharray="87, 100"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <span className="absolute font-mono text-[11px] font-bold text-[var(--lp-text-primary)]">
                  87%
                </span>
              </div>
              <div>
                <div className="text-[11px] font-mono font-medium text-[var(--lp-text-tertiary)] uppercase tracking-wider">
                  Consistency
                </div>
                <div className="text-xs font-semibold text-[var(--lp-text-primary)]">
                  24-Day Streak
                </div>
              </div>
            </div>
          </div>

          {/* Core Daily Columns */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Card 1: Today's Focus / Training */}
            <div className="p-6 rounded-[20px] bg-[var(--lp-surface)] border border-[var(--lp-border)] shadow-xs hover:border-[var(--lp-forest)] transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[var(--lp-text-tertiary)]">
                    Today&apos;s Focus
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--lp-forest-subtle)] text-[var(--lp-forest)] font-mono font-medium">
                    45 min
                  </span>
                </div>
                <h4 className="text-xl font-bold text-[var(--lp-text-primary)]">
                  Upper Body A
                </h4>
                <p className="text-xs text-[var(--lp-text-secondary)] mt-1 mb-4">
                  Hypertrophy & Shoulder Stability Protocol
                </p>
                <div className="space-y-2 text-xs text-[var(--lp-text-secondary)]">
                  <div className="flex items-center justify-between py-1 border-b border-[var(--lp-border-subtle)]">
                    <span>Incline DB Press</span>
                    <span className="font-mono text-[var(--lp-text-tertiary)]">3 × 8-10 · 28kg</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-[var(--lp-border-subtle)]">
                    <span>Chest Supported Row</span>
                    <span className="font-mono text-[var(--lp-text-tertiary)]">3 × 10-12 · 32kg</span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span>Overhead Cable Raise</span>
                    <span className="font-mono text-[var(--lp-text-tertiary)]">2 × 15 · 10kg</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-[var(--lp-border-subtle)] flex items-center justify-between">
                <span className="text-xs text-[var(--lp-text-tertiary)]">Scheduled 10:00 AM</span>
                <span className="text-xs font-semibold text-[var(--lp-forest)] hover:underline cursor-pointer">
                  Start Workout →
                </span>
              </div>
            </div>

            {/* Card 2: Nutrition Telemetry */}
            <div className="p-6 rounded-[20px] bg-[var(--lp-surface)] border border-[var(--lp-border)] shadow-xs hover:border-[var(--lp-forest)] transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[var(--lp-text-tertiary)]">
                    Nutrition
                  </span>
                  <span className="text-xs font-mono text-[var(--lp-success)] font-medium">
                    On Target
                  </span>
                </div>
                
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-3xl font-extrabold tracking-tight text-[var(--lp-text-primary)] font-mono">
                    1,840
                  </span>
                  <span className="text-xs text-[var(--lp-text-tertiary)]">/ 2,300 kcal</span>
                </div>

                {/* Macro Distribution Bars */}
                <div className="space-y-3 mt-4">
                  {/* Protein */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-[var(--lp-text-secondary)] font-medium">Protein (142g / 180g)</span>
                      <span className="font-mono text-[var(--lp-text-tertiary)]">78%</span>
                    </div>
                    <div className="w-full bg-[var(--lp-bg-subtle)] h-2 rounded-full overflow-hidden">
                      <div className="bg-[var(--lp-forest)] h-full rounded-full" style={{ width: "78%" }} />
                    </div>
                  </div>
                  
                  {/* Carbs */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-[var(--lp-text-secondary)] font-medium">Carbohydrates (195g / 240g)</span>
                      <span className="font-mono text-[var(--lp-text-tertiary)]">81%</span>
                    </div>
                    <div className="w-full bg-[var(--lp-bg-subtle)] h-2 rounded-full overflow-hidden">
                      <div className="bg-[var(--lp-sage)] h-full rounded-full" style={{ width: "81%" }} />
                    </div>
                  </div>

                  {/* Fats */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-[var(--lp-text-secondary)] font-medium">Fats (56g / 65g)</span>
                      <span className="font-mono text-[var(--lp-text-tertiary)]">86%</span>
                    </div>
                    <div className="w-full bg-[var(--lp-bg-subtle)] h-2 rounded-full overflow-hidden">
                      <div className="bg-[var(--lp-border-strong)] h-full rounded-full" style={{ width: "86%" }} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-[var(--lp-border-subtle)] flex items-center justify-between text-xs">
                <span className="text-[var(--lp-text-tertiary)]">Remaining: 460 kcal</span>
                <span className="text-xs font-semibold text-[var(--lp-forest)] hover:underline cursor-pointer">
                  Log Meal →
                </span>
              </div>
            </div>

            {/* Card 3: Connected Life Routines */}
            <div className="p-6 rounded-[20px] bg-[var(--lp-surface)] border border-[var(--lp-border)] shadow-xs hover:border-[var(--lp-forest)] transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[var(--lp-text-tertiary)]">
                    Routine Continuity
                  </span>
                  <span className="text-xs font-mono text-[var(--lp-text-tertiary)]">
                    {Object.values(completedTask).filter(Boolean).length} / 3 done
                  </span>
                </div>
                
                <h4 className="text-lg font-bold text-[var(--lp-text-primary)] mb-1">
                  Daily Habit Anchor
                </h4>
                <p className="text-xs text-[var(--lp-text-secondary)] mb-4">
                  Micro-actions that protect daily momentum.
                </p>

                <div className="space-y-2.5">
                  <button
                    onClick={() => toggleTask("task1")}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl bg-[var(--lp-bg-subtle)] hover:bg-[var(--lp-surface-inset)] transition text-left text-xs"
                  >
                    <span className={`flex items-center gap-2 ${completedTask.task1 ? "line-through text-[var(--lp-text-tertiary)]" : "text-[var(--lp-text-primary)]"}`}>
                      <span className={`w-4 h-4 rounded-full flex items-center justify-center border text-[10px] ${
                        completedTask.task1 ? "bg-[var(--lp-forest)] border-[var(--lp-forest)] text-white" : "border-[var(--lp-border-strong)]"
                      }`}>
                        {completedTask.task1 ? "✓" : ""}
                      </span>
                      10m Morning Mobility
                    </span>
                    <span className="font-mono text-[10px] text-[var(--lp-text-tertiary)]">07:00</span>
                  </button>

                  <button
                    onClick={() => toggleTask("task2")}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl bg-[var(--lp-bg-subtle)] hover:bg-[var(--lp-surface-inset)] transition text-left text-xs"
                  >
                    <span className={`flex items-center gap-2 ${completedTask.task2 ? "line-through text-[var(--lp-text-tertiary)]" : "text-[var(--lp-text-primary)]"}`}>
                      <span className={`w-4 h-4 rounded-full flex items-center justify-center border text-[10px] ${
                        completedTask.task2 ? "bg-[var(--lp-forest)] border-[var(--lp-forest)] text-white" : "border-[var(--lp-border-strong)]"
                      }`}>
                        {completedTask.task2 ? "✓" : ""}
                      </span>
                      3L Hydration Target
                    </span>
                    <span className="font-mono text-[10px] text-[var(--lp-text-tertiary)]">Ongoing</span>
                  </button>

                  <button
                    onClick={() => toggleTask("task3")}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl bg-[var(--lp-bg-subtle)] hover:bg-[var(--lp-surface-inset)] transition text-left text-xs"
                  >
                    <span className={`flex items-center gap-2 ${completedTask.task3 ? "line-through text-[var(--lp-text-tertiary)]" : "text-[var(--lp-text-primary)]"}`}>
                      <span className={`w-4 h-4 rounded-full flex items-center justify-center border text-[10px] ${
                        completedTask.task3 ? "bg-[var(--lp-forest)] border-[var(--lp-forest)] text-white" : "border-[var(--lp-border-strong)]"
                      }`}>
                        {completedTask.task3 ? "✓" : ""}
                      </span>
                      Evening Reflection (3 min)
                    </span>
                    <span className="font-mono text-[10px] text-[var(--lp-text-tertiary)]">21:30</span>
                  </button>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-[var(--lp-border-subtle)] flex items-center justify-between text-xs text-[var(--lp-text-tertiary)]">
                <span>Interactive mockup state</span>
                <span className="font-mono text-[11px]">Click items to test</span>
              </div>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
};

