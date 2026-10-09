"use client";

import React, { useState, useEffect } from "react";
import type { PreviewTheme } from "./types";
import { OrbitMark } from "@/components/orbit/OrbitMark";
import { ColorSection } from "./ColorSection";
import { TypographySection } from "./TypographySection";
import { ButtonSection } from "./ButtonSection";
import { CardSection } from "./CardSection";
import { HeroPreview } from "./HeroPreview";
import { ProductMockup } from "./ProductMockup";
import { FloatingLifeCards } from "./FloatingLifeCards";
import { OrbitPreview } from "./OrbitPreview";
import { ContinuityLine } from "./ContinuityLine";
import { DarkSectionPreview } from "./DarkSectionPreview";
import { MotionLab } from "./MotionLab";

import "./landing-preview.css";

const NAV_LINKS = [
  { href: "#colors", label: "Colors" },
  { href: "#typography", label: "Type" },
  { href: "#buttons", label: "Buttons" },
  { href: "#cards", label: "Cards" },
  { href: "#hero", label: "Hero" },
  { href: "#product-mockup", label: "Product UI" },
  { href: "#life-cards", label: "Life Cards" },
  { href: "#orbit", label: "Orbit" },
  { href: "#continuity", label: "Continuity" },
  { href: "#dark-section", label: "Dark Canvas" },
  { href: "#motion-lab", label: "Motion Lab" },
];

