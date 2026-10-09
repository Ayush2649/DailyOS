"use client";

import React from "react";
import { signIn } from "next-auth/react";
import HeroProductScene from "./HeroProductScene";

export default function Hero() {
  return (
    <section className="relative pt-32 sm:pt-40 pb-20 sm:pb-28 px-5 sm:px-6 overflow-hidden">
      <div className="max-w-5xl mx-auto text-center">
        {/* Eyebrow Label */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[var(--brand-subtle)] border border-[var(--border)] mb-6 sm:mb-8 animate-fade-in">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand)]" />
          <span className="type-eyebrow text-[var(--brand)] tracking-[0.16em]">
            YOUR LIFE. ONE SYSTEM.
          </span>
        </div>

        {/* Editorial Headline */}
        <h1 className="type-display-xl text-[var(--text-primary)] mb-6 sm:mb-8 font-sans">
          Progress,
          <br />
          <span className="text-[var(--brand)]">made continuous.</span>
        </h1>

        {/* Supporting Copy */}
        <p className="type-body-lg text-[var(--text-secondary)] max-w-2xl mx-auto mb-10 leading-relaxed font-normal">
          Satat connects your goals, routines, training, nutrition and progress into one intelligent system — so you can build consistency and keep becoming better.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
            className="w-full sm:w-auto btn-primary rounded-full px-8 py-4 text-base font-medium shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 group"
          >
            <span>Start building consistency</span>
            <span className="transition-transform group-hover:translate-x-1">→</span>
          </button>

          <a
            href="#problem"
            className="w-full sm:w-auto btn-secondary rounded-full px-7 py-4 text-base font-medium transition-all flex items-center justify-center gap-2"
          >
            <span>See how it works</span>
            <span className="text-xs text-[var(--text-muted)]">↓</span>
          </a>
        </div>

        {/* Minimal Reassurance */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-[var(--text-muted)]">
          <span className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-[var(--brand)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
            No fragmented apps
          </span>
          <span className="w-1 h-1 rounded-full bg-[var(--border-strong)]" />
          <span className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-[var(--brand)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
            Adaptive daily guidance
          </span>
          <span className="w-1 h-1 rounded-full bg-[var(--border-strong)]" />
          <span className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-[var(--brand)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
            Free to use · No credit card
          </span>
        </div>

        {/* Polished Product Visualization */}
        <HeroProductScene />
      </div>
    </section>
  );
}

