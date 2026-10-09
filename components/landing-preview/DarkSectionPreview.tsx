"use client";

import React, { useState } from "react";
import type { PreviewTheme } from "./types";
import { OrbitMark } from "@/components/orbit/OrbitMark";

interface DarkSectionPreviewProps {
  theme: PreviewTheme;
}

interface LifeNode {
  title: string;
  category: string;
  metric: string;
  status: string;
  pos: string;
}

const DARK_NODES: LifeNode[] = [
  { title: "Goals", category: "Trajectory", metric: "-3 kg Fat Loss", status: "Active", pos: "top-4 left-6" },
  { title: "Tasks", category: "Execution", metric: "5/6 Completed", status: "83%", pos: "top-4 right-6" },
  { title: "Training", category: "Physical", metric: "Upper Body A (45m)", status: "Queued", pos: "bottom-4 left-6" },
  { title: "Nutrition", category: "Biochemical", metric: "142g Protein", status: "On Track", pos: "bottom-4 right-6" },
  { title: "Habits", category: "Behavioral", metric: "24-Day Streak", status: "Persistent", pos: "top-1/2 -left-2 -translate-y-1/2" },
  { title: "Recovery", category: "Autonomic", metric: "7h 42m Sleep", status: "Optimal", pos: "top-1/2 -right-2 -translate-y-1/2" },
];

export const DarkSectionPreview: React.FC<DarkSectionPreviewProps> = ({ theme }) => {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  return (
    <section id="dark-section" className="space-y-8 py-16 border-t border-[var(--lp-border)]">
      {/* Section Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="font-mono text-xs font-semibold uppercase tracking-wider text-[var(--lp-forest)]">
            Section J · Night Canvas
          </span>
          <span className="text-xs text-[var(--lp-text-tertiary)]">/</span>
          <span className="text-xs text-[var(--lp-text-secondary)]">Deep Forest Contrast Exploration</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--lp-text-primary)]">
          The Dark Canvas: Focused Intensity
        </h2>
        <p className="mt-2 text-sm sm:text-base text-[var(--lp-text-secondary)] max-w-3xl leading-relaxed">
          The dark section avoids harsh blacks and cyan neon. It leverages deep forest charcoal (#101412), 
          subtle sage borders, and warm ivory typography (#F4F5EF) to evoke disciplined, quiet focus.
        </p>
      </div>

      {/* Dark Canvas Showcase Container */}
      <div className="relative overflow-hidden rounded-[28px] sm:rounded-[36px] bg-[#101412] text-[#F4F5EF] border border-[rgba(255,255,255,0.08)] shadow-[0_20px_50px_rgba(0,0,0,0.6)] p-8 sm:p-14 lg:p-20">
        
        {/* Subtle Ambient Radial Light (Forest Green Tonal, zero neon) */}
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[450px] rounded-full pointer-events-none opacity-20 blur-[100px]"
          style={{
            background: "radial-gradient(circle, #2A5447 0%, transparent 70%)"
          }}
        />

        {/* Section Headline Block */}
        <div className="relative z-10 max-w-2xl mx-auto text-center mb-14 sm:mb-20">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#181D1A] border border-[rgba(255,255,255,0.08)] mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-[#A8B89D]" />
            <span className="text-[11px] font-mono font-semibold uppercase tracking-widest text-[#A8B89D]">
              UNIFIED LIFE OPERATING SYSTEM
            </span>
          </div>

          <h3 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#F4F5EF] leading-tight font-sans">
            One system.
            <br />
            <span className="text-[#A8B89D]">Many parts of your life.</span>
          </h3>

          <p className="mt-4 text-sm sm:text-base text-[#A2A89F] leading-relaxed max-w-lg mx-auto">
            Instead of juggling five disparate apps that never communicate, SATAT forms the unbroken hub 
            where every health signal informs your next action.
          </p>
        </div>

        {/* Satellite Life Nodes Canvas */}
        <div className="relative z-10 max-w-4xl mx-auto py-8">
          
          {/* Center Hub: SATAT & Orbit */}
          <div className="relative mx-auto w-36 h-36 sm:w-44 sm:h-44 rounded-full bg-[#181D1A] border border-[rgba(255,255,255,0.12)] shadow-[0_0_40px_rgba(42,84,71,0.25)] flex flex-col items-center justify-center text-center p-4 z-20 lp-pulse-subtle">
            <div className="w-10 h-10 rounded-full bg-[#202722] border border-[rgba(255,255,255,0.1)] flex items-center justify-center text-[#A8B89D] mb-2 shadow-xs">
              <OrbitMark size={22} />
            </div>
            <span className="text-xs font-mono font-bold tracking-widest text-[#F4F5EF] uppercase">
              SATAT
            </span>
            <span className="text-[10px] text-[#A8B89D] font-mono mt-0.5">
              Central Nexus
            </span>
          </div>

          {/* Connected Grid of 6 Dimensions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mt-12">
            {DARK_NODES.map((node) => {
              const isHovered = hoveredNode === node.title;

              return (
                <div
                  key={node.title}
                  onMouseEnter={() => setHoveredNode(node.title)}
                  onMouseLeave={() => setHoveredNode(null)}
                  className={`p-5 rounded-[20px] bg-[#181D1A] border transition-all duration-300 cursor-pointer ${
                    isHovered
                      ? "border-[#A8B89D] bg-[#202722] -translate-y-1 shadow-[0_8px_24px_rgba(0,0,0,0.5)]"
                      : "border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.18)]"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#71786E]">
                      {node.category}
                    </span>
                    <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-[#202722] text-[#A8B89D] border border-[rgba(255,255,255,0.06)]">
                      {node.status}
                    </span>
                  </div>

                  <h4 className="text-lg font-bold text-[#F4F5EF]">
                    {node.title}
                  </h4>
                  <p className="text-xs text-[#A2A89F] mt-1 font-mono">
                    {node.metric}
                  </p>

                  <div className="mt-4 pt-3 border-t border-[rgba(255,255,255,0.06)] flex items-center justify-between text-[11px] text-[#71786E]">
                    <span>Linked to Nexus</span>
                    <span className="text-[#A8B89D]">● Active</span>
                  </div>
                </div>
              );
            })}
          </div>

        </div>

        {/* Footnote */}
        <div className="mt-12 text-center text-xs text-[#71786E] font-mono relative z-10">
          Palette: #101412 Canvas · #181D1A Surface · #202722 Elevated · #A8B89D Accent · #F4F5EF Primary Text
        </div>
      </div>
    </section>
  );
};
