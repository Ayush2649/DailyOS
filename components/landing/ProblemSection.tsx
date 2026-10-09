"use client";

import React from "react";

const FRAGMENTED_TOOLS = [
  {
    category: "Goal Tracker",
    app: "Isolated Ambition",
    friction: "Targets set without daily training or schedule awareness.",
  },
  {
    category: "Workout App",
    app: "Blind Volume",
    friction: "Demands heavy lifting regardless of last night's 4h sleep.",
  },
  {
    category: "Diet Logger",
    app: "Passive Calorie Counter",
    friction: "Tracks meals without adjusting when workout intensity spikes.",
  },
  {
    category: "Sleep Ring",
    app: "Anxious Telemetry",
    friction: "Tells you you're tired, but offers no plan to recover.",
  },
  {
    category: "To-Do List",
    app: "Disjointed Tasks",
    friction: "Forces errands and life priorities into an unconnected silo.",
  },
];

export default function ProblemSection() {
  return (
    <section id="problem" className="py-24 sm:py-32 px-5 sm:px-6 border-t border-[var(--border)] bg-[var(--surface-subtle)]">
      <div className="max-w-5xl mx-auto">
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center mb-16 sm:mb-20">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--surface)] border border-[var(--border)] mb-4">
            <span className="type-eyebrow text-[var(--brand)]">
              THE FRAGMENTATION TRAP
            </span>
          </div>

          <h2 className="type-display-l text-[var(--text-primary)]">
            Your life is connected.
            <br />
            <span className="text-[var(--brand)]">Your tools shouldn&apos;t be separate.</span>
          </h2>

          <p className="type-body-lg text-[var(--text-secondary)] mt-5 max-w-xl mx-auto">
            When you train harder, you need more fuel. When your sleep dips, your workout volume should adjust. 
            Yet five different apps keep treating your body like unrelated spreadsheets.
          </p>
        </div>

        {/* Visual Problem Representation: The Disconnected Reality vs SATAT */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {FRAGMENTED_TOOLS.map((tool, idx) => (
            <div
              key={tool.category}
              className="p-5 rounded-[20px] bg-[var(--surface)] border border-[var(--border)] shadow-xs flex flex-col justify-between transition-all hover:border-[var(--brand)]"
            >
              <div>
                <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                  0{idx + 1} · {tool.category}
                </span>
                <h3 className="font-semibold text-sm sm:text-base text-[var(--text-primary)] mt-1 mb-2">
                  {tool.app}
                </h3>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  {tool.friction}
                </p>
              </div>

              <div className="mt-5 pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between text-[11px] text-[var(--error)] font-mono">
                <span>Disconnected</span>
                <span>✕</span>
              </div>
            </div>
          ))}
        </div>

        {/* Synthesis Banner */}
        <div className="mt-8 p-6 rounded-[24px] bg-[var(--surface)] border border-[var(--brand)] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-[var(--brand)] shrink-0" />
            <p className="text-sm sm:text-base font-medium text-[var(--text-primary)]">
              SATAT eliminates the cognitive tax of copying numbers between apps.
            </p>
          </div>
          <span className="type-eyebrow text-[var(--brand)] shrink-0 font-semibold">
            One Unified Architecture →
          </span>
        </div>
      </div>
    </section>
  );
}

