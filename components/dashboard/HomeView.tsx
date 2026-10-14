"use client";

import { useEffect, useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  Dumbbell, Utensils, CheckSquare, ChevronRight,
  Flame, Check, ArrowRight, Scale, Clock, AlertCircle, Plus,
  TrendingUp, Calendar
} from "lucide-react";
import { OrbitMark } from "@/components/orbit/OrbitMark";
import { setDietContext, setWorkoutContext, setTaskContext } from "@/lib/orbitContext";
import {
  getAllTasks, getMeals, getMacroGoals,
  getWorkoutSessions, getBodyWeightEntries, getAllMeals, getUserProfile,
  updateTask,
} from "@/lib/firestore";
import ActivityHeatmap from "@/components/dashboard/ActivityHeatmap";
import { DayMomentumProgress } from "@/components/dashboard/DayMomentumProgress";
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

        // Keep Orbit AI context populated with actual user data
        const tDay = todayString();
        setTaskContext({
          todayDate: tDay,
          pendingToday: t.filter((x: any) => x.status === "pending" && (!x.dueDate || x.dueDate <= tDay)).map((x: any) => ({ title: x.title, priority: x.priority })),
          completedToday: t.filter((x: any) => x.status === "completed" && x.completedAt && localDateString(new Date(x.completedAt)) === tDay).map((x: any) => ({ title: x.title, completedAt: x.completedAt })),
          overdue: t.filter((x: any) => x.status === "pending" && x.dueDate && x.dueDate < tDay).map((x: any) => ({ title: x.title, dueDate: x.dueDate })),
          totalPending: t.filter((x: any) => x.status === "pending").length,
        });

        const mealTotals = m.reduce(
          (acc: any, item: any) => ({
            calories: acc.calories + (item.macros?.calories || 0),
            proteinG: acc.proteinG + (item.macros?.proteinG || 0),
            carbsG: acc.carbsG + (item.macros?.carbsG || 0),
            fatG: acc.fatG + (item.macros?.fatG || 0),
          }),
          { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 }
        );

        setDietContext({
          date: tDay,
          meals: m.map((tm: any) => ({
            name: tm.name,
            calories: tm.macros?.calories || 0,
            proteinG: tm.macros?.proteinG || 0,
            carbsG: tm.macros?.carbsG || 0,
            fatG: tm.macros?.fatG || 0,
            fiberG: tm.macros?.fiberG,
          })),
          totals: mealTotals,
          goals: g ? { calories: g.calories, proteinG: g.proteinG, carbsG: g.carbsG, fatG: g.fatG } : null,
        });

        setWorkoutContext({
          bodyWeightKg: w.length > 0 ? w[0].weightKg : undefined,
          recentSessions: s.map((sess: any) => ({
            date: sess.date,
            durationMinutes: sess.durationMinutes || 0,
            exercises: sess.exercises || [],
            cardio: sess.cardio || [],
            summary: sess.summary,
          })),
        });
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
      actionHref: "/dashboard/orbit",
    };
  }, [todaySession, pendingTasks.length, proteinRemaining, meals.length, profile]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 py-4 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-4 w-32 bg-[var(--surface-elevated)] rounded-md" />
            <div className="h-7 w-48 bg-[var(--surface-elevated)] rounded-lg" />
          </div>
          <div className="w-10 h-10 rounded-full bg-[var(--surface-elevated)]" />
        </div>
        <div className="h-48 rounded-2xl bg-[var(--surface-elevated)] border border-[var(--border)]" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-7 h-64 rounded-2xl bg-[var(--surface-elevated)] border border-[var(--border)]" />
          <div className="lg:col-span-5 h-64 rounded-2xl bg-[var(--surface-elevated)] border border-[var(--border)]" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-2 select-none animate-fade-in">
      {/* ── 1. COMMAND HEADER: GREETING & STREAK ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)] font-display">
            {getGreeting(firstName)}
          </h1>
          <p className="text-xs sm:text-sm mt-1 font-medium text-[var(--text-secondary)]">
            {formatCurrentDate()}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--brand-subtle)] border border-[var(--brand-muted)] text-[var(--brand)] text-xs font-semibold shadow-xs">
            <Flame className="w-3.5 h-3.5 fill-current" />
            <span>{weeklyConsistencyPct}% consistency</span>
          </div>
        </div>
      </div>

      {/* ── 2. DAY MOMENTUM CENTERPIECE ── */}
      <div className="rounded-2xl p-5 sm:p-6 bg-[var(--surface)] border border-[var(--border)] shadow-xs transition-shadow">
        <DayMomentumProgress progressPct={dayProgressPct} />

        {/* 4 Quantitative Pillar Tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Tasks Pillar */}
          <Link
            href="/dashboard/tasks"
            className="group pressable p-3 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border-subtle)] hover:border-[var(--brand-subtle)] transition-all flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-[var(--text-muted)] group-hover:text-[var(--text-secondary)] transition-colors">
                Tasks
              </span>
              <CheckSquare className="w-3.5 h-3.5 text-[var(--text-muted)] group-hover:text-[var(--brand)] transition-colors" />
            </div>
            <div>
              <div className="text-lg sm:text-xl font-bold font-display tabular-nums text-[var(--text-primary)]">
                {completedTodayTasks.length}/{todayTasks.length}
              </div>
              <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 truncate">
                {pendingTasks.length === 0 ? "✓ Completed" : `${pendingTasks.length} remaining`}
              </p>
            </div>
          </Link>

          {/* Workout Pillar */}
          <Link
            href="/dashboard/workout"
            className="group pressable p-3 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border-subtle)] hover:border-[var(--brand-subtle)] transition-all flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-[var(--text-muted)] group-hover:text-[var(--text-secondary)] transition-colors">
                Training
              </span>
              <Dumbbell className="w-3.5 h-3.5 text-[var(--text-muted)] group-hover:text-[var(--brand)] transition-colors" />
            </div>
            <div>
              <div
                className={`text-lg sm:text-xl font-bold font-display tabular-nums ${
                  todaySession ? "text-[var(--success)]" : "text-[var(--text-primary)]"
                }`}
              >
                {todaySession ? "✓ Done" : "Planned"}
              </div>
              <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 truncate">
                {todaySession
                  ? `${todaySession.durationMinutes || 45}m logged`
                  : "Session scheduled"}
              </p>
            </div>
          </Link>

          {/* Calories Pillar */}
          <Link
            href="/dashboard/diet"
            className="group pressable p-3 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border-subtle)] hover:border-[var(--brand-subtle)] transition-all flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-[var(--text-muted)] group-hover:text-[var(--text-secondary)] transition-colors">
                Calories
              </span>
              <Utensils className="w-3.5 h-3.5 text-[var(--text-muted)] group-hover:text-[var(--brand)] transition-colors" />
            </div>
            <div>
              <div className="text-lg sm:text-xl font-bold font-display tabular-nums text-[var(--text-primary)]">
                {Math.round(totals.cal)}
              </div>
              <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 truncate">
                {caloriesRemaining > 0 ? `${caloriesRemaining} kcal left` : "Target reached"}
              </p>
            </div>
          </Link>

          {/* Protein Pillar */}
          <Link
            href="/dashboard/diet"
            className="group pressable p-3 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border-subtle)] hover:border-[var(--brand-subtle)] transition-all flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-[var(--text-muted)] group-hover:text-[var(--text-secondary)] transition-colors">
                Protein
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--macro-protein)]" />
            </div>
            <div>
              <div className="text-lg sm:text-xl font-bold font-display tabular-nums text-[var(--text-primary)]">
                {Math.round(totals.p)}g
              </div>
              <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 truncate">
                {proteinRemaining > 0 ? `${proteinRemaining}g remaining` : "Target reached"}
              </p>
            </div>
          </Link>
        </div>
      </div>

      {/* ── 3. CONTEXTUAL ORBIT NEURAL DIRECTIVE ── */}
      <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--brand-muted)] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-[var(--brand-subtle)] border border-[var(--brand-muted)] text-[var(--brand)] flex items-center justify-center shrink-0">
            <OrbitMark size={16} state="idle" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--brand)]">
              Orbit Directive
            </div>
            <p className="text-xs sm:text-sm text-[var(--text-primary)] font-medium truncate sm:whitespace-normal">
              {orbitInsight.text}
            </p>
          </div>
        </div>

        <Link
          href={orbitInsight.actionHref.startsWith("#") ? "/dashboard/orbit" : orbitInsight.actionHref}
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-[var(--brand-text)] text-xs font-semibold shrink-0 transition-colors shadow-xs"
        >
          <span>{orbitInsight.actionLabel}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* ── 4. TWO-COLUMN COMMAND GRID: PRIORITIES & RHYTHM ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Today's Priorities */}
        <div className="lg:col-span-7 rounded-2xl p-5 bg-[var(--surface)] border border-[var(--border)] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">
                  Today&apos;s Priorities
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[var(--surface-elevated)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
                  {completedTodayTasks.length}/{todayTasks.length}
                </span>
              </div>
              <Link
                href="/dashboard/tasks"
                className="text-xs font-semibold text-[var(--brand)] hover:underline inline-flex items-center gap-1"
              >
                <span>+ Add task</span>
              </Link>
            </div>

            {todayTasks.length === 0 ? (
              <div className="text-center py-8 px-4 rounded-xl border border-dashed border-[var(--border)]">
                <p className="text-xs text-[var(--text-muted)]">
                  No tasks scheduled for today. Plan ahead to keep momentum.
                </p>
                <Link
                  href="/dashboard/tasks"
                  className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[var(--brand)] hover:underline"
                >
                  <Plus className="w-3 h-3" />
                  <span>Create your first task</span>
                </Link>
              </div>
            ) : (
              <div className="space-y-1 divide-y divide-[var(--border-subtle)]">
                {todayTasks.slice(0, 5).map((task) => {
                  const isDone = task.status === "completed";
                  return (
                    <div
                      key={task.id}
                      onClick={() => handleToggleTask(task.id, task.status)}
                      className="flex items-center justify-between py-2.5 px-1.5 cursor-pointer transition-colors hover:bg-[var(--surface-hover)] rounded-lg group pressable"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all ${
                            isDone
                              ? "bg-[var(--brand)] border-[var(--brand)] text-[var(--brand-text)] animate-check-pop"
                              : "border-[var(--border)] group-hover:border-[var(--brand)] bg-transparent"
                          }`}
                        >
                          {isDone && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <span
                          className={`text-xs sm:text-sm font-medium truncate ${
                            isDone
                              ? "line-through text-[var(--text-muted)]"
                              : "text-[var(--text-primary)]"
                          }`}
                        >
                          {task.title}
                        </span>
                      </div>

                      {task.priority === "high" && !isDone && (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[rgba(234,119,119,0.15)] text-[var(--error)] shrink-0 ml-2">
                          High
                        </span>
                      )}
                    </div>
                  );
                })}

                {todayTasks.length > 5 && (
                  <Link
                    href="/dashboard/tasks"
                    className="block text-center pt-3 text-xs font-semibold text-[var(--brand)] hover:underline"
                  >
                    +{todayTasks.length - 5} more in Plan →
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Weekly Rhythm & Comparative Insights */}
        <div className="lg:col-span-5 rounded-2xl p-5 bg-[var(--surface)] border border-[var(--border)] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">
                This Week Rhythm
              </span>
              <span className="text-xs font-medium text-[var(--text-secondary)]">
                {weeklyDeltaText}
              </span>
            </div>

            {/* 7-Day Mini Timeline */}
            <div className="grid grid-cols-7 gap-1.5 py-1">
              {weekDays.map((day) => (
                <div
                  key={day.dateStr}
                  className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all ${
                    day.isToday
                      ? "bg-[var(--brand-subtle)] border-1.5 border-[var(--brand)]"
                      : day.isActive
                      ? "bg-[var(--surface-elevated)] border border-[var(--border-subtle)]"
                      : "bg-transparent border border-transparent"
                  } ${day.isFuture ? "opacity-35" : ""}`}
                >
                  <span className="text-[10px] font-semibold leading-none mb-1 text-[var(--text-muted)]">
                    {day.label}
                  </span>
                  <span
                    className={`text-xs font-semibold tabular-nums leading-none ${
                      day.isToday ? "text-[var(--brand)]" : "text-[var(--text-primary)]"
                    }`}
                  >
                    {day.dayNum}
                  </span>
                  <div className="h-1 flex items-center justify-center mt-1.5">
                    {day.isActive ? (
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          day.isToday ? "bg-[var(--brand)]" : "bg-[var(--success)]"
                        }`}
                      />
                    ) : (
                      <span className="w-1 h-1 rounded-full bg-[var(--border)]" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Micro Comparative Summary */}
          <div className="mt-4 pt-3 flex items-center justify-between text-xs border-t border-[var(--border-subtle)] flex-wrap gap-2">
            <span className="text-[var(--text-secondary)]">
              Tasks: <strong className="font-semibold text-[var(--text-primary)]">{completedTodayTasks.length} done</strong> ({taskDeltaText})
            </span>
            {latestWeight && (
              <span className="text-[var(--text-secondary)]">
                Weight: <strong className="font-semibold tabular-nums text-[var(--text-primary)]">{latestWeight} kg</strong>
                {weightDelta && (
                  <span className="text-[11px] ml-1 text-[var(--text-muted)]">
                    ({parseFloat(weightDelta) > 0 ? `+${weightDelta}` : weightDelta} kg)
                  </span>
                )}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── 5. COMPOUNDING MOMENTUM HEATMAP ── */}
      <div className="rounded-2xl p-4 sm:p-5 bg-[var(--surface)] border border-[var(--border)] shadow-xs">
        <ActivityHeatmap
          sessions={sessions}
          tasks={tasks}
          allMeals={allMeals}
          loading={loading}
        />
      </div>
    </div>
  );
}
