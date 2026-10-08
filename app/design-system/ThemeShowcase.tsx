"use client";

import React, { useState } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Info,
  Clock,
  Dumbbell,
  Utensils,
  CheckSquare,
  Sparkles,
  Flame,
  TrendingUp,
  Search,
  ChevronRight,
  ArrowRight,
  RefreshCw,
  LayoutDashboard,
  Settings,
  ShieldCheck,
  Activity,
  Layers,
  Sliders,
  Check,
  X,
  Plus,
  Play,
  RotateCcw,
  Calendar,
  Mic,
  Bookmark,
  ChevronDown,
  BarChart3,
  ListTodo,
  Bot,
} from "lucide-react";

interface ThemeShowcaseProps {
  themeName: "SATAT DAY" | "SATAT NIGHT";
  themeClass: "satat-theme-day" | "satat-theme-night";
  mode: "day" | "night";
}

export function ThemeShowcase({ themeName, themeClass, mode }: ThemeShowcaseProps) {
  // Interactive state demos
  const [inputText, setInputText] = useState("Ayush Sharma");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectValue, setSelectValue] = useState("hypertrophy");
  const [textareaValue, setTextareaValue] = useState(
    "Focusing on compound movements and high protein intake today."
  );
  const [checkbox1, setCheckbox1] = useState(true);
  const [checkbox2, setCheckbox2] = useState(false);
  const [radioChoice, setRadioChoice] = useState("maintenance");
  const [toggleActive, setToggleActive] = useState(true);
  const [sliderVal, setSliderVal] = useState(75);
  const [activeTab, setActiveTab] = useState("today");

  // Task list demo state
  const [tasks, setTasks] = useState([
    { id: 1, title: "Review database schema migrations", done: true, priority: "High", time: "9:00 AM" },
    { id: 2, title: "Finalize theme token playground", done: false, priority: "High", time: "1:30 PM" },
    { id: 3, title: "Sync with design team on visual tokens", done: false, priority: "Medium", time: "3:00 PM" },
  ]);

  const toggleTask = (id: number) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
    );
  };

  const isNight = mode === "night";

  return (
    <div
      className={`${themeClass} rounded-2xl border transition-colors p-4 sm:p-6 md:p-8 space-y-12`}
      style={{
        backgroundColor: "var(--background)",
        borderColor: "var(--border)",
        color: "var(--text-primary)",
        fontFamily: "var(--font-sans)",
      }}
    >
      {/* ──────────────────────────────────────────────────────────────────────── */}
      {/* THEME HEADER BANNER                                                      */}
      {/* ──────────────────────────────────────────────────────────────────────── */}
      <div
        className="p-5 sm:p-6 rounded-xl border flex flex-wrap items-center justify-between gap-4"
        style={{
          backgroundColor: "var(--surface)",
          borderColor: "var(--border)",
        }}
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <span
              className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider"
              style={{
                backgroundColor: "var(--brand-subtle)",
                color: "var(--brand)",
              }}
            >
              {isNight ? "SATAT NIGHT • CHARCOAL FOUNDATION" : "SATAT DAY • WARM CANVAS"}
            </span>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              {isNight ? "#17191C Neutral Charcoal" : "#F7F7F4 Warm Ivory"}
            </span>
          </div>
          <h2
            className="text-2xl sm:text-3xl font-bold tracking-tight"
            style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
          >
            {themeName}
          </h2>
          <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
            &ldquo;Progress, made continuous.&rdquo; — {isNight ? "Comfortable, calm, sophisticated evening clarity" : "Fresh, optimistic, energetic daylight clarity"}
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span
            className="px-3 py-1.5 rounded-lg border font-mono font-medium"
            style={{
              backgroundColor: "var(--surface-subtle)",
              borderColor: "var(--border)",
              color: "var(--text-secondary)",
            }}
          >
            75% Neutral • 15% Cobalt • 10% Accents
          </span>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────────────────── */}
      {/* 1. PALETTE SWATCHES & TOKEN VALUES                                       */}
      {/* ──────────────────────────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3
            className="text-lg font-semibold tracking-tight"
            style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
          >
            Core Semantic Tokens
          </h3>
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            Defined Roles • No Inversions
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {/* Canvas */}
          <div
            className="p-3 rounded-lg border flex flex-col justify-between h-28"
            style={{ backgroundColor: "var(--background)", borderColor: "var(--border)" }}
          >
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider block" style={{ color: "var(--text-muted)" }}>
                Background
              </span>
              <span className="text-xs font-semibold block mt-0.5" style={{ color: "var(--text-primary)" }}>
                {isNight ? "#17191C" : "#F7F7F4"}
              </span>
            </div>
            <span className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
              Canvas (75%)
            </span>
          </div>

          {/* Surface */}
          <div
            className="p-3 rounded-lg border flex flex-col justify-between h-28"
            style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
          >
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider block" style={{ color: "var(--text-muted)" }}>
                Surface
              </span>
              <span className="text-xs font-semibold block mt-0.5" style={{ color: "var(--text-primary)" }}>
                {isNight ? "#1E2125" : "#FFFFFF"}
              </span>
            </div>
            <span className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
              Cards & Panels
            </span>
          </div>

          {/* Brand Cobalt */}
          <div
            className="p-3 rounded-lg border flex flex-col justify-between h-28"
            style={{ backgroundColor: "var(--brand)", borderColor: "var(--border)", color: "var(--brand-text)" }}
          >
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider block opacity-90">
                Brand Cobalt
              </span>
              <span className="text-xs font-semibold block mt-0.5">
                {isNight ? "#7C93FF" : "#4263EB"}
              </span>
            </div>
            <span className="text-[11px] opacity-90">
              Identity (10-15%)
            </span>
          </div>

          {/* Fresh Mint */}
          <div
            className="p-3 rounded-lg border flex flex-col justify-between h-28"
            style={{ backgroundColor: "var(--mint-subtle)", borderColor: "var(--mint)", color: "var(--mint-strong)" }}
          >
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider block">
                Fresh Mint
              </span>
              <span className="text-xs font-semibold block mt-0.5">
                {isNight ? "#5BC7B2" : "#43B5A0"}
              </span>
            </div>
            <span className="text-[11px]">
              Progress / Health
            </span>
          </div>

          {/* Energy Peach */}
          <div
            className="p-3 rounded-lg border flex flex-col justify-between h-28"
            style={{ backgroundColor: "var(--peach-subtle)", borderColor: "var(--peach)", color: "var(--peach-strong)" }}
          >
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider block">
                Energy Peach
              </span>
              <span className="text-xs font-semibold block mt-0.5">
                {isNight ? "#F3A583" : "#F29A7A"}
              </span>
            </div>
            <span className="text-[11px]">
              Warmth / Focus
            </span>
          </div>

          {/* Semantic Progress */}
          <div
            className="p-3 rounded-lg border flex flex-col justify-between h-28"
            style={{ backgroundColor: "var(--success-subtle)", borderColor: "var(--success)", color: "var(--success)" }}
          >
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider block">
                Semantic Green
              </span>
              <span className="text-xs font-semibold block mt-0.5">
                {isNight ? "#7ACB7D" : "#68B36B"}
              </span>
            </div>
            <span className="text-[11px]">
              Success / Adherence
            </span>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────────────────── */}
      {/* 2. NAVIGATION SHOWCASE                                                   */}
      {/* ──────────────────────────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <h3
          className="text-lg font-semibold tracking-tight"
          style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
        >
          Navigation Components
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Sidebar Preview */}
          <div
            className="p-4 rounded-xl border flex flex-col justify-between space-y-6"
            style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
          >
            <div className="space-y-4">
              <div className="flex items-center gap-2.5 px-2">
                <div
                  className="w-7 h-7 rounded-md flex items-center justify-center font-bold text-xs"
                  style={{ backgroundColor: "var(--brand)", color: "var(--brand-text)" }}
                >
                  S
                </div>
                <div>
                  <span className="font-semibold text-sm tracking-tight block" style={{ color: "var(--text-primary)" }}>
                    SATAT
                  </span>
                  <span className="text-[10px] block" style={{ color: "var(--text-muted)" }}>
                    Progress, made continuous
                  </span>
                </div>
              </div>

              {/* Nav Items */}
              <nav className="space-y-1">
                {[
                  { id: "today", label: "Today", icon: LayoutDashboard, active: true },
                  { id: "workout", label: "Workout", icon: Dumbbell, active: false },
                  { id: "nutrition", label: "Nutrition", icon: Utensils, active: false },
                  { id: "tasks", label: "Tasks", icon: CheckSquare, active: false, badge: "3" },
                  { id: "settings", label: "Settings", icon: Settings, active: false },
                ].map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium cursor-pointer transition-colors"
                    style={{
                      backgroundColor: item.active ? "var(--brand-subtle)" : "transparent",
                      color: item.active ? "var(--brand)" : "var(--text-secondary)",
                    }}
                  >
                    <div className="flex items-center gap-2.5">
                      <item.icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span
                        className="px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                        style={{ backgroundColor: "var(--surface-subtle)", color: "var(--text-secondary)" }}
                      >
                        {item.badge}
                      </span>
                    )}
                  </div>
                ))}
              </nav>
            </div>

            {/* Orbit Sidebar Indicator */}
            <div
              className="p-3 rounded-lg border flex items-center gap-2.5 text-xs"
              style={{ backgroundColor: "var(--surface-subtle)", borderColor: "var(--border)" }}
            >
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "var(--brand)" }} />
              <div className="flex-1 min-w-0">
                <span className="font-semibold block truncate" style={{ color: "var(--text-primary)" }}>
                  Orbit Active
                </span>
                <span className="text-[11px] truncate block" style={{ color: "var(--text-muted)" }}>
                  Morning routine optimized
                </span>
              </div>
            </div>
          </div>

          {/* Top Navigation & Mobile Bar */}
          <div className="lg:col-span-2 space-y-4">
            {/* Top Bar */}
            <div
              className="p-3 sm:p-4 rounded-xl border flex flex-wrap items-center justify-between gap-3"
              style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
            >
              <div className="flex items-center gap-3">
                <h4 className="font-semibold text-base" style={{ color: "var(--text-primary)" }}>
                  Today
                </h4>
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                  Wednesday, Oct 7
                </span>
              </div>

              <div className="flex items-center gap-2.5">
                <div
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs"
                  style={{ backgroundColor: "var(--surface-subtle)", borderColor: "var(--border)", color: "var(--text-muted)" }}
                >
                  <Search className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Search...</span>
                  <kbd className="text-[10px] px-1 py-0.5 rounded border" style={{ borderColor: "var(--border)" }}>⌘K</kbd>
                </div>
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border"
                  style={{ backgroundColor: "var(--brand-subtle)", color: "var(--brand)", borderColor: "var(--border)" }}
                >
                  AY
                </div>
              </div>
            </div>

            {/* Mobile Tab Bar Simulation */}
            <div
              className="p-2 sm:p-3 rounded-xl border"
              style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
            >
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 block mb-2" style={{ color: "var(--text-muted)" }}>
                Mobile Navigation Bar
              </span>
              <div className="grid grid-cols-5 gap-1 text-center">
                {[
                  { label: "Today", icon: LayoutDashboard, active: true },
                  { label: "Workout", icon: Dumbbell, active: false },
                  { label: "Diet", icon: Utensils, active: false },
                  { label: "Tasks", icon: CheckSquare, active: false },
                  { label: "Orbit", icon: Bot, active: false },
                ].map((tab, idx) => (
                  <div
                    key={idx}
                    className="py-1.5 px-1 rounded-md flex flex-col items-center gap-1 text-[11px] font-medium"
                    style={{
                      color: tab.active ? "var(--brand)" : "var(--text-muted)",
                      backgroundColor: tab.active ? "var(--brand-subtle)" : "transparent",
                    }}
                  >
                    <tab.icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────────────────── */}
      {/* 3. TYPOGRAPHY SCALE                                                      */}
      {/* ──────────────────────────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <h3
          className="text-lg font-semibold tracking-tight"
          style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
        >
          Typography Scale & Hierarchy
        </h3>

        <div
          className="p-5 sm:p-6 rounded-xl border space-y-4"
          style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
        >
          <div className="border-b pb-3" style={{ borderColor: "var(--border)" }}>
            <span className="text-[10px] font-mono uppercase tracking-wider block" style={{ color: "var(--text-muted)" }}>
              Page Title • Plus Jakarta Sans 28px / 600
            </span>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight mt-0.5" style={{ color: "var(--text-primary)" }}>
              Good morning, Ayush.
            </h1>
          </div>

          <div className="border-b pb-3" style={{ borderColor: "var(--border)" }}>
            <span className="text-[10px] font-mono uppercase tracking-wider block" style={{ color: "var(--text-muted)" }}>
              Section Title • Plus Jakarta Sans 20px / 600
            </span>
            <h2 className="text-xl font-semibold tracking-tight mt-0.5" style={{ color: "var(--text-primary)" }}>
              Daily Performance & Momentum
            </h2>
          </div>

          <div className="border-b pb-3" style={{ borderColor: "var(--border)" }}>
            <span className="text-[10px] font-mono uppercase tracking-wider block" style={{ color: "var(--text-muted)" }}>
              Card Title • 16px / 600
            </span>
            <h3 className="text-base font-semibold mt-0.5" style={{ color: "var(--text-primary)" }}>
              Full Body Compound A
            </h3>
          </div>

          <div className="border-b pb-3" style={{ borderColor: "var(--border)" }}>
            <span className="text-[10px] font-mono uppercase tracking-wider block" style={{ color: "var(--text-muted)" }}>
              Body Text • Inter 15px / 400
            </span>
            <p className="text-[15px] leading-relaxed mt-0.5" style={{ color: "var(--text-primary)" }}>
              Continuous habits compound exponentially over time. You have maintained 100% adherence to your strength program across the last 7 days.
            </p>
          </div>

          <div className="flex flex-wrap gap-6 pt-1">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider block" style={{ color: "var(--text-muted)" }}>
                Secondary Text (14px)
              </span>
              <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>
                Updated 12 minutes ago from Health Sync
              </p>
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider block" style={{ color: "var(--text-muted)" }}>
                Metadata / Muted (12px)
              </span>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                RPE 8.0 • 3 sets • 90s rest
              </p>
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider block" style={{ color: "var(--text-muted)" }}>
                Tabular Metric Display
              </span>
              <p className="text-xl font-semibold tabular-nums mt-0.5" style={{ color: "var(--text-primary)" }}>
                1,840 <span className="text-xs font-normal" style={{ color: "var(--text-muted)" }}>kcal</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────────────────── */}
      {/* 4. BUTTONS SHOWCASE & STATES                                             */}
      {/* ──────────────────────────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3
            className="text-lg font-semibold tracking-tight"
            style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
          >
            Button System & Interactive States
          </h3>
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            Normalized 10px Radii • Restrained Elevation
          </span>
        </div>

        <div
          className="p-5 sm:p-6 rounded-xl border space-y-6"
          style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
        >
          {/* Main Button Variants */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Primary */}
            <button
              type="button"
              className="px-4 py-2 rounded-[10px] text-sm font-medium transition-colors shadow-xs"
              style={{
                backgroundColor: "var(--brand)",
                color: "var(--brand-text)",
              }}
            >
              Primary CTA
            </button>

            {/* Secondary */}
            <button
              type="button"
              className="px-4 py-2 rounded-[10px] text-sm font-medium border transition-colors"
              style={{
                backgroundColor: "var(--surface-subtle)",
                borderColor: "var(--border)",
                color: "var(--text-primary)",
              }}
            >
              Secondary Action
            </button>

            {/* Tertiary / Ghost */}
            <button
              type="button"
              className="px-4 py-2 rounded-[10px] text-sm font-medium transition-colors"
              style={{
                color: "var(--text-secondary)",
              }}
            >
              Ghost / Tertiary
            </button>

            {/* Destructive */}
            <button
              type="button"
              className="px-4 py-2 rounded-[10px] text-sm font-medium border transition-colors"
              style={{
                backgroundColor: "var(--error-subtle)",
                borderColor: "var(--error)",
                color: "var(--error)",
              }}
            >
              Destructive
            </button>

            {/* Disabled */}
            <button
              type="button"
              disabled
              className="px-4 py-2 rounded-[10px] text-sm font-medium opacity-40 cursor-not-allowed border"
              style={{
                backgroundColor: "var(--surface-subtle)",
                borderColor: "var(--border)",
                color: "var(--text-muted)",
              }}
            >
              Disabled State
            </button>

            {/* Loading */}
            <button
              type="button"
              disabled
              className="px-4 py-2 rounded-[10px] text-sm font-medium flex items-center gap-2"
              style={{
                backgroundColor: "var(--brand)",
                color: "var(--brand-text)",
                opacity: 0.85,
              }}
            >
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Saving...</span>
            </button>
          </div>

          {/* Icon Buttons & Focus States */}
          <div className="pt-4 border-t flex flex-wrap items-center justify-between gap-4" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium mr-2" style={{ color: "var(--text-secondary)" }}>Icon Controls:</span>
              {[
                { icon: Mic, label: "Voice input" },
                { icon: Bookmark, label: "Saved" },
                { icon: Settings, label: "Settings" },
                { icon: Plus, label: "Add" },
              ].map((btn, idx) => (
                <button
                  key={idx}
                  type="button"
                  aria-label={btn.label}
                  className="w-9 h-9 rounded-[10px] border flex items-center justify-center transition-colors"
                  style={{
                    backgroundColor: "var(--surface-subtle)",
                    borderColor: "var(--border)",
                    color: "var(--text-secondary)",
                  }}
                >
                  <btn.icon className="w-4 h-4" />
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-medium mr-1" style={{ color: "var(--text-secondary)" }}>Focus Ring Test:</span>
              <button
                type="button"
                className="px-3 py-1.5 rounded-[10px] text-xs font-medium ring-2 ring-offset-2"
                style={{
                  backgroundColor: "var(--surface-subtle)",
                  borderColor: "var(--border)",
                  color: "var(--brand)",
                  outline: "none",
                }}
              >
                Simulated Focus Ring
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────────────────── */}
      {/* 5. INPUTS & FORM CONTROLS                                                */}
      {/* ──────────────────────────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <h3
          className="text-lg font-semibold tracking-tight"
          style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
        >
          Input Controls & Forms
        </h3>

        <div
          className="p-5 sm:p-6 rounded-xl border space-y-6"
          style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Text Input Default */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium block" style={{ color: "var(--text-secondary)" }}>
                Full Name
              </label>
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-[10px] border outline-none transition-colors"
                style={{
                  backgroundColor: "var(--surface)",
                  borderColor: "var(--border)",
                  color: "var(--text-primary)",
                }}
              />
            </div>

            {/* Focused State Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium block" style={{ color: "var(--text-secondary)" }}>
                Simulated Focused State
              </label>
              <input
                type="text"
                defaultValue="Workout Routine"
                className="w-full px-3 py-2 text-sm rounded-[10px] border outline-none ring-2"
                style={{
                  backgroundColor: "var(--surface)",
                  borderColor: "var(--brand)",
                  color: "var(--text-primary)",
                }}
              />
            </div>

            {/* Error State Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium block" style={{ color: "var(--text-secondary)" }}>
                Calorie Target (Error)
              </label>
              <input
                type="text"
                defaultValue="-500"
                className="w-full px-3 py-2 text-sm rounded-[10px] border outline-none"
                style={{
                  backgroundColor: "var(--surface)",
                  borderColor: "var(--error)",
                  color: "var(--text-primary)",
                }}
              />
              <span className="text-[11px] block" style={{ color: "var(--error)" }}>
                Must be greater than 0
              </span>
            </div>

            {/* Disabled Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium block" style={{ color: "var(--text-secondary)" }}>
                Account Email (Locked)
              </label>
              <input
                type="text"
                disabled
                defaultValue="ayush@dailyos.internal"
                className="w-full px-3 py-2 text-sm rounded-[10px] border opacity-50 cursor-not-allowed"
                style={{
                  backgroundColor: "var(--surface-subtle)",
                  borderColor: "var(--border)",
                  color: "var(--text-muted)",
                }}
              />
            </div>
          </div>

          {/* Select, Search, Textarea */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t" style={{ borderColor: "var(--border)" }}>
            {/* Select Dropdown */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium block" style={{ color: "var(--text-secondary)" }}>
                Training Goal
              </label>
              <div className="relative">
                <select
                  value={selectValue}
                  onChange={(e) => setSelectValue(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-[10px] border appearance-none outline-none pr-8"
                  style={{
                    backgroundColor: "var(--surface)",
                    borderColor: "var(--border)",
                    color: "var(--text-primary)",
                  }}
                >
                  <option value="hypertrophy">Hypertrophy (4 days/week)</option>
                  <option value="strength">Strength Focus (3 days/week)</option>
                  <option value="endurance">Conditioning & Mobility</option>
                </select>
                <ChevronDown className="w-4 h-4 absolute right-2.5 top-2.5 pointer-events-none" style={{ color: "var(--text-muted)" }} />
              </div>
            </div>

            {/* Search Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium block" style={{ color: "var(--text-secondary)" }}>
                Search Exercises
              </label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 pointer-events-none" style={{ color: "var(--text-muted)" }} />
                <input
                  type="text"
                  placeholder="Filter by muscle group..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-[10px] border outline-none"
                  style={{
                    backgroundColor: "var(--surface)",
                    borderColor: "var(--border)",
                    color: "var(--text-primary)",
                  }}
                />
              </div>
            </div>

            {/* Slider */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium block" style={{ color: "var(--text-secondary)" }}>
                  Daily Effort Target: {sliderVal}%
                </label>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={sliderVal}
                onChange={(e) => setSliderVal(Number(e.target.value))}
                className="w-full mt-2 accent-[var(--brand)]"
              />
            </div>
          </div>

          {/* Checkboxes, Radios, Toggles */}
          <div className="flex flex-wrap items-center gap-6 pt-4 border-t text-sm" style={{ borderColor: "var(--border)" }}>
            {/* Checkbox */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={checkbox1}
                onChange={() => setCheckbox1(!checkbox1)}
                className="w-4 h-4 rounded accent-[var(--brand)]"
              />
              <span style={{ color: "var(--text-primary)" }}>Health sync active</span>
            </label>

            {/* Radio */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name={`goal-radio-${mode}`}
                checked={radioChoice === "maintenance"}
                onChange={() => setRadioChoice("maintenance")}
                className="w-4 h-4 accent-[var(--brand)]"
              />
              <span style={{ color: "var(--text-primary)" }}>Maintenance (2,200 kcal)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name={`goal-radio-${mode}`}
                checked={radioChoice === "deficit"}
                onChange={() => setRadioChoice("deficit")}
                className="w-4 h-4 accent-[var(--brand)]"
              />
              <span style={{ color: "var(--text-secondary)" }}>Deficit (1,850 kcal)</span>
            </label>

            {/* Switch Toggle */}
            <div className="flex items-center gap-2.5 ml-auto">
              <span className="text-xs" style={{ color: "var(--text-secondary)" }}>Auto Rest Timer</span>
              <button
                type="button"
                onClick={() => setToggleActive(!toggleActive)}
                className="w-11 h-6 rounded-full transition-colors relative px-0.5"
                style={{
                  backgroundColor: toggleActive ? "var(--brand)" : "var(--border)",
                }}
              >
                <div
                  className="w-5 h-5 rounded-full bg-white transition-transform"
                  style={{
                    transform: toggleActive ? "translateX(20px)" : "translateX(0)",
                  }}
                />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────────────────── */}
      {/* 6. CARDS SHOWCASE (REALISTIC SATAT DATA)                                  */}
      {/* ──────────────────────────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3
            className="text-lg font-semibold tracking-tight"
            style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
          >
            Core Product Cards
          </h3>
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            Neutral Surfaces • Restrained Color Usage
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* 1. Today's Focus */}
          <div
            className="p-5 rounded-xl border flex flex-col justify-between space-y-4"
            style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--brand)" }}>
                  Today&apos;s Focus
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ backgroundColor: "var(--brand-subtle)", color: "var(--brand)" }}>
                  High Priority
                </span>
              </div>
              <h4 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
                Complete project architecture
              </h4>
              <p className="text-xs mt-1 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                Establish core abstractions for offline-first sync and verify onboarding re-entry invariants.
              </p>
            </div>

            <div className="pt-3 border-t flex items-center justify-between text-xs" style={{ borderColor: "var(--border)" }}>
              <span style={{ color: "var(--text-muted)" }}>Due Today • 5:00 PM</span>
              <span className="font-medium" style={{ color: "var(--mint-strong)" }}>2 of 3 tasks complete</span>
            </div>
          </div>

          {/* 2. Workout Card */}
          <div
            className="p-5 rounded-xl border flex flex-col justify-between space-y-4"
            style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--mint-strong)" }}>
                  Assigned Routine
                </span>
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                  45 min • 4 Exercises
                </span>
              </div>
              <h4 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
                Full Body Compound A
              </h4>
              <div className="space-y-1.5 mt-2.5">
                {["Barbell Back Squat (3 × 5)", "Flat Barbell Bench Press (3 × 5)", "Bent-Over Row (3 × 8)"].map((ex, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs" style={{ color: "var(--text-secondary)" }}>
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "var(--brand)" }} />
                    <span>{ex}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="button"
              className="w-full py-2 rounded-[10px] text-xs font-semibold flex items-center justify-center gap-1.5"
              style={{ backgroundColor: "var(--brand)", color: "var(--brand-text)" }}
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Start Workout</span>
            </button>
          </div>

          {/* 3. Nutrition Card */}
          <div
            className="p-5 rounded-xl border flex flex-col justify-between space-y-4"
            style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                  Daily Nutrition
                </span>
                <span className="text-xs font-semibold" style={{ color: "var(--mint-strong)" }}>
                  360 kcal remaining
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold tabular-nums" style={{ color: "var(--text-primary)" }}>
                  1,840
                </span>
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>/ 2,200 kcal</span>
              </div>

              {/* Calorie Bar */}
              <div className="w-full h-2 rounded-full overflow-hidden mt-3" style={{ backgroundColor: "var(--surface-subtle)" }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: "83%", backgroundColor: "var(--brand)" }}
                />
              </div>

              {/* Macro Pills */}
              <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                <div className="p-2 rounded-lg" style={{ backgroundColor: "var(--surface-subtle)" }}>
                  <span className="text-[10px] block" style={{ color: "var(--text-muted)" }}>Protein</span>
                  <span className="text-xs font-bold" style={{ color: "var(--mint-strong)" }}>128g</span>
                </div>
                <div className="p-2 rounded-lg" style={{ backgroundColor: "var(--surface-subtle)" }}>
                  <span className="text-[10px] block" style={{ color: "var(--text-muted)" }}>Carbs</span>
                  <span className="text-xs font-bold" style={{ color: "var(--brand)" }}>195g</span>
                </div>
                <div className="p-2 rounded-lg" style={{ backgroundColor: "var(--surface-subtle)" }}>
                  <span className="text-[10px] block" style={{ color: "var(--text-muted)" }}>Fats</span>
                  <span className="text-xs font-bold" style={{ color: "var(--peach-strong)" }}>54g</span>
                </div>
              </div>
            </div>

            <div className="text-[11px] text-center" style={{ color: "var(--text-muted)" }}>
              High-protein target on track for recovery
            </div>
          </div>

          {/* 4. Progress Card */}
          <div
            className="p-5 rounded-xl border flex flex-col justify-between space-y-4"
            style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--peach-strong)" }}>
                  Consistency Streak
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ backgroundColor: "var(--peach-subtle)", color: "var(--peach-strong)" }}>
                  🔥 7 Days
                </span>
              </div>
              <h4 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
                7 Day Consistency
              </h4>
              <p className="text-xs mt-1 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                You have reached your longest continuous workout and nutrition streak this month. Adherence is at 94%.
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs font-medium" style={{ color: "var(--mint-strong)" }}>
              <TrendingUp className="w-4 h-4" />
              <span>+18% consistency vs prior week</span>
            </div>
          </div>

          {/* 5. Orbit Insight Card */}
          <div
            className="p-5 rounded-xl border flex flex-col justify-between space-y-4 md:col-span-2"
            style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "var(--brand)" }} />
                  <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--brand)" }}>
                    Orbit Insight
                  </span>
                </div>
                <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                  AI Continuity Analysis
                </span>
              </div>
              <h4 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
                Your mornings have been more consistent this week.
              </h4>
              <p className="text-sm mt-1 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                &ldquo;You are 35% more likely to hit your strength and protein goals when your first session is planned before 9:00 AM. Recommend scheduling tomorrow&apos;s Workout B for 8:15 AM.&rdquo;
              </p>
            </div>

            <div className="pt-3 border-t flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                Based on 28 tracked days
              </span>
              <button
                type="button"
                className="px-3 py-1.5 rounded-[10px] text-xs font-medium border"
                style={{
                  backgroundColor: "var(--surface-subtle)",
                  borderColor: "var(--border)",
                  color: "var(--brand)",
                }}
              >
                Schedule with Orbit
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────────────────── */}
      {/* 7. PROGRESS, BADGES & STATUS INDICATORS                                  */}
      {/* ──────────────────────────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <h3
          className="text-lg font-semibold tracking-tight"
          style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
        >
          Progress & Status Semantics
        </h3>

        <div
          className="p-5 sm:p-6 rounded-xl border space-y-6"
          style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
        >
          {/* Badges / Tags */}
          <div className="space-y-2">
            <span className="text-xs font-medium block" style={{ color: "var(--text-secondary)" }}>
              Normalized Badges (Pill Geometry)
            </span>
            <div className="flex flex-wrap gap-2">
              <span className="px-2.5 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: "var(--brand-subtle)", color: "var(--brand)" }}>
                Today
              </span>
              <span className="px-2.5 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: "var(--success-subtle)", color: "var(--success)" }}>
                Completed
              </span>
              <span className="px-2.5 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: "var(--info-subtle)", color: "var(--info)" }}>
                In Progress
              </span>
              <span className="px-2.5 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: "var(--peach-subtle)", color: "var(--peach-strong)" }}>
                Recovery
              </span>
              <span className="px-2.5 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: "var(--warning-subtle)", color: "var(--warning)" }}>
                High Priority
              </span>
              <span className="px-2.5 py-1 rounded-full text-xs font-medium border" style={{ backgroundColor: "var(--surface-subtle)", borderColor: "var(--border)", color: "var(--brand)" }}>
                Orbit Insight
              </span>
            </div>
          </div>

          {/* Status Alert Banners */}
          <div className="space-y-2.5 pt-4 border-t" style={{ borderColor: "var(--border)" }}>
            <span className="text-xs font-medium block" style={{ color: "var(--text-secondary)" }}>
              Semantic Notifications (Restrained Backgrounds)
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg border flex items-center gap-2.5" style={{ backgroundColor: "var(--success-subtle)", borderColor: "var(--success)", color: "var(--success)" }}>
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Workout logged successfully to cloud history.</span>
              </div>
              <div className="p-3 rounded-lg border flex items-center gap-2.5" style={{ backgroundColor: "var(--warning-subtle)", borderColor: "var(--warning)", color: "var(--warning)" }}>
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Protein intake is 22g below targeted baseline.</span>
              </div>
              <div className="p-3 rounded-lg border flex items-center gap-2.5" style={{ backgroundColor: "var(--error-subtle)", borderColor: "var(--error)", color: "var(--error)" }}>
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Health sync authorization expired. Tap to reconnect.</span>
              </div>
              <div className="p-3 rounded-lg border flex items-center gap-2.5" style={{ backgroundColor: "var(--info-subtle)", borderColor: "var(--info)", color: "var(--info)" }}>
                <Info className="w-4 h-4 shrink-0" />
                <span>Scheduled deload week begins in 5 days.</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────────────────── */}
      {/* 8. DATA VISUALIZATION (CLEAN, NO RAINBOW)                                */}
      {/* ──────────────────────────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <h3
          className="text-lg font-semibold tracking-tight"
          style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
        >
          Data Visualization (Restrained Metrics)
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Weekly Consistency Bar Chart */}
          <div
            className="p-5 rounded-xl border space-y-3"
            style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
          >
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                Weekly Training Volume
              </h4>
              <span className="text-xs font-medium" style={{ color: "var(--brand)" }}>
                4 of 4 Completed
              </span>
            </div>

            {/* Subtle SVG Bar Chart */}
            <div className="h-32 flex items-end justify-between gap-2 pt-4">
              {[
                { day: "Mon", h: 75, active: true },
                { day: "Tue", h: 40, active: false },
                { day: "Wed", h: 90, active: true },
                { day: "Thu", h: 30, active: false },
                { day: "Fri", h: 85, active: true },
                { day: "Sat", h: 60, active: true },
                { day: "Sun", h: 20, active: false },
              ].map((b, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                  <div
                    className="w-full rounded-sm transition-all"
                    style={{
                      height: `${b.h}%`,
                      backgroundColor: b.active ? "var(--brand)" : "var(--surface-subtle)",
                    }}
                  />
                  <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                    {b.day}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Adherence Curve Line Chart */}
          <div
            className="p-5 rounded-xl border space-y-3"
            style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
          >
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                30-Day Continuity Trend
              </h4>
              <span className="text-xs font-medium" style={{ color: "var(--mint-strong)" }}>
                +14% Adherence
              </span>
            </div>

            <div className="h-32 pt-2 flex flex-col justify-between">
              <svg className="w-full h-24 overflow-visible" viewBox="0 0 300 80" preserveAspectRatio="none">
                <path
                  d="M0,65 Q50,60 80,45 T160,35 T240,20 T300,12"
                  fill="none"
                  stroke={isNight ? "#7C93FF" : "#4263EB"}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                <circle cx="300" cy="12" r="4" fill={isNight ? "#7C93FF" : "#4263EB"} />
              </svg>
              <div className="flex items-center justify-between text-[10px]" style={{ color: "var(--text-muted)" }}>
                <span>Day 1 (Baseline)</span>
                <span>Day 15</span>
                <span>Day 30 (Current)</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────────────────── */}
      {/* 9. WORKOUT UI SHOWCASE                                                   */}
      {/* ──────────────────────────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <h3
          className="text-lg font-semibold tracking-tight"
          style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
        >
          Workout Logger & Session UI
        </h3>

        <div
          className="p-5 sm:p-6 rounded-xl border space-y-5"
          style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
        >
          <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: "var(--border)" }}>
            <div>
              <h4 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
                Barbell Back Squat
              </h4>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                Warmup complete • Working sets: 3 × 5 @ 100 kg
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono px-2 py-1 rounded border font-medium" style={{ backgroundColor: "var(--surface-subtle)", borderColor: "var(--border)", color: "var(--text-primary)" }}>
                Rest: 01:30
              </span>
            </div>
          </div>

          {/* Sets Table */}
          <div className="space-y-2">
            {[
              { set: 1, weight: "100 kg", reps: "5 reps", done: true, rpe: "@ 8.0" },
              { set: 2, weight: "100 kg", reps: "5 reps", done: true, rpe: "@ 8.0" },
              { set: 3, weight: "105 kg", reps: "5 reps", done: false, rpe: "@ 8.5" },
            ].map((s) => (
              <div
                key={s.set}
                className="flex items-center justify-between p-2.5 rounded-lg border text-sm"
                style={{
                  backgroundColor: s.done ? "var(--surface-subtle)" : "var(--surface)",
                  borderColor: "var(--border)",
                }}
              >
                <div className="flex items-center gap-3">
                  <span className="w-5 text-center font-bold text-xs" style={{ color: "var(--text-muted)" }}>
                    {s.set}
                  </span>
                  <span className="font-semibold tabular-nums" style={{ color: "var(--text-primary)" }}>
                    {s.weight}
                  </span>
                  <span style={{ color: "var(--text-secondary)" }}>{s.reps}</span>
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>{s.rpe}</span>
                </div>

                <button
                  type="button"
                  className="w-7 h-7 rounded-md border flex items-center justify-center transition-colors"
                  style={{
                    backgroundColor: s.done ? "var(--brand)" : "transparent",
                    borderColor: s.done ? "var(--brand)" : "var(--border)",
                    color: s.done ? "var(--brand-text)" : "var(--text-muted)",
                  }}
                >
                  <Check className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              className="text-xs font-medium flex items-center gap-1"
              style={{ color: "var(--brand)" }}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Set</span>
            </button>

            <button
              type="button"
              className="px-4 py-2 rounded-[10px] text-xs font-semibold"
              style={{ backgroundColor: "var(--brand)", color: "var(--brand-text)" }}
            >
              Complete Exercise
            </button>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────────────────── */}
      {/* 10. TASK & HABITS UI SHOWCASE                                            */}
      {/* ──────────────────────────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <h3
          className="text-lg font-semibold tracking-tight"
          style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
        >
          Task Management & Daily Routines
        </h3>

        <div
          className="p-5 sm:p-6 rounded-xl border space-y-4"
          style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
        >
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              Today&apos;s Action Items
            </h4>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              {tasks.filter((t) => t.done).length} of {tasks.length} Done
            </span>
          </div>

          <div className="space-y-2">
            {tasks.map((task) => (
              <div
                key={task.id}
                onClick={() => toggleTask(task.id)}
                className="flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors"
                style={{
                  backgroundColor: task.done ? "var(--surface-subtle)" : "var(--surface)",
                  borderColor: "var(--border)",
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-5 h-5 rounded border flex items-center justify-center transition-colors"
                    style={{
                      backgroundColor: task.done ? "var(--brand)" : "transparent",
                      borderColor: task.done ? "var(--brand)" : "var(--border)",
                      color: task.done ? "var(--brand-text)" : "transparent",
                    }}
                  >
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  </div>
                  <div>
                    <span
                      className={`text-sm font-medium block ${task.done ? "line-through opacity-60" : ""}`}
                      style={{ color: "var(--text-primary)" }}
                    >
                      {task.title}
                    </span>
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {task.time}
                    </span>
                  </div>
                </div>

                <span
                  className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                  style={{
                    backgroundColor: task.priority === "High" ? "var(--peach-subtle)" : "var(--surface-subtle)",
                    color: task.priority === "High" ? "var(--peach-strong)" : "var(--text-secondary)",
                  }}
                >
                  {task.priority}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────────────────── */}
      {/* 11. ORBIT AI ASSISTANT & SUGGESTIONS                                     */}
      {/* ──────────────────────────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <h3
          className="text-lg font-semibold tracking-tight"
          style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
        >
          Orbit AI Intelligence Layer
        </h3>

        <div
          className="p-5 sm:p-6 rounded-xl border space-y-5"
          style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
        >
          {/* Integrated Orbit message */}
          <div className="flex items-start gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
              style={{ backgroundColor: "var(--brand-subtle)", color: "var(--brand)" }}
            >
              <Bot className="w-4 h-4" />
            </div>
            <div className="space-y-1.5 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--brand)" }}>
                  Orbit
                </span>
                <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>Just now</span>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-primary)" }}>
                I reviewed your latest squat set logs and nutrition targets. You are recovering well from Monday&apos;s session. Would you like me to auto-populate your rest intervals based on your historical heart-rate recovery?
              </p>
            </div>
          </div>

          {/* Quick Orbit Action Chips */}
          <div className="flex flex-wrap gap-2 pt-2 border-t" style={{ borderColor: "var(--border)" }}>
            <button
              type="button"
              className="px-3 py-1.5 rounded-[10px] text-xs font-medium border transition-colors"
              style={{
                backgroundColor: "var(--brand-subtle)",
                borderColor: "var(--brand)",
                color: "var(--brand)",
              }}
            >
              Apply Auto Rest Intervals
            </button>
            <button
              type="button"
              className="px-3 py-1.5 rounded-[10px] text-xs font-medium border transition-colors"
              style={{
                backgroundColor: "var(--surface-subtle)",
                borderColor: "var(--border)",
                color: "var(--text-secondary)",
              }}
            >
              Summarize Macro Deficit
            </button>
          </div>

          {/* AI Subtle Loading State */}
          <div
            className="p-3 rounded-lg border flex items-center gap-2.5 text-xs"
            style={{ backgroundColor: "var(--surface-subtle)", borderColor: "var(--border)", color: "var(--text-secondary)" }}
          >
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: "var(--brand)" }} />
            <span>Orbit is analyzing weekly recovery momentum...</span>
          </div>
        </div>
      </section>
    </div>
  );
}

