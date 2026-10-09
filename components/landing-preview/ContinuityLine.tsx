"use client";

import React, { useState } from "react";
import type { PreviewTheme } from "./types";

interface ContinuityLineProps {
  theme: PreviewTheme;
}

interface ContinuityNode {
  id: string;
  title: string;
  phase: string;
  description: string;
  metric: string;
  coordinates: { x: number; y: number };
}

const NODES: ContinuityNode[] = [
  {
    id: "goals",
    title: "Goals",
    phase: "01 · Understand",
    description: "North-star clarity without arbitrary deadline anxiety.",
    metric: "Body composition + endurance",
    coordinates: { x: 80, y: 130 },
  },
  {
    id: "routines",
    title: "Routines",
    phase: "02 · Plan",
    description: "Daily habit scaffolding tailored to your schedule rhythm.",
    metric: "Morning mobility & 3L water",
    coordinates: { x: 250, y: 70 },
  },
  {
    id: "training",
    title: "Training",
    phase: "03 · Act",
    description: "Progressive overload structured by biomechanics, not fatigue.",
    metric: "Upper Body A · 45 min",
    coordinates: { x: 430, y: 150 },
  },
  {
    id: "nutrition",
    title: "Nutrition",
    phase: "04 · Track",
    description: "Deterministic macro intake balanced against workout expenditure.",
    metric: "142g / 180g protein",
    coordinates: { x: 610, y: 75 },
  },
  {
    id: "recovery",
    title: "Recovery",
    phase: "05 · Reflect",
    description: "Sleep quality and autonomic nervous system restitution.",
    metric: "7h 42m · 88% quality",
    coordinates: { x: 790, y: 140 },
  },
  {
    id: "progress",
    title: "Progress",
    phase: "06 · Adapt & Repeat",
    description: "Continuous trajectory synthesis that feeds tomorrow's baseline.",
    metric: "+8.4% weekly capacity",
    coordinates: { x: 960, y: 80 },
  },
];

