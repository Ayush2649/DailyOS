"use client";

import React from "react";
import Link from "next/link";
import { OrbitMark } from "@/components/orbit/OrbitMark";

export default function Footer() {
  return (
    <footer className="border-t border-[var(--border)] py-14 px-5 sm:px-6 bg-[var(--surface-subtle)] text-xs text-[var(--text-muted)]">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
        {/* Brand & Core Positioning */}
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-full bg-[var(--brand-subtle)] flex items-center justify-center text-[var(--brand)]">
            <OrbitMark size={14} />
          </div>
          <span className="font-display font-bold text-sm tracking-tight text-[var(--text-primary)]">
            SATAT
          </span>
          <span className="text-[var(--border-strong)]">·</span>
          <span className="text-xs text-[var(--text-secondary)]">
            Progress, made continuous.
          </span>
        </div>

        {/* Minimal Meaningful Public Links */}
        <div className="flex items-center gap-6 text-xs text-[var(--text-secondary)]">
          <a href="#system" className="hover:text-[var(--text-primary)] transition-colors">
            System
          </a>
          <a href="#adaptation" className="hover:text-[var(--text-primary)] transition-colors">
            Adaptation
          </a>
          <a href="#orbit" className="hover:text-[var(--text-primary)] transition-colors">
            Orbit
          </a>
          <Link href="/signin" className="hover:text-[var(--text-primary)] transition-colors">
            Sign In
          </Link>
        </div>

        {/* Quiet Legal & Year */}
        <div className="text-[11px] font-mono text-[var(--text-muted)]">
          © {new Date().getFullYear()} SATAT · Continuous Human Improvement
        </div>
      </div>
    </footer>
  );
}
