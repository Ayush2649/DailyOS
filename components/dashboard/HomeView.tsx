"use client";

import { useEffect, useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  Dumbbell, Utensils, CheckSquare, Sparkles, ChevronRight,
  Flame, Check, ArrowRight, Scale, Clock, AlertCircle, Plus,
  TrendingUp, Calendar
} from "lucide-react";
import {
  getAllTasks, getMeals, getMacroGoals,
  getWorkoutSessions, getBodyWeightEntries, getAllMeals, getUserProfile,
  updateTask,
} from "@/lib/firestore";
import ActivityHeatmap from "@/components/dashboard/ActivityHeatmap";
import { todayString, localDateString } from "@/lib/utils";
import type { Task, MealEntry, MacroGoals, WorkoutSession, BodyWeightEntry, UserProfileDocument } from "@/types";

/* ── Date Helpers ── */
function getGreeting(name: string) {
  const h = new Date().getHours();
  if (h < 5) return `Working late, ${name}`;
  if (h < 12) return `Good morning, ${name}`;
  if (h < 17) return `Good afternoon, ${name}`;
  if (h < 21) return `Good evening, ${name}`;
  return `Good night, ${name}`;
}

function formatCurrentDate() {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function getPrevDay(ds: string): string {
  const [y, m, d] = ds.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() - 1);
  return localDateString(dt);
}

function getCurrentWeekDates(refDate: Date = new Date()) {
  const dow = (refDate.getDay() + 6) % 7; // ISO Mon=0..Sun=6
  const monday = new Date(refDate);
  monday.setDate(refDate.getDate() - dow);

  const dates: string[] = [];
  const dayLabels = ["M", "T", "W", "T", "F", "S", "S"];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(localDateString(d));
  }
  return { dates, dayLabels, todayIndex: dow };
}