export const ContinuityLine: React.FC<ContinuityLineProps> = ({ theme }) => {
  const [activeNode, setActiveNode] = useState<string>("training");
  const [isAnimating, setIsAnimating] = useState<boolean>(true);

  const selectedData = NODES.find((n) => n.id === activeNode) || NODES[2];

  return (
    <section id="continuity" className="space-y-8 py-16 border-t border-[var(--lp-border)]">
      {/* Section Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="font-mono text-xs font-semibold uppercase tracking-wider text-[var(--lp-forest)]">
            Section I · Signature Metaphor
          </span>
          <span className="text-xs text-[var(--lp-text-tertiary)]">/</span>
          <span className="text-xs text-[var(--lp-text-secondary)]">The Unbroken Thread (सतत)</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--lp-text-primary)]">
          The Continuity Line: Unbroken Integration
        </h2>
        <p className="mt-2 text-sm sm:text-base text-[var(--lp-text-secondary)] max-w-3xl leading-relaxed">
          SATAT is defined by continuity — not an artificial infinity loop or generic AI nodes, but an organic, 
          continuous waveform connecting the fundamental stages of human progress into a coherent whole.
        </p>
      </div>

      {/* Interactive Visual Canvas */}
      <div className="rounded-[24px] sm:rounded-[32px] bg-[var(--lp-surface)] border border-[var(--lp-border)] shadow-[var(--lp-shadow-sm)] p-6 sm:p-10 transition-all duration-300 overflow-hidden">
        
        {/* Controls bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 mb-6 border-b border-[var(--lp-border-subtle)] gap-4">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--lp-forest)]" />
            <span className="text-xs font-mono uppercase tracking-wider font-semibold text-[var(--lp-text-primary)]">
              Continuous Loop Telemetry: 6 Interconnected Nodes
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsAnimating(!isAnimating)}
              className="text-xs px-3 py-1 rounded-full border border-[var(--lp-border)] text-[var(--lp-text-secondary)] hover:text-[var(--lp-text-primary)] transition"
            >
              {isAnimating ? "Pause Flow ⏸" : "Resume Flow ▶"}
            </button>
            <span className="text-[11px] font-mono text-[var(--lp-text-tertiary)]">
              Hover node to inspect
            </span>
          </div>
        </div>

        {/* Desktop / Tablet SVG Continuity Waveform */}
        <div className="relative w-full overflow-x-auto pb-4">
          <div className="min-w-[850px] lg:min-w-[1020px] relative h-[220px]">
            <svg
              viewBox="0 0 1040 220"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-full h-full select-none"
            >
              <defs>
                <linearGradient id="continuityGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="var(--lp-sage)" stopOpacity="0.6" />
                  <stop offset="35%" stopColor="var(--lp-forest)" stopOpacity="0.9" />
                  <stop offset="65%" stopColor="var(--lp-forest-hover)" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="var(--lp-sage)" stopOpacity="0.6" />
                </linearGradient>

                <linearGradient id="glowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="var(--lp-sage-soft)" stopOpacity="0.3" />
                  <stop offset="50%" stopColor="var(--lp-forest-subtle)" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="var(--lp-sage-soft)" stopOpacity="0.3" />
                </linearGradient>
              </defs>

              {/* Ambient Glow path */}
              <path
                d="M 50 140 C 140 140, 190 70, 250 70 C 330 70, 360 150, 430 150 C 510 150, 540 75, 610 75 C 690 75, 720 140, 790 140 C 860 140, 900 80, 990 80"
                stroke="url(#glowGrad)"
                strokeWidth="12"
                strokeLinecap="round"
                className="opacity-40"
              />

              {/* Base Path (Static Track) */}
              <path
                d="M 50 140 C 140 140, 190 70, 250 70 C 330 70, 360 150, 430 150 C 510 150, 540 75, 610 75 C 690 75, 720 140, 790 140 C 860 140, 900 80, 990 80"
                stroke="var(--lp-border)"
                strokeWidth="2.5"
                strokeLinecap="round"
              />

              {/* Active Animated Organic Flow Path */}
              <path
                d="M 50 140 C 140 140, 190 70, 250 70 C 330 70, 360 150, 430 150 C 510 150, 540 75, 610 75 C 690 75, 720 140, 790 140 C 860 140, 900 80, 990 80"
                stroke="url(#continuityGrad)"
                strokeWidth="2.75"
                strokeLinecap="round"
                strokeDasharray="14 12"
                style={{
                  animation: isAnimating ? "lpPathFlow 14s linear infinite" : "none",
                }}
              />

              {/* Nodes Rendered along path */}
              {NODES.map((node) => {
                const isActive = activeNode === node.id;
                return (
                  <g
                    key={node.id}
                    onClick={() => setActiveNode(node.id)}
                    onMouseEnter={() => setActiveNode(node.id)}
                    className="cursor-pointer transition-all duration-200"
                  >
                    {/* Outer halo on active */}
                    {isActive && (
                      <circle
                        cx={node.coordinates.x}
                        cy={node.coordinates.y}
                        r="20"
                        fill="var(--lp-forest-subtle)"
                        className="animate-ping opacity-30"
                      />
                    )}

                    {/* Node background circle */}
                    <circle
                      cx={node.coordinates.x}
                      cy={node.coordinates.y}
                      r={isActive ? "10" : "7"}
                      fill="var(--lp-surface)"
                      stroke={isActive ? "var(--lp-forest)" : "var(--lp-border-strong)"}
                      strokeWidth={isActive ? "3" : "2"}
                      className="transition-all duration-300"
                    />

                    {/* Node inner core */}
                    <circle
                      cx={node.coordinates.x}
                      cy={node.coordinates.y}
                      r={isActive ? "4" : "2.5"}
                      fill={isActive ? "var(--lp-forest)" : "var(--lp-sage)"}
                    />

                    {/* Node Label Top/Bottom */}
                    <text
                      x={node.coordinates.x}
                      y={node.coordinates.y > 110 ? node.coordinates.y + 26 : node.coordinates.y - 18}
                      textAnchor="middle"
                      className={`text-[12px] font-sans font-semibold transition-colors duration-200 select-none ${
                        isActive ? "fill-[var(--lp-forest)] font-bold" : "fill-[var(--lp-text-primary)]"
                      }`}
                    >
                      {node.title}
                    </text>

                    {/* Small Phase Number */}
                    <text
                      x={node.coordinates.x}
                      y={node.coordinates.y > 110 ? node.coordinates.y + 40 : node.coordinates.y - 32}
                      textAnchor="middle"
                      className="text-[10px] font-mono fill-[var(--lp-text-tertiary)] select-none"
                    >
                      {node.phase.split(" · ")[0]}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Selected Node Deep-Dive Inspection Panel */}
        <div className="mt-4 p-5 sm:p-6 rounded-[20px] bg-[var(--lp-bg-subtle)] border border-[var(--lp-border)] transition-all">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-[var(--lp-forest-subtle)] text-[var(--lp-forest)]">
                {selectedData.phase}
              </span>
              <h3 className="text-lg font-bold text-[var(--lp-text-primary)]">
                {selectedData.title}
              </h3>
            </div>
            <div className="text-xs font-mono text-[var(--lp-forest)] font-medium">
              Live metric: {selectedData.metric}
            </div>
          </div>
          <p className="text-sm text-[var(--lp-text-secondary)] leading-relaxed">
            {selectedData.description}
          </p>
        </div>
      </div>
    </section>
  );
};

