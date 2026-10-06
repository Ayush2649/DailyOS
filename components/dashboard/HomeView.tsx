"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  Flame, Dumbbell, CheckSquare, Scale,
  TrendingUp, TrendingDown, Minus, CheckCircle2,
  AlertCircle, ArrowUpRight, Zap,
} from "lucide-react";
import {
  getAllTasks, getMeals, getMacroGoals,
  getWorkoutSessions, getBodyWeightEntries, getAllMeals, getUserProfile,
} from "@/lib/firestore";
import ActivityHeatmap from "@/components/dashboard/ActivityHeatmap";
import { todayString } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { Task, MealEntry, MacroGoals, WorkoutSession, BodyWeightEntry, UserProfileDocument } from "@/types";

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
function getGreeting(name: string) {
  const h = new Date().getHours();
  if (h < 5)  return `Working late, ${name}`;
  if (h < 12) return `Good morning, ${name}`;
  if (h < 17) return `Good afternoon, ${name}`;
  if (h < 21) return `Good evening, ${name}`;
  return `Good night, ${name}`;
}

function formatDate() {
  return new Date().toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long",
  });
}

/* ─── Streak ──────────────────────────────────────────────────────────────── */
/**
 * Given an array of YYYY-MM-DD date strings (may have duplicates),
 * returns the number of consecutive days ending today or yesterday.
 */
function computeStreak(dateSeries: string[]): number {
  if (dateSeries.length === 0) return 0;

  const unique = Array.from(new Set(dateSeries)).sort((a, b) => b.localeCompare(a)); // newest first

  // Helper: subtract one calendar day from a YYYY-MM-DD string
  const prevDay = (ds: string) => {
    const [y, m, d] = ds.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    dt.setDate(dt.getDate() - 1);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
  };

  const today = todayString();
  const yesterday = prevDay(today);

  // An active streak must include today or yesterday
  if (unique[0] !== today && unique[0] !== yesterday) return 0;

  let streak = 1;
  let cursor = unique[0];
  for (let i = 1; i < unique.length; i++) {
    if (unique[i] === prevDay(cursor)) {
      streak++;
      cursor = unique[i];
    } else {
      break;
    }
  }
  return streak;
}

/* ─── Primitives ──────────────────────────────────────────────────────────── */
function Skel({ className }: { className?: string }) {
  return (
    <div
      className={cn("rounded-xl animate-pulse", className)}
      style={{ background: "var(--surface-3)" }}
    />
  );
}

function Bar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="h-1 rounded-full overflow-hidden w-full" style={{ background: "var(--surface-inset)" }}>
      <div
        className="h-full rounded-full transition-all duration-350"
        style={{ width: `${Math.min(100, Math.max(0, pct))}%`, background: color }}
      />
    </div>
  );
}

function Card({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn("rounded-xl p-4 sm:p-5 flex flex-col", className)}
      style={{ background: "var(--surface-base)", border: "1px solid var(--border-subtle)" }}
    >
      {children}
    </div>
  );
}

function SummaryMetric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="min-w-0">
      <p className="metadata">{label}</p>
      <p className="text-base font-semibold tabular-nums mt-0.5 truncate" style={{ color: "var(--text-1)" }}>{value}</p>
      <p className="metadata truncate">{detail}</p>
    </div>
  );
}

