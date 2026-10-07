"use client";

import { useEffect, useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  Dumbbell, Utensils, CheckSquare, Sparkles, ChevronRight,
  Flame, Check, ArrowRight, Scale, Clock, AlertCircle, Plus
} from "lucide-react";
import {
  getAllTasks, getMeals, getMacroGoals,
  getWorkoutSessions, getBodyWeightEntries, getAllMeals, getUserProfile,
  updateTask,
} from "@/lib/firestore";
import ActivityHeatmap from "@/components/dashboard/ActivityHeatmap";
import { todayString, formatDate } from "@/lib/utils";
import type { Task, MealEntry, MacroGoals, WorkoutSession, BodyWeightEntry, UserProfileDocument } from "@/types";

/* ── Greeting helper ── */
function getGreeting(name: string) {
  const h = new Date().getHours();
  if (h < 5) return `Working late, ${name}`;
  if (h < 12) return `Good morning, ${name}`;
  if (h < 17) return `Good afternoon, ${name}`;
  if (h < 21) return `Good evening, ${name}`;
  return `Good night, ${name}`;
}

function formatCurrentDate() {
  return new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

/* ── Streak calculator ── */
function computeStreak(dateSeries: string[]): number {
  if (dateSeries.length === 0) return 0;
  const unique = Array.from(new Set(dateSeries)).sort((a, b) => b.localeCompare(a));
  const prevDay = (ds: string) => {
    const [y, m, d] = ds.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    dt.setDate(dt.getDate() - 1);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
  };
  const today = todayString();
  const yesterday = prevDay(today);
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

  // Derived metrics
  const today = todayString();
  const todaySession = sessions.find((s) => s.date === today);
  const todayTasks = tasks.filter((t) => !t.dueDate || t.dueDate === today || (t.dueDate < today && t.status === "pending"));
  const completedTodayTasks = todayTasks.filter((t) => t.status === "completed");
  const pendingTasks = todayTasks.filter((t) => t.status === "pending");

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

  const calorieGoal = goals?.calories ?? 2200;
  const proteinGoal = goals?.proteinG ?? 150;
  const caloriePct = Math.min(100, Math.round((totals.cal / calorieGoal) * 100));

  const taskStreak = computeStreak(
    tasks
      .filter((t) => t.status === "completed" && t.completedAt != null)
      .map((t) => {
        const d = new Date(t.completedAt!);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      })
  );
  const workoutStreak = computeStreak(sessions.map((s) => s.date));

  // Weight stats
  const latestWeight = weights.length > 0 ? weights[0].weightKg : null;
  const prevWeight = weights.length > 1 ? weights[1].weightKg : null;
  const weightDelta = latestWeight && prevWeight ? (latestWeight - prevWeight).toFixed(1) : null;

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
            ? {
                ...t,
                status: currentStatus as any,
              }
            : t
        )
      );
    }
  };

  // Orbit context brief derived honestly from state
  const orbitInsight = useMemo(() => {
    if (todaySession) {
      return {
        title: "Session Completed",
        text: `Logged ${todaySession.exercises.length} exercises today (${todaySession.durationMinutes || 45}m). Prioritize ${Math.max(0, Math.round(proteinGoal - totals.p))}g more protein to hit recovery targets.`,
        actionLabel: "Review Workout",
        actionHref: "/dashboard/workout",
      };
    }
    if (pendingTasks.length > 0 && totals.cal < 500) {
      return {
        title: "Morning Pacing",
        text: `You have ${pendingTasks.length} pending items and haven't logged your first meal yet. Keep energy steady early.`,
        actionLabel: "Log Breakfast",
        actionHref: "/dashboard/diet",
      };
    }
    if (!todaySession && profile?.workoutPlanAssignment) {
      return {
        title: "Training Target",
        text: `Assigned routine: ${profile.workoutPlanAssignment.planName}. Recommended time to train before evening fatigue sets in.`,
        actionLabel: "Start Workout",
        actionHref: "/dashboard/workout",
      };
    }
    return {
      title: "System Momentum",
      text: `${taskStreak > 0 ? `${taskStreak}-day task consistency` : "Daily tracking active"}. Focus on executing your priority items today.`,
      actionLabel: "Ask Orbit",
      actionHref: "#orbit",
    };
  }, [todaySession, pendingTasks.length, totals.cal, totals.p, proteinGoal, profile, taskStreak]);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-pulse py-2">
        <div className="space-y-2">
          <div className="h-4 w-24 bg-white/5 rounded" />
          <div className="h-7 w-48 bg-white/10 rounded" />
          <div className="h-3 w-32 bg-white/5 rounded" />
        </div>
        <div className="h-28 rounded-2xl bg-white/5" />
        <div className="h-44 rounded-2xl bg-white/5" />
        <div className="h-32 rounded-2xl bg-white/5" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-1 select-none animate-fade-in">
      {/* ── 1. HEADER: Clean, Quiet, Personal ── */}
      <div className="flex items-start justify-between pt-1">
        <div>
          <span className="text-[11px] font-semibold tracking-wider uppercase" style={{ color: "var(--text-muted)" }}>
            {getGreeting(firstName).split(",")[0]}
          </span>
          <h1
            className="text-2xl font-semibold tracking-tight mt-0.5"
            style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
          >
            {firstName}
          </h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
            {formatCurrentDate()}
          </p>
        </div>

        <Link
          href="/dashboard/settings"
          className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
          style={{
            background: "var(--satat-surface, #0D0F11)",
            border: "1px solid var(--satat-border, rgba(255,255,255,0.08))",
            color: "var(--text-secondary)",
          }}
          aria-label="Profile and Settings"
        >
          <span className="text-xs font-semibold uppercase">{firstName.charAt(0)}</span>
        </Link>
      </div>

      {/* ── 2. ORBIT CONTEXT BRIEF: Proactive ambient intelligence ── */}
      <div
        className="p-4 rounded-2xl transition-colors"
        style={{
          background: "var(--satat-surface, #0D0F11)",
          border: "1px solid var(--satat-border-subtle, rgba(255,255,255,0.05))",
        }}
      >
        <div className="flex items-center gap-2 mb-1.5">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--satat-brand, #6E8BFF)" }} />
          <span className="text-[11px] font-semibold tracking-wider uppercase" style={{ color: "var(--satat-brand, #6E8BFF)" }}>
            Orbit Context · {orbitInsight.title}
          </span>
        </div>
        <p className="text-[13px] leading-relaxed" style={{ color: "var(--text-primary)" }}>
          &ldquo;{orbitInsight.text}&rdquo;
        </p>
        <div className="mt-3 flex items-center gap-3">
          {orbitInsight.actionHref.startsWith("#") ? (
            <button
              type="button"
              onClick={() => {
                if (typeof window !== "undefined") {
                  window.dispatchEvent(new CustomEvent("satat:open-orbit"));
                }
              }}
              className="text-xs font-semibold flex items-center gap-1 hover:underline"
              style={{ color: "var(--satat-brand, #6E8BFF)" }}
            >
              <span>{orbitInsight.actionLabel}</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          ) : (
            <Link
              href={orbitInsight.actionHref}
              className="text-xs font-semibold flex items-center gap-1 hover:underline"
              style={{ color: "var(--satat-brand, #6E8BFF)" }}
            >
              <span>{orbitInsight.actionLabel}</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          )}
        </div>
      </div>

      {/* ── 3. TODAY: Focus Actions as Clean Rows ── */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between pb-0.5">
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
            Today&apos;s Focus
          </span>
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            {completedTodayTasks.length} of {todayTasks.length} Done
          </span>
        </div>

        <div
          className="rounded-2xl divide-y overflow-hidden"
          style={{
            background: "var(--satat-surface, #0D0F11)",
            border: "1px solid var(--satat-border-subtle, rgba(255,255,255,0.05))",
          }}
        >
          {todayTasks.length === 0 ? (
            <div className="p-4 text-center">
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                No tasks scheduled for today
              </p>
              <Link
                href="/dashboard/tasks"
                className="inline-flex items-center gap-1 text-xs font-semibold mt-2 hover:underline"
                style={{ color: "var(--satat-brand, #6E8BFF)" }}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add first task</span>
              </Link>
            </div>
          ) : (
            todayTasks.slice(0, 5).map((task) => {
              const isDone = task.status === "completed";
              return (
                <div
                  key={task.id}
                  onClick={() => handleToggleTask(task.id, task.status)}
                  className="flex items-center justify-between p-3.5 cursor-pointer transition-colors hover:bg-white/[0.02] active:bg-white/[0.04]"
                >
                  <div className="flex items-center gap-3 min-w-0">
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
                      className={`text-[13px] font-medium leading-tight truncate ${
                        isDone ? "line-through opacity-40" : ""
                      }`}
                      style={{ color: "var(--text-primary)" }}
                    >
                      {task.title}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    {task.priority === "high" && !isDone && (
                      <span
                        className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded"
                        style={{ background: "rgba(234, 119, 119, 0.15)", color: "var(--satat-error, #EA7777)" }}
                      >
                        High
                      </span>
                    )}
                    <span className="text-xs font-medium tabular-nums" style={{ color: "var(--text-secondary)" }}>
                      {task.dueDate === today ? "Today" : task.dueDate || "Planned"}
                    </span>
                  </div>
                </div>
              );
            })
          )}

          {todayTasks.length > 5 && (
            <Link
              href="/dashboard/tasks"
              className="flex items-center justify-center p-2.5 text-xs font-medium hover:bg-white/[0.02]"
              style={{ color: "var(--text-secondary)" }}
            >
              +{todayTasks.length - 5} more tasks in Plan →
            </Link>
          )}
        </div>
      </div>

      {/* ── 4. TRAINING & NUTRITION CARDS: Clean Row Integrations ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Workout Row Card */}
        <Link
          href="/dashboard/workout"
          className="p-4 rounded-2xl flex flex-col justify-between transition-all hover:border-white/15"
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
              className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
              style={{
                background: todaySession ? "rgba(99, 210, 184, 0.12)" : "rgba(110, 139, 255, 0.12)",
                color: todaySession ? "var(--satat-mint, #63D2B8)" : "var(--satat-brand, #6E8BFF)",
              }}
            >
              {todaySession ? "Completed" : "Scheduled"}
            </span>
          </div>

          <div>
            <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>
              {todaySession
                ? `${todaySession.exercises.length} Exercises Logged`
                : profile?.workoutPlanAssignment?.planName || "Daily Training Session"}
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
              {todaySession
                ? `${todaySession.durationMinutes || 45} mins · Great work`
                : `${profile?.workoutPlanAssignment?.daysPerWeek || 4} days/week targeted`}
            </p>
          </div>

          <div className="mt-3 flex items-center justify-between pt-2" style={{ borderTop: "1px solid var(--satat-border-subtle, rgba(255,255,255,0.05))" }}>
            <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
              {todaySession ? "View session details" : "Start session"}
            </span>
            <ChevronRight className="w-3.5 h-3.5" style={{ color: "var(--text-secondary)" }} />
          </div>
        </Link>

        {/* Nutrition Row Card */}
        <Link
          href="/dashboard/diet"
          className="p-4 rounded-2xl flex flex-col justify-between transition-all hover:border-white/15"
          style={{
            background: "var(--satat-surface, #0D0F11)",
            border: "1px solid var(--satat-border-subtle, rgba(255,255,255,0.05))",
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              Nutrition
            </span>
            <span className="text-xs font-semibold tabular-nums" style={{ color: "var(--text-primary)" }}>
              {Math.round(totals.cal)} / {calorieGoal} kcal
            </span>
          </div>

          {/* Clean Progress Bar */}
          <div className="w-full h-1.5 rounded-full overflow-hidden my-1.5" style={{ background: "var(--surface-inset)" }}>
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${caloriePct}%`,
                background: "var(--satat-brand, #6E8BFF)",
              }}
            />
          </div>

          <div className="flex items-center justify-between text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
            <span>Protein: <strong className="font-semibold" style={{ color: "var(--text-primary)" }}>{Math.round(totals.p)}g</strong> / {proteinGoal}g</span>
            <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
              {Math.max(0, calorieGoal - Math.round(totals.cal))} kcal left
            </span>
          </div>

          <div className="mt-3 flex items-center justify-between pt-2" style={{ borderTop: "1px solid var(--satat-border-subtle, rgba(255,255,255,0.05))" }}>
            <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
              {meals.length === 0 ? "Log today's meal" : `${meals.length} meals tracked`}
            </span>
            <ChevronRight className="w-3.5 h-3.5" style={{ color: "var(--text-secondary)" }} />
          </div>
        </Link>
      </div>

      {/* ── 5. YOUR DAY OVERVIEW: High-level metric anchors ── */}
      <div className="space-y-2">
        <span className="text-xs font-semibold uppercase tracking-wider block" style={{ color: "var(--text-muted)" }}>
          Your Day Overview
        </span>

        <div
          className="grid grid-cols-3 gap-2.5 p-3.5 rounded-2xl"
          style={{
            background: "var(--satat-surface, #0D0F11)",
            border: "1px solid var(--satat-border-subtle, rgba(255,255,255,0.05))",
          }}
        >
          <Link href="/dashboard/tasks" className="block hover:opacity-80 transition-opacity">
            <span className="text-[11px] block" style={{ color: "var(--text-muted)" }}>Tasks</span>
            <span className="text-base sm:text-lg font-semibold tabular-nums mt-0.5 block" style={{ color: "var(--text-primary)" }}>
              {pendingTasks.length} pending
            </span>
          </Link>

          <Link href="/dashboard/workout" className="block hover:opacity-80 transition-opacity">
            <span className="text-[11px] block" style={{ color: "var(--text-muted)" }}>Workout</span>
            <span
              className="text-base sm:text-lg font-semibold tabular-nums mt-0.5 block"
              style={{ color: todaySession ? "var(--satat-mint, #63D2B8)" : "var(--satat-brand, #6E8BFF)" }}
            >
              {todaySession ? "Done" : "Planned"}
            </span>
          </Link>

          <Link href="/dashboard/diet" className="block hover:opacity-80 transition-opacity">
            <span className="text-[11px] block" style={{ color: "var(--text-muted)" }}>Nutrition</span>
            <span className="text-base sm:text-lg font-semibold tabular-nums mt-0.5 block" style={{ color: "var(--satat-mint, #63D2B8)" }}>
              {Math.round(totals.cal)} kcal
            </span>
          </Link>
        </div>
      </div>

      {/* ── 6. CONTINUITY: Streak & Body Weight ── */}
      <div
        className="p-3.5 rounded-2xl flex items-center justify-between"
        style={{
          background: "var(--satat-surface, #0D0F11)",
          border: "1px solid var(--satat-border-subtle, rgba(255,255,255,0.05))",
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "rgba(99, 210, 184, 0.12)", color: "var(--satat-mint, #63D2B8)" }}
          >
            <Flame className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-semibold block" style={{ color: "var(--text-primary)" }}>
              Continuous Streak: {Math.max(taskStreak, workoutStreak)} Days
            </span>
            <span className="text-[11px] block mt-0.5" style={{ color: "var(--text-secondary)" }}>
              {taskStreak}d tasks · {workoutStreak}d workouts logged
            </span>
          </div>
        </div>

        {latestWeight && (
          <div className="text-right">
            <span className="text-xs font-semibold tabular-nums block" style={{ color: "var(--text-primary)" }}>
              {latestWeight} kg
            </span>
            {weightDelta && (
              <span className="text-[10px] tabular-nums" style={{ color: "var(--text-muted)" }}>
                {parseFloat(weightDelta) > 0 ? `+${weightDelta}` : weightDelta} kg
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── 7. ACTIVITY HEATMAP: Long-term compounding progress ── */}
      <div className="pt-2">
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
