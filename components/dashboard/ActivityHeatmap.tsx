"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, Flame, Trophy, Calendar, Sparkles, Check, Clock } from "lucide-react";
import { localDateString, todayString } from "@/lib/utils";
import type { Task, WorkoutSession, MealEntry } from "@/types";

interface Props {
  sessions: WorkoutSession[];
  tasks: Task[];
  allMeals: MealEntry[];
  loading: boolean;
}

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function getPrevDay(ds: string): string {
  const [y, m, d] = ds.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() - 1);
  return localDateString(dt);
}

function getNextDay(ds: string): string {
  const [y, m, d] = ds.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + 1);
  return localDateString(dt);
}

export default function ActivityHeatmap({ sessions, tasks, allMeals, loading }: Props) {
  const todayStr = useMemo(() => todayString(), []);

  // Default to today's local year and month
  const todayDate = useMemo(() => new Date(), []);
  const [viewYear, setViewYear] = useState(() => todayDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(() => todayDate.getMonth()); // 0-indexed
  const [selectedDateStr, setSelectedDateStr] = useState(() => todayString());
  const [viewMode, setViewMode] = useState<"month" | "year">("month");

  const yearScrollRef = useRef<HTMLDivElement>(null);

  // When switching to year view, automatically scroll to right so TODAY is visible
  useEffect(() => {
    if (viewMode === "year" && yearScrollRef.current) {
      yearScrollRef.current.scrollLeft = yearScrollRef.current.scrollWidth;
    }
  }, [viewMode]);

  // Activity lookup set
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

  // Workouts and tasks by date
  const workoutDates = useMemo(() => new Set(sessions.map((s) => s.date)), [sessions]);
  const taskDatesMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of tasks) {
      if (t.status === "completed" && t.completedAt) {
        const ds = localDateString(new Date(t.completedAt));
        m.set(ds, (m.get(ds) ?? 0) + 1);
      }
    }
    return m;
  }, [tasks]);
  const mealDates = useMemo(() => new Set(allMeals.map((m) => m.date)), [allMeals]);

  // Compute streaks
  const { currentStreak, longestStreak } = useMemo(() => {
    const dates = Array.from(activeDatesSet).sort();
    if (dates.length === 0) return { currentStreak: 0, longestStreak: 0 };

    let longest = 0;
    let tempStreak = 0;
    let prevDateStr: string | null = null;

    for (const dStr of dates) {
      if (!prevDateStr) {
        tempStreak = 1;
      } else {
        const expected = getNextDay(prevDateStr);
        if (dStr === expected) {
          tempStreak++;
        } else {
          tempStreak = 1;
        }
      }
      if (tempStreak > longest) longest = tempStreak;
      prevDateStr = dStr;
    }

    const yesterdayStr = getPrevDay(todayStr);
    let current = 0;
    let checkDate: string | null = null;

    if (activeDatesSet.has(todayStr)) {
      checkDate = todayStr;
    } else if (activeDatesSet.has(yesterdayStr)) {
      checkDate = yesterdayStr;
    }

    if (checkDate) {
      current = 1;
      let prev = getPrevDay(checkDate);
      while (activeDatesSet.has(prev)) {
        current++;
        prev = getPrevDay(prev);
      }
    }

    return {
      currentStreak: current,
      longestStreak: Math.max(longest, current),
    };
  }, [activeDatesSet, todayStr]);

  // Calendar cells for currently selected viewMonth
  const { monthCells, monthActiveDaysCount, daysInCurrentMonth } = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1);
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    // ISO day-of-week for 1st of month: 0 = Monday, 6 = Sunday
    const startDow = (firstDay.getDay() + 6) % 7;

    const cells: { dateStr: string; dayNum: number; isPadding: boolean }[] = [];

    // Leading padding cells from previous month
    for (let i = 0; i < startDow; i++) {
      cells.push({ dateStr: "", dayNum: 0, isPadding: true });
    }

    let activeCount = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const dStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      if (activeDatesSet.has(dStr)) activeCount++;
      cells.push({ dateStr: dStr, dayNum: d, isPadding: false });
    }

    return {
      monthCells: cells,
      monthActiveDaysCount: activeCount,
      daysInCurrentMonth: daysInMonth,
    };
  }, [viewYear, viewMonth, activeDatesSet]);

  const monthLabel = useMemo(() => {
    return new Date(viewYear, viewMonth, 1).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  }, [viewYear, viewMonth]);

  const isCurrentMonth = useMemo(() => {
    return viewYear === todayDate.getFullYear() && viewMonth === todayDate.getMonth();
  }, [viewYear, viewMonth, todayDate]);

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleJumpToToday = () => {
    const now = new Date();
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
    setSelectedDateStr(todayStr);
  };

  // Details for selected date
  const selectedDetails = useMemo(() => {
    if (!selectedDateStr) return null;
    const hasWorkout = workoutDates.has(selectedDateStr);
    const session = sessions.find((s) => s.date === selectedDateStr);
    const tasksDone = taskDatesMap.get(selectedDateStr) ?? 0;
    const hasMeal = mealDates.has(selectedDateStr);
    const meals = allMeals.filter((m) => m.date === selectedDateStr);
    const calories = meals.reduce((acc, m) => acc + (m.macros?.calories || 0), 0);

    const isToday = selectedDateStr === todayStr;
    const isFuture = selectedDateStr > todayStr;

    const [y, m, d] = selectedDateStr.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    const label = dt.toLocaleDateString("en-US", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });

    return {
      label,
      isToday,
      isFuture,
      hasWorkout,
      session,
      tasksDone,
      hasMeal,
      mealCount: meals.length,
      calories,
    };
  }, [selectedDateStr, todayStr, workoutDates, sessions, taskDatesMap, mealDates, allMeals]);

  if (loading) {
    return (
      <div
        className="rounded-2xl p-4 sm:p-5 animate-pulse"
        style={{
          background: "var(--satat-surface, #0D0F11)",
          border: "1px solid var(--satat-border-subtle, rgba(255,255,255,0.05))",
          height: 260,
        }}
      />
    );
  }

  return (
    <div
      className="rounded-2xl p-4 sm:p-5 animate-fade-in select-none"
      style={{
        background: "var(--satat-surface, #0D0F11)",
        border: "1px solid var(--satat-border-subtle, rgba(255,255,255,0.05))",
      }}
    >
      {/* ── Section Header ── */}
      <div className="flex items-center justify-between mb-3.5">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider block" style={{ color: "var(--text-muted)" }}>
            Consistency
          </span>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
            Long-term compounding habit momentum
          </p>
        </div>

        {/* View mode toggle */}
        <div
          className="flex items-center gap-0.5 p-0.5 rounded-lg border text-xs"
          style={{
            background: "var(--satat-surface-elevated, #121519)",
            borderColor: "var(--satat-border-subtle, rgba(255,255,255,0.05))",
          }}
        >
          <button
            type="button"
            onClick={() => setViewMode("month")}
            className="px-2.5 py-1 rounded-md font-semibold transition-all"
            style={{
              background: viewMode === "month" ? "var(--satat-surface-high, #181C21)" : "transparent",
              color: viewMode === "month" ? "var(--text-primary)" : "var(--text-muted)",
              border: viewMode === "month" ? "1px solid var(--satat-border, rgba(255,255,255,0.08))" : "1px solid transparent",
            }}
          >
            Month
          </button>
          <button
            type="button"
            onClick={() => setViewMode("year")}
            className="px-2.5 py-1 rounded-md font-semibold transition-all"
            style={{
              background: viewMode === "year" ? "var(--satat-surface-high, #181C21)" : "transparent",
              color: viewMode === "year" ? "var(--text-primary)" : "var(--text-muted)",
              border: viewMode === "year" ? "1px solid var(--satat-border, rgba(255,255,255,0.08))" : "1px solid transparent",
            }}
          >
            Year
          </button>
        </div>
      </div>

      {/* ── 1. STREAK SUMMARY ROW (Section 25.3 & 25.4) ── */}
      <div
        className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl mb-4"
        style={{
          background: "var(--satat-surface-elevated, #121519)",
          border: "1px solid var(--satat-border-subtle, rgba(255,255,255,0.05))",
        }}
      >
        {/* Current streak */}
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <Flame className="w-3.5 h-3.5" style={{ color: "var(--satat-peach, #F2A080)" }} />
            <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              Streak
            </span>
          </div>
          <p className="text-lg font-semibold tabular-nums leading-none" style={{ color: "var(--text-primary)" }}>
            {currentStreak} <span className="text-xs font-normal" style={{ color: "var(--text-muted)" }}>days</span>
          </p>
        </div>

        {/* Best streak */}
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <Trophy className="w-3.5 h-3.5" style={{ color: "var(--satat-warning, #E0AB57)" }} />
            <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              Best
            </span>
          </div>
          <p className="text-lg font-semibold tabular-nums leading-none" style={{ color: "var(--text-primary)" }}>
            {longestStreak} <span className="text-xs font-normal" style={{ color: "var(--text-muted)" }}>days</span>
          </p>
        </div>

        {/* This month active days */}
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <Calendar className="w-3.5 h-3.5" style={{ color: "var(--satat-brand, #6E8BFF)" }} />
            <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              Month
            </span>
          </div>
          <p className="text-lg font-semibold tabular-nums leading-none" style={{ color: "var(--text-primary)" }}>
            {monthActiveDaysCount} <span className="text-xs font-normal" style={{ color: "var(--text-muted)" }}>active</span>
          </p>
        </div>

        {/* Today status */}
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <Clock className="w-3.5 h-3.5" style={{ color: activeDatesSet.has(todayStr) ? "var(--satat-mint, #63D2B8)" : "var(--text-muted)" }} />
            <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              Today
            </span>
          </div>
          <p
            className="text-xs font-semibold leading-tight flex items-center gap-1.5 mt-1"
            style={{ color: activeDatesSet.has(todayStr) ? "var(--satat-mint, #63D2B8)" : "var(--text-secondary)" }}
          >
            {activeDatesSet.has(todayStr) ? (
              <>
                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Active</span>
              </>
            ) : (
              <span>In progress</span>
            )}
          </p>
        </div>
      </div>

      {/* ── 2. MONTH VIEW (Zero Horizontal Scroll, Anchored to Today by Default) ── */}
      {viewMode === "month" ? (
        <div className="space-y-3">
          {/* Month Navigation Header */}
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>
                {monthLabel}
              </span>
              {!isCurrentMonth && (
                <button
                  type="button"
                  onClick={handleJumpToToday}
                  className="text-[11px] font-semibold px-2 py-0.5 rounded-full hover:underline"
                  style={{
                    background: "rgba(110, 139, 255, 0.12)",
                    color: "var(--satat-brand, #6E8BFF)",
                  }}
                >
                  Jump to Today
                </button>
              )}
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handlePrevMonth}
                aria-label="Previous month"
                className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-white/5"
                style={{ color: "var(--text-secondary)" }}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                aria-label="Next month"
                className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-white/5"
                style={{ color: "var(--text-secondary)" }}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Weekday columns */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {DAY_LABELS.map((day) => (
              <span key={day} className="text-[10px] font-semibold uppercase" style={{ color: "var(--text-muted)" }}>
                {day}
              </span>
            ))}
          </div>

          {/* Day Grid */}
          <div className="grid grid-cols-7 gap-1">
            {monthCells.map((cell, idx) => {
              if (cell.isPadding) {
                return <div key={`pad-${idx}`} className="h-9 sm:h-10 rounded-lg" />;
              }

              const isToday = cell.dateStr === todayStr;
              const isFuture = cell.dateStr > todayStr;
              const isActive = activeDatesSet.has(cell.dateStr);
              const isSelected = cell.dateStr === selectedDateStr;

              return (
                <button
                  key={cell.dateStr}
                  type="button"
                  onClick={() => setSelectedDateStr(cell.dateStr)}
                  className="h-9 sm:h-10 rounded-lg flex flex-col items-center justify-center relative transition-all"
                  style={{
                    background: isToday
                      ? "rgba(110, 139, 255, 0.15)"
                      : isSelected
                      ? "var(--satat-surface-elevated, #121519)"
                      : isActive
                      ? "rgba(99, 210, 184, 0.08)"
                      : "transparent",
                    border: isToday
                      ? "1.5px solid var(--satat-brand, #6E8BFF)"
                      : isSelected
                      ? "1px solid var(--satat-border-strong, rgba(255,255,255,0.15))"
                      : "1px solid transparent",
                    opacity: isFuture ? 0.35 : 1,
                  }}
                >
                  <span
                    className="text-xs font-semibold tabular-nums leading-none"
                    style={{
                      color: isToday
                        ? "var(--satat-brand, #6E8BFF)"
                        : isFuture
                        ? "var(--text-muted)"
                        : "var(--text-primary)",
                    }}
                  >
                    {cell.dayNum}
                  </span>

                  {/* Indicator dot */}
                  <div className="h-1 flex items-center justify-center mt-1">
                    {isActive && (
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{
                          background: isToday ? "var(--satat-brand, #6E8BFF)" : "var(--satat-mint, #63D2B8)",
                        }}
                      />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Micro-detail row for tapped/selected date */}
          {selectedDetails && (
            <div
              className="p-3 rounded-xl mt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs"
              style={{
                background: "var(--satat-surface-elevated, #121519)",
                border: "1px solid var(--satat-border-subtle, rgba(255,255,255,0.05))",
              }}
            >
              <div className="flex items-center gap-2">
                <span className="font-semibold" style={{ color: "var(--text-primary)" }}>
                  {selectedDetails.label}
                </span>
                {selectedDetails.isToday && (
                  <span
                    className="text-[10px] font-semibold px-1.5 py-0.2 rounded"
                    style={{ background: "rgba(110, 139, 255, 0.15)", color: "var(--satat-brand, #6E8BFF)" }}
                  >
                    Today
                  </span>
                )}
                {selectedDetails.isFuture && (
                  <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                    (Upcoming)
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                {selectedDetails.hasWorkout ? (
                  <span style={{ color: "var(--satat-brand, #6E8BFF)" }}>
                    💪 Workout ({selectedDetails.session?.exercises.length || 0} ex)
                  </span>
                ) : (
                  <span style={{ color: "var(--text-muted)" }}>No workout</span>
                )}

                {selectedDetails.tasksDone > 0 ? (
                  <span style={{ color: "var(--satat-mint, #63D2B8)" }}>
                    ✓ {selectedDetails.tasksDone} {selectedDetails.tasksDone === 1 ? "task" : "tasks"}
                  </span>
                ) : (
                  <span style={{ color: "var(--text-muted)" }}>0 tasks</span>
                )}

                {selectedDetails.calories > 0 ? (
                  <span style={{ color: "var(--satat-peach, #F2A080)" }}>
                    🥗 {Math.round(selectedDetails.calories)} kcal
                  </span>
                ) : (
                  <span style={{ color: "var(--text-muted)" }}>0 meals</span>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ── 3. ANNUAL 52-WEEK HEATMAP VIEW (Auto-scrolled to Today on Right) ── */
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs px-1" style={{ color: "var(--text-muted)" }}>
            <span>52-Week Progress</span>
            <span>Today is aligned on the right →</span>
          </div>

          <div ref={yearScrollRef} className="overflow-x-auto py-1">
            <AnnualHeatmapGrid
              sessions={sessions}
              tasks={tasks}
              allMeals={allMeals}
              todayStr={todayStr}
              activeDatesSet={activeDatesSet}
            />
          </div>
        </div>
      )}
    </div>
  );
}

/* ── 52-Week Annual Heatmap Grid Subcomponent ── */
function AnnualHeatmapGrid({
  sessions,
  tasks,
  allMeals,
  todayStr,
  activeDatesSet,
}: {
  sessions: WorkoutSession[];
  tasks: Task[];
  allMeals: MealEntry[];
  todayStr: string;
  activeDatesSet: Set<string>;
}) {
  const WEEKS = 52;
  const CELL = 12;
  const GAP = 3;
  const STEP = CELL + GAP;

  const { weeks, monthLabels } = useMemo(() => {
    const today = new Date();
    const dow = (today.getDay() + 6) % 7; // ISO Mon=0..Sun=6
    const thisMonday = new Date(today);
    thisMonday.setDate(today.getDate() - dow);

    const startDate = new Date(thisMonday);
    startDate.setDate(thisMonday.getDate() - (WEEKS - 1) * 7);

    const allDays: string[] = [];
    for (let i = 0; i < WEEKS * 7; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      allDays.push(localDateString(d));
    }

    const weekArrays: string[][] = [];
    for (let w = 0; w < WEEKS; w++) {
      weekArrays.push(allDays.slice(w * 7, w * 7 + 7));
    }

    const labels: { label: string; col: number }[] = [];
    let lastMonth = -1;
    weekArrays.forEach((week, wi) => {
      const m = new Date(week[0] + "T12:00:00").getMonth();
      if (m !== lastMonth) {
        labels.push({
          label: new Date(week[0] + "T12:00:00").toLocaleString("en-US", { month: "short" }),
          col: wi,
        });
        lastMonth = m;
      }
    });

    return { weeks: weekArrays, monthLabels: labels };
  }, [WEEKS]);

  const workoutDates = useMemo(() => new Set(sessions.map((s) => s.date)), [sessions]);
  const taskDatesMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of tasks) {
      if (t.status === "completed" && t.completedAt) {
        const ds = localDateString(new Date(t.completedAt));
        m.set(ds, (m.get(ds) ?? 0) + 1);
      }
    }
    return m;
  }, [tasks]);
  const mealDates = useMemo(() => new Set(allMeals.map((m) => m.date)), [allMeals]);

  const getDayLevel = (d: string): number => {
    if (d > todayStr) return -1; // future
    let score = 0;
    if (workoutDates.has(d)) score++;
    if ((taskDatesMap.get(d) ?? 0) > 0) score++;
    if (mealDates.has(d)) score++;
    return score;
  };

  const LEVEL_BG = [
    "var(--satat-surface-elevated, #121519)",
    "rgba(110, 139, 255, 0.25)",
    "rgba(99, 210, 184, 0.45)",
    "var(--satat-mint, #63D2B8)",
  ];

  return (
    <div style={{ display: "inline-block", minWidth: WEEKS * STEP }}>
      {/* Month Labels */}
      <div style={{ position: "relative", height: 14, marginBottom: 4 }}>
        {monthLabels.map((m, i) => (
          <span
            key={i}
            style={{
              position: "absolute",
              left: m.col * STEP,
              fontSize: 10,
              fontWeight: 600,
              color: "var(--text-muted)",
              whiteSpace: "nowrap",
            }}
          >
            {m.label}
          </span>
        ))}
      </div>

      {/* Grid columns */}
      <div style={{ display: "flex", gap: GAP }}>
        {weeks.map((week, wi) => (
          <div key={wi} style={{ display: "flex", flexDirection: "column", gap: GAP }}>
            {week.map((date, di) => {
              const level = getDayLevel(date);
              const isFuture = level === -1;
              const isToday = date === todayStr;

              return (
                <div
                  key={di}
                  title={`${date}: ${level > 0 ? `${level} habits active` : isFuture ? "Future" : "Rest"}`}
                  style={{
                    width: CELL,
                    height: CELL,
                    borderRadius: 2,
                    background: isFuture ? "var(--satat-surface-elevated, #121519)" : LEVEL_BG[level],
                    opacity: isFuture ? 0.2 : 1,
                    outline: isToday ? "1.5px solid var(--satat-brand, #6E8BFF)" : undefined,
                    outlineOffset: "1px",
                  }}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
