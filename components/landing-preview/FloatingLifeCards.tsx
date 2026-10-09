"use client";

import React, { useState } from "react";
import type { PreviewTheme } from "./types";

interface FloatingLifeCardsProps {
  theme: PreviewTheme;
}

interface LifeDimension {
  id: string;
  dimension: string;
  headline: string;
  subline: string;
  metric: string;
  badge: string;
  badgeColor: string;
  animationClass: string;
  icon: React.ReactNode;
}

export const FloatingLifeCards: React.FC<FloatingLifeCardsProps> = ({ theme }) => {
  const [selectedDimension, setSelectedDimension] = useState<string>("training");

  const DIMENSIONS: LifeDimension[] = [
    {
      id: "goal",
      dimension: "Goal",
      headline: "Lose 3 kg",
      subline: "Current: 76.2 kg · Target: 73.2 kg",
      metric: "-0.4 kg / wk pace",
      badge: "Target Q4",
      badgeColor: "bg-[var(--lp-forest-subtle)] text-[var(--lp-forest)]",
      animationClass: "lp-float-slow",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
    },
    {
      id: "training",
      dimension: "Training",
      headline: "Upper Body A",
      subline: "3 compounds · 45 min · RPE 8.0",
      metric: "Next: Incline DB Press",
      badge: "Hypertrophy",
      badgeColor: "bg-[var(--lp-sage-subtle)] text-[var(--lp-forest)]",
      animationClass: "lp-float-alt",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6h18M3 12h18M3 18h18" />
        </svg>
      ),
    },
    {
      id: "nutrition",
      dimension: "Nutrition",
      headline: "142g protein",
      subline: "1,840 kcal logged · 460 kcal remaining",
      metric: "78% daily target",
      badge: "Clean Fuel",
      badgeColor: "bg-[var(--lp-forest-subtle)] text-[var(--lp-forest)]",
      animationClass: "lp-float-slow",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707" />
        </svg>
      ),
    },
    {
      id: "recovery",
      dimension: "Recovery",
      headline: "7h 42m",
      subline: "Deep sleep 1h 48m · Resting HR 54 bpm",
      metric: "Recovery 91%",
      badge: "Optimal Rest",
      badgeColor: "bg-[var(--lp-sage-subtle)] text-[var(--lp-forest)]",
      animationClass: "lp-float-alt",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      ),
    },
    {
      id: "tasks",
      dimension: "Tasks",
      headline: "5/6 completed",
      subline: "Mobility, Hydration, Lunch meal prep",
      metric: "Pending: Night walk",
      badge: "Consistency",
      badgeColor: "bg-[var(--lp-forest-subtle)] text-[var(--lp-forest)]",
      animationClass: "lp-float-slow",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ];

  return (
    <section id="life-cards" className="space-y-8 py-16 border-t border-[var(--lp-border)]">
      {/* Section Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="font-mono text-xs font-semibold uppercase tracking-wider text-[var(--lp-forest)]">
            Section G · Synthesis
          </span>
          <span className="text-xs text-[var(--lp-text-tertiary)]">/</span>
          <span className="text-xs text-[var(--lp-text-secondary)]">Connected Dimensions of Human Life</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--lp-text-primary)]">
          Floating Life Dimensions
        </h2>
        <p className="mt-2 text-sm sm:text-base text-[var(--lp-text-secondary)] max-w-3xl leading-relaxed">
          Health is not an isolated workout log or an isolated calorie counter. SATAT floats and interconnects 
          all five core dimensions so a change in one automatically adapts the others.
        </p>
      </div>

      {/* Floating Canvas Area */}
      <div className="relative p-6 sm:p-10 lg:p-14 rounded-[24px] sm:rounded-[32px] bg-[var(--lp-bg-subtle)] border border-[var(--lp-border)] overflow-hidden">
        
        {/* Soft Background Center Ambient */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] rounded-full bg-[var(--lp-sage-subtle)] blur-3xl pointer-events-none opacity-50" />

        {/* Central Brand Anchor */}
        <div className="text-center mb-8 relative z-10">
          <span className="inline-block px-3 py-1 rounded-full bg-[var(--lp-surface)] border border-[var(--lp-border)] text-[11px] font-mono text-[var(--lp-text-secondary)]">
            Continuous Integration Engine
          </span>
        </div>

        {/* Floating Cards Grid / Cloud */}
        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto">
          {DIMENSIONS.map((card) => {
            const isSelected = selectedDimension === card.id;

            return (
              <div
                key={card.id}
                onClick={() => setSelectedDimension(card.id)}
                className={`cursor-pointer p-6 rounded-[20px] bg-[var(--lp-surface)] border transition-all duration-300 ${
                  isSelected
                    ? "border-[var(--lp-forest)] shadow-[var(--lp-shadow-md)] -translate-y-1 ring-1 ring-[var(--lp-forest)]"
                    : "border-[var(--lp-border)] shadow-[var(--lp-shadow-sm)] hover:border-[var(--lp-border-strong)]"
                } ${card.animationClass}`}
              >
                {/* Card Top: Dimension + Badge */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-[var(--lp-bg-subtle)] text-[var(--lp-forest)]">
                      {card.icon}
                    </span>
                    <span className="font-mono text-xs font-bold uppercase tracking-wider text-[var(--lp-text-tertiary)]">
                      {card.dimension}
                    </span>
                  </div>
                  <span className={`text-[11px] font-mono font-medium px-2 py-0.5 rounded-full ${card.badgeColor}`}>
                    {card.badge}
                  </span>
                </div>

                {/* Card Headline & Detail */}
                <div className="space-y-1">
                  <h3 className="text-xl font-bold tracking-tight text-[var(--lp-text-primary)]">
                    &ldquo;{card.headline}&rdquo;
                  </h3>
                  <p className="text-xs text-[var(--lp-text-secondary)] leading-relaxed">
                    {card.subline}
                  </p>
                </div>

                {/* Card Bottom: Metric & Continuity Indicator */}
                <div className="mt-5 pt-3 border-t border-[var(--lp-border-subtle)] flex items-center justify-between text-xs">
                  <span className="font-mono text-[11px] text-[var(--lp-forest)] font-medium">
                    {card.metric}
                  </span>
                  <span className="text-[10px] text-[var(--lp-text-tertiary)] flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--lp-forest)]" />
                    Synchronized
                  </span>
                </div>
              </div>
            );
          })}

          {/* Central Synthesis Summary Card (6th Card) */}
          <div className="p-6 rounded-[20px] bg-[var(--lp-surface-elevated)] border border-[var(--lp-forest)] shadow-[var(--lp-shadow-md)] flex flex-col justify-between lp-pulse-subtle">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-[var(--lp-forest)]" />
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-[var(--lp-forest)]">
                  The Synthesis
                </span>
              </div>
              <h4 className="text-lg font-bold text-[var(--lp-text-primary)]">
                Unbroken System
              </h4>
              <p className="text-xs text-[var(--lp-text-secondary)] mt-1.5 leading-relaxed">
                When training increases, nutrition auto-compensates. When sleep dips, workout volume adjusts. 
                Everything is linked.
              </p>
            </div>
            <div className="mt-5 pt-3 border-t border-[var(--lp-border-subtle)] flex items-center justify-between text-xs text-[var(--lp-text-secondary)]">
              <span className="font-mono text-[11px]">Active dimension: {selectedDimension}</span>
              <span className="text-[var(--lp-forest)] font-medium">Autonomous</span>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-8 text-center text-xs text-[var(--lp-text-tertiary)] font-mono">
          Hover or click any life dimension to inspect cross-system synchronization.
        </div>
      </div>
    </section>
  );
};

