"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useSession, signIn } from "next-auth/react";
import { OrbitMark } from "@/components/orbit/OrbitMark";

export default function LandingNav() {
  const { data: session } = useSession();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 16);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-[var(--surface)]/90 backdrop-blur-md border-b border-[var(--border)] shadow-xs"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-6xl mx-auto px-5 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
        {/* Brand identity */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-full bg-[var(--brand-subtle)] border border-[var(--border)] flex items-center justify-center text-[var(--brand)] transition-transform duration-200 group-hover:scale-105">
            <OrbitMark size={18} />
          </div>
          <span className="font-display font-extrabold text-xl sm:text-2xl tracking-tight text-[var(--text-primary)]">
            SATAT
          </span>
        </Link>

        {/* Quiet Navigation Links */}
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-[var(--text-secondary)]">
          <a
            href="#problem"
            className="hover:text-[var(--text-primary)] transition-colors"
          >
            The Problem
          </a>
          <a
            href="#system"
            className="hover:text-[var(--text-primary)] transition-colors"
          >
            The System
          </a>
          <a
            href="#adaptation"
            className="hover:text-[var(--text-primary)] transition-colors"
          >
            Adaptation
          </a>
          <a
            href="#orbit"
            className="hover:text-[var(--text-primary)] transition-colors"
          >
            Orbit
          </a>
          <a
            href="#progress"
            className="hover:text-[var(--text-primary)] transition-colors"
          >
            Progress
          </a>
        </div>

        {/* Primary Action Button */}
        <div className="flex items-center gap-3">
          {session ? (
            <Link
              href="/dashboard"
              className="btn-primary rounded-full px-5 py-2.5 text-xs sm:text-sm font-medium shadow-sm hover:shadow-md transition-all flex items-center gap-2"
            >
              <span>Dashboard</span>
              <span>→</span>
            </Link>
          ) : (
            <>
              <button
                onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
                className="hidden sm:inline-flex text-xs sm:text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors px-3 py-2"
              >
                Sign in
              </button>
              <button
                onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
                className="btn-primary rounded-full px-4 sm:px-6 py-2.5 text-xs sm:text-sm font-medium shadow-sm hover:shadow-md transition-all flex items-center gap-1.5"
              >
                <span>Start building consistency</span>
                <span className="text-sm">→</span>
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

