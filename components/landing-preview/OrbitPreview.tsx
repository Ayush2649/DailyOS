"use client";

import React, { useState } from "react";
import type { PreviewTheme } from "./types";
import { OrbitMark } from "@/components/orbit/OrbitMark";

interface OrbitPreviewProps {
  theme: PreviewTheme;
}

export const OrbitPreview: React.FC<OrbitPreviewProps> = ({ theme }) => {
  const [responseState, setResponseState] = useState<"idle" | "adjusted" | "dismissed">("idle");
  const [isProcessing, setIsProcessing] = useState(false);

  const handleAction = (action: "adjust" | "dismiss") => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setResponseState(action === "adjust" ? "adjusted" : "dismissed");
    }, 400);
  };

  const handleReset = () => {
    setResponseState("idle");
  };

  return (
    <section id="orbit" className="space-y-8 py-16 border-t border-[var(--lp-border)]">
      {/* Section Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="font-mono text-xs font-semibold uppercase tracking-wider text-[var(--lp-forest)]">
            Section H · Intelligence
          </span>
          <span className="text-xs text-[var(--lp-text-tertiary)]">/</span>
          <span className="text-xs text-[var(--lp-text-secondary)]">The Orbit Intelligent Presence</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--lp-text-primary)]">
          Orbit: Ambient Contextual Guidance
        </h2>
        <p className="mt-2 text-sm sm:text-base text-[var(--lp-text-secondary)] max-w-3xl leading-relaxed">
          Orbit is neither a generic chatbot window nor an intrusive pop-up. It is a persistent ambient companion 
          that watches the spaces between your workouts, nutrition, and sleep to offer calm, deterministic adjustments.
        </p>
      </div>

      {/* Orbit Interactive Surface */}
      <div className="max-w-2xl mx-auto">
        <div className="relative rounded-[24px] sm:rounded-[28px] bg-[var(--lp-surface-elevated)] border border-[var(--lp-border)] shadow-[var(--lp-shadow-md)] p-6 sm:p-10 transition-all duration-300">
          
          {/* Subtle Orbit Ambient Glow */}
          <div 
            className="absolute top-0 right-0 w-64 h-64 rounded-full pointer-events-none opacity-20 blur-3xl"
            style={{
              background: "radial-gradient(circle, var(--lp-forest) 0%, transparent 70%)"
            }}
          />

          {/* Orbit Presence Bar */}
          <div className="flex items-center justify-between pb-6 mb-6 border-b border-[var(--lp-border-subtle)]">
            <div className="flex items-center gap-3">
              {/* Proprietary Orbit Mark Container */}
              <div className="w-10 h-10 rounded-full bg-[var(--lp-forest-subtle)] border border-[var(--lp-border-subtle)] flex items-center justify-center text-[var(--lp-forest)] shadow-xs">
                <OrbitMark size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-base text-[var(--lp-text-primary)]">
                    Orbit
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider bg-[var(--lp-forest-subtle)] text-[var(--lp-forest)] font-semibold">
                    Live Presence
                  </span>
                </div>
                <p className="text-xs text-[var(--lp-text-tertiary)] mt-0.5 font-mono">
                  Context: Upper Body Workout Completed (11:45 AM)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-[var(--lp-text-secondary)] font-mono">
              <span className="w-2 h-2 rounded-full bg-[var(--lp-success)] animate-pulse" />
              <span>Attentive</span>
            </div>
          </div>

          {/* Interactive Dialogue State */}
          {responseState === "idle" && (
            <div className="space-y-6 animate-fade-in">
              {/* Dialogue Content */}
              <div className="space-y-3">
                <p className="text-base sm:text-lg text-[var(--lp-text-primary)] font-medium leading-relaxed">
                  &ldquo;You trained harder than usual today.&rdquo;
                </p>
                <p className="text-base sm:text-lg text-[var(--lp-text-primary)] font-medium leading-relaxed">
                  &ldquo;You&apos;re 38g short on protein.&rdquo;
                </p>
                <p className="text-base sm:text-lg text-[var(--lp-forest)] font-semibold leading-relaxed">
                  &ldquo;Want me to adjust dinner?&rdquo;
                </p>
              </div>

              {/* Context Pill */}
              <div className="p-3 rounded-xl bg-[var(--lp-bg-subtle)] border border-[var(--lp-border-subtle)] text-xs text-[var(--lp-text-secondary)] flex items-center justify-between">
                <span>Workout strain: 8.4 / 10 · Caloric expenditure: +380 kcal</span>
                <span className="font-mono text-[var(--lp-forest)] font-medium">Auto-detected</span>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                <button
                  disabled={isProcessing}
                  onClick={() => handleAction("adjust")}
                  className="w-full sm:w-auto px-6 py-3 rounded-full bg-[var(--lp-forest)] hover:bg-[var(--lp-forest-hover)] active:bg-[var(--lp-forest-2)] text-[var(--lp-text-on-forest)] font-medium text-sm tracking-tight shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lp-forest)]"
                >
                  {isProcessing ? "Recalculating..." : "Adjust dinner"}
                  {!isProcessing && <span>→</span>}
                </button>

                <button
                  disabled={isProcessing}
                  onClick={() => handleAction("dismiss")}
                  className="w-full sm:w-auto px-5 py-3 rounded-full bg-transparent hover:bg-[var(--lp-bg-subtle)] active:bg-[var(--lp-surface-inset)] text-[var(--lp-text-secondary)] hover:text-[var(--lp-text-primary)] border border-[var(--lp-border)] font-medium text-sm tracking-tight transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lp-forest)]"
                >
                  Not now
                </button>
              </div>
            </div>
          )}

          {/* Adjusted State */}
          {responseState === "adjusted" && (
            <div className="space-y-5 animate-fade-in">
              <div className="p-4 rounded-2xl bg-[var(--lp-forest-subtle)] border border-[var(--lp-forest)]/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-semibold uppercase tracking-wider text-[var(--lp-forest)]">
                    Dinner Macro Target Updated
                  </span>
                  <span className="text-xs text-[var(--lp-success)] font-medium">✓ Applied</span>
                </div>
                <p className="text-sm sm:text-base text-[var(--lp-text-primary)] leading-relaxed">
                  Added <strong className="text-[var(--lp-forest)]">Greek Yogurt Bowl (+28g protein)</strong> and <strong className="text-[var(--lp-forest)]">Roasted Edamame (+10g protein)</strong> to your evening plan.
                </p>
                <div className="flex items-center justify-between text-xs text-[var(--lp-text-secondary)] pt-2 border-t border-[var(--lp-border)]">
                  <span>New Dinner Target: 74g Protein</span>
                  <span className="font-mono text-[var(--lp-forest)]">Deficit resolved: 0g remaining</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-[var(--lp-text-tertiary)]">State synchronized across Nutrition tab</span>
                <button
                  onClick={handleReset}
                  className="text-xs font-semibold text-[var(--lp-forest)] hover:underline"
                >
                  Reset interaction ↺
                </button>
              </div>
            </div>
          )}

          {/* Dismissed State */}
          {responseState === "dismissed" && (
            <div className="space-y-5 animate-fade-in">
              <div className="p-4 rounded-2xl bg-[var(--lp-bg-subtle)] border border-[var(--lp-border)] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-semibold uppercase tracking-wider text-[var(--lp-text-tertiary)]">
                    Deferred Adjustment
                  </span>
                  <span className="text-xs text-[var(--lp-text-tertiary)]">Saved</span>
                </div>
                <p className="text-sm text-[var(--lp-text-secondary)] leading-relaxed">
                  Understood. Your protein deficit will be gently compensated across tomorrow&apos;s morning meal without affecting today&apos;s sleep window.
                </p>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-[var(--lp-text-tertiary)]">Zero nagging. Autonomy preserved.</span>
                <button
                  onClick={handleReset}
                  className="text-xs font-semibold text-[var(--lp-forest)] hover:underline"
                >
                  Reset interaction ↺
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </section>
  );
};