function TodaySummary({
  tasks,
  meals,
  goals,
  sessions,
  loading,
}: {
  tasks: Task[];
  meals: MealEntry[];
  goals: MacroGoals | null;
  sessions: WorkoutSession[];
  loading: boolean;
}) {
  const today = todayString();
  const todayStart = new Date(`${today}T00:00:00`).getTime();
  const dueTasks = tasks.filter((task) =>
    task.status === "pending" && (!task.dueDate || task.dueDate === today)
  );
  const overdueTasks = tasks.filter((task) =>
    task.status === "pending" && task.dueDate && task.dueDate < today
  );
  const completedTasks = tasks.filter((task) =>
    task.status === "completed" && task.completedAt != null && task.completedAt >= todayStart
  );
  const todayWorkout = sessions.find((session) => session.date === today);
  const calorieTotal = meals.reduce((total, meal) => total + meal.macros.calories, 0);
  const proteinTotal = meals.reduce((total, meal) => total + meal.macros.proteinG, 0);
  const nutritionGoals = goals ?? { calories: 2000, proteinG: 150, carbsG: 200, fatG: 65 };
  const remainingTasks = dueTasks.length + overdueTasks.length;

  const nextAction = overdueTasks.length > 0
    ? { href: "/dashboard/tasks", label: "Review overdue" }
    : dueTasks.length > 0
      ? { href: "/dashboard/tasks", label: "View today's tasks" }
      : !todayWorkout
        ? { href: "/dashboard/workout", label: "Log workout" }
        : meals.length === 0 || calorieTotal < nutritionGoals.calories
          ? { href: "/dashboard/diet", label: "Log a meal" }
          : { href: "/dashboard/diet", label: "Review nutrition" };

  const headline = overdueTasks.length > 0
    ? `${overdueTasks.length} overdue task${overdueTasks.length === 1 ? "" : "s"}`
    : remainingTasks > 0
      ? `${remainingTasks} task${remainingTasks === 1 ? "" : "s"} left today`
      : "Tasks are clear for today";

  return (
    <section className="rounded-xl border p-4 sm:p-5" style={{ background: "var(--surface-base)", borderColor: "var(--border-subtle)" }} aria-labelledby="today-summary-title">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="metadata">TODAY AT A GLANCE</p>
          <h2 id="today-summary-title" className="text-lg font-semibold mt-1" style={{ color: "var(--text-1)" }}>
            {loading ? "Loading today's progress" : headline}
          </h2>
          <p className="secondary-text mt-1">
            {loading
              ? "Your activity will appear here."
              : `${completedTasks.length} completed · ${todayWorkout ? `Workout logged${todayWorkout.durationMinutes ? ` · ${todayWorkout.durationMinutes} min` : ""}` : "No workout logged"}`}
          </p>
        </div>
        {!loading && (
          <Link href={nextAction.href} className="btn-primary w-full sm:w-auto shrink-0">
            {nextAction.label}
          </Link>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-3 mt-4 pt-4 border-t" style={{ borderColor: "var(--border-subtle)" }}>
        <SummaryMetric
          label="Calories"
          value={loading ? "—" : `${Math.round(calorieTotal).toLocaleString()} kcal`}
          detail={`of ${nutritionGoals.calories.toLocaleString()} kcal`}
        />
        <SummaryMetric
          label="Protein"
          value={loading ? "—" : `${Math.round(proteinTotal)} g`}
          detail={`of ${nutritionGoals.proteinG} g`}
        />
        <SummaryMetric
          label="Tasks"
          value={loading ? "—" : `${completedTasks.length}/${completedTasks.length + remainingTasks}`}
          detail={loading ? "Loading" : `${remainingTasks} remaining`}
        />
        <SummaryMetric
          label="Training"
          value={loading ? "—" : todayWorkout ? "Logged" : "Not logged"}
          detail={todayWorkout?.exercises.length ? `${todayWorkout.exercises.length} exercises` : todayWorkout?.durationMinutes ? `${todayWorkout.durationMinutes} min` : "Today"}
        />
      </div>
    </section>
  );
}

/* ─── Calorie ring ───────────────────────────────────────────────────────── */
function CalorieRing({ consumed, goal, size = 120 }: { consumed: number; goal: number; size?: number }) {
  const R = 44;
  const C = 2 * Math.PI * R;
  const pct = goal > 0 ? Math.min(1, consumed / goal) : 0;
  const over = consumed > goal;

  return (
    <div className="relative flex items-center justify-center shrink-0">
      <svg viewBox="0 0 100 100" style={{ width: size, height: size }} className="-rotate-90">
        <circle cx="50" cy="50" r={R} fill="none" strokeWidth="7" stroke="var(--surface-3)" />
        <circle
          cx="50" cy="50" r={R} fill="none" strokeWidth="7"
          strokeLinecap="round"
          stroke={over ? "var(--status-warning)" : "var(--status-success)"}
          strokeDasharray={`${pct * C} ${C}`}
          style={{ transition: "stroke-dasharray 0.8s ease" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center leading-none">
        <span className={size < 110 ? "text-base font-semibold tabular-nums" : "text-xl font-semibold tabular-nums"} style={{ color: "var(--text-1)" }}>
          {consumed}
        </span>
        <span className="text-[10px] font-medium mt-0.5" style={{ color: "var(--text-3)" }}>
          / {goal} kcal
        </span>
      </div>
    </div>
  );
}

/* ─── Calorie Card ───────────────────────────────────────────────────────── */
function CalorieCard({
  meals,
  goals,
  loading,
}: {
  meals: MealEntry[];
  goals: MacroGoals | null;
  loading: boolean;
}) {
  if (loading) {
    return (
      <Card className="md:col-span-2">
        <Skel className="h-6 w-36 mb-4" />
        <div className="flex gap-6">
          <Skel className="w-[120px] h-[120px] rounded-full" />
          <div className="flex-1 space-y-3 pt-2">
            <Skel className="h-4 w-24" />
            <Skel className="h-3 w-full" />
            <Skel className="h-3 w-full" />
            <Skel className="h-3 w-full" />
          </div>
        </div>
      </Card>
    );
  }

  const totals = meals.reduce(
    (acc, m) => ({
      cal: acc.cal + m.macros.calories,
      p:   acc.p   + m.macros.proteinG,
      c:   acc.c   + m.macros.carbsG,
      f:   acc.f   + m.macros.fatG,
    }),
    { cal: 0, p: 0, c: 0, f: 0 }
  );

  const hasGoals = Boolean(goals && goals.calories > 0);
  const remaining = hasGoals ? Math.max(0, goals!.calories - totals.cal) : 0;
  const over = hasGoals ? totals.cal > goals!.calories : false;

  return (
    <Card className="md:col-span-2">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "color-mix(in srgb, var(--status-success) 12%, transparent)" }}
          >
            <Flame className="w-4 h-4" style={{ color: "var(--success)" }} />
          </div>
          <span className="card-title">
            Today's Nutrition
          </span>
        </div>
        <Link
          href="/dashboard/diet"
          className="flex items-center gap-1 text-xs font-semibold text-emerald-500 hover:text-emerald-400 transition-colors"
        >
          Open <ArrowUpRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Body */}
      <div className="flex flex-row items-center gap-4">
        {/* Ring — smaller on mobile, larger on sm+ */}
        {hasGoals ? (
          <>
            <div className="block sm:hidden shrink-0">
              <CalorieRing consumed={Math.round(totals.cal)} goal={goals!.calories} size={90} />
            </div>
            <div className="hidden sm:block shrink-0">
              <CalorieRing consumed={Math.round(totals.cal)} goal={goals!.calories} size={120} />
            </div>
          </>
        ) : (
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full flex flex-col items-center justify-center shrink-0 border border-emerald-500/20 bg-emerald-500/5">
            <span className="text-sm sm:text-base font-bold font-mono text-emerald-500">
              {Math.round(totals.cal)}
            </span>
            <span className="text-[10px] text-gray-400">kcal</span>
          </div>
        )}

        <div className="flex-1 space-y-2.5 min-w-0">
          {/* Status pill */}
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="text-xs font-medium px-2 py-1 rounded-md"
              style={{
                color: over ? "var(--warning)" : "var(--success)",
                background: over
                  ? "color-mix(in srgb, var(--warning) 12%, transparent)"
                  : "color-mix(in srgb, var(--success) 12%, transparent)",
              }}
            >
              {hasGoals
                ? over
                  ? `${Math.round(totals.cal - goals!.calories)} kcal over goal`
                  : `${Math.round(remaining)} kcal remaining`
                : "Intuitive Habit Tracking Active"}
            </span>
            {meals.length === 0 && (
              <span className="text-xs" style={{ color: "var(--text-3)" }}>
                No meals logged yet
              </span>
            )}
          </div>

          {/* Macro bars */}
          {[
            { label: "Protein", val: totals.p, goal: goals?.proteinG,  unit: "g", color: "var(--macro-protein)" },
            { label: "Carbs",   val: totals.c, goal: goals?.carbsG,    unit: "g", color: "var(--macro-carbs)" },
            { label: "Fat",     val: totals.f, goal: goals?.fatG,      unit: "g", color: "var(--macro-fat)" },
          ].map(({ label, val, goal: macroGoal, unit, color }) => (
            <div key={label} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium" style={{ color: "var(--text-2)" }}>
                  {label}
                </span>
                <span className="text-xs font-medium tabular-nums" style={{ color: "var(--text-2)" }}>
                  {Math.round(val)}{macroGoal ? <span>/{macroGoal}{unit}</span> : <span>{unit}</span>}
                </span>
              </div>
              {macroGoal ? (
                <Bar pct={(val / macroGoal) * 100} color={color} />
              ) : (
                <div className="h-1.5 rounded-full overflow-hidden w-full bg-surface-2" />
              )}
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

/* ─── Weight Sparkline ───────────────────────────────────────────────────── */
function WeightSparkline({ entries }: { entries: BodyWeightEntry[] }) {
  // Entries arrive newest-first; reverse to get chronological order
  const chron = [...entries].reverse().slice(-14);
  if (chron.length < 2) return null;

  const vals  = chron.map((e) => e.weightKg);
  const lo    = Math.min(...vals);
  const hi    = Math.max(...vals);
  const range = hi - lo || 0.5;

  const W = 200, H = 38, PAD = 3;

  const pts = chron
    .map((e, i) => {
      const x = (i / (chron.length - 1)) * W;
      const y = H - PAD - ((e.weightKg - lo) / range) * (H - PAD * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  // Closed polygon for gradient fill (trace line then drop to bottom)
  const lastX = W.toFixed(1);
  const lastY = (H - PAD - ((chron[chron.length - 1].weightKg - lo) / range) * (H - PAD * 2)).toFixed(1);
  const area  = `0,${H} ${pts} ${lastX},${H}`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full mt-3"
      style={{ height: `${H}px`, overflow: "visible" }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="var(--accent)" stopOpacity="0.25" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0"    />
        </linearGradient>
      </defs>
      {/* Fill */}
      <polygon points={area} style={{ fill: "url(#weightGrad)" }} />
      {/* Line */}
      <polyline
        points={pts}
        fill="none"
        stroke="var(--accent)"
        strokeWidth="1.8"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* Latest value dot */}
      <circle cx={parseFloat(lastX)} cy={parseFloat(lastY)} r="3" fill="var(--accent)" />
    </svg>
  );
}

/* ─── Weight Card ────────────────────────────────────────────────────────── */
function WeightCard({ entries, loading }: { entries: BodyWeightEntry[]; loading: boolean }) {
  if (loading) {
    return (
      <Card>
        <Skel className="h-6 w-28 mb-4" />
        <Skel className="h-12 w-24 mb-2" />
        <Skel className="h-4 w-16" />
      </Card>
    );
  }

  const latest  = entries[0];
  const prev    = entries[1];
  const delta   = latest && prev ? +(latest.weightKg - prev.weightKg).toFixed(1) : null;
  const daysAgo = latest
    ? Math.round((Date.now() - latest.createdAt) / 86_400_000)
    : null;

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "var(--accent-soft)" }}
          >
            <Scale className="w-4 h-4" style={{ color: "var(--accent)" }} />
          </div>
          <span className="card-title">
            Body Weight
          </span>
        </div>
        <Link
          href="/dashboard/workout"
          className="flex items-center gap-1 text-xs font-medium text-accent hover:opacity-80 transition-opacity"
        >
          Log <ArrowUpRight className="w-3 h-3" />
        </Link>
      </div>

      {latest ? (
        <div className="flex-1 flex flex-col justify-center">
          <div className="flex items-end gap-1.5">
            <span
              className="text-3xl font-semibold tabular-nums"
              style={{ color: "var(--text-1)" }}
            >
              {latest.weightKg}
            </span>
            <span
              className="text-sm font-medium mb-1"
              style={{ color: "var(--text-3)" }}
            >
              kg
            </span>
          </div>

          <div className="flex items-center gap-2 mt-1.5">
            {delta !== null && (
              <span
                className="flex items-center gap-1 text-xs font-medium tabular-nums"
                style={{ color: "var(--text-2)" }}
              >
                {delta > 0 ? (
                  <TrendingUp className="w-3 h-3" />
                ) : delta < 0 ? (
                  <TrendingDown className="w-3 h-3" />
                ) : (
                  <Minus className="w-3 h-3" />
                )}
                {delta > 0 ? "+" : ""}
                {delta} kg vs previous
              </span>
            )}
            <span className="text-xs" style={{ color: "var(--text-3)" }}>
              {daysAgo === 0
                ? "Logged today"
                : daysAgo === 1
                ? "Yesterday"
                : `${daysAgo}d ago`}
            </span>
          </div>
          <WeightSparkline entries={entries} />
        </div>
      ) : (
        <div className="flex-1 flex items-center gap-2 py-3">
          <Scale className="w-5 h-5" style={{ color: "var(--text-3)" }} />
          <p className="text-sm" style={{ color: "var(--text-3)" }}>
            No weight logged
          </p>
        </div>
      )}
    </Card>
  );
}

/* ─── Tasks Card ─────────────────────────────────────────────────────────── */
const PRIORITY_COLOR: Record<string, string> = {
  high:   "badge-danger",
  medium: "badge-warning",
  low:    "badge-success",
};

function TasksCard({ tasks, loading }: { tasks: Task[]; loading: boolean }) {
  if (loading) {
    return (
      <Card>
        <Skel className="h-6 w-28 mb-4" />
        <Skel className="h-10 w-20 mb-3" />
        <Skel className="h-2 w-full mb-4" />
        <div className="space-y-2">
          <Skel className="h-8 w-full" />
          <Skel className="h-8 w-full" />
          <Skel className="h-8 w-3/4" />
        </div>
      </Card>
    );
  }

  const t         = todayString();
  const dayStart  = new Date(t + "T00:00:00").getTime();
  const streak    = computeStreak(
    tasks
      .filter((tk) => tk.status === "completed" && tk.completedAt != null)
      .map((tk) => {
        const d = new Date(tk.completedAt!);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      })
  );
  const pending   = tasks.filter(
    (tk) => tk.status === "pending" && (!tk.dueDate || tk.dueDate === t)
  );
  const completed = tasks.filter(
    (tk) =>
      tk.status === "completed" &&
      tk.completedAt !== undefined &&
      tk.completedAt >= dayStart
  );
  const overdue   = tasks.filter(
    (tk) => tk.status === "pending" && tk.dueDate && tk.dueDate < t
  );
  const total = pending.length + completed.length;
  const pct   = total > 0 ? (completed.length / total) * 100 : 0;

  return (
    <Card>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "var(--accent-soft)" }}
          >
            <CheckSquare className="w-4 h-4" style={{ color: "var(--accent)" }} />
          </div>
          <span className="card-title">
            Today's Tasks
          </span>
        </div>
        <div className="flex items-center gap-2">
          {overdue.length > 0 && (
            <span className="badge-danger flex items-center gap-1 rounded-md">
              <AlertCircle className="w-3 h-3" />
              {overdue.length} overdue
            </span>
          )}
          <Link
            href="/dashboard/tasks"
            className="flex items-center gap-1 text-xs font-medium text-accent hover:opacity-80 transition-opacity"
          >
            Open <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* Progress fraction + bar */}
      <div className="mb-4">
        <div className="flex items-end justify-between mb-2">
          <div>
            <span className="text-2xl font-semibold tabular-nums" style={{ color: "var(--text-1)" }}>
              {completed.length}
            </span>
            <span className="text-sm font-semibold ml-1.5" style={{ color: "var(--text-3)" }}>
              / {total} done today
            </span>
          </div>
          <span className="text-sm font-medium tabular-nums" style={{ color: "var(--accent)" }}>{Math.round(pct)}%</span>
        </div>
        <Bar pct={pct} color="var(--accent)" />
      </div>

      {streak >= 2 && (
        <p className="metadata mb-3 flex items-center gap-1">
          <Flame className="w-3 h-3" style={{ color: "var(--accent)" }} />
          {streak}-day task streak
        </p>
      )}

      {/* Task list */}
      {pending.length > 0 ? (
        <div className="space-y-1.5">
          {pending.slice(0, 3).map((task) => (
            <div
              key={task.id}
              className="flex items-center gap-2 py-2 px-2.5 rounded-md"
              style={{ background: "var(--surface-raised)" }}
            >
              <div
                className="w-3.5 h-3.5 rounded-full border-2 shrink-0"
                style={{ borderColor: "var(--border)" }}
              />
              <span
                className="flex-1 text-xs font-medium truncate"
                style={{ color: "var(--text-2)" }}
              >
                {task.title}
              </span>
              {task.priority && (
                <span
                  className={cn(
                    "text-[10px] font-medium px-1.5 py-0.5 rounded-md shrink-0",
                    PRIORITY_COLOR[task.priority] ?? "text-gray-400 bg-gray-500/10"
                  )}
                >
                  {task.priority}
                </span>
              )}
            </div>
          ))}
          {pending.length > 3 && (
            <p className="text-xs text-center pt-1" style={{ color: "var(--text-3)" }}>
              +{pending.length - 3} more pending
            </p>
          )}
        </div>
      ) : completed.length > 0 ? (
        <div className="flex-1 flex items-center gap-2 py-2">
          <CheckCircle2 className="w-5 h-5" style={{ color: "var(--success)" }} />
          <p className="text-sm font-medium" style={{ color: "var(--text-2)" }}>
            All tasks done today
          </p>
        </div>
      ) : (
        <div className="flex-1 flex items-center gap-2 py-2">
          <CheckSquare className="w-5 h-5" style={{ color: "var(--text-3)" }} />
          <p className="text-sm" style={{ color: "var(--text-3)" }}>
            No tasks due today
          </p>
        </div>
      )}
    </Card>
  );
}

/* ─── Workout Frequency Bars ─────────────────────────────────────────────── */
function WorkoutFrequencyBars({ sessions }: { sessions: WorkoutSession[] }) {
  // Build last-7-days array (oldest → today)
  const today = new Date();
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (6 - i));
    const y   = d.getFullYear();
    const mo  = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return {
      date:  `${y}-${mo}-${day}`,
      label: d.toLocaleDateString("en-IN", { weekday: "narrow" }),
    };
  });

  const sessionMap = new Map(sessions.map((s) => [s.date, s]));
  const durations  = sessions.map((s) => s.durationMinutes).filter(Boolean);
  const maxDur     = durations.length > 0 ? Math.max(...durations) : 60;

  const BAR_W  = 18;
  const GAP    = 7;
  const CHART_H = 32;
  const LABEL_H = 14;
  const TOTAL_W = 7 * BAR_W + 6 * GAP;
  const W = TOTAL_W;
  const H = CHART_H + LABEL_H;

  return (
    <div className="mt-4 pt-4" style={{ borderTop: "1px solid var(--border-subtle)" }}>
      <p
        className="text-xs font-medium mb-2"
        style={{ color: "var(--text-3)" }}
      >
        Last 7 days
      </p>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ height: `${H}px` }}
        aria-hidden="true"
      >
        {days.map(({ date, label }, i) => {
          const session = sessionMap.get(date);
          const trained = !!session;
          const dur     = session?.durationMinutes ?? 0;
          const barH    = trained ? Math.max(8, (dur / maxDur) * CHART_H) : 4;
          const x       = i * (BAR_W + GAP);
          const y       = CHART_H - barH;

          return (
            <g key={date}>
              <rect
                x={x} y={y}
                width={BAR_W} height={barH}
                rx="4"
                style={{ fill: trained ? "var(--accent)" : "var(--surface-3)" }}
              />
              <text
                x={x + BAR_W / 2}
                y={CHART_H + LABEL_H - 1}
                textAnchor="middle"
                style={{ fill: "var(--text-3)", fontSize: "10px", fontFamily: "var(--font-sans)" }}
              >
                {label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* ─── Workout Card ───────────────────────────────────────────────────────── */
function WorkoutCard({
  sessions,
  loading,
  assignedRoutine,
}: {
  sessions: WorkoutSession[];
  loading: boolean;
  assignedRoutine?: { planName: string; templateIds: string[]; daysPerWeek: number } | null;
}) {
  if (loading) {
    return (
      <Card>
        <Skel className="h-6 w-28 mb-4" />
        <Skel className="h-6 w-32 mb-3" />
        <div className="space-y-2">
          <Skel className="h-8 w-full" />
          <Skel className="h-8 w-full" />
        </div>
      </Card>
    );
  }

  const today        = todayString();
  const todaySession = sessions.find((s) => s.date === today);
  const lastSession  = sessions[0];
  const streak       = computeStreak(sessions.map((s) => s.date));

  const cardioCal = (s: WorkoutSession) =>
    (s.cardioLogs ?? []).reduce((sum, c) => sum + (c.caloriesBurned ?? 0), 0);

  // Parse YYYY-MM-DD safely without UTC shift
  const formatSessionDate = (date: string) => {
    const [y, mo, d] = date.split("-").map(Number);
    return new Date(y, mo - 1, d).toLocaleDateString("en-IN", {
      weekday: "short", day: "numeric", month: "short",
    });
  };

  return (
    <Card>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "var(--accent-soft)" }}
          >
            <Dumbbell className="w-4 h-4" style={{ color: "var(--accent)" }} />
          </div>
          <span className="card-title">
            Workout
          </span>
        </div>
        <div className="flex items-center gap-2">
          {streak >= 2 && (
            <span className="text-xs font-medium" style={{ color: "var(--text-3)" }}>
              <Flame className="w-3 h-3" />
              {streak}-day streak
            </span>
          )}
          <Link
            href="/dashboard/workout"
            className="flex items-center gap-1 text-xs font-medium text-accent hover:opacity-80 transition-opacity"
          >
            {todaySession ? "View" : "Log"} <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {todaySession ? (
        <div className="space-y-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="flex items-center gap-1 text-xs font-medium" style={{ color: "var(--success)" }}>
              <CheckCircle2 className="w-3.5 h-3.5" /> Workout logged today
            </span>
            {todaySession.durationMinutes > 0 && (
              <span className="text-xs" style={{ color: "var(--text-3)" }}>
                {todaySession.durationMinutes} min
              </span>
            )}
          </div>
          <div className="space-y-1.5">
            {todaySession.exercises.slice(0, 3).map((ex) => (
              <div
                key={ex.id}
                className="flex items-center gap-2 py-2 px-2.5 rounded-md"
                style={{ background: "var(--surface-raised)" }}
              >
                <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "var(--accent)" }} />
                <span
                  className="text-xs font-medium flex-1 truncate"
                  style={{ color: "var(--text-2)" }}
                >
                  {ex.name}
                </span>
                <span className="text-xs shrink-0" style={{ color: "var(--text-3)" }}>
                  {ex.sets.length} sets
                </span>
              </div>
            ))}
            {todaySession.exercises.length > 3 && (
              <p className="text-xs text-center" style={{ color: "var(--text-3)" }}>
                +{todaySession.exercises.length - 3} more exercises
              </p>
            )}
          </div>
          {cardioCal(todaySession) > 0 && (
            <p className="text-xs" style={{ color: "var(--text-3)" }}>
              Cardio: ~{cardioCal(todaySession)} kcal burned
            </p>
          )}
          <WorkoutFrequencyBars sessions={sessions} />
        </div>
      ) : lastSession ? (
        <div className="space-y-3">
          <div>
            <p className="text-[11px] uppercase tracking-wider font-semibold" style={{ color: "var(--text-3)" }}>
              Last session
            </p>
            <p className="text-sm font-bold mt-0.5" style={{ color: "var(--text-1)" }}>
              {formatSessionDate(lastSession.date)}
              {lastSession.durationMinutes > 0 && (
                <span className="font-normal text-xs ml-2" style={{ color: "var(--text-3)" }}>
                  {lastSession.durationMinutes} min
                </span>
              )}
            </p>
          </div>
          <div className="space-y-1.5">
            {lastSession.exercises.slice(0, 2).map((ex) => (
              <div
                key={ex.id}
                className="flex items-center gap-2 py-2 px-2.5 rounded-md"
                style={{ background: "var(--surface-raised)" }}
              >
                <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "var(--border)" }} />
                <span
                  className="text-xs font-medium flex-1 truncate"
                  style={{ color: "var(--text-2)" }}
                >
                  {ex.name}
                </span>
              </div>
            ))}
          </div>
          <Link
            href="/dashboard/workout"
            className="flex items-center justify-center gap-1.5 min-h-10 rounded-md text-sm font-medium text-accent hover:bg-accent-soft transition-colors"
            style={{ border: "1px dashed var(--border)" }}
          >
            Log today's workout
          </Link>
          <WorkoutFrequencyBars sessions={sessions} />
        </div>
      ) : assignedRoutine ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 py-5 text-center">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 mb-1">
            <Dumbbell className="w-5 h-5" />
          </div>
          <p className="text-sm font-black" style={{ color: "var(--text-1)" }}>
            {assignedRoutine.planName}
          </p>
          <p className="text-xs font-medium" style={{ color: "var(--text-3)" }}>
            {assignedRoutine.daysPerWeek} sessions / week assigned
          </p>
          <Link
            href="/dashboard/workout"
            className="inline-flex items-center justify-center gap-1.5 mt-2 py-2 px-4 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-all shadow-xs"
          >
            Start your session →
          </Link>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-between gap-3 py-2">
          <p className="text-sm" style={{ color: "var(--text-3)" }}>
            No workouts logged yet
          </p>
          <Link
            href="/dashboard/workout"
            className="text-sm font-medium text-accent hover:opacity-80 transition-opacity shrink-0"
          >
            Log workout
          </Link>
        </div>
      )}
    </Card>
  );
}