export default function HomeView() {
  const { data: session } = useSession();
  const userId = (session?.user as any)?.id as string | undefined;
  const firstName = session?.user?.name?.split(" ")[0] ?? "there";

  const [meals, setMeals] = useState<MealEntry[]>([]);
  const [goals, setGoals] = useState<MacroGoals | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [weights, setWeights] = useState<BodyWeightEntry[]>([]);
  const [allMeals, setAllMeals] = useState<MealEntry[]>([]);
  const [profile, setProfile] = useState<UserProfileDocument | null>(null);
  const [loading, setLoading] = useState(true);

  // Load production data
  useEffect(() => {
    if (!userId) return;
    const today = todayString();
    Promise.all([
      getMeals(userId, today),
      getMacroGoals(userId),
      getAllTasks(userId),
      getWorkoutSessions(userId),
      getBodyWeightEntries(userId),
      getAllMeals(userId),
      getUserProfile(userId),
    ])
      .then(([m, g, t, s, w, am, p]) => {
        setMeals(m);
        setGoals(g);
        setTasks(t);
        setSessions(s);
        setWeights(w);
        setAllMeals(am);
        setProfile(p);
      })
      .finally(() => setLoading(false));
  }, [userId]);

  // Derived metrics for Today
  const today = todayString();
  const yesterday = getPrevDay(today);

  const todaySession = sessions.find((s) => s.date === today);
  const yesterdaySession = sessions.find((s) => s.date === yesterday);

  const todayTasks = tasks.filter((t) => !t.dueDate || t.dueDate === today || (t.dueDate < today && t.status === "pending"));
  const completedTodayTasks = todayTasks.filter((t) => t.status === "completed");
  const pendingTasks = todayTasks.filter((t) => t.status === "pending");

  const yesterdayCompletedTasksCount = tasks.filter((t) => {
    if (!t.completedAt) return false;
    return localDateString(new Date(t.completedAt)) === yesterday;
  }).length;

  const totals = useMemo(() => {
    return meals.reduce(
      (acc, m) => ({
        cal: acc.cal + (m.macros?.calories || 0),
        p: acc.p + (m.macros?.proteinG || 0),
        c: acc.c + (m.macros?.carbsG || 0),
        f: acc.f + (m.macros?.fatG || 0),
      }),
      { cal: 0, p: 0, c: 0, f: 0 }
    );
  }, [meals]);

  const yesterdayTotals = useMemo(() => {
    const yMeals = allMeals.filter((m) => m.date === yesterday);
    return yMeals.reduce(
      (acc, m) => ({
        cal: acc.cal + (m.macros?.calories || 0),
        p: acc.p + (m.macros?.proteinG || 0),
      }),
      { cal: 0, p: 0 }
    );
  }, [allMeals, yesterday]);

  const calorieGoal = goals?.calories ?? 2200;
  const proteinGoal = goals?.proteinG ?? 150;
  const caloriePct = Math.min(100, Math.round((totals.cal / Math.max(calorieGoal, 1)) * 100));
  const caloriesRemaining = Math.max(0, Math.round(calorieGoal - totals.cal));
  const proteinRemaining = Math.max(0, Math.round(proteinGoal - totals.p));

  // Weight check-in
  const latestWeight = weights.length > 0 ? weights[0].weightKg : null;
  const prevWeight = weights.length > 1 ? weights[1].weightKg : null;
  const weightDelta = latestWeight && prevWeight ? (latestWeight - prevWeight).toFixed(1) : null;

  // Active dates lookup set
  const activeDatesSet = useMemo(() => {
    const set = new Set<string>();
    sessions.forEach((s) => set.add(s.date));
    tasks.forEach((t) => {
      if (t.status === "completed" && t.completedAt) {
        set.add(localDateString(new Date(t.completedAt)));
      }
    });
    allMeals.forEach((m) => set.add(m.date));
    return set;
  }, [sessions, tasks, allMeals]);

  // Overall Day Progress (Honest, Real Data)
  const dayProgressPct = useMemo(() => {
    const pillars: number[] = [];
    // 1. Tasks pillar
    if (todayTasks.length > 0) {
      pillars.push(completedTodayTasks.length / todayTasks.length);
    }
    // 2. Training pillar
    pillars.push(todaySession ? 1 : 0);
    // 3. Nutrition pillar
    if (calorieGoal > 0) {
      pillars.push(Math.min(totals.cal / calorieGoal, 1));
    }
    if (pillars.length === 0) return 0;
    return Math.round((pillars.reduce((a, b) => a + b, 0) / pillars.length) * 100);
  }, [todayTasks.length, completedTodayTasks.length, todaySession, totals.cal, calorieGoal]);

  // Weekly Trend & Consistency
  const { weekDays, weeklyConsistencyPct, weeklyDeltaText } = useMemo(() => {
    const { dates, dayLabels, todayIndex } = getCurrentWeekDates();
    const elapsedDays = todayIndex + 1;

    let activeThisWeek = 0;
    const days = dates.map((dStr, idx) => {
      const isPast = dStr < today;
      const isToday = dStr === today;
      const isFuture = dStr > today;
      const isActive = activeDatesSet.has(dStr);
      if (idx <= todayIndex && isActive) activeThisWeek++;

      const dayNum = parseInt(dStr.split("-")[2], 10);
      return {
        dateStr: dStr,
        label: dayLabels[idx],
        dayNum,
        isPast,
        isToday,
        isFuture,
        isActive,
      };
    });

    const consistencyPct = elapsedDays > 0 ? Math.round((activeThisWeek / elapsedDays) * 100) : 0;

    // Previous week comparison (same Mon..elapsed period)
    const prevWeekMonday = new Date();
    prevWeekMonday.setDate(prevWeekMonday.getDate() - ((prevWeekMonday.getDay() + 6) % 7) - 7);
    let activePrevWeekSamePeriod = 0;
    for (let i = 0; i < elapsedDays; i++) {
      const d = new Date(prevWeekMonday);
      d.setDate(prevWeekMonday.getDate() + i);
      if (activeDatesSet.has(localDateString(d))) activePrevWeekSamePeriod++;
    }
    const prevWeekPct = elapsedDays > 0 ? Math.round((activePrevWeekSamePeriod / elapsedDays) * 100) : 0;
    const diff = consistencyPct - prevWeekPct;

    let deltaText = "Tracking this week";
    if (activePrevWeekSamePeriod > 0 || activeThisWeek > 0) {
      if (diff > 0) deltaText = `↑ ${diff}% vs last week`;
      else if (diff < 0) deltaText = `↓ ${Math.abs(diff)}% vs last week`;
      else deltaText = "Equal to last week";
    }

    return {
      weekDays: days,
      weeklyConsistencyPct: consistencyPct,
      weeklyDeltaText: deltaText,
    };
  }, [today, activeDatesSet]);

  // Today vs Yesterday Comparisons
  const taskDeltaText = useMemo(() => {
    const diff = completedTodayTasks.length - yesterdayCompletedTasksCount;
    if (diff > 0) return `+${diff} vs yesterday`;
    if (diff < 0) return `${diff} vs yesterday`;
    return "same as yesterday";
  }, [completedTodayTasks.length, yesterdayCompletedTasksCount]);

  // Toggle task completion inline
  const handleToggleTask = async (taskId: string, currentStatus: string) => {
    const isNowCompleted = currentStatus !== "completed";
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              status: isNowCompleted ? "completed" : "pending",
              completedAt: isNowCompleted ? Date.now() : undefined,
            }
          : t
      )
    );
    try {
      await updateTask(taskId, {
        status: isNowCompleted ? "completed" : "pending",
        completedAt: isNowCompleted ? Date.now() : undefined,
      });
    } catch {
      // Revert on error
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? { ...t, status: currentStatus as any }
            : t
        )
      );
    }
  };

  // Concise Orbit Insight (Section 13: 1 sentence, 1 action)
  const orbitInsight = useMemo(() => {
    if (todaySession && pendingTasks.length === 0) {
      return {
        text: `Training and tasks are wrapped up. Prioritize ${proteinRemaining}g protein for recovery.`,
        actionLabel: "Log dinner",
        actionHref: "/dashboard/diet",
      };
    }
    if (todaySession) {
      return {
        text: `Workout finished. You have ${pendingTasks.length} ${pendingTasks.length === 1 ? "task" : "tasks"} open for the afternoon.`,
        actionLabel: "View plan",
        actionHref: "/dashboard/tasks",
      };
    }
    if (pendingTasks.length > 0 && meals.length === 0) {
      return {
        text: `${pendingTasks.length} open tasks today and first meal isn't logged yet. Keep energy steady.`,
        actionLabel: "Log breakfast",
        actionHref: "/dashboard/diet",
      };
    }
    if (!todaySession) {
      const routineName = profile?.workoutPlanAssignment?.planName || "Daily Training";
      return {
        text: `Target routine today: ${routineName}. Ready to start before fatigue builds up?`,
        actionLabel: "Start workout",
        actionHref: "/dashboard/workout",
      };
    }
    return {
      text: `Your daily momentum is active. Focus on executing your priority items.`,
      actionLabel: "Open Orbit",
      actionHref: "#orbit",
    };
  }, [todaySession, pendingTasks.length, proteinRemaining, meals.length, profile]);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4 animate-pulse py-2">
        <div className="flex items-center justify-between">
          <div className="space-y-1.5">
            <div className="h-3 w-28 bg-white/5 rounded" />
            <div className="h-6 w-40 bg-white/10 rounded" />
          </div>
          <div className="w-8 h-8 rounded-full bg-white/5" />
        </div>
        <div className="h-44 rounded-2xl bg-white/5" />
        <div className="h-32 rounded-2xl bg-white/5" />
        <div className="h-32 rounded-2xl bg-white/5" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4 py-1 select-none animate-fade-in">
      {/* ── 1. PRIMARY PAGE HEADING (Section 1 & 2) ── */}
      <div className="pt-1 pb-1">
        <h1
          className="text-[24px] sm:text-[26px] font-bold tracking-tight leading-[1.2]"
          style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
        >
          {getGreeting(firstName)}
        </h1>
        <p className="text-xs sm:text-sm mt-1 font-medium" style={{ color: "var(--text-secondary)" }}>
          {formatCurrentDate()}
        </p>
      </div>

      {/* ── 2. TODAY AT A GLANCE (The Visual Centerpiece, Section 2, 3, 5, 6) ── */}
      <div
        className="rounded-2xl p-4 sm:p-5"
        style={{
          background: "var(--satat-surface, #0D0F11)",
          border: "1px solid var(--satat-border-subtle, rgba(255,255,255,0.05))",
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
            Today
          </span>
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold tabular-nums" style={{ color: "var(--satat-brand, #6E8BFF)" }}>
              {dayProgressPct}%
            </span>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              day progress
            </span>
          </div>
        </div>

        {/* Day Progress Visual Bar */}
        <div className="w-full h-2 rounded-full overflow-hidden mb-4" style={{ background: "var(--surface-inset)" }}>
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${dayProgressPct}%`,
              background: "var(--satat-brand, #6E8BFF)",
            }}
          />
        </div>

        {/* 4 Quantitative Metric Columns (Numbers First, Meaning First, Section 4) */}
        <div className="grid grid-cols-4 gap-2 pt-1 border-t" style={{ borderColor: "var(--satat-border-subtle, rgba(255,255,255,0.05))" }}>
          {/* Tasks Metric */}
          <Link href="/dashboard/tasks" className="block p-1 hover:opacity-85 transition-opacity">
            <span className="text-base sm:text-lg font-semibold tabular-nums block leading-tight" style={{ color: "var(--text-primary)" }}>
              {completedTodayTasks.length} / {todayTasks.length}
            </span>
            <span className="text-[11px] font-semibold block mt-0.5" style={{ color: "var(--text-muted)" }}>
              Tasks
            </span>
            <span className="text-[10px] block mt-0.5 truncate" style={{ color: "var(--text-secondary)" }}>
              {pendingTasks.length === 0 ? "✓ Done" : `${pendingTasks.length} left`}
            </span>
          </Link>

          {/* Workout Metric */}
          <Link href="/dashboard/workout" className="block p-1 hover:opacity-85 transition-opacity">
            <span
              className="text-base sm:text-lg font-semibold tabular-nums block leading-tight"
              style={{ color: todaySession ? "var(--satat-mint, #63D2B8)" : "var(--satat-brand, #6E8BFF)" }}
            >
              {todaySession ? "✓ Done" : "Planned"}
            </span>
            <span className="text-[11px] font-semibold block mt-0.5" style={{ color: "var(--text-muted)" }}>
              Workout
            </span>
            <span className="text-[10px] block mt-0.5 truncate" style={{ color: "var(--text-secondary)" }}>
              {todaySession ? `${todaySession.durationMinutes || 45}m` : "45m target"}
            </span>
          </Link>

          {/* Calories Metric */}
          <Link href="/dashboard/diet" className="block p-1 hover:opacity-85 transition-opacity">
            <span className="text-base sm:text-lg font-semibold tabular-nums block leading-tight" style={{ color: "var(--text-primary)" }}>
              {Math.round(totals.cal)}
            </span>
            <span className="text-[11px] font-semibold block mt-0.5" style={{ color: "var(--text-muted)" }}>
              kcal
            </span>
            <span className="text-[10px] block mt-0.5 truncate" style={{ color: "var(--text-secondary)" }}>
              {caloriesRemaining > 0 ? `${caloriesRemaining} left` : "Goal met"}
            </span>
          </Link>

          {/* Protein Metric */}
          <Link href="/dashboard/diet" className="block p-1 hover:opacity-85 transition-opacity">
            <span className="text-base sm:text-lg font-semibold tabular-nums block leading-tight" style={{ color: "var(--text-primary)" }}>
              {Math.round(totals.p)}g
            </span>
            <span className="text-[11px] font-semibold block mt-0.5" style={{ color: "var(--text-muted)" }}>
              Protein
            </span>
            <span className="text-[10px] block mt-0.5 truncate" style={{ color: "var(--text-secondary)" }}>
              {proteinRemaining > 0 ? `${proteinRemaining}g left` : "Goal met"}
            </span>
          </Link>
        </div>
      </div>

      {/* ── 3. THIS WEEK & RECENT PROGRESS (Section 7 & 8) ── */}
      <div
        className="rounded-2xl p-4 sm:p-5"
        style={{
          background: "var(--satat-surface, #0D0F11)",
          border: "1px solid var(--satat-border-subtle, rgba(255,255,255,0.05))",
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              This Week
            </span>
            <span
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: "rgba(110, 139, 255, 0.12)", color: "var(--satat-brand, #6E8BFF)" }}
            >
              {weeklyConsistencyPct}% consistency
            </span>
          </div>
          <span className="text-[11px] font-medium" style={{ color: "var(--text-secondary)" }}>
            {weeklyDeltaText}
          </span>
        </div>

        {/* 7-Day Mini Timeline (M T W T F S S) */}
        <div className="grid grid-cols-7 gap-1.5 py-1">
          {weekDays.map((day) => (
            <div
              key={day.dateStr}
              className="flex flex-col items-center justify-center p-2 rounded-xl transition-all"
              style={{
                background: day.isToday
                  ? "rgba(110, 139, 255, 0.12)"
                  : day.isActive
                  ? "var(--satat-surface-elevated, #121519)"
                  : "transparent",
                border: day.isToday
                  ? "1.5px solid var(--satat-brand, #6E8BFF)"
                  : "1px solid var(--satat-border-subtle, rgba(255,255,255,0.05))",
                opacity: day.isFuture ? 0.35 : 1,
              }}
            >
              <span className="text-[10px] font-semibold leading-none mb-1" style={{ color: "var(--text-muted)" }}>
                {day.label}
              </span>
              <span
                className="text-xs font-semibold tabular-nums leading-none"
                style={{ color: day.isToday ? "var(--satat-brand, #6E8BFF)" : "var(--text-primary)" }}
              >
                {day.dayNum}
              </span>
              <div className="h-1 flex items-center justify-center mt-1">
                {day.isActive ? (
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: day.isToday ? "var(--satat-brand, #6E8BFF)" : "var(--satat-mint, #63D2B8)" }}
                  />
                ) : (
                  <span className="w-1 h-1 rounded-full bg-white/10" />
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Comparative Indicators (Section 8: Today vs Yesterday) */}
        <div
          className="mt-3 pt-2.5 flex items-center justify-between text-xs flex-wrap gap-2 border-t"
          style={{ borderColor: "var(--satat-border-subtle, rgba(255,255,255,0.05))" }}
        >
          <span style={{ color: "var(--text-secondary)" }}>
            Tasks: <strong className="font-semibold" style={{ color: "var(--text-primary)" }}>{completedTodayTasks.length} done</strong> ({taskDeltaText})
          </span>
          {latestWeight && (
            <span style={{ color: "var(--text-secondary)" }}>
              Weight: <strong className="font-semibold tabular-nums" style={{ color: "var(--text-primary)" }}>{latestWeight} kg</strong>
              {weightDelta && (
                <span className="text-[11px] ml-1" style={{ color: "var(--text-muted)" }}>
                  ({parseFloat(weightDelta) > 0 ? `+${weightDelta}` : weightDelta} kg)
                </span>
              )}
            </span>
          )}
        </div>
      </div>

      {/* ── 4. NUTRITION (Numeric First, Section 9) ── */}
      <div
        className="rounded-2xl p-4 sm:p-5"
        style={{
          background: "var(--satat-surface, #0D0F11)",
          border: "1px solid var(--satat-border-subtle, rgba(255,255,255,0.05))",
        }}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
            Nutrition
          </span>
          <Link
            href="/dashboard/diet"
            className="text-xs font-semibold flex items-center gap-1 hover:underline"
            style={{ color: "var(--satat-brand, #6E8BFF)" }}
          >
            <span>+ Log Meal</span>
          </Link>
        </div>

        {/* Main numbers */}
        <div className="flex items-baseline justify-between mb-2">
          <div>
            <span className="text-2xl font-semibold tabular-nums" style={{ color: "var(--text-primary)" }}>
              {Math.round(totals.cal)}
            </span>
            <span className="text-xs font-medium ml-1" style={{ color: "var(--text-muted)" }}>
              / {calorieGoal} kcal
            </span>
          </div>
          <span className="text-xs font-medium tabular-nums" style={{ color: "var(--text-secondary)" }}>
            {caloriesRemaining > 0 ? `${caloriesRemaining} kcal remaining` : "Target achieved"}
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full h-1.5 rounded-full overflow-hidden mb-3" style={{ background: "var(--surface-inset)" }}>
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${caloriePct}%`,
              background: "var(--satat-brand, #6E8BFF)",
            }}
          />
        </div>

        {/* Macro Numbers */}
        <div className="grid grid-cols-3 gap-2 text-xs pt-1">
          <div className="p-2 rounded-xl" style={{ background: "var(--satat-surface-elevated, #121519)" }}>
            <span className="text-[10px] block" style={{ color: "var(--text-muted)" }}>Protein</span>
            <span className="font-semibold tabular-nums block mt-0.5" style={{ color: "var(--satat-brand, #6E8BFF)" }}>
              {Math.round(totals.p)} / {proteinGoal}g
            </span>
            <span className="text-[10px] block mt-0.5" style={{ color: "var(--text-secondary)" }}>
              {proteinRemaining > 0 ? `${proteinRemaining}g left` : "Met"}
            </span>
          </div>

          <div className="p-2 rounded-xl" style={{ background: "var(--satat-surface-elevated, #121519)" }}>
            <span className="text-[10px] block" style={{ color: "var(--text-muted)" }}>Carbs</span>
            <span className="font-semibold tabular-nums block mt-0.5" style={{ color: "var(--satat-peach, #F2A080)" }}>
              {Math.round(totals.c)} / {goals?.carbsG ?? 200}g
            </span>
            <span className="text-[10px] block mt-0.5" style={{ color: "var(--text-secondary)" }}>
              {Math.max(0, (goals?.carbsG ?? 200) - Math.round(totals.c))}g left
            </span>
          </div>

          <div className="p-2 rounded-xl" style={{ background: "var(--satat-surface-elevated, #121519)" }}>
            <span className="text-[10px] block" style={{ color: "var(--text-muted)" }}>Fat</span>
            <span className="font-semibold tabular-nums block mt-0.5" style={{ color: "var(--satat-warning, #E0AB57)" }}>
              {Math.round(totals.f)} / {goals?.fatG ?? 65}g
            </span>
            <span className="text-[10px] block mt-0.5" style={{ color: "var(--text-secondary)" }}>
              {Math.max(0, (goals?.fatG ?? 65) - Math.round(totals.f))}g left
            </span>
          </div>
        </div>
      </div>

      {/* ── 5. TRAINING (Status-First, Section 10) ── */}
      <div
        className="rounded-2xl p-4 sm:p-5"
        style={{
          background: "var(--satat-surface, #0D0F11)",
          border: "1px solid var(--satat-border-subtle, rgba(255,255,255,0.05))",
        }}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
            Training
          </span>
          <span
            className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
            style={{
              background: todaySession ? "rgba(99, 210, 184, 0.12)" : "rgba(110, 139, 255, 0.12)",
              color: todaySession ? "var(--satat-mint, #63D2B8)" : "var(--satat-brand, #6E8BFF)",
            }}
          >
            {todaySession ? "✓ Completed" : "Scheduled"}
          </span>
        </div>

        <div className="flex items-center justify-between mt-1">
          <div>
            <h3 className="text-sm font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>
              {todaySession
                ? `${todaySession.exercises.length > 0 ? `${todaySession.exercises.length} Exercises` : "Cardio"} Logged`
                : profile?.workoutPlanAssignment?.planName || "Daily Training Session"}
            </h3>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
              {todaySession
                ? `${todaySession.durationMinutes || 45} mins · ${todaySession.exercises.reduce((a, e) => a + e.sets.length, 0)} sets completed`
                : `Target: 45 min · ${profile?.workoutPlanAssignment?.daysPerWeek || 4} days/week`}
            </p>
          </div>

          <Link
            href="/dashboard/workout"
            className="text-xs font-semibold px-3 py-1.5 rounded-xl transition-all inline-flex items-center gap-1 shrink-0"
            style={{
              background: todaySession ? "var(--satat-surface-elevated, #121519)" : "var(--satat-brand, #6E8BFF)",
              color: todaySession ? "var(--text-primary)" : "var(--brand-text, #08090A)",
              border: todaySession ? "1px solid var(--satat-border-subtle, rgba(255,255,255,0.05))" : "none",
            }}
          >
            <span>{todaySession ? "View session" : "Start workout"}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* ── 6. TODAY'S FOCUS (Compact Action List, Section 11) ── */}
      <div
        className="rounded-2xl p-4 sm:p-5"
        style={{
          background: "var(--satat-surface, #0D0F11)",
          border: "1px solid var(--satat-border-subtle, rgba(255,255,255,0.05))",
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              Today&apos;s Focus
            </span>
            <span className="text-[11px] font-medium" style={{ color: "var(--text-secondary)" }}>
              {completedTodayTasks.length} / {todayTasks.length} completed
            </span>
          </div>
          <Link
            href="/dashboard/tasks"
            className="text-xs font-semibold hover:underline"
            style={{ color: "var(--satat-brand, #6E8BFF)" }}
          >
            + Add task
          </Link>
        </div>

        {todayTasks.length === 0 ? (
          <div className="text-center py-3">
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              No tasks scheduled for today
            </p>
          </div>
        ) : (
          <div className="space-y-1 divide-y" style={{ borderColor: "var(--satat-border-subtle, rgba(255,255,255,0.05))" }}>
            {todayTasks.slice(0, 4).map((task) => {
              const isDone = task.status === "completed";
              return (
                <div
                  key={task.id}
                  onClick={() => handleToggleTask(task.id, task.status)}
                  className="flex items-center justify-between py-2.5 px-1 cursor-pointer transition-colors hover:bg-white/[0.02]"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors"
                      style={{
                        background: isDone ? "var(--satat-brand, #6E8BFF)" : "transparent",
                        borderColor: isDone ? "var(--satat-brand, #6E8BFF)" : "var(--satat-border, rgba(255,255,255,0.15))",
                        color: isDone ? "var(--brand-text, #08090A)" : "transparent",
                      }}
                    >
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </div>
                    <span
                      className={`text-xs font-medium truncate ${isDone ? "line-through opacity-40" : ""}`}
                      style={{ color: "var(--text-primary)" }}
                    >
                      {task.title}
                    </span>
                  </div>

                  {task.priority === "high" && !isDone && (
                    <span
                      className="text-[9px] font-semibold uppercase px-1.5 py-0.2 rounded shrink-0 ml-2"
                      style={{ background: "rgba(234, 119, 119, 0.15)", color: "var(--satat-error, #EA7777)" }}
                    >
                      High
                    </span>
                  )}
                </div>
              );
            })}

            {todayTasks.length > 4 && (
              <Link
                href="/dashboard/tasks"
                className="block text-center pt-2.5 text-xs font-semibold hover:underline"
                style={{ color: "var(--satat-brand, #6E8BFF)" }}
              >
                +{todayTasks.length - 4} more in Plan →
              </Link>
            )}
          </div>
        )}
      </div>

      {/* ── 7. CONSISTENCY & STREAK (Section 25 Fix: Anchored to Today, Current Month by Default) ── */}
      <div>
        <ActivityHeatmap
          sessions={sessions}
          tasks={tasks}
          allMeals={allMeals}
          loading={loading}
        />
      </div>

      {/* ── 8. ORBIT AI (Moved Down, Concise: 1 Insight, 1 Action, Section 12 & 13) ── */}
      <div
        className="p-3.5 rounded-2xl flex items-center justify-between gap-3"
        style={{
          background: "var(--satat-surface, #0D0F11)",
          border: "1px solid var(--satat-border-subtle, rgba(255,255,255,0.05))",
        }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: "rgba(110, 139, 255, 0.12)", color: "var(--satat-brand, #6E8BFF)" }}
          >
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <p className="text-xs leading-snug truncate" style={{ color: "var(--text-primary)" }}>
            {orbitInsight.text}
          </p>
        </div>

        {orbitInsight.actionHref.startsWith("#") ? (
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined") {
                window.dispatchEvent(new CustomEvent("satat:open-orbit"));
              }
            }}
            className="text-xs font-semibold shrink-0 hover:underline flex items-center gap-1"
            style={{ color: "var(--satat-brand, #6E8BFF)" }}
          >
            <span>{orbitInsight.actionLabel}</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        ) : (
          <Link
            href={orbitInsight.actionHref}
            className="text-xs font-semibold shrink-0 hover:underline flex items-center gap-1"
            style={{ color: "var(--satat-brand, #6E8BFF)" }}
          >
            <span>{orbitInsight.actionLabel}</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        )}
      </div>
    </div>
  );
}
