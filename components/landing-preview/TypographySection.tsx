"use client";

import React from "react";
import { TypeSpec, PreviewTheme } from "./types";

const typeSpecs: TypeSpec[] = [
  {
    name: "Display XL",
    tag: "Hero Headline",
    size: "64px / 4rem (sm: 80px / 5rem)",
    weight: "Bold 700 (Plus Jakarta Sans)",
    lineHeight: "1.05",
    tracking: "-0.035em",
    sampleText: "Progress,\nmade continuous.",
    usage: "Primary landing hero statement; monumental scale with tight character tracking",
  },
  {
    name: "Display L",
    tag: "Section Feature Anchor",
    size: "44px / 2.75rem (sm: 52px / 3.25rem)",
    weight: "Bold 700 (Plus Jakarta Sans)",
    lineHeight: "1.12",
    tracking: "-0.025em",
    sampleText: "One system.\nMany parts of your life.",
    usage: "Major thematic section headers (Continuity, Dark Section, Orbit introduction)",
  },
  {
    name: "Headline 1 (H1)",
    tag: "Feature Header",
    size: "32px / 2rem (sm: 38px / 2.375rem)",
    weight: "SemiBold 600 (Plus Jakarta Sans)",
    lineHeight: "1.2",
    tracking: "-0.02em",
    sampleText: "Connect goals, training, nutrition and recovery into unbroken rhythm.",
    usage: "Key value proposition headlines and pillar introductions",
  },
  {
    name: "Headline 2 (H2)",
    tag: "Card & Sub-feature Header",
    size: "24px / 1.5rem",
    weight: "SemiBold 600 (Plus Jakarta Sans)",
    lineHeight: "1.3",
    tracking: "-0.015em",
    sampleText: "Adaptive guidance that never scolds, only adjusts.",
    usage: "Card group headers, Orbit message headers, feature block titles",
  },
  {
    name: "Headline 3 (H3)",
    tag: "Module Title",
    size: "18px / 1.125rem",
    weight: "SemiBold 600 (Plus Jakarta Sans)",
    lineHeight: "1.35",
    tracking: "-0.01em",
    sampleText: "Upper Body Hypertrophy · Week 4",
    usage: "Widget headers, metric cards, floating dimension card titles",
  },
  {
    name: "Body Large",
    tag: "Hero Subhead & Lead",
    size: "18px / 1.125rem (sm: 20px / 1.25rem)",
    weight: "Regular 400 (Inter)",
    lineHeight: "1.6",
    tracking: "-0.005em",
    sampleText: "Satat connects your goals, routines, training, nutrition and progress into one intelligent system — so you can build consistency and keep becoming better.",
    usage: "Lead editorial paragraphs, hero descriptions, narrative story blocks",
  },
  {
    name: "Body Default",
    tag: "Standard Content",
    size: "15px / 0.9375rem",
    weight: "Regular 400 (Inter)",
    lineHeight: "1.65",
    tracking: "0em",
    sampleText: "When your training volume peaks on heavy squat days, Satat automatically recalibrates your protein and recovery targets before you even open your log.",
    usage: "Feature descriptions, card bodies, explanatory texts",
  },
  {
    name: "Body Small",
    tag: "Secondary Text",
    size: "13px / 0.8125rem",
    weight: "Medium 500 (Inter)",
    lineHeight: "1.55",
    tracking: "0em",
    sampleText: "Based on 28-day rolling volume · Updated 14 minutes ago via watch sync",
    usage: "Supporting annotations, contextual hints, secondary card copy",
  },
  {
    name: "Eyebrow / Micro-Label",
    tag: "Pillar Identifier",
    size: "11px / 0.6875rem",
    weight: "Bold 700 (Inter)",
    lineHeight: "1.2",
    tracking: "0.14em uppercase",
    sampleText: "CONTINUOUS PERSONAL SYSTEM",
    usage: "Section category tags, feature pill pre-headers, badge labels",
  },
  {
    name: "Caption / Metric Unit",
    tag: "Fine Print",
    size: "11px / 0.6875rem",
    weight: "Medium 500 (Inter)",
    lineHeight: "1.4",
    tracking: "0.01em",
    sampleText: "1,840 / 2,300 kcal · 87% Consistency · Zero clinical friction",
    usage: "Metric units, footer notes, disclaimer microcopy",
  },
];

