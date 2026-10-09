"use client";

import React from "react";
import { signIn } from "next-auth/react";

export default function FinalCTA() {
  return (
    <section className="py-32 sm:py-44 px-5 sm:px-6 border-t border-[var(--border)] bg-[var(--background)] relative overflow-hidden">
      {/* Ambient Radial Soft Glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] rounded-full pointer-events-none opacity-25 blur-3xl"
        style={{
          background: "radial-gradient(circle, var(--accent-soft) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 max-w-3xl mx-auto text-center">
        {/* Eyebrow */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[var(--brand-subtle)] border border-[var(--border)] mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand)]" />
          <span className="type-eyebrow text-[var(--brand)]">
            THE INVITATION
          </span>
        </div>

        {/* Headline */}
        <h2 className="type-display-l text-[var(--text-primary)] mb-6 font-sans">
          Start becoming more consistent.
        </h2>

        {/* Supporting Copy */}
        <p className="type-body-lg text-[var(--text-secondary)] max-w-xl mx-auto mb-10 leading-relaxed font-normal">
          Your goals don&apos;t need another app.
          <br />
          They need a system.
        </p>

        {/* CTA Button */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
            className="w-full sm:w-auto btn-primary rounded-full px-9 py-4 text-base font-medium shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 group"
          >
            <span>Start building consistency</span>
            <span className="transition-transform group-hover:translate-x-1">→</span>
          </button>
        </div>

        {/* Clean Sub-Copy */}
        <p className="mt-5 text-xs text-[var(--text-muted)] font-mono">
          Free to use · No credit card required · Instant web access
        </p>
      </div>
    </section>
  );
}

