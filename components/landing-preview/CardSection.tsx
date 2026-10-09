"use client";

import React, { useState } from "react";
import type { PreviewTheme } from "./types";

interface CardSectionProps {
  theme: PreviewTheme;
}

interface RadiusDemo {
  label: string;
  value: string;
  cssClass: string;
  typicalUsage: string;
}

const RADIUS_DEMOS: RadiusDemo[] = [
  { label: "8px", value: "rounded-lg (8px)", cssClass: "rounded-[8px]", typicalUsage: "Micro badges, chips, tags, inputs" },
  { label: "10px", value: "rounded-[10px]", cssClass: "rounded-[10px]", typicalUsage: "Sub-widgets, list items, action buttons" },
  { label: "16px", value: "rounded-2xl (16px)", cssClass: "rounded-[16px]", typicalUsage: "Standard cards, floating panels, dialogs" },
  { label: "20px", value: "rounded-[20px]", cssClass: "rounded-[20px]", typicalUsage: "Featured cards, primary product modules" },
  { label: "24px", value: "rounded-3xl (24px)", cssClass: "rounded-[24px]", typicalUsage: "Hero surfaces, modal sheets, main canvas" },
  { label: "Pill", value: "rounded-full", cssClass: "rounded-full", typicalUsage: "Status pills, segment switches, pill CTAs" },
];

