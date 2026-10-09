"use client";

import React, { useState } from "react";
import { Copy, Check } from "lucide-react";
import { ColorSwatch, PreviewTheme } from "./types";

const lightSwatches: ColorSwatch[] = [
  { name: "Background Primary", role: "Page Canvas", hex: "#F8F7F2", category: "foundation", description: "Warm ivory ground; tactile foundation for editorial calm" },
  { name: "Background Subtle", role: "Section Contrast", hex: "#F2EFE8", category: "foundation", description: "Soft tint for secondary blocks & subtle section separation" },
  { name: "Surface Default", role: "Primary Cards", hex: "#FFFFFF", category: "foundation", description: "Pure white surface for high-clarity data cards" },
  { name: "Surface Subtle", role: "Inset & Tags", hex: "#F1EFE9", category: "foundation", description: "Recessed elements, input fields, pill backgrounds" },
  { name: "Forest Primary", role: "Primary Brand / Action", hex: "#173D32", category: "brand", description: "Deep woodland green; grounded authority & discipline" },
  { name: "Forest Secondary", role: "Secondary Brand", hex: "#1D493C", category: "brand", description: "Subtle variation for layered borders and hierarchy" },
  { name: "Forest Hover", role: "Interactive Active", hex: "#245747", category: "brand", description: "States under cursor/touch engagement" },
  { name: "Forest Supporting", role: "Muted Botanical", hex: "#3E7563", category: "brand", description: "Supportive accents, icons, and contextual badges" },
  { name: "Sage Accent", role: "Signature Accent", hex: "#A8B89D", category: "accent", description: "Calm vegetative sage; marks progress and continuity" },
  { name: "Sage Soft", role: "Accent Washes", hex: "#D8E1D2", category: "accent", description: "Subtle backgrounds, pill washes, metric highlights" },
  { name: "Text Primary", role: "Headings & Metrics", hex: "#171A17", category: "text", description: "Warm charcoal-black; high contrast without harshness" },
  { name: "Text Secondary", role: "Body & Description", hex: "#686D67", category: "text", description: "Muted warm grey for comfortable editorial reading" },
  { name: "Text Tertiary", role: "Eyebrows & Meta", hex: "#8B908A", category: "text", description: "Restrained labels, timestamps, units" },
  { name: "Border Default", role: "Hairline Bounds", hex: "#E5E4DD", category: "border", description: "Felt hairline borders; defines cards with quiet precision" },
  { name: "Success", role: "Progress Reached", hex: "#2E7D5B", category: "semantic", description: "Subtle botanical green for completed goals" },
  { name: "Warning", role: "Attn / Incomplete", hex: "#C27D38", category: "semantic", description: "Warm amber for pending items or macro warnings" },
  { name: "Error", role: "Critical Notice", hex: "#B84743", category: "semantic", description: "Restrained terracotta-red; zero neon" },
];

const darkSwatches: ColorSwatch[] = [
  { name: "Dark Background", role: "Dark Canvas", hex: "#101412", category: "foundation", description: "Deepest forest-charcoal ground; calm & night-ready" },
  { name: "Dark Surface", role: "Surface 1 (Base Cards)", hex: "#181D1A", category: "foundation", description: "Restrained dark cards with hairline separation" },
  { name: "Dark Surface 2", role: "Surface 2 (Elevated)", hex: "#202722", category: "foundation", description: "Lifted cards, popovers, nested items" },
  { name: "Dark Surface 3", role: "Surface 3 (Hover/High)", hex: "#272F2A", category: "foundation", description: "Hover states, control surfaces, active rows" },
  { name: "Dark Text Primary", role: "Primary Text", hex: "#F4F5EF", category: "text", description: "Soft off-white; zero optic glare on dark backgrounds" },
  { name: "Dark Text Secondary", role: "Secondary Text", hex: "#A2A89F", category: "text", description: "Warm sage-grey for supporting copy" },
  { name: "Dark Text Muted", role: "Tertiary / Meta", hex: "#71786E", category: "text", description: "Quiet labels and timestamps" },
  { name: "Dark Sage Accent", role: "Active Highlights", hex: "#B4C4AA", category: "accent", description: "Luminous calm sage for buttons & continuity line" },
  { name: "Dark Border", role: "Hairline Bounds", hex: "#2A332D", category: "border", description: "8% white equivalent; subtle structural separation" },
];