export const PreviewShell: React.FC = () => {
  const [theme, setTheme] = useState<PreviewTheme>("light");
  const [reducedMotion, setReducedMotion] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 400);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" });
  };

  return (
    <div
      className={`satat-preview-root min-h-screen ${
        theme === "dark" ? "preview-dark" : ""
      } ${reducedMotion ? "reduced-motion-active" : ""}`}
    >
      {/* ── Ultra-Subtle Noise Grain Overlay ── */}
      <div className="satat-grain-overlay" aria-hidden="true" />

      {/* ── Sticky Top Header Bar ── */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-[var(--lp-surface)]/85 border-b border-[var(--lp-border)] transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          
          {/* Brand Identity & Phase Badge */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-[var(--lp-forest)]">
              <OrbitMark size={22} />
              <span className="font-extrabold text-lg sm:text-xl tracking-tight text-[var(--lp-text-primary)] font-sans">
                SATAT
              </span>
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <span className="h-4 w-[1px] bg-[var(--lp-border)]" />
              <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-[var(--lp-forest-subtle)] text-[var(--lp-forest)] font-medium">
                Design Playground · Phase 1
              </span>
            </div>
          </div>

          {/* Quick-Jump Section Navigation */}
          <nav className="hidden lg:flex items-center gap-1 overflow-x-auto py-1 text-xs">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="px-2.5 py-1 rounded-full text-[var(--lp-text-secondary)] hover:text-[var(--lp-text-primary)] hover:bg-[var(--lp-bg-subtle)] transition font-medium"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Global Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Reduced Motion Switch */}
            <button
              onClick={() => setReducedMotion(!reducedMotion)}
              title="Toggle Reduced Motion"
              className={`p-2 rounded-xl text-xs font-mono border transition ${
                reducedMotion
                  ? "bg-[var(--lp-warning)]/20 border-[var(--lp-warning)] text-[var(--lp-warning)]"
                  : "bg-[var(--lp-surface)] border-[var(--lp-border)] text-[var(--lp-text-secondary)] hover:text-[var(--lp-text-primary)]"
              }`}
            >
              {reducedMotion ? "Motion: Off" : "Motion: On"}
            </button>

            {/* Light / Dark Mode Toggle */}
            <button
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              title="Toggle Theme"
              className="px-3 py-1.5 rounded-xl text-xs font-medium bg-[var(--lp-surface)] border border-[var(--lp-border)] hover:border-[var(--lp-border-strong)] text-[var(--lp-text-primary)] shadow-xs flex items-center gap-1.5 transition"
            >
              <span>{theme === "light" ? "☀ Day" : "☾ Night"}</span>
            </button>
          </div>
        </div>

        {/* Mobile Quick-Jump Scroller */}
        <div className="lg:hidden flex items-center gap-1 px-4 py-2 overflow-x-auto border-t border-[var(--lp-border-subtle)] bg-[var(--lp-bg-subtle)]/50 text-xs scrollbar-none">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="px-2.5 py-1 whitespace-nowrap rounded-full text-[var(--lp-text-secondary)] hover:text-[var(--lp-text-primary)] bg-[var(--lp-surface)] border border-[var(--lp-border-subtle)]"
            >
              {link.label}
            </a>
          ))}
        </div>
      </header>

      {/* ── Main Content Container ── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-16">
        
        {/* Rationale & Playground Scope Banner */}
        <div className="p-6 sm:p-8 rounded-[24px] bg-[var(--lp-forest-subtle)] border border-[var(--lp-forest)]/20 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1 max-w-3xl">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[var(--lp-forest)]" />
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--lp-forest)]">
                Phase 1 Design Playground Specification
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--lp-text-primary)]">
              SATAT Visual Language Exploration Lab
            </h1>
            <p className="text-xs sm:text-sm text-[var(--lp-text-secondary)] leading-relaxed">
              This route (<code className="font-mono bg-[var(--lp-surface)] px-1.5 py-0.5 rounded text-[var(--lp-forest)]">/design-preview</code>) is an isolated sandbox to evaluate color grading, typography, buttons, 
              atmospheric cards, product UI mockups, Orbit presence, continuity flow, and kinetic motion before implementation into the production landing page.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0 text-xs font-mono">
            <span className="px-3 py-2 rounded-xl bg-[var(--lp-surface)] border border-[var(--lp-border)] text-[var(--lp-text-secondary)] text-center">
              Target Branch: satat-ui-redesign
            </span>
            <span className="px-3 py-2 rounded-xl bg-[var(--lp-forest)] text-white text-center font-medium">
              Zero Production Impact
            </span>
          </div>
        </div>

        {/* Section A: Brand & Color */}
        <ColorSection theme={theme} />

        {/* Section B: Typography */}
        <TypographySection theme={theme} />

        {/* Section C: Buttons */}
        <ButtonSection theme={theme} />

        {/* Section D: Cards */}
        <CardSection theme={theme} />

        {/* Section E: Hero Composition */}
        <HeroPreview theme={theme} />

        {/* Section F: Product Dashboard Visualization */}
        <ProductMockup theme={theme} />

        {/* Section G: Floating Connected Life Cards */}
        <FloatingLifeCards theme={theme} />

        {/* Section H: Orbit Ambient Intelligence */}
        <OrbitPreview theme={theme} />

        {/* Section I: Continuity Waveform Metaphor */}
        <ContinuityLine theme={theme} />

        {/* Section J: Deep Forest Dark Canvas */}
        <DarkSectionPreview theme={theme} />

        {/* Section K: Kinetic Motion Lab */}
        <MotionLab
          theme={theme}
          reducedMotion={reducedMotion}
          onToggleReducedMotion={() => setReducedMotion(!reducedMotion)}
        />
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-[var(--lp-border)] py-12 bg-[var(--lp-bg-subtle)] mt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[var(--lp-text-tertiary)]">
          <div className="flex items-center gap-2">
            <OrbitMark size={16} />
            <span className="font-semibold text-[var(--lp-text-primary)]">SATAT</span>
            <span>— Progress, made continuous.</span>
          </div>
          <div>
            Phase 1 Design Playground · Dedicated Sandbox Route
          </div>
        </div>
      </footer>

      {/* ── Back to Top Floating Trigger ── */}
      {showBackToTop && (
        <button
          onClick={scrollToTop}
          aria-label="Back to top"
          className="fixed bottom-6 right-6 z-50 p-3 rounded-full bg-[var(--lp-forest)] text-white shadow-lg hover:bg-[var(--lp-forest-hover)] active:scale-95 transition-all duration-200"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
        </button>
      )}
    </div>
  );
};

