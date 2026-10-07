"use client";

import React, { useState } from "react";
import {
  LayoutDashboard,
  Calendar,
  PlusCircle,
  Sparkles,
  User,
  Check,
  ChevronRight,
  Flame,
  ArrowRight,
  Play,
  RotateCcw,
  Utensils,
  Dumbbell,
  CheckSquare,
  Scale,
  Clock,
  TrendingUp,
  X,
  Plus,
  Shield,
  Bell,
  Sliders,
  Moon,
  Sun,
  Activity,
  Bot,
} from "lucide-react";

export type ScreenId =
  | "home"
  | "plan"
  | "track"
  | "workout"
  | "nutrition"
  | "orbit"
  | "progress"
  | "profile";

interface MobileProductExperienceProps {
  themeMode: "night" | "day";
  activeScreen?: ScreenId;
  onScreenChange?: (screen: ScreenId) => void;
  isStandaloneScreen?: boolean;
  forcedScreen?: ScreenId;
}

export function MobileProductExperience({
  themeMode,
  activeScreen: controlledScreen,
  onScreenChange,
  isStandaloneScreen = false,
  forcedScreen,
}: MobileProductExperienceProps) {
  const [internalScreen, setInternalScreen] = useState<ScreenId>("home");
  const [showTrackSheet, setShowTrackSheet] = useState(false);
  const [trackSheetTab, setTrackSheetTab] = useState<"meal" | "workout" | "task" | "weight" | "habit">("meal");

  // Interactive task state
  const [todayTasks, setTodayTasks] = useState([
    { id: 1, title: "Finish API architecture", time: "5:30 PM", done: false, priority: "High" },
    { id: 2, title: "Full Body Compound A", time: "7:00 PM", done: false, priority: "Routine" },
    { id: 3, title: "Hit protein target (150g)", time: "Today", done: false, priority: "Nutrition" },
  ]);

  // Interactive workout sets state
  const [squatSets, setSquatSets] = useState([
    { set: 1, weight: 100, reps: 5, done: true },
    { set: 2, weight: 100, reps: 5, done: true },
    { set: 3, weight: 105, reps: 5, done: false },
  ]);

  const [activePlanDay, setActivePlanDay] = useState("Tue 7");

  const currentScreen = forcedScreen || controlledScreen || internalScreen;

  const navigateTo = (screen: ScreenId) => {
    if (onScreenChange) {
      onScreenChange(screen);
    } else {
      setInternalScreen(screen);
    }
  };

  const toggleTask = (id: number) => {
    setTodayTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
    );
  };

  const toggleSquatSet = (setNum: number) => {
    setSquatSets((prev) =>
      prev.map((s) => (s.set === setNum ? { ...s, done: !s.done } : s))
    );
  };

  const isNight = themeMode === "night";
  const themeClass = isNight ? "satat-theme-night" : "satat-theme-day";

  return (
    <div
      className={`${themeClass} relative flex flex-col justify-between w-full max-w-[390px] h-[844px] rounded-[48px] overflow-hidden border transition-all duration-200 select-none`}
      style={{
        backgroundColor: "var(--background)",
        color: "var(--text-primary)",
        borderColor: "var(--border)",
        boxShadow: isNight ? "0 24px 64px -12px rgba(0,0,0,0.85)" : "0 24px 48px -12px rgba(0,0,0,0.12)",
      }}
    >
      {/* ── Dynamic Island / Native Top Status Bar ── */}
      <div className="relative w-full pt-3 px-7 flex items-center justify-between text-[13px] font-semibold tracking-tight z-30" style={{ color: "var(--text-primary)" }}>
        <span>9:41</span>
        <div className="w-28 h-6 rounded-full bg-black/80 mx-auto -mt-1 flex items-center justify-center">
          <div className="w-2.5 h-2.5 rounded-full bg-zinc-900 ml-auto mr-3 border border-zinc-800" />
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <span>5G</span>
          <div className="w-5 h-2.5 rounded-sm border border-current p-0.5 flex items-center">
            <div className="h-full w-full bg-current rounded-2xs" />
          </div>
        </div>
      </div>

      {/* ── Main Scrollable Viewport ── */}
      <div className="flex-1 overflow-y-auto px-5 pt-3 pb-24 scrollbar-none space-y-6">
        {/* ========================================================================= */}
        {/* 1. SCREEN: HOME (DAILY COMMAND CENTER)                                    */}
        {/* ========================================================================= */}
        {currentScreen === "home" && (
          <div className="space-y-6 animate-fade-in">
            {/* Header: Clean, quiet, personal */}
            <div className="flex items-start justify-between pt-2">
              <div>
                <span className="text-[11px] font-semibold tracking-wider uppercase" style={{ color: "var(--text-muted)" }}>
                  Good morning
                </span>
                <h1 className="text-2xl font-semibold tracking-tight mt-0.5" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
                  Ayush
                </h1>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                  Tuesday, October 7
                </p>
              </div>

              <button
                type="button"
                onClick={() => navigateTo("profile")}
                className="w-9 h-9 rounded-full flex items-center justify-center border transition-colors mt-1"
                style={{
                  backgroundColor: "var(--surface)",
                  borderColor: "var(--border)",
                  color: "var(--text-secondary)",
                }}
              >
                <User className="w-4 h-4" />
              </button>
            </div>

            {/* Orbit Proactive Contextual Brief — Quiet intelligence, not a chatbot */}
            <div
              className="p-4 rounded-xl border transition-colors"
              style={{
                backgroundColor: "var(--surface)",
                borderColor: "var(--border-subtle)",
              }}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "var(--brand)" }} />
                <span className="text-[11px] font-semibold tracking-wider uppercase" style={{ color: "var(--brand)" }}>
                  Orbit Daily Context
                </span>
              </div>
              <p className="text-[13px] leading-relaxed" style={{ color: "var(--text-primary)" }}>
                &ldquo;You usually train with 18% higher intensity when you start before 8 PM. Shall I lock in Full Body A for 7:00 PM?&rdquo;
              </p>
              <div className="mt-2.5 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => navigateTo("plan")}
                  className="text-xs font-semibold hover:underline flex items-center gap-1"
                  style={{ color: "var(--brand)" }}
                >
                  <span>Adjust my day</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* TODAY: Actions as clean rows, not cards */}
            <div className="space-y-2">
              <div className="flex items-center justify-between pb-1">
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                  Today
                </span>
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {todayTasks.filter((t) => t.done).length} of {todayTasks.length} Done
                </span>
              </div>

              <div
                className="rounded-xl border divide-y overflow-hidden"
                style={{
                  backgroundColor: "var(--surface)",
                  borderColor: "var(--border-subtle)",
                }}
              >
                {todayTasks.map((task) => (
                  <div
                    key={task.id}
                    onClick={() => toggleTask(task.id)}
                    className="flex items-center justify-between p-3.5 cursor-pointer transition-colors active:bg-[var(--surface-elevated)]"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded-full border flex items-center justify-center transition-colors"
                        style={{
                          backgroundColor: task.done ? "var(--brand)" : "transparent",
                          borderColor: task.done ? "var(--brand)" : "var(--border)",
                          color: task.done ? "var(--brand-text)" : "transparent",
                        }}
                      >
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                      <span
                        className={`text-[13.5px] font-medium leading-tight ${
                          task.done ? "line-through opacity-40" : ""
                        }`}
                        style={{ color: "var(--text-primary)" }}
                      >
                        {task.title}
                      </span>
                    </div>

                    <span className="text-xs font-medium tabular-nums" style={{ color: "var(--text-secondary)" }}>
                      {task.time}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* YOUR DAY: High-level metric anchors */}
            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider block" style={{ color: "var(--text-muted)" }}>
                Your Day Overview
              </span>

              <div
                className="grid grid-cols-3 gap-2.5 p-3.5 rounded-xl border"
                style={{
                  backgroundColor: "var(--surface)",
                  borderColor: "var(--border-subtle)",
                }}
              >
                <div
                  className="cursor-pointer"
                  onClick={() => navigateTo("plan")}
                >
                  <span className="text-[11px] block" style={{ color: "var(--text-muted)" }}>Tasks</span>
                  <span className="text-lg font-semibold tabular-nums mt-0.5 block" style={{ color: "var(--text-primary)" }}>
                    3 pending
                  </span>
                </div>

                <div
                  className="cursor-pointer"
                  onClick={() => navigateTo("workout")}
                >
                  <span className="text-[11px] block" style={{ color: "var(--text-muted)" }}>Workout</span>
                  <span className="text-lg font-semibold tabular-nums mt-0.5 block" style={{ color: "var(--brand)" }}>
                    7:00 PM
                  </span>
                </div>

                <div
                  className="cursor-pointer"
                  onClick={() => navigateTo("nutrition")}
                >
                  <span className="text-[11px] block" style={{ color: "var(--text-muted)" }}>Nutrition</span>
                  <span className="text-lg font-semibold tabular-nums mt-0.5 block" style={{ color: "var(--mint)" }}>
                    1,840 kcal
                  </span>
                </div>
              </div>
            </div>

            {/* CONTINUITY: Quiet 7-day momentum rhythm */}
            <div
              className="p-3.5 rounded-xl border flex items-center justify-between"
              style={{
                backgroundColor: "var(--surface)",
                borderColor: "var(--border-subtle)",
              }}
            >
              <div>
                <span className="text-xs font-semibold block" style={{ color: "var(--text-primary)" }}>
                  Continuous Streak: 7 Days
                </span>
                <span className="text-[11px] block mt-0.5" style={{ color: "var(--text-secondary)" }}>
                  100% adherence to weekly targets
                </span>
              </div>
              <button
                type="button"
                onClick={() => navigateTo("progress")}
                className="text-xs font-semibold flex items-center gap-1"
                style={{ color: "var(--brand)" }}
              >
                <span>View</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 2. SCREEN: PLAN (DAILY & WEEKLY ROADMAP)                                   */}
        {/* ========================================================================= */}
        {currentScreen === "plan" && (
          <div className="space-y-5 animate-fade-in">
            <div>
              <span className="text-[11px] font-semibold tracking-wider uppercase" style={{ color: "var(--text-muted)" }}>
                Roadmap &amp; Schedule
              </span>
              <h1 className="text-2xl font-semibold tracking-tight mt-0.5" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
                Plan
              </h1>
            </div>

            {/* Date Switcher Strip */}
            <div className="flex items-center justify-between gap-1 overflow-x-auto pb-1 scrollbar-none">
              {[
                { day: "Mon", date: "6" },
                { day: "Tue", date: "7", active: true },
                { day: "Wed", date: "8" },
                { day: "Thu", date: "9" },
                { day: "Fri", date: "10" },
                { day: "Sat", date: "11" },
                { day: "Sun", date: "12" },
              ].map((d) => (
                <button
                  key={d.date}
                  type="button"
                  onClick={() => setActivePlanDay(`${d.day} ${d.date}`)}
                  className="flex-1 py-2 px-1 rounded-lg text-center transition-colors"
                  style={{
                    backgroundColor: d.active ? "var(--brand-subtle)" : "var(--surface)",
                    borderColor: d.active ? "var(--brand)" : "transparent",
                    color: d.active ? "var(--brand)" : "var(--text-secondary)",
                  }}
                >
                  <span className="text-[10px] block font-semibold">{d.day}</span>
                  <span className="text-sm block font-bold mt-0.5">{d.date}</span>
                </button>
              ))}
            </div>

            {/* Time-Blocked Flow */}
            <div className="space-y-2 pt-2">
              <span className="text-xs font-semibold uppercase tracking-wider block" style={{ color: "var(--text-muted)" }}>
                Tuesday Timeline
              </span>

              <div
                className="rounded-xl border divide-y overflow-hidden"
                style={{
                  backgroundColor: "var(--surface)",
                  borderColor: "var(--border-subtle)",
                }}
              >
                {[
                  { time: "08:30 AM", title: "Morning hydration & mobility", tag: "Routine", done: true },
                  { time: "01:00 PM", title: "High-protein lunch (680 kcal)", tag: "Nutrition", done: true },
                  { time: "05:30 PM", title: "Finish API architecture", tag: "Task", done: false },
                  { time: "07:00 PM", title: "Full Body Compound A (45 min)", tag: "Workout", done: false, highlight: true },
                  { time: "09:00 PM", title: "Evening nutrition check-in", tag: "Nutrition", done: false },
                ].map((item, idx) => (
                  <div key={idx} className="p-3.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <span className="font-mono tabular-nums font-medium" style={{ color: item.highlight ? "var(--brand)" : "var(--text-muted)" }}>
                        {item.time}
                      </span>
                      <div>
                        <span className={`font-medium block text-[13px] ${item.done ? "line-through opacity-40" : ""}`} style={{ color: "var(--text-primary)" }}>
                          {item.title}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ backgroundColor: "var(--surface-elevated)", color: "var(--text-muted)" }}>
                      {item.tag}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="button"
              className="w-full py-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              style={{
                backgroundColor: "var(--surface)",
                borderColor: "var(--border)",
                color: "var(--text-primary)",
              }}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Plan Item</span>
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 3. SCREEN: TRACK (FAST CAPTURE CENTER)                                   */}
        {/* ========================================================================= */}
        {currentScreen === "track" && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <span className="text-[11px] font-semibold tracking-wider uppercase" style={{ color: "var(--text-muted)" }}>
                Fast Capture
              </span>
              <h1 className="text-2xl font-semibold tracking-tight mt-0.5" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
                Track
              </h1>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                Log daily events in seconds.
              </p>
            </div>

            {/* Quick Logging Action Rows */}
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { label: "+ Meal", icon: Utensils, desc: "AI estimate / photo / text", action: () => navigateTo("nutrition") },
                { label: "+ Workout", icon: Dumbbell, desc: "Start active routine", action: () => navigateTo("workout") },
                { label: "+ Task", icon: CheckSquare, desc: "Capture daily action", action: () => navigateTo("home") },
                { label: "+ Weight", icon: Scale, desc: "Morning 82.4 kg check", action: () => {} },
              ].map((btn, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={btn.action}
                  className="p-4 rounded-xl border text-left flex flex-col justify-between h-28 transition-colors active:scale-[0.98]"
                  style={{
                    backgroundColor: "var(--surface)",
                    borderColor: "var(--border)",
                  }}
                >
                  <btn.icon className="w-4 h-4" style={{ color: "var(--brand)" }} />
                  <div>
                    <span className="text-sm font-semibold block" style={{ color: "var(--text-primary)" }}>
                      {btn.label}
                    </span>
                    <span className="text-[10px] block mt-0.5 truncate" style={{ color: "var(--text-muted)" }}>
                      {btn.desc}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            {/* Rapid Recent History */}
            <div className="space-y-2 pt-2">
              <span className="text-xs font-semibold uppercase tracking-wider block" style={{ color: "var(--text-muted)" }}>
                Recently Logged Today
              </span>

              <div
                className="rounded-xl border divide-y overflow-hidden text-xs"
                style={{
                  backgroundColor: "var(--surface)",
                  borderColor: "var(--border-subtle)",
                }}
              >
                <div className="p-3 flex items-center justify-between">
                  <div>
                    <span className="font-medium block text-[13px]" style={{ color: "var(--text-primary)" }}>
                      Oatmeal with Berries &amp; Whey
                    </span>
                    <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                      Breakfast • 520 kcal • 38g Protein
                    </span>
                  </div>
                  <span className="font-mono text-[11px]" style={{ color: "var(--text-secondary)" }}>8:45 AM</span>
                </div>

                <div className="p-3 flex items-center justify-between">
                  <div>
                    <span className="font-medium block text-[13px]" style={{ color: "var(--text-primary)" }}>
                      Hydration Baseline
                    </span>
                    <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                      500 ml cold water
                    </span>
                  </div>
                  <span className="font-mono text-[11px]" style={{ color: "var(--text-secondary)" }}>8:30 AM</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 4. SCREEN: WORKOUT (FOCUSED ACTIVE SESSION)                                */}
        {/* ========================================================================= */}
        {currentScreen === "workout" && (
          <div className="space-y-5 animate-fade-in">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-semibold tracking-wider uppercase" style={{ color: "var(--text-muted)" }}>
                  Active Training Session
                </span>
                <h1 className="text-xl font-semibold tracking-tight mt-0.5" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
                  Full Body Compound A
                </h1>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                  45 min • 5 exercises • Hypertrophy
                </p>
              </div>

              <div className="text-right">
                <span className="text-[11px] font-mono block" style={{ color: "var(--text-muted)" }}>Rest Timer</span>
                <span className="text-sm font-mono font-bold" style={{ color: "var(--brand)" }}>01:30</span>
              </div>
            </div>

            {/* Active Exercise: Barbell Back Squat */}
            <div
              className="p-4 rounded-xl border space-y-3"
              style={{
                backgroundColor: "var(--surface)",
                borderColor: "var(--border)",
              }}
            >
              <div className="flex items-center justify-between border-b pb-2.5" style={{ borderColor: "var(--border-subtle)" }}>
                <span className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
                  1. Barbell Back Squat
                </span>
                <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
                  Target: 3 × 5 @ 100 kg
                </span>
              </div>

              {/* Set logging rows — thumb friendly touch targets */}
              <div className="space-y-2">
                {squatSets.map((s) => (
                  <div
                    key={s.set}
                    onClick={() => toggleSquatSet(s.set)}
                    className="flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition-colors active:bg-[var(--surface-elevated)]"
                    style={{
                      backgroundColor: s.done ? "var(--surface-elevated)" : "transparent",
                      borderColor: "var(--border-subtle)",
                    }}
                  >
                    <div className="flex items-center gap-3 text-xs">
                      <span className="font-mono font-bold w-4 text-center" style={{ color: "var(--text-muted)" }}>
                        {s.set}
                      </span>
                      <span className="font-semibold text-sm tabular-nums" style={{ color: "var(--text-primary)" }}>
                        {s.weight} kg
                      </span>
                      <span style={{ color: "var(--text-secondary)" }}>× {s.reps} reps</span>
                    </div>

                    <button
                      type="button"
                      className="w-7 h-7 rounded-md border flex items-center justify-center transition-colors"
                      style={{
                        backgroundColor: s.done ? "var(--brand)" : "transparent",
                        borderColor: s.done ? "var(--brand)" : "var(--border)",
                        color: s.done ? "var(--brand-text)" : "transparent",
                      }}
                    >
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Upcoming Exercises Sequence */}
            <div className="space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider block" style={{ color: "var(--text-muted)" }}>
                Remaining Exercises
              </span>

              <div
                className="rounded-xl border divide-y overflow-hidden text-xs"
                style={{
                  backgroundColor: "var(--surface)",
                  borderColor: "var(--border-subtle)",
                }}
              >
                {["2. Flat Barbell Bench Press", "3. Bent-Over Barbell Row", "4. Romanian Deadlift (RDL)", "5. Standing Overhead Press"].map((name, i) => (
                  <div key={i} className="p-3 flex items-center justify-between" style={{ color: "var(--text-secondary)" }}>
                    <span>{name}</span>
                    <span className="font-mono text-[11px]" style={{ color: "var(--text-muted)" }}>3 × 8</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Complete Workout Primary Action */}
            <button
              type="button"
              className="w-full py-3 rounded-xl text-xs font-semibold transition-colors mt-2"
              style={{
                backgroundColor: "var(--brand)",
                color: "var(--brand-text)",
              }}
            >
              Finish Workout
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 5. SCREEN: NUTRITION (CLEAN INTAKE VIEW)                                   */}
        {/* ========================================================================= */}
        {currentScreen === "nutrition" && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <span className="text-[11px] font-semibold tracking-wider uppercase" style={{ color: "var(--text-muted)" }}>
                Daily Intake
              </span>
              <h1 className="text-2xl font-semibold tracking-tight mt-0.5" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
                Nutrition
              </h1>
            </div>

            {/* Calorie Progress Line — Not a rainbow dashboard */}
            <div
              className="p-4 rounded-xl border space-y-3"
              style={{
                backgroundColor: "var(--surface)",
                borderColor: "var(--border)",
              }}
            >
              <div className="flex items-baseline justify-between">
                <div>
                  <span className="text-2xl font-semibold tabular-nums" style={{ color: "var(--text-primary)" }}>
                    1,840
                  </span>
                  <span className="text-xs ml-1" style={{ color: "var(--text-muted)" }}>/ 2,200 kcal</span>
                </div>
                <span className="text-xs font-medium" style={{ color: "var(--mint)" }}>
                  360 kcal remaining
                </span>
              </div>

              {/* Single clean bar */}
              <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "var(--surface-elevated)" }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: "83%", backgroundColor: "var(--brand)" }}
                />
              </div>

              {/* Macro rows */}
              <div className="pt-2 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "var(--mint)" }} />
                    <span style={{ color: "var(--text-secondary)" }}>Protein</span>
                  </div>
                  <span className="font-semibold tabular-nums" style={{ color: "var(--text-primary)" }}>
                    128 / 150g (85%)
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "var(--text-muted)" }} />
                    <span style={{ color: "var(--text-secondary)" }}>Carbohydrates</span>
                  </div>
                  <span className="font-semibold tabular-nums" style={{ color: "var(--text-primary)" }}>
                    190 / 250g (76%)
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "var(--peach)" }} />
                    <span style={{ color: "var(--text-secondary)" }}>Fats</span>
                  </div>
                  <span className="font-semibold tabular-nums" style={{ color: "var(--text-primary)" }}>
                    54 / 70g (77%)
                  </span>
                </div>
              </div>
            </div>

            {/* Meals Logged */}
            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider block" style={{ color: "var(--text-muted)" }}>
                Meals Today
              </span>

              <div
                className="rounded-xl border divide-y overflow-hidden text-xs"
                style={{
                  backgroundColor: "var(--surface)",
                  borderColor: "var(--border-subtle)",
                }}
              >
                {[
                  { meal: "Breakfast", title: "Oatmeal with Berries & Whey", cals: "520 kcal", p: "38g P" },
                  { meal: "Lunch", title: "Grilled Chicken, Quinoa & Avocado", cals: "680 kcal", p: "54g P" },
                  { meal: "Snack", title: "Greek Yogurt with Walnuts", cals: "240 kcal", p: "20g P" },
                ].map((m, i) => (
                  <div key={i} className="p-3.5 flex items-center justify-between">
                    <div>
                      <span className="font-medium text-[13px] block" style={{ color: "var(--text-primary)" }}>
                        {m.title}
                      </span>
                      <span className="text-[11px] block mt-0.5" style={{ color: "var(--text-muted)" }}>
                        {m.meal} • {m.cals} • {m.p}
                      </span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 6. SCREEN: ORBIT (EMBEDDED INTELLIGENCE LAYER)                            */}
        {/* ========================================================================= */}
        {currentScreen === "orbit" && (
          <div className="space-y-5 animate-fade-in">
            <div>
              <span className="text-[11px] font-semibold tracking-wider uppercase" style={{ color: "var(--brand)" }}>
                AI Companion
              </span>
              <h1 className="text-2xl font-semibold tracking-tight mt-0.5" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
                Orbit
              </h1>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                Continuous intelligence embedded in your routine.
              </p>
            </div>

            {/* Proactive Rebalance Card */}
            <div
              className="p-4 rounded-xl border space-y-3"
              style={{
                backgroundColor: "var(--surface)",
                borderColor: "var(--border)",
              }}
            >
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "var(--brand)" }} />
                <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
                  Schedule Rebalance Recommendation
                </span>
              </div>
              <p className="text-[13px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                &ldquo;You are currently running 45 minutes behind schedule today. Would you like me to shorten your compound rest timer and shift dinner to 8:30 PM to preserve your bedtime?&rdquo;
              </p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold"
                  style={{ backgroundColor: "var(--brand)", color: "var(--brand-text)" }}
                >
                  Rebalance Routine
                </button>
                <button
                  type="button"
                  className="px-3 py-1.5 rounded-lg border text-xs font-medium"
                  style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
                >
                  Keep Original
                </button>
              </div>
            </div>

            {/* Habit Momentum Observation */}
            <div
              className="p-4 rounded-xl border space-y-2"
              style={{
                backgroundColor: "var(--surface)",
                borderColor: "var(--border-subtle)",
              }}
            >
              <span className="text-xs font-semibold block" style={{ color: "var(--text-primary)" }}>
                Weekly Pattern Observation
              </span>
              <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                Your training adherence is 40% higher on Tuesdays and Thursdays when protein intake exceeds 40g before noon.
              </p>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 7. SCREEN: PROGRESS (QUIET, MEANINGFUL CONSISTENCY)                        */}
        {/* ========================================================================= */}
        {currentScreen === "progress" && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <span className="text-[11px] font-semibold tracking-wider uppercase" style={{ color: "var(--text-muted)" }}>
                Weekly Review
              </span>
              <h1 className="text-2xl font-semibold tracking-tight mt-0.5" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
                Progress
              </h1>
            </div>

            {/* Big quiet number */}
            <div
              className="p-5 rounded-xl border space-y-2"
              style={{
                backgroundColor: "var(--surface)",
                borderColor: "var(--border)",
              }}
            >
              <span className="text-xs font-semibold uppercase tracking-wider block" style={{ color: "var(--text-muted)" }}>
                Overall Consistency
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold tabular-nums" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
                  78%
                </span>
                <span className="text-xs font-semibold" style={{ color: "var(--mint)" }}>
                  ↑ 12% from last week
                </span>
              </div>
              <p className="text-xs pt-1" style={{ color: "var(--text-secondary)" }}>
                3 core operational areas improving continuously.
              </p>
            </div>

            {/* 3 Areas Improving */}
            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider block" style={{ color: "var(--text-muted)" }}>
                Key Improvement Vectors
              </span>

              <div
                className="rounded-xl border divide-y overflow-hidden text-xs"
                style={{
                  backgroundColor: "var(--surface)",
                  borderColor: "var(--border-subtle)",
                }}
              >
                <div className="p-3.5 flex items-center justify-between">
                  <div>
                    <span className="font-semibold block text-[13px]" style={{ color: "var(--text-primary)" }}>
                      Strength Load Progression
                    </span>
                    <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>+2.5 kg on compound lifts</span>
                  </div>
                  <span className="font-semibold" style={{ color: "var(--mint)" }}>+4%</span>
                </div>

                <div className="p-3.5 flex items-center justify-between">
                  <div>
                    <span className="font-semibold block text-[13px]" style={{ color: "var(--text-primary)" }}>
                      Protein Target Adherence
                    </span>
                    <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>6 of 7 days completed</span>
                  </div>
                  <span className="font-semibold" style={{ color: "var(--mint)" }}>85%</span>
                </div>

                <div className="p-3.5 flex items-center justify-between">
                  <div>
                    <span className="font-semibold block text-[13px]" style={{ color: "var(--text-primary)" }}>
                      Sleep Recovery Quality
                    </span>
                    <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>7.4 hours nightly average</span>
                  </div>
                  <span className="font-semibold" style={{ color: "var(--mint)" }}>On Track</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 8. SCREEN: YOU / PROFILE (SETTINGS & SYSTEM CONTROLS)                      */}
        {/* ========================================================================= */}
        {currentScreen === "profile" && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex items-center gap-3 pt-1">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-base border"
                style={{
                  backgroundColor: "var(--surface-elevated)",
                  borderColor: "var(--border)",
                  color: "var(--brand)",
                }}
              >
                AY
              </div>
              <div>
                <h1 className="text-lg font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>
                  Ayush Sharma
                </h1>
                <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                  ayush@dailyos.internal
                </p>
              </div>
            </div>

            {/* Settings Rows */}
            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider block" style={{ color: "var(--text-muted)" }}>
                Personal Preferences
              </span>

              <div
                className="rounded-xl border divide-y overflow-hidden text-xs"
                style={{
                  backgroundColor: "var(--surface)",
                  borderColor: "var(--border-subtle)",
                }}
              >
                {[
                  { label: "Training Goals", val: "Hypertrophy (4 days/week)" },
                  { label: "Nutrition Targets", val: "2,200 kcal • 150g protein" },
                  { label: "Health Sync", val: "Apple Health Active" },
                  { label: "Daily Briefing", val: "8:00 AM Prompt" },
                  { label: "Appearance", val: isNight ? "SATAT Night (Primary)" : "SATAT Day" },
                  { label: "Privacy & Data", val: "Local First" },
                ].map((row, i) => (
                  <div key={i} className="p-3.5 flex items-center justify-between cursor-pointer transition-colors active:bg-[var(--surface-elevated)]">
                    <span className="font-medium text-[13px]" style={{ color: "var(--text-primary)" }}>
                      {row.label}
                    </span>
                    <div className="flex items-center gap-1.5" style={{ color: "var(--text-secondary)" }}>
                      <span>{row.val}</span>
                      <ChevronRight className="w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Native Mobile Bottom Navigation (5 Items) ── */}
      <div
        className="absolute bottom-0 left-0 right-0 h-20 px-4 border-t backdrop-blur-md flex items-center justify-around z-30 transition-colors"
        style={{
          backgroundColor: isNight ? "rgba(13, 15, 17, 0.92)" : "rgba(255, 255, 255, 0.92)",
          borderColor: "var(--border-subtle)",
        }}
      >
        {[
          { id: "home", label: "Home", icon: LayoutDashboard },
          { id: "plan", label: "Plan", icon: Calendar },
          { id: "track", label: "Track", icon: PlusCircle, isPrimaryAction: true },
          { id: "orbit", label: "Orbit", icon: Sparkles },
          { id: "profile", label: "You", icon: User },
        ].map((tab) => {
          const isActive = currentScreen === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => navigateTo(tab.id as ScreenId)}
              className="flex flex-col items-center justify-center py-1 px-3 rounded-lg transition-transform active:scale-95"
              style={{
                color: isActive ? "var(--brand)" : "var(--text-muted)",
              }}
            >
              <tab.icon className={`w-5 h-5 ${tab.isPrimaryAction ? "stroke-[2.2]" : "stroke-[1.8]"}`} />
              <span className={`text-[10px] mt-1 font-medium ${isActive ? "font-bold" : ""}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Native Home Indicator ── */}
      <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-36 h-1 rounded-full bg-white/20 pointer-events-none z-40" />
    </div>
  );
}