export function ColorSection({ theme }: { theme?: PreviewTheme } = {}) {
  const [copiedHex, setCopiedHex] = useState<string | null>(null);

  const copyToClipboard = (hex: string) => {
    navigator.clipboard?.writeText(hex);
    setCopiedHex(hex);
    setTimeout(() => setCopiedHex(null), 1800);
  };

  return (
    <section id="section-color" className="space-y-12">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[11px] font-bold tracking-[0.14em] uppercase text-[var(--lp-forest-support)]">
            Section 01 · Visual Grammar
          </span>
        </div>
        <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[var(--lp-text-primary)]">
          Brand & Palette Hierarchy
        </h2>
        <p className="text-sm text-[var(--lp-text-secondary)] mt-1.5 max-w-2xl">
          SATAT is grounded in a restrained 4-tier distribution: <strong>65% Ivory/White foundation</strong>, <strong>20% Warm Charcoal text</strong>, <strong>10% Forest Green brand presence</strong>, and <strong>5% Sage accent continuity</strong>.
        </p>
      </div>

      {/* ── Proportion Distribution Bar ── */}
      <div className="space-y-3 p-5 rounded-2xl border bg-[var(--lp-surface)] border-[var(--lp-border)] shadow-[var(--lp-shadow-sm)]">
        <div className="flex items-center justify-between text-xs font-semibold">
          <span className="text-[var(--lp-text-primary)]">Visual Balance Distribution</span>
          <span className="text-[var(--lp-text-tertiary)] text-[11px]">Strict discipline: zero decorative overload</span>
        </div>
        <div className="h-5 w-full rounded-lg overflow-hidden flex shadow-inner">
          <div className="bg-[#F8F7F2] border-r border-[#E5E4DD] flex items-center justify-center text-[10px] font-bold text-[#686D67]" style={{ width: "65%" }}>
            65% Ivory Base
          </div>
          <div className="bg-[#171A17] flex items-center justify-center text-[10px] font-bold text-[#F8F7F2]" style={{ width: "20%" }}>
            20% Charcoal
          </div>
          <div className="bg-[#173D32] flex items-center justify-center text-[10px] font-bold text-[#F8F7F2]" style={{ width: "10%" }}>
            10% Forest
          </div>
          <div className="bg-[#A8B89D] flex items-center justify-center text-[10px] font-bold text-[#173D32]" style={{ width: "5%" }}>
            5%
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-[var(--lp-text-secondary)] pt-1">
          <div><span className="font-semibold text-[var(--lp-text-primary)]">65% Ivory/White</span> — Warm ambient ground</div>
          <div><span className="font-semibold text-[var(--lp-text-primary)]">20% Charcoal</span> — Editorial text & hierarchy</div>
          <div><span className="font-semibold text-[var(--lp-text-primary)]">10% Forest</span> — Brand moments & buttons</div>
          <div><span className="font-semibold text-[var(--lp-text-primary)]">5% Sage</span> — Continuity, streaks & signals</div>
        </div>
      </div>

      {/* ── Light Palette Grid ── */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-[var(--lp-text-primary)] flex items-center gap-2">
          <span>Day / Editorial Light Palette</span>
          <span className="text-xs font-normal text-[var(--lp-text-tertiary)]">(Standard marketing context)</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
          {lightSwatches.map((swatch) => (
            <div
              key={swatch.name}
              onClick={() => copyToClipboard(swatch.hex)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && copyToClipboard(swatch.hex)}
              className="group p-3.5 rounded-xl border bg-[var(--lp-surface)] border-[var(--lp-border)] hover:border-[var(--lp-forest-support)] transition-all cursor-pointer shadow-[var(--lp-shadow-sm)] hover:shadow-[var(--lp-shadow-md)]"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-lg border border-black/10 shrink-0 shadow-sm flex items-center justify-center"
                  style={{ backgroundColor: swatch.hex }}
                >
                  {copiedHex === swatch.hex ? (
                    <Check className="w-4 h-4 text-emerald-600 drop-shadow" />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-[var(--lp-text-primary)] truncate">{swatch.name}</p>
                    <span className="text-[10px] font-mono text-[var(--lp-text-tertiary)] group-hover:text-[var(--lp-forest)] flex items-center gap-1">
                      {swatch.hex}
                      <Copy className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </span>
                  </div>
                  <p className="text-[11px] font-medium text-[var(--lp-forest-support)] mt-0.5">{swatch.role}</p>
                  <p className="text-[10px] text-[var(--lp-text-secondary)] line-clamp-1 mt-1 leading-tight">{swatch.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Dark Palette Grid ── */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-[var(--lp-text-primary)] flex items-center gap-2">
          <span>Night / Deep Forest Palette</span>
          <span className="text-xs font-normal text-[var(--lp-text-tertiary)]">(Dark sections & focused night reviews)</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 p-5 rounded-2xl bg-[#101412] border border-[#202722]">
          {darkSwatches.map((swatch) => (
            <div
              key={swatch.name}
              onClick={() => copyToClipboard(swatch.hex)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && copyToClipboard(swatch.hex)}
              className="group p-3 rounded-xl border border-white/5 bg-[#181D1A] hover:border-[#B4C4AA]/40 transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-11 h-11 rounded-lg border border-white/10 shrink-0 shadow-sm flex items-center justify-center"
                  style={{ backgroundColor: swatch.hex }}
                >
                  {copiedHex === swatch.hex ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-[#F4F5EF] truncate">{swatch.name}</p>
                    <span className="text-[10px] font-mono text-[#A2A89F] group-hover:text-[#B4C4AA] flex items-center gap-1">
                      {swatch.hex}
                      <Copy className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </span>
                  </div>
                  <p className="text-[11px] font-medium text-[#B4C4AA] mt-0.5">{swatch.role}</p>
                  <p className="text-[10px] text-[#A2A89F] line-clamp-1 mt-1 leading-tight">{swatch.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
