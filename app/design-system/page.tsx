"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Smartphone,
  Grid,
  Columns2,
  Moon,
  Sun,
  LayoutDashboard,
  Calendar,
  PlusCircle,
  Dumbbell,
  Utensils,
  Sparkles,
  TrendingUp,
  User,
  ArrowRight,
} from "lucide-react";
import { MobileProductExperience, ScreenId } from "./MobileProductExperience";

type DisplayMode = "interactive" | "grid" | "compare";

export default function DesignSystemPage() {
  const [themeMode, setThemeMode] = useState<"night" | "day">("night");
  const [displayMode, setDisplayMode] = useState<DisplayMode>("interactive");
  const [activeScreen, setActiveScreen] = useState<ScreenId>("home");

  const isNight = themeMode === "night";
  const shellThemeClass = isNight ? "satat-theme-night" : "satat-theme-day";

  const allScreens: { id: ScreenId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "home", label: "1. Home (Command Center)", icon: LayoutDashboard },
    { id: "plan", label: "2. Plan (Roadmap)", icon: Calendar },
    { id: "track", label: "3. Track (Fast Capture)", icon: PlusCircle },
    { id: "workout", label: "4. Workout (Active Session)", icon: Dumbbell },
    { id: "nutrition", label: "5. Nutrition (Clean Intake)", icon: Utensils },
    { id: "orbit", label: "6. Orbit (Intelligence)", icon: Sparkles },
    { id: "progress", label: "7. Progress (Quiet Continuity)", icon: TrendingUp },
    { id: "profile", label: "8. You (System Settings)", icon: User },
  ];

  return (
    <div
      className={`${shellThemeClass} min-h-screen transition-colors duration-200`}
      style={{
        backgroundColor: "var(--background)",
        color: "var(--text-primary)",
        fontFamily: "var(--font-sans)",
      }}
    >
      {/* ──────────────────────────────────────────────────────────────────────── */}
      {/* MINIMAL HEADER — LINEAR GRADE RESTRAINT                                  */}
      {/* ──────────────────────────────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-50 backdrop-blur-md border-b px-4 lg:px-8 py-3 transition-colors"
        style={{
          backgroundColor: isNight ? "rgba(8, 9, 10, 0.92)" : "rgba(247, 247, 244, 0.92)",
          borderColor: "var(--border-subtle)",
        }}
      >
        <div className="max-w-[1700px] mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className="w-7 h-7 rounded-md flex items-center justify-center font-bold text-xs"
              style={{
                backgroundColor: "var(--brand)",
                color: "var(--brand-text)",
                fontFamily: "var(--font-display)",
              }}
            >
              S
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span
                  className="font-semibold text-sm tracking-tight"
                  style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
                >
                  SATAT
                </span>
                <span
                  className="px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase rounded-full"
                  style={{
                    backgroundColor: "var(--surface-elevated)",
                    color: "var(--text-secondary)",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  Mobile Operating System
                </span>
              </div>
              <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                &ldquo;Progress, made continuous.&rdquo; • Near-Black #08090A Foundation
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 text-xs">
            {/* Theme Toggle (Night is primary) */}
            <div
              className="flex items-center rounded-lg border p-0.5"
              style={{ backgroundColor: "var(--surface)", borderColor: "var(--border-subtle)" }}
            >
              <button
                type="button"
                onClick={() => setThemeMode("night")}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md font-medium transition-colors ${
                  isNight ? "shadow-xs font-semibold" : "opacity-60 hover:opacity-100"
                }`}
                style={{
                  backgroundColor: isNight ? "var(--surface-elevated)" : "transparent",
                  color: isNight ? "var(--brand)" : "var(--text-secondary)",
                }}
              >
                <Moon className="w-3.5 h-3.5" />
                <span>Night (Primary)</span>
              </button>

              <button
                type="button"
                onClick={() => setThemeMode("day")}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md font-medium transition-colors ${
                  !isNight ? "shadow-xs font-semibold" : "opacity-60 hover:opacity-100"
                }`}
                style={{
                  backgroundColor: !isNight ? "var(--surface-elevated)" : "transparent",
                  color: !isNight ? "var(--brand)" : "var(--text-secondary)",
                }}
              >
                <Sun className="w-3.5 h-3.5" />
                <span>Day</span>
              </button>
            </div>

            {/* Display Mode Toggle */}
            <div
              className="flex items-center rounded-lg border p-0.5"
              style={{ backgroundColor: "var(--surface)", borderColor: "var(--border-subtle)" }}
            >
              <button
                type="button"
                onClick={() => setDisplayMode("interactive")}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md font-medium transition-colors ${
                  displayMode === "interactive" ? "shadow-xs font-semibold" : "opacity-60 hover:opacity-100"
                }`}
                style={{
                  backgroundColor: displayMode === "interactive" ? "var(--surface-elevated)" : "transparent",
                  color: displayMode === "interactive" ? "var(--text-primary)" : "var(--text-secondary)",
                }}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Device Simulator</span>
              </button>

              <button
                type="button"
                onClick={() => setDisplayMode("grid")}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md font-medium transition-colors ${
                  displayMode === "grid" ? "shadow-xs font-semibold" : "opacity-60 hover:opacity-100"
                }`}
                style={{
                  backgroundColor: displayMode === "grid" ? "var(--surface-elevated)" : "transparent",
                  color: displayMode === "grid" ? "var(--text-primary)" : "var(--text-secondary)",
                }}
              >
                <Grid className="w-3.5 h-3.5" />
                <span>All 8 Screens</span>
              </button>

              <button
                type="button"
                onClick={() => setDisplayMode("compare")}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md font-medium transition-colors ${
                  displayMode === "compare" ? "shadow-xs font-semibold" : "opacity-60 hover:opacity-100"
                }`}
                style={{
                  backgroundColor: displayMode === "compare" ? "var(--surface-elevated)" : "transparent",
                  color: displayMode === "compare" ? "var(--text-primary)" : "var(--text-secondary)",
                }}
              >
                <Columns2 className="w-3.5 h-3.5" />
                <span>Night vs Day</span>
              </button>
            </div>

            <Link
              href="/dashboard"
              className="px-3 py-1.5 rounded-lg border font-medium transition-colors"
              style={{
                backgroundColor: "var(--surface)",
                borderColor: "var(--border-subtle)",
                color: "var(--text-secondary)",
              }}
            >
              Back to App
            </Link>
          </div>
        </div>

        {/* Quick Screen Jumper in Interactive Mode */}
        {displayMode === "interactive" && (
          <div className="max-w-[1700px] mx-auto mt-2 pt-2 border-t flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs" style={{ borderColor: "var(--border-subtle)" }}>
            <span className="text-[11px] font-semibold uppercase tracking-wider mr-1.5" style={{ color: "var(--text-muted)" }}>
              Jump to Screen:
            </span>
            {allScreens.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setActiveScreen(s.id)}
                className={`px-2.5 py-1 rounded-md transition-colors whitespace-nowrap font-medium ${
                  activeScreen === s.id ? "font-semibold" : "opacity-70 hover:opacity-100"
                }`}
                style={{
                  backgroundColor: activeScreen === s.id ? "var(--surface-elevated)" : "transparent",
                  color: activeScreen === s.id ? "var(--brand)" : "var(--text-secondary)",
                  border: activeScreen === s.id ? "1px solid var(--border-subtle)" : "1px solid transparent",
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* ──────────────────────────────────────────────────────────────────────── */}
      {/* PRODUCT MANIFESTO / SPECIFICATION BAR                                    */}
      {/* ──────────────────────────────────────────────────────────────────────── */}
      <section className="max-w-[1700px] mx-auto px-4 lg:px-8 pt-6 pb-2">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs pb-4 border-b" style={{ borderColor: "var(--border-subtle)" }}>
          <div className="flex items-center gap-4">
            <span className="font-mono" style={{ color: "var(--text-muted)" }}>
              CANVAS: <span style={{ color: "var(--text-primary)" }}>{isNight ? "#08090A" : "#F7F7F4"}</span>
            </span>
            <span className="font-mono" style={{ color: "var(--text-muted)" }}>
              SURFACE: <span style={{ color: "var(--text-primary)" }}>{isNight ? "#0D0F11" : "#FFFFFF"}</span>
            </span>
            <span className="font-mono" style={{ color: "var(--text-muted)" }}>
              ELEVATED: <span style={{ color: "var(--text-primary)" }}>{isNight ? "#121519" : "#F0F1ED"}</span>
            </span>
            <span className="font-mono" style={{ color: "var(--text-muted)" }}>
              COBALT: <span style={{ color: "var(--brand)" }}>#6E8BFF</span>
            </span>
          </div>

          <div className="flex items-center gap-3 text-[11px]" style={{ color: "var(--text-muted)" }}>
            <span>90% Near-Black Foundation</span>
            <span>•</span>
            <span>8% Restrained Cobalt</span>
            <span>•</span>
            <span>2% Mint &amp; Peach Accent</span>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────────────────── */}
      {/* MAIN PLAYGROUND DISPLAY CONTAINER                                        */}
      {/* ──────────────────────────────────────────────────────────────────────── */}
      <main className="max-w-[1700px] mx-auto px-4 lg:px-8 py-8 pb-20">
        {/* MODE 1: INTERACTIVE SINGLE DEVICE (390 x 844) */}
        {displayMode === "interactive" && (
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="text-center space-y-1 mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "var(--brand)" }}>
                Native 390 × 844 Viewport Simulator
              </span>
              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                Click bottom navigation or jump links above to evaluate real workflows.
              </p>
            </div>

            <MobileProductExperience
              themeMode={themeMode}
              activeScreen={activeScreen}
              onScreenChange={setActiveScreen}
            />
          </div>
        )}

        {/* MODE 2: EXECUTIVE SCREEN GRID (ALL 8 SCREENS SIMULTANEOUSLY) */}
        {displayMode === "grid" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-2">
              <div>
                <h2 className="text-lg font-semibold tracking-tight" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
                  Executive Overview — All 8 Core Product Surfaces
                </h2>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                  Evaluate visual hierarchy, spacing discipline, and consistency across the entire operating system.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8 justify-items-center">
              {allScreens.map((s) => (
                <div key={s.id} className="space-y-3 w-full max-w-[390px]">
                  <div className="flex items-center justify-between px-2">
                    <span className="text-xs font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>
                      {s.label}
                    </span>
                    <span className="text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>
                      390px
                    </span>
                  </div>

                  <MobileProductExperience
                    themeMode={themeMode}
                    forcedScreen={s.id}
                    isStandaloneScreen={true}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MODE 3: NIGHT VS DAY SIDE-BY-SIDE */}
        {displayMode === "compare" && (
          <div className="space-y-6">
            <div className="text-center space-y-1 mb-4">
              <h2 className="text-lg font-semibold tracking-tight" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
                SATAT Night vs SATAT Day Side-by-Side
              </h2>
              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                Identical layout and hierarchy with synchronized mobile experience.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-10">
              <div className="space-y-3 w-full max-w-[390px]">
                <div className="flex items-center justify-between px-2">
                  <span className="text-xs font-semibold tracking-tight text-white">
                    SATAT Night (Primary Identity)
                  </span>
                  <span className="text-[10px] font-mono text-zinc-400">#08090A Foundation</span>
                </div>
                <MobileProductExperience
                  themeMode="night"
                  activeScreen={activeScreen}
                  onScreenChange={setActiveScreen}
                />
              </div>

              <div className="space-y-3 w-full max-w-[390px]">
                <div className="flex items-center justify-between px-2">
                  <span className="text-xs font-semibold tracking-tight text-zinc-900">
                    SATAT Day (Light Reference)
                  </span>
                  <span className="text-[10px] font-mono text-zinc-500">#F7F7F4 Foundation</span>
                </div>
                <MobileProductExperience
                  themeMode="day"
                  activeScreen={activeScreen}
                  onScreenChange={setActiveScreen}
                />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
