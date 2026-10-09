"use client";

import React, { useState, useEffect } from "react";
import type { PreviewTheme } from "./types";
import { OrbitMark } from "@/components/orbit/OrbitMark";

interface MotionLabProps {
  theme: PreviewTheme;
  reducedMotion: boolean;
  onToggleReducedMotion: () => void;
}

export const MotionLab: React.FC<MotionLabProps> = ({
  theme,
  reducedMotion,
  onToggleReducedMotion,
}) => {
  // Triggers for isolated motion tests
  const [keyScrollReveal, setKeyScrollReveal] = useState(0);
  const [keyFadeTranslate, setKeyFadeTranslate] = useState(0);
  const [btnPressed, setBtnPressed] = useState(false);
  const [countVal, setCountVal] = useState(87);
  const [isCounting, setIsCounting] = useState(false);
  const [progressVal, setProgressVal] = useState(78);
  const [keyPathDraw, setKeyPathDraw] = useState(0);
  const [morphExpanded, setMorphExpanded] = useState(false);
  const [orbitRevealed, setOrbitRevealed] = useState(false);

  // Replay count-up
  const triggerCountUp = () => {
    if (isCounting) return;
    setIsCounting(true);
    setCountVal(0);
    let current = 0;
    const target = 87;
    const step = () => {
      current += 3;
      if (current >= target) {
        setCountVal(target);
        setIsCounting(false);
      } else {
        setCountVal(current);
        requestAnimationFrame(step);
      }
    };
    requestAnimationFrame(step);
  };

  // Replay progress bar
  const triggerProgress = () => {
    setProgressVal(0);
    setTimeout(() => {
      setProgressVal(78);
    }, 50);
  };

  return (
    <section id="motion-lab" className="space-y-8 py-16 border-t border-[var(--lp-border)]">
      {/* Section Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="font-mono text-xs font-semibold uppercase tracking-wider text-[var(--lp-forest)]">
            Section K · Kinetic Physics
          </span>
          <span className="text-xs text-[var(--lp-text-tertiary)]">/</span>
          <span className="text-xs text-[var(--lp-text-secondary)]">The Motion Laboratory</span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--lp-text-primary)]">
              10 Isolated Motion Specimens
            </h2>
            <p className="mt-1 text-sm sm:text-base text-[var(--lp-text-secondary)] max-w-2xl leading-relaxed">
              &ldquo;Many moments of motion, very little motion at one time.&rdquo; Tested for fluidity, dignity, 
              and strict accessibility compliance.
            </p>
          </div>

          {/* Reduced Motion Toggle Control */}
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-[var(--lp-surface)] border border-[var(--lp-border)] shadow-xs">
            <span className="text-xs font-mono text-[var(--lp-text-secondary)]">
              Prefers Reduced Motion:
            </span>
            <button
              onClick={onToggleReducedMotion}
              className={`px-3 py-1 rounded-full text-xs font-semibold font-mono transition-all ${
                reducedMotion
                  ? "bg-[var(--lp-warning)] text-white"
                  : "bg-[var(--lp-forest-subtle)] text-[var(--lp-forest)] hover:bg-[var(--lp-forest)] hover:text-white"
              }`}
            >
              {reducedMotion ? "ON (Disabled)" : "OFF (Active)"}
            </button>
          </div>
        </div>
      </div>

      {/* 10 Motion Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

        {/* 1. Scroll Reveal */}
        <div className="p-6 rounded-[20px] bg-[var(--lp-surface)] border border-[var(--lp-border)] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--lp-forest)]">
                01 · Scroll Reveal
              </span>
              <button
                onClick={() => setKeyScrollReveal((k) => k + 1)}
                className="text-[11px] font-mono px-2 py-0.5 rounded bg-[var(--lp-bg-subtle)] text-[var(--lp-text-secondary)] hover:text-[var(--lp-text-primary)] transition"
              >
                Replay ↺
              </button>
            </div>
            <p className="text-xs text-[var(--lp-text-secondary)] mb-4">
              Gentle 24px upwards glide with cubic-bezier ease-out.
            </p>
            <div key={keyScrollReveal} className="p-4 rounded-xl bg-[var(--lp-bg-subtle)] border border-[var(--lp-border-subtle)] animate-slide-up">
              <span className="text-xs font-semibold text-[var(--lp-text-primary)]">
                Revealed Surface Block
              </span>
              <p className="text-[11px] text-[var(--lp-text-secondary)] mt-1">
                Triggered as user scrolls past threshold.
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono text-[var(--lp-text-tertiary)] mt-4">
            ease-out · 450ms · translateY(24px → 0)
          </span>
        </div>

        {/* 2. Fade + Translate Cascade */}
        <div className="p-6 rounded-[20px] bg-[var(--lp-surface)] border border-[var(--lp-border)] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--lp-forest)]">
                02 · Staggered Fade
              </span>
              <button
                onClick={() => setKeyFadeTranslate((k) => k + 1)}
                className="text-[11px] font-mono px-2 py-0.5 rounded bg-[var(--lp-bg-subtle)] text-[var(--lp-text-secondary)] hover:text-[var(--lp-text-primary)] transition"
              >
                Replay ↺
              </button>
            </div>
            <p className="text-xs text-[var(--lp-text-secondary)] mb-4">
              Multi-element cascading entrance without jarring pops.
            </p>
            <div key={keyFadeTranslate} className="space-y-2">
              <div className="p-2 rounded-lg bg-[var(--lp-bg-subtle)] text-xs text-[var(--lp-text-primary)] animate-fade-in" style={{ animationDelay: "50ms" }}>
                1. Context Identified
              </div>
              <div className="p-2 rounded-lg bg-[var(--lp-bg-subtle)] text-xs text-[var(--lp-text-primary)] animate-fade-in" style={{ animationDelay: "150ms" }}>
                2. Recovery Calculated
              </div>
              <div className="p-2 rounded-lg bg-[var(--lp-bg-subtle)] text-xs text-[var(--lp-text-primary)] animate-fade-in" style={{ animationDelay: "250ms" }}>
                3. Daily Plan Updated
              </div>
            </div>
          </div>
          <span className="text-[10px] font-mono text-[var(--lp-text-tertiary)] mt-4">
            Stagger: +100ms per child element
          </span>
        </div>

        {/* 3. Card Hover Lift */}
        <div className="p-6 rounded-[20px] bg-[var(--lp-surface)] border border-[var(--lp-border)] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--lp-forest)]">
                03 · Tactile Hover Lift
              </span>
              <span className="text-[10px] font-mono text-[var(--lp-text-tertiary)]">Hover below</span>
            </div>
            <p className="text-xs text-[var(--lp-text-secondary)] mb-4">
              Controlled -3px vertical lift with atmospheric shadow bloom.
            </p>
            <div className="group p-4 rounded-xl bg-[var(--lp-surface-elevated)] border border-[var(--lp-border)] shadow-[var(--lp-shadow-sm)] hover:shadow-[var(--lp-shadow-md)] hover:-translate-y-1 hover:border-[var(--lp-forest)] transition-all duration-300 cursor-pointer text-center">
              <span className="text-xs font-semibold text-[var(--lp-text-primary)] group-hover:text-[var(--lp-forest)] transition-colors">
                Interactive Specimen Card
              </span>
              <p className="text-[10px] text-[var(--lp-text-tertiary)] mt-1">
                Zero twitch · Clean 300ms transition
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono text-[var(--lp-text-tertiary)] mt-4">
            transform: translateY(-3px) · shadow-md
          </span>
        </div>

        {/* 4. Button Press Physics */}
        <div className="p-6 rounded-[20px] bg-[var(--lp-surface)] border border-[var(--lp-border)] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--lp-forest)]">
                04 · Button Press Physics
              </span>
              <span className="text-[10px] font-mono text-[var(--lp-text-tertiary)]">Click & hold</span>
            </div>
            <p className="text-xs text-[var(--lp-text-secondary)] mb-4">
              Micro-compression (scale 0.98) providing physical feedback.
            </p>
            <div className="flex justify-center py-2">
              <button
                onMouseDown={() => setBtnPressed(true)}
                onMouseUp={() => setBtnPressed(false)}
                onMouseLeave={() => setBtnPressed(false)}
                className="px-5 py-2.5 rounded-full bg-[var(--lp-forest)] text-white text-xs font-medium active:scale-[0.98] transition-transform duration-100 shadow-xs"
              >
                {btnPressed ? "Compacted (scale 0.98)" : "Press Me"}
              </button>
            </div>
          </div>
          <span className="text-[10px] font-mono text-[var(--lp-text-tertiary)] mt-4">
            scale(0.98) on :active · 100ms response
          </span>
        </div>

        {/* 5. Number Count-Up */}
        <div className="p-6 rounded-[20px] bg-[var(--lp-surface)] border border-[var(--lp-border)] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--lp-forest)]">
                05 · Metric Count-Up
              </span>
              <button
                onClick={triggerCountUp}
                className="text-[11px] font-mono px-2 py-0.5 rounded bg-[var(--lp-bg-subtle)] text-[var(--lp-text-secondary)] hover:text-[var(--lp-text-primary)] transition"
              >
                Replay ↺
              </button>
            </div>
            <p className="text-xs text-[var(--lp-text-secondary)] mb-4">
              Fluid numeric ticker for milestones and metrics.
            </p>
            <div className="p-4 rounded-xl bg-[var(--lp-bg-subtle)] text-center">
              <div className="text-3xl font-extrabold font-mono text-[var(--lp-forest)] tracking-tight">
                {countVal}%
              </div>
              <span className="text-[11px] font-medium text-[var(--lp-text-secondary)]">
                Consistency Score
              </span>
            </div>
          </div>
          <span className="text-[10px] font-mono text-[var(--lp-text-tertiary)] mt-4">
            requestAnimationFrame interpolation
          </span>
        </div>

        {/* 6. Progress Fill */}
        <div className="p-6 rounded-[20px] bg-[var(--lp-surface)] border border-[var(--lp-border)] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--lp-forest)]">
                06 · Smooth Progress Fill
              </span>
              <button
                onClick={triggerProgress}
                className="text-[11px] font-mono px-2 py-0.5 rounded bg-[var(--lp-bg-subtle)] text-[var(--lp-text-secondary)] hover:text-[var(--lp-text-primary)] transition"
              >
                Replay ↺
              </button>
            </div>
            <p className="text-xs text-[var(--lp-text-secondary)] mb-4">
              Gentle caloric and macro bar fill interpolation.
            </p>
            <div className="p-4 rounded-xl bg-[var(--lp-bg-subtle)] space-y-2">
              <div className="flex justify-between text-xs text-[var(--lp-text-secondary)]">
                <span>Daily Protein Intake</span>
                <span className="font-mono">{progressVal}%</span>
              </div>
              <div className="w-full bg-[var(--lp-border-subtle)] h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-[var(--lp-forest)] h-full rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${progressVal}%` }}
                />
              </div>
            </div>
          </div>
          <span className="text-[10px] font-mono text-[var(--lp-text-tertiary)] mt-4">
            duration: 700ms · cubic-bezier(0.16, 1, 0.3, 1)
          </span>
        </div>

        {/* 7. SVG Path Drawing */}
        <div className="p-6 rounded-[20px] bg-[var(--lp-surface)] border border-[var(--lp-border)] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--lp-forest)]">
                07 · SVG Path Drawing
              </span>
              <button
                onClick={() => setKeyPathDraw((k) => k + 1)}
                className="text-[11px] font-mono px-2 py-0.5 rounded bg-[var(--lp-bg-subtle)] text-[var(--lp-text-secondary)] hover:text-[var(--lp-text-primary)] transition"
              >
                Replay ↺
              </button>
            </div>
            <p className="text-xs text-[var(--lp-text-secondary)] mb-4">
              Vector stroke drawing with strokeDashoffset.
            </p>
            <div key={keyPathDraw} className="h-16 flex items-center justify-center p-2 rounded-xl bg-[var(--lp-bg-subtle)]">
              <svg width="180" height="40" viewBox="0 0 180 40" fill="none">
                <path
                  d="M 10 20 Q 50 5 90 20 T 170 20"
                  stroke="var(--lp-forest)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeDasharray="200"
                  strokeDashoffset="200"
                  className="animate-[dash_1.5s_ease-out_forwards]"
                  style={{
                    animation: "lpPathFlow 2s ease-out forwards",
                  }}
                />
              </svg>
            </div>
          </div>
          <span className="text-[10px] font-mono text-[var(--lp-text-tertiary)] mt-4">
            stroke-dasharray / stroke-dashoffset draw
          </span>
        </div>

        {/* 8. Floating Sine-Wave Motion */}
        <div className="p-6 rounded-[20px] bg-[var(--lp-surface)] border border-[var(--lp-border)] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--lp-forest)]">
                08 · Floating Oscillation
              </span>
              <span className="text-[10px] font-mono text-[var(--lp-text-tertiary)]">Subtle wave</span>
            </div>
            <p className="text-xs text-[var(--lp-text-secondary)] mb-4">
              Slow 6-second vertical harmonic float for ambient depth.
            </p>
            <div className="flex justify-center py-2">
              <div className="lp-float-slow px-4 py-2 rounded-xl bg-[var(--lp-forest-subtle)] border border-[var(--lp-border)] text-xs font-medium text-[var(--lp-forest)] flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[var(--lp-forest)]" />
                <span>Ambient Floating Pill</span>
              </div>
            </div>
          </div>
          <span className="text-[10px] font-mono text-[var(--lp-text-tertiary)] mt-4">
            animation: lpFloatSlow 6s ease-in-out infinite
          </span>
        </div>

        {/* 9. Morphing State */}
        <div className="p-6 rounded-[20px] bg-[var(--lp-surface)] border border-[var(--lp-border)] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--lp-forest)]">
                09 · Morphing State
              </span>
              <button
                onClick={() => setMorphExpanded(!morphExpanded)}
                className="text-[11px] font-mono px-2 py-0.5 rounded bg-[var(--lp-bg-subtle)] text-[var(--lp-text-secondary)] hover:text-[var(--lp-text-primary)] transition"
              >
                {morphExpanded ? "Collapse" : "Expand"}
              </button>
            </div>
            <p className="text-xs text-[var(--lp-text-secondary)] mb-4">
              Fluid dimensional container expansion without jarring layout shift.
            </p>
            <div
              onClick={() => setMorphExpanded(!morphExpanded)}
              className="p-3.5 rounded-2xl bg-[var(--lp-surface-elevated)] border border-[var(--lp-border)] hover:border-[var(--lp-forest)] transition-all duration-300 cursor-pointer overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--lp-text-primary)]">
                  Weekly Volume Target
                </span>
                <span className="text-xs text-[var(--lp-forest)] font-mono">
                  {morphExpanded ? "▲" : "▼"}
                </span>
              </div>
              {morphExpanded && (
                <div className="mt-3 pt-2 border-t border-[var(--lp-border-subtle)] text-xs text-[var(--lp-text-secondary)] space-y-1 animate-fade-in">
                  <div>• Sets completed: 18 / 22</div>
                  <div>• Average load: 82.5 kg</div>
                  <div>• Next session: Lower Body B tomorrow</div>
                </div>
              )}
            </div>
          </div>
          <span className="text-[10px] font-mono text-[var(--lp-text-tertiary)] mt-4">
            transition: all 300ms ease
          </span>
        </div>

        {/* 10. Orbit Response Reveal */}
        <div className="p-6 rounded-[20px] bg-[var(--lp-surface)] border border-[var(--lp-border)] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--lp-forest)]">
                10 · Orbit Response Reveal
              </span>
              <button
                onClick={() => setOrbitRevealed(!orbitRevealed)}
                className="text-[11px] font-mono px-2 py-0.5 rounded bg-[var(--lp-bg-subtle)] text-[var(--lp-text-secondary)] hover:text-[var(--lp-text-primary)] transition"
              >
                {orbitRevealed ? "Reset" : "Reveal"}
              </button>
            </div>
            <p className="text-xs text-[var(--lp-text-secondary)] mb-4">
              Calm entrance of Orbit companion suggestion.
            </p>
            <div className="min-h-[70px] flex items-center justify-center">
              {orbitRevealed ? (
                <div className="p-3 rounded-xl bg-[var(--lp-forest-subtle)] border border-[var(--lp-forest)]/30 text-xs text-[var(--lp-forest)] flex items-center gap-2.5 animate-slide-up w-full">
                  <OrbitMark size={16} />
                  <span>&ldquo;Adjusted evening macros by +38g protein.&rdquo;</span>
                </div>
              ) : (
                <button
                  onClick={() => setOrbitRevealed(true)}
                  className="text-xs text-[var(--lp-text-tertiary)] hover:text-[var(--lp-forest)] font-mono"
                >
                  Click to simulate Orbit whisper →
                </button>
              )}
            </div>
          </div>
          <span className="text-[10px] font-mono text-[var(--lp-text-tertiary)] mt-4">
            opacity + translateY(8px) · 250ms
          </span>
        </div>

      </div>
    </section>
  );
};