export function TypographySection({ theme }: { theme?: PreviewTheme } = {}) {
  return (
    <section id="section-typography" className="space-y-12">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[11px] font-bold tracking-[0.14em] uppercase text-[var(--lp-forest-support)]">
            Section 02 · Editorial Voice
          </span>
        </div>
        <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[var(--lp-text-primary)]">
          Typography System
        </h2>
        <p className="text-sm text-[var(--lp-text-secondary)] mt-1.5 max-w-2xl">
          Expressive editorial scale powered by Plus Jakarta Sans for structural authority and Inter for high-clarity reading. Built with generous line-height and strong contrast.
        </p>
      </div>

      <div className="space-y-8">
        {typeSpecs.map((spec) => (
          <div
            key={spec.name}
            className="p-6 rounded-2xl border bg-[var(--lp-surface)] border-[var(--lp-border)] shadow-[var(--lp-shadow-sm)] space-y-4"
          >
            {/* Spec metadata bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--lp-border-subtle)] pb-3">
              <div className="flex items-center gap-2.5">
                <span className="font-display font-bold text-sm text-[var(--lp-forest)]">{spec.name}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--lp-forest-subtle)] text-[var(--lp-forest-support)] font-medium">
                  {spec.tag}
                </span>
              </div>
              <div className="flex items-center gap-4 text-[11px] font-mono text-[var(--lp-text-tertiary)]">
                <span>{spec.size}</span>
                <span>·</span>
                <span>{spec.weight}</span>
                <span>·</span>
                <span>{spec.tracking}</span>
              </div>
            </div>

            {/* Spec sample rendering */}
            <div className="py-2">
              {spec.name === "Display XL" ? (
                <div className="font-display font-bold text-4xl sm:text-6xl lg:text-[76px] leading-[1.04] tracking-[-0.035em] text-[var(--lp-text-primary)] whitespace-pre-line">
                  {spec.sampleText}
                </div>
              ) : spec.name === "Display L" ? (
                <div className="font-display font-bold text-3xl sm:text-4xl lg:text-[48px] leading-[1.12] tracking-[-0.025em] text-[var(--lp-text-primary)] whitespace-pre-line">
                  {spec.sampleText}
                </div>
              ) : spec.name === "Headline 1 (H1)" ? (
                <h1 className="font-display font-semibold text-2xl sm:text-3xl leading-[1.2] tracking-[-0.02em] text-[var(--lp-text-primary)]">
                  {spec.sampleText}
                </h1>
              ) : spec.name === "Headline 2 (H2)" ? (
                <h2 className="font-display font-semibold text-xl sm:text-2xl leading-[1.3] tracking-[-0.015em] text-[var(--lp-text-primary)]">
                  {spec.sampleText}
                </h2>
              ) : spec.name === "Headline 3 (H3)" ? (
                <h3 className="font-display font-semibold text-lg leading-[1.35] tracking-[-0.01em] text-[var(--lp-text-primary)]">
                  {spec.sampleText}
                </h3>
              ) : spec.name === "Body Large" ? (
                <p className="text-lg sm:text-[19px] leading-[1.6] text-[var(--lp-text-secondary)]">
                  {spec.sampleText}
                </p>
              ) : spec.name === "Body Default" ? (
                <p className="text-[15px] leading-[1.65] text-[var(--lp-text-secondary)]">
                  {spec.sampleText}
                </p>
              ) : spec.name === "Body Small" ? (
                <p className="text-[13px] font-medium leading-[1.55] text-[var(--lp-text-secondary)]">
                  {spec.sampleText}
                </p>
              ) : spec.name === "Eyebrow / Micro-Label" ? (
                <span className="text-[11px] font-bold tracking-[0.14em] uppercase text-[var(--lp-forest-support)]">
                  {spec.sampleText}
                </span>
              ) : (
                <span className="text-[11px] font-medium text-[var(--lp-text-tertiary)]">
                  {spec.sampleText}
                </span>
              )}
            </div>

            {/* Usage guidance */}
            <p className="text-[11px] text-[var(--lp-text-tertiary)] border-t border-[var(--lp-border-subtle)] pt-2.5">
              <strong className="text-[var(--lp-text-secondary)]">Application:</strong> {spec.usage}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