/* ─── HomeView ───────────────────────────────────────────────────────────── */
export default function HomeView() {
  const { data: session } = useSession();
  const userId    = (session?.user as any)?.id as string | undefined;
  const firstName = session?.user?.name?.split(" ")[0] ?? "there";

  const [meals,    setMeals]    = useState<MealEntry[]>([]);
  const [goals,    setGoals]    = useState<MacroGoals | null>(null);
  const [tasks,    setTasks]    = useState<Task[]>([]);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [weights,  setWeights]  = useState<BodyWeightEntry[]>([]);
  const [allMeals, setAllMeals] = useState<MealEntry[]>([]);
  const [profile,  setProfile]  = useState<UserProfileDocument | null>(null);
  const [loading,  setLoading]  = useState(true);

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
    ]).then(([m, g, t, s, w, am, p]) => {
      setMeals(m);
      setGoals(g);
      setTasks(t);
      setSessions(s);
      setWeights(w);
      setAllMeals(am);
      setProfile(p);
    }).finally(() => setLoading(false));
  }, [userId]);

  const taskStreak = computeStreak(
    tasks.filter(t => t.status === "completed" && t.completedAt != null)
      .map(t => {
        const d = new Date(t.completedAt!);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      })
  );
  const workoutStreak = computeStreak(sessions.map(s => s.date));

  // --- Helper components for the new hierarchy ---
  function ConsistencyInfo({ tasks, sessions, loading }: { tasks: Task[]; sessions: WorkoutSession[]; loading: boolean }) {
    const taskStreak = computeStreak(
      tasks.filter(t => t.status === "completed" && t.completedAt != null)
        .map(t => {
          const d = new Date(t.completedAt!);
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        })
    );
    const workoutStreak = computeStreak(sessions.map(s => s.date));
    if (loading) return <Skel className="h-6 w-40" />;
    return (
      <Card className="p-3">
        <div className="flex items-center gap-2 text-sm" style={{ color: "var(--text-2)" }}>
          <Flame className="w-3 h-3" style={{ color: "var(--accent)" }} />
          <span>{taskStreak}-day task streak</span>
          <span className="mx-1">·</span>
          <span>{workoutStreak}-day workout streak</span>
        </div>
      </Card>
    );
  }

  function TodayFocus({ tasks, meals, sessions, loading }: { tasks: Task[]; meals: MealEntry[]; sessions: WorkoutSession[]; loading: boolean }) {
    const today = todayString();
    const overdue = tasks.filter(t => t.status === "pending" && t.dueDate && t.dueDate < today);
    const due = tasks.filter(t => t.status === "pending" && (!t.dueDate || t.dueDate === today));
    const todayWorkout = sessions.find(s => s.date === today);
    const calorieTotal = meals.reduce((c, m) => c + m.macros.calories, 0);
    const nutritionGoals = (goals ?? { calories: 2000, proteinG: 150, carbsG: 200, fatG: 65 });
    const actions = [] as { href: string; label: string; icon: React.ReactNode }[];
    if (overdue.length > 0) actions.push({ href: "/dashboard/tasks", label: `${overdue.length} overdue`, icon: <AlertCircle className="w-4 h-4" /> });
    else if (due.length > 0) actions.push({ href: "/dashboard/tasks", label: `${due.length} tasks today`, icon: <CheckSquare className="w-4 h-4" /> });
    else if (!todayWorkout) actions.push({ href: "/dashboard/workout", label: "Log workout", icon: <Dumbbell className="w-4 h-4" /> });
    else if (meals.length === 0 || calorieTotal < nutritionGoals.calories) actions.push({ href: "/dashboard/diet", label: "Log a meal", icon: <Flame className="w-4 h-4" /> });
    else actions.push({ href: "/dashboard/diet", label: "Review nutrition", icon: <Flame className="w-4 h-4" /> });
    return (
      <Card className="p-4">
        <h2 className="text-lg font-semibold mb-2" style={{ color: "var(--text-1)" }}>Today's Focus</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {actions.map(a => (
            <Link key={a.href} href={a.href} className="flex items-center gap-2 p-2 rounded-md bg-accent-soft hover:bg-accent transition-colors">
              {a.icon}
              <span className="font-medium" style={{ color: "var(--accent)" }}>{a.label}</span>
            </Link>
          ))}
        </div>
      </Card>
    );
  }

  function SatatInsight({ loading }: { loading: boolean }) {
    return (
      <Card className="p-4">
        <h2 className="text-lg font-semibold mb-2" style={{ color: "var(--text-1)" }}>Satat Insight</h2>
        {loading ? <Skel className="h-6 w-40" /> : <p className="text-sm" style={{ color: "var(--text-2)" }}>Your progress is steady. Keep the consistency and consider a short cardio session tomorrow.</p>}
      </Card>
    );
  }
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* ── Greeting ── */}
      <div>
        <h1 className="page-title">
          {getGreeting(firstName)}
        </h1>
        <p className="page-description mt-1">
          {formatDate()}
        </p>
      </div>

      {/* Today's Focus */}
      <TodayFocus tasks={tasks} meals={meals} sessions={sessions} loading={loading} />
      {/* Consistency */}
      <ConsistencyInfo tasks={tasks} sessions={sessions} loading={loading} />
        <SatatInsight loading={loading} />

      {/* ── Today's actions and nutrition ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <TasksCard tasks={tasks} loading={loading} />
        <CalorieCard meals={meals} goals={goals} loading={loading} />
      </div>

      {/* ── Training and weight trend ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          <WorkoutCard sessions={sessions} loading={loading} />
        </div>
        <WeightCard entries={weights} loading={loading} />
      </div>

      {/* ── Activity Heatmap ── */}
      <ActivityHeatmap
        sessions={sessions}
        tasks={tasks}
        allMeals={allMeals}
        loading={loading}
      />
    </div>
  );
}