export const CardSection: React.FC<CardSectionProps> = ({ theme }) => {
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  return (
    <section id="cards" className="space-y-12 py-12 border-t border-[var(--lp-border)]">
      {/* Section Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="font-mono text-xs font-semibold uppercase tracking-wider text-[var(--lp-forest)]">
            Section D · Architecture
          </span>
          <span className="text-xs text-[var(--lp-text-tertiary)]">/</span>
          <span className="text-xs text-[var(--lp-text-secondary)]">Surface Hierarchy, Radius & Elevation</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--lp-text-primary)]">
          Card Taxonomy & Tactile Depths
        </h2>
        <p className="mt-2 text-sm sm:text-base text-[var(--lp-text-secondary)] max-w-3xl leading-relaxed">
          SATAT cards avoid heavy gradients and excessive glassmorphism. They rely on crisp micro-borders, 
          natural atmospheric shadows, and deliberate tactile radii that guide the eye without competing for attention.
        </p>
      </div>

      {/* ── 1. The 6 Card Archetypes ── */}
      <div className="space-y-4">
        <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-[var(--lp-text-tertiary)]">
          Card Archetypes
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Archetype 1: Standard Card */}
          <div
            onMouseEnter={() => setHoveredCard("standard")}
            onMouseLeave={() => setHoveredCard(null)}
            className="group relative p-6 rounded-[16px] bg-[var(--lp-surface)] border border-[var(--lp-border)] shadow-[var(--lp-shadow-sm)] hover:shadow-[var(--lp-shadow-md)] hover:border-[var(--lp-border-strong)] transition-all duration-300 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[var(--lp-text-tertiary)]">
                  Standard Surface
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--lp-bg-subtle)] text-[var(--lp-text-secondary)]">
                  16px · Flat 1x
                </span>
              </div>
              <h4 className="text-lg font-semibold text-[var(--lp-text-primary)] mb-2">
                Daily Habit Momentum
              </h4>
              <p className="text-sm text-[var(--lp-text-secondary)] leading-relaxed">
                Workhorse card for list entries, routine check-ins, and secondary metrics. Completely opaque, zero optical distraction.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-[var(--lp-border-subtle)] flex items-center justify-between text-xs text-[var(--lp-text-tertiary)]">
              <span>Border: var(--lp-border)</span>
              <span className="font-mono text-[11px]">Hover: +2px lift</span>
            </div>
          </div>

          {/* Archetype 2: Elevated Card */}
          <div
            onMouseEnter={() => setHoveredCard("elevated")}
            onMouseLeave={() => setHoveredCard(null)}
            className="group relative p-6 rounded-[20px] bg-[var(--lp-surface-elevated)] border border-[var(--lp-border)] shadow-[var(--lp-shadow-md)] hover:shadow-[var(--lp-shadow-lg)] hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[var(--lp-forest)]">
                  Elevated Surface
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--lp-sage-subtle)] text-[var(--lp-forest)] font-medium">
                  20px · Shadow 2x
                </span>
              </div>
              <h4 className="text-lg font-semibold text-[var(--lp-text-primary)] mb-2">
                Weekly Recovery Synthesis
              </h4>
              <p className="text-sm text-[var(--lp-text-secondary)] leading-relaxed">
                Reserved for key summaries, focal highlights, and actionable weekly insights that sit physically above the base canvas.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-[var(--lp-border-subtle)] flex items-center justify-between text-xs text-[var(--lp-text-tertiary)]">
              <span>Shadow: var(--lp-shadow-md)</span>
              <span className="font-mono text-[11px]">Hover: Shadow LG</span>
            </div>
          </div>

          {/* Archetype 3: Subtle Card */}
          <div
            onMouseEnter={() => setHoveredCard("subtle")}
            onMouseLeave={() => setHoveredCard(null)}
            className="group relative p-6 rounded-[16px] bg-[var(--lp-bg-subtle)] border border-transparent hover:border-[var(--lp-border)] transition-all duration-300 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[var(--lp-text-tertiary)]">
                  Subtle Inset
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--lp-surface)] text-[var(--lp-text-secondary)]">
                  16px · Borderless
                </span>
              </div>
              <h4 className="text-lg font-semibold text-[var(--lp-text-primary)] mb-2">
                Secondary Reflection Log
              </h4>
              <p className="text-sm text-[var(--lp-text-secondary)] leading-relaxed">
                Blends into the canvas background to de-emphasize ancillary notes, completed tasks, or background telemetry.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-[var(--lp-border)] flex items-center justify-between text-xs text-[var(--lp-text-tertiary)]">
              <span>Background: var(--lp-bg-subtle)</span>
              <span className="font-mono text-[11px]">No shadow</span>
            </div>
          </div>

          {/* Archetype 4: Glass Card */}
          <div
            onMouseEnter={() => setHoveredCard("glass")}
            onMouseLeave={() => setHoveredCard(null)}
            className="group relative p-6 rounded-[20px] bg-[var(--lp-glass-bg)] backdrop-blur-md border border-[var(--lp-glass-border)] shadow-[var(--lp-shadow-glass)] hover:border-[var(--lp-sage)] transition-all duration-300 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[var(--lp-forest)]">
                  Restrained Glass
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--lp-sage-subtle)] text-[var(--lp-forest)] font-medium">
                  20px · 12px Blur
                </span>
              </div>
              <h4 className="text-lg font-semibold text-[var(--lp-text-primary)] mb-2">
                Floating Orbit Dialog
              </h4>
              <p className="text-sm text-[var(--lp-text-secondary)] leading-relaxed">
                Strictly used for floating contextual overlays and navigation headers. Never used for general wall-of-cards content.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-[var(--lp-border-subtle)] flex items-center justify-between text-xs text-[var(--lp-text-tertiary)]">
              <span>Opacity: 72% · Blur: 12px</span>
              <span className="font-mono text-[11px]">Natural translucency</span>
            </div>
          </div>

          {/* Archetype 5: Dark Forest Feature Card */}
          <div
            onMouseEnter={() => setHoveredCard("dark")}
            onMouseLeave={() => setHoveredCard(null)}
            className="group relative p-6 rounded-[24px] bg-[#101412] text-[#F4F5EF] border border-[rgba(255,255,255,0.1)] shadow-[0_8px_32px_rgba(0,0,0,0.4)] hover:border-[rgba(168,184,157,0.3)] transition-all duration-300 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[#A8B89D]">
                  Dark Accent Card
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-[#181D1A] text-[#A8B89D] border border-[rgba(255,255,255,0.08)]">
                  24px · Contrast
                </span>
              </div>
              <h4 className="text-lg font-semibold text-white mb-2">
                Deep Focus Protocol
              </h4>
              <p className="text-sm text-[#A2A89F] leading-relaxed">
                Intentional contrast card used inside light layouts to anchor milestone achievements or high-leverage actions.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-[rgba(255,255,255,0.08)] flex items-center justify-between text-xs text-[#71786E]">
              <span>Surface: #101412</span>
              <span className="font-mono text-[11px]">Text: #F4F5EF</span>
            </div>
          </div>

          {/* Archetype 6: Product Data Card */}
          <div
            onMouseEnter={() => setHoveredCard("product")}
            onMouseLeave={() => setHoveredCard(null)}
            className="group relative p-6 rounded-[20px] bg-[var(--lp-surface)] border border-[var(--lp-border)] shadow-[var(--lp-shadow-sm)] hover:shadow-[var(--lp-shadow-md)] transition-all duration-300 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[var(--lp-forest)]" />
                  <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[var(--lp-text-secondary)]">
                    Live Telemetry Card
                  </span>
                </div>
                <span className="text-xs font-mono font-medium text-[var(--lp-forest)]">
                  87% Consistency
                </span>
              </div>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-2xl font-bold tracking-tight text-[var(--lp-text-primary)]">
                  1,840
                </span>
                <span className="text-xs text-[var(--lp-text-tertiary)]">/ 2,300 kcal</span>
              </div>
              {/* Progress track */}
              <div className="w-full bg-[var(--lp-bg-subtle)] h-2 rounded-full overflow-hidden my-3">
                <div className="bg-[var(--lp-forest)] h-full rounded-full transition-all duration-500" style={{ width: "80%" }} />
              </div>
              <p className="text-xs text-[var(--lp-text-secondary)] flex justify-between">
                <span>P: 142g · C: 195g</span>
                <span className="text-[var(--lp-success)] font-medium">On Track</span>
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-[var(--lp-border-subtle)] flex items-center justify-between text-xs text-[var(--lp-text-tertiary)]">
              <span>Dynamic Data Container</span>
              <span className="font-mono text-[11px]">20px Radius</span>
            </div>
          </div>

        </div>
      </div>

      {/* ── 2. The 6-Step Radius Hierarchy ── */}
      <div className="space-y-4 pt-4">
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
          <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-[var(--lp-text-tertiary)]">
            Radius System Specimen (8px → Pill)
          </h3>
          <p className="text-xs text-[var(--lp-text-secondary)]">
            Consistent geometric scaling ensures nested components maintain optical harmony.
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {RADIUS_DEMOS.map((item) => (
            <div
              key={item.label}
              className={`p-4 bg-[var(--lp-surface)] border border-[var(--lp-border)] shadow-[var(--lp-shadow-sm)] ${item.cssClass} flex flex-col justify-between h-36 hover:border-[var(--lp-forest)] transition-all`}
            >
              <div>
                <span className="inline-block px-2 py-0.5 rounded bg-[var(--lp-forest-subtle)] text-[var(--lp-forest)] font-mono text-xs font-bold mb-2">
                  {item.label}
                </span>
                <div className="text-[11px] font-mono text-[var(--lp-text-secondary)]">
                  {item.value}
                </div>
              </div>
              <div className="text-[10px] text-[var(--lp-text-tertiary)] leading-tight">
                {item.typicalUsage}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 3. Shadow Elevation Depth Ladder ── */}
      <div className="space-y-4 pt-4">
        <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-[var(--lp-text-tertiary)]">
          Natural Atmospheric Shadow Ladder
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="p-6 rounded-[16px] bg-[var(--lp-surface)] border border-[var(--lp-border)] shadow-[var(--lp-shadow-sm)] flex flex-col justify-between">
            <div>
              <span className="text-xs font-mono font-semibold text-[var(--lp-text-secondary)]">Shadow SM</span>
              <h4 className="text-base font-semibold text-[var(--lp-text-primary)] mt-1">Ground Plane</h4>
              <p className="text-xs text-[var(--lp-text-secondary)] mt-2">
                0 1px 2px rgba(23,26,23,0.03), 0 2px 6px rgba(23,26,23,0.02)
              </p>
            </div>
            <span className="text-[11px] font-mono text-[var(--lp-text-tertiary)] mt-4">Static in-flow cards</span>
          </div>
          <div className="p-6 rounded-[16px] bg-[var(--lp-surface)] border border-[var(--lp-border)] shadow-[var(--lp-shadow-md)] flex flex-col justify-between">
            <div>
              <span className="text-xs font-mono font-semibold text-[var(--lp-forest)]">Shadow MD</span>
              <h4 className="text-base font-semibold text-[var(--lp-text-primary)] mt-1">Mid Elevation</h4>
              <p className="text-xs text-[var(--lp-text-secondary)] mt-2">
                0 2px 4px rgba(23,26,23,0.03), 0 8px 20px rgba(23,26,23,0.04)
              </p>
            </div>
            <span className="text-[11px] font-mono text-[var(--lp-text-tertiary)] mt-4">Hover states & floating panels</span>
          </div>
          <div className="p-6 rounded-[16px] bg-[var(--lp-surface)] border border-[var(--lp-border)] shadow-[var(--lp-shadow-lg)] flex flex-col justify-between">
            <div>
              <span className="text-xs font-mono font-semibold text-[var(--lp-text-secondary)]">Shadow LG</span>
              <h4 className="text-base font-semibold text-[var(--lp-text-primary)] mt-1">Modal / Spotlight</h4>
              <p className="text-xs text-[var(--lp-text-secondary)] mt-2">
                0 4px 8px rgba(23,26,23,0.04), 0 16px 36px rgba(23,26,23,0.06)
              </p>
            </div>
            <span className="text-[11px] font-mono text-[var(--lp-text-tertiary)] mt-4">Active dialogs & top-layer popovers</span>
          </div>
        </div>
      </div>
    </section>
  );
};

