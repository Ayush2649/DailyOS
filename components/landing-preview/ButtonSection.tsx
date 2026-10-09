"use client";

import React, { useState } from "react";
import { ArrowRight, ChevronDown, Sparkles } from "lucide-react";
import { ButtonVariant, ButtonState, PreviewTheme } from "./types";

export function ButtonSection({ theme }: { theme?: PreviewTheme } = {}) {
  const [clickedState, setClickedState] = useState<string | null>(null);

  const handleClick = (name: string) => {
    setClickedState(name);
    setTimeout(() => setClickedState(null), 1000);
  };

  return (
    <section id="section-buttons" className="space-y-12">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[11px] font-bold tracking-[0.14em] uppercase text-[var(--lp-forest-support)]">
            Section 03 · Tactile Controls
          </span>
        </div>
        <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[var(--lp-text-primary)]">
          Button & Interaction Language
        </h2>
        <p className="text-sm text-[var(--lp-text-secondary)] mt-1.5 max-w-2xl">
          Quiet, solid, and deliberate interactions. High contrast primary actions in deep forest green, restrained secondary outlines in warm bone, and dark surface counterparts.
        </p>
      </div>

      {/* ── Day Context Buttons ── */}
      <div className="space-y-6 p-6 sm:p-8 rounded-2xl border bg-[var(--lp-surface)] border-[var(--lp-border)] shadow-[var(--lp-shadow-sm)]">
        <h3 className="text-sm font-bold text-[var(--lp-text-primary)] tracking-tight">
          Day Context Controls (Ivory Canvas)
        </h3>

        {/* Primary Button States */}
        <div className="space-y-3">
          <div className="text-xs font-semibold text-[var(--lp-text-secondary)]">
            Primary Action — Solid Forest (`#173D32`) with Arrow Indicator
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {/* Default */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-mono text-[var(--lp-text-tertiary)] uppercase">Default</span>
              <button
                type="button"
                onClick={() => handleClick("pri-def")}
                className="w-full h-11 px-4 rounded-xl font-medium text-xs sm:text-sm tracking-tight text-[#F8F7F2] bg-[#173D32] hover:bg-[#245747] active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 shadow-sm"
              >
                <span>Start consistency</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Hover simulated */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-mono text-[var(--lp-text-tertiary)] uppercase">Hover</span>
              <button
                type="button"
                className="w-full h-11 px-4 rounded-xl font-medium text-xs sm:text-sm tracking-tight text-[#F8F7F2] bg-[#245747] shadow-md flex items-center justify-center gap-1.5"
              >
                <span>Start consistency</span>
                <ArrowRight className="w-3.5 h-3.5 translate-x-0.5 transition-transform" />
              </button>
            </div>

            {/* Active / Pressed */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-mono text-[var(--lp-text-tertiary)] uppercase">Active / Press</span>
              <button
                type="button"
                className="w-full h-11 px-4 rounded-xl font-medium text-xs sm:text-sm tracking-tight text-[#F8F7F2] bg-[#14332A] scale-[0.98] flex items-center justify-center gap-1.5"
              >
                <span>Start consistency</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Focus Ring */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-mono text-[var(--lp-text-tertiary)] uppercase">Keyboard Focus</span>
              <button
                type="button"
                className="w-full h-11 px-4 rounded-xl font-medium text-xs sm:text-sm tracking-tight text-[#F8F7F2] bg-[#173D32] ring-2 ring-offset-2 ring-[#173D32] ring-offset-[#F8F7F2] flex items-center justify-center gap-1.5"
              >
                <span>Start consistency</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Disabled */}
            <div className="space-y-1.5 col-span-2 sm:col-span-1">
              <span className="text-[10px] font-mono text-[var(--lp-text-tertiary)] uppercase">Disabled</span>
              <button
                type="button"
                disabled
                className="w-full h-11 px-4 rounded-xl font-medium text-xs sm:text-sm tracking-tight text-[#8B908A] bg-[#E5E4DD] cursor-not-allowed flex items-center justify-center gap-1.5"
              >
                <span>Start consistency</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Secondary Button States */}
        <div className="space-y-3 pt-3 border-t border-[var(--lp-border-subtle)]">
          <div className="text-xs font-semibold text-[var(--lp-text-secondary)]">
            Secondary Action — Architectural Outline (`#E5E4DD` Hairline)
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {/* Default */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-mono text-[var(--lp-text-tertiary)] uppercase">Default</span>
              <button
                type="button"
                onClick={() => handleClick("sec-def")}
                className="w-full h-11 px-4 rounded-xl font-medium text-xs sm:text-sm tracking-tight text-[#171A17] bg-[#FFFFFF] border border-[#E5E4DD] hover:bg-[#F8F7F2] hover:border-[#D5D3C8] active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 shadow-[var(--lp-shadow-sm)]"
              >
                <span>See how it works</span>
                <ChevronDown className="w-3.5 h-3.5 text-[#686D67]" />
              </button>
            </div>

            {/* Hover */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-mono text-[var(--lp-text-tertiary)] uppercase">Hover</span>
              <button
                type="button"
                className="w-full h-11 px-4 rounded-xl font-medium text-xs sm:text-sm tracking-tight text-[#171A17] bg-[#F8F7F2] border border-[#D5D3C8] flex items-center justify-center gap-1.5 shadow-sm"
              >
                <span>See how it works</span>
                <ChevronDown className="w-3.5 h-3.5 text-[#171A17]" />
              </button>
            </div>

            {/* Active */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-mono text-[var(--lp-text-tertiary)] uppercase">Active / Press</span>
              <button
                type="button"
                className="w-full h-11 px-4 rounded-xl font-medium text-xs sm:text-sm tracking-tight text-[#171A17] bg-[#EDEAE2] border border-[#D5D3C8] scale-[0.98] flex items-center justify-center gap-1.5"
              >
                <span>See how it works</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Focus */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-mono text-[var(--lp-text-tertiary)] uppercase">Focus</span>
              <button
                type="button"
                className="w-full h-11 px-4 rounded-xl font-medium text-xs sm:text-sm tracking-tight text-[#171A17] bg-[#FFFFFF] border border-[#E5E4DD] ring-2 ring-offset-2 ring-[#173D32] flex items-center justify-center gap-1.5"
              >
                <span>See how it works</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Disabled */}
            <div className="space-y-1.5 col-span-2 sm:col-span-1">
              <span className="text-[10px] font-mono text-[var(--lp-text-tertiary)] uppercase">Disabled</span>
              <button
                type="button"
                disabled
                className="w-full h-11 px-4 rounded-xl font-medium text-xs sm:text-sm tracking-tight text-[#8B908A] bg-transparent border border-[#E5E4DD]/60 cursor-not-allowed flex items-center justify-center gap-1.5"
              >
                <span>See how it works</span>
                <ChevronDown className="w-3.5 h-3.5 opacity-50" />
              </button>
            </div>
          </div>
        </div>

        {/* Tertiary & Ghost */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-[var(--lp-border-subtle)]">
          <div className="space-y-2">
            <span className="text-xs font-semibold text-[var(--lp-text-secondary)]">Tertiary / Pill Control</span>
            <div className="flex gap-2">
              <button
                type="button"
                className="h-9 px-3.5 rounded-full text-xs font-medium text-[#173D32] bg-[#D8E1D2] hover:bg-[#C8D4BF] active:scale-95 transition-all flex items-center gap-1.5"
              >
                <Sparkles className="w-3 h-3 text-[#173D32]" />
                <span>Adjust dinner</span>
              </button>
              <button
                type="button"
                className="h-9 px-3.5 rounded-full text-xs font-medium text-[#686D67] bg-[#F1EFE9] hover:bg-[#E7E5DC] active:scale-95 transition-all"
              >
                Not now
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-xs font-semibold text-[var(--lp-text-secondary)]">Ghost Link / In-line Navigation</span>
            <div className="flex items-center gap-4 pt-1.5">
              <button
                type="button"
                className="text-xs font-semibold text-[#173D32] hover:text-[#245747] underline underline-offset-4 decoration-[#A8B89D] hover:decoration-[#173D32] transition-colors"
              >
                Explore method statement →
              </button>
              <button
                type="button"
                className="text-xs font-medium text-[#686D67] hover:text-[#171A17] transition-colors"
              >
                Download manual (PDF)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Dark Context Buttons ── */}
      <div className="space-y-6 p-6 sm:p-8 rounded-2xl bg-[#101412] border border-[#202722]">
        <h3 className="text-sm font-bold text-[#F4F5EF] tracking-tight">
          Dark Context Controls (Deep Forest Canvas)
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Dark Primary */}
          <div className="space-y-2">
            <span className="text-[10px] font-mono text-[#A2A89F] uppercase">Dark Primary (Sage Solid)</span>
            <button
              type="button"
              className="w-full h-11 px-4 rounded-xl font-semibold text-xs sm:text-sm text-[#101412] bg-[#B4C4AA] hover:bg-[#C6D4BD] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              <span>Begin unbroken log</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Dark Secondary */}
          <div className="space-y-2">
            <span className="text-[10px] font-mono text-[#A2A89F] uppercase">Dark Secondary (Surface Hairline)</span>
            <button
              type="button"
              className="w-full h-11 px-4 rounded-xl font-medium text-xs sm:text-sm text-[#F4F5EF] bg-[#181D1A] border border-white/10 hover:bg-[#202722] hover:border-white/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <span>Review architecture</span>
            </button>
          </div>

          {/* Dark Ghost */}
          <div className="space-y-2">
            <span className="text-[10px] font-mono text-[#A2A89F] uppercase">Dark Ghost</span>
            <button
              type="button"
              className="w-full h-11 px-4 rounded-xl font-medium text-xs sm:text-sm text-[#A2A89F] hover:text-[#F4F5EF] hover:bg-white/5 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <span>Compare editions</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
