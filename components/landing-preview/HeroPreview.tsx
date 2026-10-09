"use client";

import React, { useState } from "react";
import type { PreviewTheme } from "./types";

interface HeroPreviewProps {
  theme: PreviewTheme;
}

export const HeroPreview: React.FC<HeroPreviewProps> = ({ theme }) => {
  const [clickedCTA, setClickedCTA] = useState<string | null>(null);

  return (
    <section id="hero" className="space-y-8 py-16 border-t border-[var(--lp-border)]">
      {/* Section Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="font-mono text-xs font-semibold uppercase tracking-wider text-[var(--lp-forest)]">
            Section E · Composition
          </span>
          <span className="text-xs text-[var(--lp-text-tertiary)]">/</span>
          <span className="text-xs text-[var(--lp-text-secondary)]">Editorial Hero Architecture</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--lp-text-primary)]">
          Hero Typographic Stance
        </h2>
        <p className="mt-2 text-sm sm:text-base text-[var(--lp-text-secondary)] max-w-3xl leading-relaxed">
          The hero does not shout with aggressive marketing claims or neon badges. It sets an editorial, calm, and grounded 
          tone with generous whitespace, disciplined hierarchy, and authoritative typographic presence.
        </p>
      </div>

      {/* Hero Canvas Container */}
      <div className="relative overflow-hidden rounded-[24px] sm:rounded-[32px] bg-[var(--lp-surface)] border border-[var(--lp-border)] shadow-[var(--lp-shadow-sm)] p-8 sm:p-14 lg:p-20 transition-all duration-300">
        
        {/* Subtle Ambient Radial Glow (Soft Forest / Ivory Tint, zero neon) */}
        <div 
          className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[350px] rounded-full pointer-events-none opacity-40 blur-3xl"
          style={{
            background: "radial-gradient(circle, var(--lp-sage-soft) 0%, transparent 70%)"
          }}
        />

        {/* Content Hierarchy */}
        <div className="relative z-10 max-w-3xl mx-auto text-center flex flex-col items-center">
          
          {/* 1. Eyebrow Tag */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--lp-forest-subtle)] border border-[var(--lp-border-subtle)] mb-6 sm:mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--lp-forest)]" />
            <span className="text-[11px] sm:text-xs font-mono font-semibold uppercase tracking-[0.2em] text-[var(--lp-forest)]">
              YOUR LIFE. ONE SYSTEM.
            </span>
          </div>

          {/* 2. Editorial Headline */}
          <h1 
            className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-[-0.035em] text-[var(--lp-text-primary)] leading-[1.06] mb-6 sm:mb-8 font-sans"
            style={{ fontFamily: "var(--font-plus-jakarta), sans-serif" }}
          >
            Progress,
            <br />
            <span className="text-[var(--lp-forest)]">made continuous.</span>
          </h1>

          {/* 3. Supporting Body */}
          <p className="text-base sm:text-lg lg:text-xl text-[var(--lp-text-secondary)] leading-relaxed max-w-2xl font-normal mb-8 sm:mb-10">
            Satat connects your goals, routines, training, nutrition and progress into one intelligent system — so you can build consistency and keep becoming better.
          </p>

          {/* 4. Action CTA Pair */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
            {/* Primary CTA */}
            <button
              onClick={() => setClickedCTA("primary")}
              className="w-full sm:w-auto px-7 py-3.5 rounded-full bg-[var(--lp-forest)] hover:bg-[var(--lp-forest-hover)] active:bg-[var(--lp-forest-2)] text-[var(--lp-text-on-forest)] font-medium text-sm sm:text-base tracking-tight shadow-sm hover:shadow-md transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lp-forest)] focus-visible:ring-offset-2 flex items-center justify-center gap-2"
            >
              <span>Start building consistency</span>
              <span className="text-base transition-transform group-hover:translate-x-1">→</span>
            </button>

            {/* Secondary CTA */}
            <button
              onClick={() => setClickedCTA("secondary")}
              className="w-full sm:w-auto px-6 py-3.5 rounded-full bg-transparent hover:bg-[var(--lp-bg-subtle)] active:bg-[var(--lp-surface-inset)] text-[var(--lp-text-primary)] border border-[var(--lp-border)] hover:border-[var(--lp-border-strong)] font-medium text-sm sm:text-base tracking-tight transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lp-forest)] focus-visible:ring-offset-2 flex items-center justify-center gap-2"
            >
              <span>See how it works</span>
              <span className="text-xs text-[var(--lp-text-tertiary)]">↓</span>
            </button>
          </div>

          {/* 5. Minimal Reassurance Line */}
          <div className="mt-10 sm:mt-12 flex flex-wrap items-center justify-center gap-6 text-xs text-[var(--lp-text-tertiary)] border-t border-[var(--lp-border-subtle)] pt-6 w-full max-w-lg">
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-[var(--lp-forest)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              No fragmented apps
            </span>
            <span className="w-1 h-1 rounded-full bg-[var(--lp-border-strong)]" />
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-[var(--lp-forest)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              Adaptive daily guidance
            </span>
            <span className="w-1 h-1 rounded-full bg-[var(--lp-border-strong)]" />
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-[var(--lp-forest)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              Lifelong progression
            </span>
          </div>

          {clickedCTA && (
            <div className="mt-4 text-xs font-mono text-[var(--lp-forest)] animate-fade-in">
              Interactive test trigger: &quot;{clickedCTA === "primary" ? "Start building consistency →" : "See how it works ↓"}&quot; clicked
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

