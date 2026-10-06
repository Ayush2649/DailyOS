"use client";
import { useMemo, useState, useEffect, useRef } from "react";
import type { Task, WorkoutSession, MealEntry } from "@/types";

interface Props {
  sessions: WorkoutSession[];
  tasks: Task[];
  allMeals: MealEntry[];
  loading: boolean;
}

const WEEKS = 52;

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Intensity backgrounds follow the selected theme accent.
const LEVEL_BG = [
  "var(--surface-2)",           // 0 — no activity
  "color-mix(in srgb, var(--accent) 18%, transparent)", // 1 — one activity
  "color-mix(in srgb, var(--accent) 46%, transparent)", // 2 — two activities
  "color-mix(in srgb, var(--accent) 76%, transparent)", // 3 — all three
] as const;

interface TooltipState {
  content: string;
  x: number;
  y: number;
}

export default function ActivityHeatmap({ sessions, tasks, allMeals, loading }: Props) {
  const todayStr = toDateStr(new Date());
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [isTouch, setIsTouch] = useState(false);
  useEffect(() => {
    setIsTouch(window.matchMedia("(hover: none)").matches);
  }, []);

  // ── Build the 16-week grid ─────────────────────────────────────────────────
  const { weeks, monthLabels, startDateStr } = useMemo(() => {
    const today = new Date();
    // ISO day-of-week: Mon=0 … Sun=6
    const dow = (today.getDay() + 6) % 7;
    // Monday of this week
    const thisMonday = new Date(today);
    thisMonday.setDate(today.getDate() - dow);
    // Grid start = 15 full weeks before this Monday
    const startDate = new Date(thisMonday);
    startDate.setDate(thisMonday.getDate() - (WEEKS - 1) * 7);

    const allDays: string[] = [];
    for (let i = 0; i < WEEKS * 7; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      allDays.push(toDateStr(d));
    }

    const weeks: string[][] = Array.from({ length: WEEKS }, (_, w) =>
      allDays.slice(w * 7, w * 7 + 7)
    );

    // Month label at the first column of each calendar month
    const monthLabels: { label: string; col: number }[] = [];
    let lastMonth = -1;
    weeks.forEach((week, wi) => {
      const m = new Date(week[0] + "T12:00:00").getMonth();
      if (m !== lastMonth) {
        monthLabels.push({
          label: new Date(week[0] + "T12:00:00").toLocaleString("default", { month: "short" }),
          col: wi,
        });
        lastMonth = m;
      }
    });

    return { weeks, monthLabels, startDateStr: allDays[0] };
  }, []);

  // ── Activity lookup maps ───────────────────────────────────────────────────
  const workoutDates = useMemo(() => new Set(sessions.map((s) => s.date)), [sessions]);

  const taskDates = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of tasks) {
      if (t.status === "completed" && t.completedAt) {
        const ds = toDateStr(new Date(t.completedAt));
        m.set(ds, (m.get(ds) ?? 0) + 1);
      }
    }
    return m;
  }, [tasks]);

  const mealDates = useMemo(() => new Set(allMeals.map((m) => m.date)), [allMeals]);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const getLevel = (date: string): number => {
    if (date > todayStr) return -1; // future
    return (
      (workoutDates.has(date) ? 1 : 0) +
      ((taskDates.get(date) ?? 0) > 0 ? 1 : 0) +
      (mealDates.has(date) ? 1 : 0)
    );
  };

  // ── Summary stats (within visible range) ──────────────────────────────────
  const visibleDays = weeks.flat().filter((d) => d >= startDateStr && d <= todayStr);
  const workoutsInRange  = visibleDays.filter((d) => workoutDates.has(d)).length;
  const taskDaysInRange  = visibleDays.filter((d) => (taskDates.get(d) ?? 0) > 0).length;
  const mealDaysInRange  = visibleDays.filter((d) => mealDates.has(d)).length;
  const perfectDays      = visibleDays.filter((d) => getLevel(d) === 3).length;

  // ── Sizing ─────────────────────────────────────────────────────────────────
  const CELL = 13;
  const GAP  = 3;
  const STEP = CELL + GAP;
  const DAY_COL_W = 14;

  if (loading) {
    return (
      <div
        className="rounded-lg animate-pulse"
        style={{
          background: "var(--surface-raised)",
          height: 132,
        }}
      />
    );
  }

  return (
    <div
      className="rounded-lg p-4 animate-fade-in"
      style={{ background: "var(--surface-base)", border: "1px solid var(--border-subtle)" }}
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h3 className="card-title">Activity history</h3>
          <p className="metadata mt-0.5">
            Last year
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {([
            { color: "var(--status-info)", label: "Workout" },
            { color: "var(--accent)", label: "Tasks"   },
            { color: "var(--status-success)", label: "Meals"   },
          ] as const).map(({ color, label }) => (
            <div key={label} className="flex items-center gap-1.5">
              <span
                style={{
                  width: 8, height: 8, borderRadius: 2,
                  background: color, display: "inline-block", flexShrink: 0,
                }}
              />
              <span className="text-xs font-medium" style={{ color: "var(--text-2)" }}>
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Grid ── */}
      <div className="overflow-x-auto">
        <div style={{ display: "inline-block" }}>
          {/* Month labels row */}
          <div
            style={{
              position: "relative",
              height: 14,
              marginLeft: DAY_COL_W + 2,
              marginBottom: 4,
              minWidth: WEEKS * STEP,
            }}
          >
            {monthLabels.map((m, i) => (
              <span
                key={i}
                style={{
                  position: "absolute",
                  left: m.col * STEP,
                  fontSize: 10,
                  fontWeight: 700,
                  color: "var(--text-3)",
                  lineHeight: "14px",
                  whiteSpace: "nowrap",
                  userSelect: "none",
                }}
              >
                {m.label}
              </span>
            ))}
          </div>

          {/* Day labels + week columns */}
          <div style={{ display: "flex", alignItems: "flex-start" }}>
            {/* Day-of-week labels: show M, W, F, S */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: GAP,
                width: DAY_COL_W,
                flexShrink: 0,
                marginRight: 2,
              }}
            >
              {["M", "", "W", "", "F", "", "S"].map((label, i) => (
                <div
                  key={i}
                  style={{
                    height: CELL,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    fontSize: 9,
                    fontWeight: 700,
                    color: "var(--text-3)",
                    userSelect: "none",
                  }}
                >
                  {label}
                </div>
              ))}
            </div>

            {/* Week columns */}
            <div style={{ display: "flex", gap: GAP }}>
              {weeks.map((week, wi) => (
                <div key={wi} style={{ display: "flex", flexDirection: "column", gap: GAP }}>
                  {week.map((date, di) => {
                    const level     = getLevel(date);
                    const isFuture  = level === -1;
                    const isToday   = date === todayStr;
                    const hasWorkout = !isFuture && workoutDates.has(date);
                    const hasTask    = !isFuture && (taskDates.get(date) ?? 0) > 0;
                    const hasMeal    = !isFuture && mealDates.has(date);

                    const dateLabel = new Date(date + "T12:00:00").toLocaleDateString("en-IN", {
                      weekday: "short", day: "numeric", month: "short",
                    });
                    const tooltipContent = isFuture
                      ? ""
                      : [
                          dateLabel,
                          hasWorkout ? "💪 Workout" : "",
                          hasTask    ? `✓ ${taskDates.get(date)} task${taskDates.get(date) === 1 ? "" : "s"}` : "",
                          hasMeal    ? "🥗 Meals logged" : "",
                          !hasWorkout && !hasTask && !hasMeal ? "No activity" : "",
                        ]
                          .filter(Boolean)
                          .join("  ·  ");

                    return (
                      <div
                        key={di}
                        onMouseEnter={(e) => {
                          if (isFuture || isTouch) return;
                          const rect = e.currentTarget.getBoundingClientRect();
                          const x = Math.max(80, Math.min(rect.left + rect.width / 2, window.innerWidth - 80));
                          setTooltip({ content: tooltipContent, x, y: rect.top });
                        }}
                        onMouseLeave={() => setTooltip(null)}
                        style={{
                          width: CELL,
                          height: CELL,
                          borderRadius: 3,
                          background: isFuture
                            ? "var(--surface-2)"
                            : LEVEL_BG[level as 0 | 1 | 2 | 3],
                          opacity: isFuture ? 0.18 : 1,
                          outline: isToday ? "1.5px solid var(--accent)" : undefined,
                          outlineOffset: isToday ? "1px" : undefined,
                          position: "relative",
                          flexShrink: 0,
                          cursor: "default",
                          transition: "opacity 0.15s",
                        }}
                      >
                        {/* Coloured activity dots */}
                        {!isFuture && level > 0 && (
                          <div
                            style={{
                              position: "absolute",
                              bottom: 1.5,
                              left: "50%",
                              transform: "translateX(-50%)",
                              display: "flex",
                              gap: 1.5,
                            }}
                          >
                            {hasWorkout && (
                              <span
                                style={{
                                  width: 2.5, height: 2.5,
                                  borderRadius: "50%",
                                  background: "var(--status-info)",
                                  display: "block", flexShrink: 0,
                                }}
                              />
                            )}
                            {hasTask && (
                              <span
                                style={{
                                  width: 2.5, height: 2.5,
                                  borderRadius: "50%",
                                  background: "var(--accent)",
                                  display: "block", flexShrink: 0,
                                }}
                              />
                            )}
                            {hasMeal && (
                              <span
                                style={{
                                  width: 2.5, height: 2.5,
                                  borderRadius: "50%",
                                  background: "var(--status-success)",
                                  display: "block", flexShrink: 0,
                                }}
                              />
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Summary stats ── */}
      <div
        className="flex items-center gap-4 mt-4 pt-3 flex-wrap"
        style={{ borderTop: "1px solid var(--border-subtle)" }}
      >
        <span className="text-xs font-medium" style={{ color: "var(--text-2)" }}>
          {workoutsInRange} workout{workoutsInRange !== 1 ? "s" : ""}
        </span>
        <span className="text-xs font-medium" style={{ color: "var(--text-2)" }}>
          {taskDaysInRange} active day{taskDaysInRange !== 1 ? "s" : ""}
        </span>
        <span className="text-xs font-medium" style={{ color: "var(--text-2)" }}>
          {mealDaysInRange} day{mealDaysInRange !== 1 ? "s" : ""} tracked
        </span>
        {perfectDays > 0 && (
          <span className="text-xs font-medium ml-auto" style={{ color: "var(--text-3)" }}>
            {perfectDays} full-activity day{perfectDays !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* ── Instant tooltip (fixed, pointer-events-none) ── */}
      {tooltip && (
        <div
          style={{
            position: "fixed",
            left: tooltip.x,
            top: tooltip.y - 10,
            transform: "translate(-50%, -100%)",
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "5px 10px",
            fontSize: 11,
            fontWeight: 600,
            color: "var(--text-1)",
            pointerEvents: "none",
            zIndex: 9999,
            whiteSpace: "nowrap",
            boxShadow: "var(--shadow-raised)",
          }}
        >
          {tooltip.content}
        </div>
      )}
    </div>
  );
}
