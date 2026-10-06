"use client";
import { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import {
  Plus, Dumbbell, Trash2, ChevronDown, ChevronUp, Sparkles, Scale, Clock,
  Save, History, X, Loader2, Flame, Activity, PersonStanding, Bike,
  Mountain, Waves, Footprints, Timer, MapPin, TrendingUp, LayoutTemplate,
  BookOpen, Check, Pencil, Mic,
} from "lucide-react";
import { cn, generateId, todayString, formatDate, localDateString } from "@/lib/utils";
import { saveWorkoutSession, getWorkoutSessions, getBodyWeightEntries, logBodyWeight, getWorkoutTemplates, saveWorkoutTemplate, deleteWorkoutTemplate, getUserProfile } from "@/lib/firestore";
import { WORKOUT_PRESETS } from "@/lib/workoutPresets";
import { partitionWorkoutTemplates } from "@/lib/workouts/classification";
import { setWorkoutContext } from "@/lib/orbitContext";
import { useToast } from "@/components/ui/Toast";
import { MarkdownText } from "@/components/ui/MarkdownText";
import VoiceLogModal from "@/components/workout/VoiceLogModal";
import type { WorkoutSession, ExerciseLog, SetLog, WeightUnit, BodyWeightEntry, CardioLog, CardioActivity, WorkoutTemplate } from "@/types";

// ── Cardio config ─────────────────────────────────────────────────────────────
const CARDIO_META: Record<CardioActivity, { label: string; icon: React.ElementType; color: string; met: number; unit: string }> = {
  walking:          { label: "Walking",          icon: Footprints,      color: "text-emerald-400 bg-emerald-500/10", met: 3.5,  unit: "km" },
  running:          { label: "Running",           icon: PersonStanding,  color: "text-orange-400 bg-orange-500/10",   met: 9.8,  unit: "km" },
  cycling:          { label: "Cycling",           icon: Bike,            color: "text-blue-400 bg-blue-500/10",       met: 7.5,  unit: "km" },
  hiking:           { label: "Hiking",            icon: TrendingUp,      color: "text-amber-400 bg-amber-500/10",     met: 5.3,  unit: "km" },
  mountain_climbing:{ label: "Mountain Climbing", icon: Mountain,        color: "text-red-400 bg-red-500/10",         met: 8.0,  unit: "m elev" },
  swimming:         { label: "Swimming",          icon: Waves,           color: "text-cyan-400 bg-cyan-500/10",       met: 7.0,  unit: "km" },
  jump_rope:        { label: "Jump Rope",         icon: Activity,        color: "text-pink-400 bg-pink-500/10",       met: 11.8, unit: "skips" },
  elliptical:       { label: "Elliptical",        icon: Activity,        color: "text-violet-400 bg-violet-500/10",   met: 5.0,  unit: "km" },
  stair_climbing:   { label: "Stair Climbing",    icon: TrendingUp,      color: "text-rose-400 bg-rose-500/10",       met: 9.0,  unit: "floors" },
  rowing:           { label: "Rowing",            icon: Waves,           color: "text-indigo-400 bg-indigo-500/10",   met: 7.0,  unit: "km" },
};

function calcCardioCals(activity: CardioActivity, durationMinutes: number, weightKg: number): number {
  const met = CARDIO_META[activity]?.met ?? 5.0;
  return Math.round(met * weightKg * (durationMinutes / 60));
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function WorkoutPage() {
  const { data: session } = useSession();
  const userId = (session?.user as any)?.id ?? session?.user?.email ?? "";
  const { toast } = useToast();

  const [view, setView] = useState<"log" | "history" | "templates">("log");
  const [pastSessions, setPastSessions] = useState<WorkoutSession[]>([]);
  const [bodyWeightEntries, setBodyWeightEntries] = useState<BodyWeightEntry[]>([]);

  // Cardio-only add for after today's workout is done
  const [showAddCardioToday, setShowAddCardioToday] = useState(false);
  const [cardioLogsToday, setCardioLogsToday] = useState<CardioLog[]>([]);
  const [savingCardioToday, setSavingCardioToday] = useState(false);

  // Templates
  const [userTemplates, setUserTemplates] = useState<WorkoutTemplate[]>([]);
  const [assignedRoutine, setAssignedRoutine] = useState<{
    planName: string;
    templateIds: string[];
    daysPerWeek: number;
  } | null>(null);

  const { assignedTemplates, starterLibrary, customTemplates } = useMemo(() => {
    return partitionWorkoutTemplates({
      userTemplates,
      systemPresets: WORKOUT_PRESETS,
      assignedRoutine,
      userId,
    });
  }, [userTemplates, assignedRoutine, userId]);

  const [savingTemplate, setSavingTemplate] = useState(false);
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [templateName, setTemplateName] = useState("");

  // Strength
  const [exercises, setExercises] = useState<ExerciseLog[]>([]);
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [newExerciseName, setNewExerciseName] = useState("");
  const [showVoice, setShowVoice] = useState(false);

  // Cardio
  const [cardioLogs, setCardioLogs] = useState<CardioLog[]>([]);
  const [showAddCardio, setShowAddCardio] = useState(false);

  // Session meta
  const [duration, setDuration] = useState<number>(0);
  const [bodyWeight, setBodyWeight] = useState<string>("");
  const [date, setDate] = useState(todayString());

  // Body weight modal
  const [showBodyWeightModal, setShowBodyWeightModal] = useState(false);
  const [newBodyWeight, setNewBodyWeight] = useState("");

  // AI + save
  const [summarizing, setSummarizing] = useState(false);
  const [summaryResult, setSummaryResult] = useState<string>("");
  const [caloriesBurned, setCaloriesBurned] = useState<number | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!userId) return;
    getWorkoutSessions(userId).then((sessions) => {
      setPastSessions(sessions);
      // Write to Orbit context so chatbot knows workout history
      setWorkoutContext({
        bodyWeightKg: bodyWeightEntries[0]?.weightKg,
        recentSessions: sessions.slice(0, 5).map((s) => ({
          date: s.date,
          durationMinutes: s.durationMinutes,
          exercises: s.exercises.map((ex) => ({
            name: ex.name,
            sets: ex.sets.length,
            topWeight: ex.sets.reduce((max, set) => Math.max(max, set.weight ?? 0), 0) || undefined,
            unit: ex.sets[0]?.unit,
          })),
          cardio: s.cardioLogs?.map((c) => ({
            activity: c.activity,
            durationMinutes: c.durationMinutes,
            distanceKm: c.distanceKm,
            caloriesBurned: c.caloriesBurned,
          })),
          summary: s.summary,
        })),
      });
    });
    getWorkoutTemplates(userId).then(setUserTemplates);
    getUserProfile(userId).then((profile) => {
      if (profile?.workoutPlanAssignment) {
        setAssignedRoutine(profile.workoutPlanAssignment);
      }
    });
    getBodyWeightEntries(userId).then((entries) => {
      setBodyWeightEntries(entries);
      if (entries.length > 0) {
        setBodyWeight(String(entries[0].weightKg));
        // Update context with body weight
        setWorkoutContext({
          bodyWeightKg: entries[0].weightKg,
          recentSessions: [],
        });
      }
    });
  }, [userId]);

  // Today's session (if already logged)
  const todaySession = pastSessions.find((s) => s.date === todayString()) ?? null;

  const totalSets = exercises.reduce((acc, ex) => acc + ex.sets.length, 0);
  const totalReps = exercises.reduce((acc, ex) => acc + ex.sets.reduce((s, set) => s + (set.reps || 0), 0), 0);
  const bwKg = parseFloat(bodyWeight) || 70;
  const totalCardioCals = cardioLogs.reduce((sum, c) => sum + (c.caloriesBurned ?? 0), 0);
  const hasAnything = exercises.length > 0 || cardioLogs.length > 0;

  // ── Strength handlers ──
  const addExercise = () => {
    if (!newExerciseName.trim()) return;
    setExercises((prev) => [...prev, { id: generateId(), name: newExerciseName.trim(), sets: [newSet()] }]);
    setNewExerciseName(""); setShowAddExercise(false);
  };
  const removeExercise = (id: string) => setExercises((prev) => prev.filter((e) => e.id !== id));
  const addVoiceExercises = (
    newOnes: ExerciseLog[],
    newCardio: { activity: CardioActivity; durationMinutes: number; distanceKm?: number }[],
  ) => {
    if (newOnes.length) setExercises((prev) => [...prev, ...newOnes]);
    if (newCardio.length) {
      const logs: CardioLog[] = newCardio.map((c) => {
        const log: CardioLog = {
          id: generateId(),
          activity: c.activity,
          durationMinutes: c.durationMinutes,
          caloriesBurned: calcCardioCals(c.activity, c.durationMinutes, bwKg),
        };
        if (c.distanceKm != null) log.distanceKm = c.distanceKm;
        return log;
      });
      setCardioLogs((prev) => [...prev, ...logs]);
    }
    setShowVoice(false);
    const n = newOnes.length + newCardio.length;
    if (n) toast(`Added ${n} item${n !== 1 ? "s" : ""} from voice 🎤`, "success");
  };
  const addSet = (exId: string) => setExercises((prev) => prev.map((ex) => ex.id === exId ? { ...ex, sets: [...ex.sets, newSet()] } : ex));
  const removeSet = (exId: string, setId: string) => setExercises((prev) => prev.map((ex) => ex.id === exId ? { ...ex, sets: ex.sets.filter((s) => s.id !== setId) } : ex));
  const updateSet = (exId: string, setId: string, updates: Partial<SetLog>) => setExercises((prev) => prev.map((ex) => ex.id === exId ? { ...ex, sets: ex.sets.map((s) => s.id === setId ? { ...s, ...updates } : s) } : ex));

  // ── Cardio handlers ──
  const addCardioLog = (log: Omit<CardioLog, "id">) => {
    setCardioLogs((prev) => [...prev, { ...log, id: generateId() }]);
    setShowAddCardio(false);
  };
  const removeCardioLog = (id: string) => setCardioLogs((prev) => prev.filter((c) => c.id !== id));

  // ── Save cardio-only session (after today's strength workout is done) ──
  const handleSaveCardioToday = async () => {
    if (cardioLogsToday.length === 0) return;
    setSavingCardioToday(true);
    try {
      const session_data: Omit<WorkoutSession, "id"> = {
        userId, date: todayString(), exercises: [], durationMinutes: 0,
        cardioLogs: cardioLogsToday, createdAt: Date.now(),
      };
      if (bodyWeight) session_data.bodyWeightKg = parseFloat(bodyWeight);
      const saved = await saveWorkoutSession(session_data);
      setPastSessions((prev) => [saved, ...prev]);
      setCardioLogsToday([]);
      setShowAddCardioToday(false);
      toast("Cardio logged! 🔥", "success");
    } catch { toast("Failed to save cardio", "error"); }
    finally { setSavingCardioToday(false); }
  };

  // ── Load template into log form ──
  const handleLoadTemplate = (tpl: WorkoutTemplate) => {
    const loaded: ExerciseLog[] = tpl.exercises.map((te) => ({
      id: generateId(),
      name: te.name,
      sets: Array.from({ length: te.defaultSets }, () => ({
        id: generateId(),
        reps: te.defaultReps,
        weight: te.defaultUnit === "bodyweight" ? undefined : (te.defaultWeight ?? 0),
        unit: te.defaultUnit,
        completed: false,
      })),
    }));
    setExercises(loaded);
    setView("log");
    toast(`Loaded "${tpl.name}" ✓`, "success");
  };

  // ── Save current exercises as template ──
  const handleSaveAsTemplate = async () => {
    if (!templateName.trim() || exercises.length === 0) return;
    setSavingTemplate(true);
    try {
      const tpl: Omit<WorkoutTemplate, "id"> = {
        userId,
        name: templateName.trim(),
        exercises: exercises.map((ex) => ({
          id: generateId(),
          name: ex.name,
          defaultSets: ex.sets.length,
          defaultReps: ex.sets[0]?.reps ?? 8,
          defaultWeight: ex.sets[0]?.unit === "bodyweight" ? undefined : (ex.sets[0]?.weight ?? 0),
          defaultUnit: ex.sets[0]?.unit ?? "kg",
        })),
        isPreset: false,
        isOnboarding: false,
        source: "custom",
        createdAt: Date.now(),
      };
      const saved = await saveWorkoutTemplate(tpl);
      setUserTemplates((prev) => [saved, ...prev]);
      setTemplateName("");
      setShowSaveTemplate(false);
      toast(`Template "${saved.name}" saved!`, "success");
    } catch { toast("Failed to save template", "error"); }
    finally { setSavingTemplate(false); }
  };

  // ── Delete user template ──
  const handleDeleteTemplate = async (id: string) => {
    await deleteWorkoutTemplate(id);
    setUserTemplates((prev) => prev.filter((t) => t.id !== id));
    toast("Template deleted", "success");
  };

  // ── AI Summary ──
  const handleSummarize = async () => {
    if (!hasAnything) return;
    setSummarizing(true);
    try {
      const res = await fetch("/api/summarize-workout", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exercises, cardioLogs, durationMinutes: duration, bodyWeightKg: bodyWeight ? parseFloat(bodyWeight) : null }),
      });
      const data = await res.json();
      if (data.summary) {
        setSummaryResult(data.summary);
        setCaloriesBurned(data.caloriesBurned ?? null);
        // Update calorie counts on cardio logs from server response
        if (data.cardioWithCalories?.length) {
          setCardioLogs((prev) => prev.map((c) => {
            const updated = data.cardioWithCalories.find((u: any) => u.id === c.id);
            return updated ? { ...c, caloriesBurned: updated.caloriesBurned } : c;
          }));
        }
        setShowSummary(true);
        toast("AI summary generated!", "success");
      } else {
        toast("Couldn't generate summary", "error");
      }
    } catch { toast("Something went wrong", "error"); }
    finally { setSummarizing(false); }
  };

  // ── Save ──
  const handleSave = async () => {
    if (!hasAnything) return;
    setSaving(true);
    try {
      const session_data: Omit<WorkoutSession, "id"> = {
        userId, date, exercises, durationMinutes: duration, createdAt: Date.now(),
      };
      if (cardioLogs.length > 0) session_data.cardioLogs = cardioLogs;
      if (bodyWeight) session_data.bodyWeightKg = parseFloat(bodyWeight);
      if (summaryResult) session_data.summary = summaryResult;
      const saved = await saveWorkoutSession(session_data);
      setPastSessions((prev) => [saved, ...prev]);
      setExercises([]); setCardioLogs([]); setDuration(0);
      setSummaryResult(""); setCaloriesBurned(null); setShowSummary(false);
      toast("Workout saved! 💪", "success");
    } catch { toast("Failed to save workout", "error"); }
    finally { setSaving(false); }
  };

  const handleLogBodyWeight = async () => {
    if (!newBodyWeight) return;
    const entry = await logBodyWeight({ userId, date: todayString(), weightKg: parseFloat(newBodyWeight), createdAt: Date.now() });
    setBodyWeightEntries((prev) => [entry, ...prev]);
    setBodyWeight(newBodyWeight); setNewBodyWeight(""); setShowBodyWeightModal(false);
    toast(`Body weight logged: ${entry.weightKg} kg`, "success");
  };

  return (
    <div className="animate-fade-in">
      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="page-title" style={{ color: "var(--text-primary)" }}>Workout</h1>
          <p className="page-description mt-1" style={{ color: "var(--text-secondary)" }}>Log and track your training</p>
        </div>
        <button onClick={() => setShowBodyWeightModal(true)} type="button" title="Log body weight"
          className="btn-secondary text-sm flex items-center gap-1.5 flex-shrink-0">
          <Scale className="w-4 h-4 text-accent" />
          {bodyWeight
            ? <span className="font-bold text-blue-600">{bodyWeight} kg</span>
            : <span className="hidden sm:inline">Log weight</span>}
        </button>
      </div>

      {/* ── View toggle ── */}
      <div className="flex gap-1 p-1 rounded-lg mb-4 w-full sm:w-fit overflow-x-auto" style={{ background: "var(--surface-raised)", border: "1px solid var(--border-subtle)" }} role="tablist" aria-label="Workout views">
        {([
          { key: "log",       label: "Log Workout" },
          { key: "templates", label: "Templates"   },
          { key: "history",   label: "History"     },
        ] as const).map(({ key, label }) => (
          <button key={key} onClick={() => setView(key)} type="button" role="tab" aria-selected={view === key}
            className="flex-1 sm:flex-none min-h-11 px-3 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap"
            style={view === key ? { background: "var(--surface-0)", color: "var(--text-1)", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" } : { color: "var(--text-3)" }}>
            {key === "templates" && <LayoutTemplate className="w-3.5 h-3.5" />}
            {label}
          </button>
        ))}
      </div>

      {view === "log" ? (
        todaySession ? (
          /* ── TODAY'S WORKOUT SUMMARY ── */
          <div className="space-y-4 animate-fade-in">
            {/* Done banner */}
            <div className="rounded-lg p-3 flex items-center gap-3 border"
              style={{ background: "color-mix(in srgb, var(--success) 8%, transparent)", borderColor: "color-mix(in srgb, var(--success) 18%, transparent)" }}>
              <div className="w-9 h-9 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: "color-mix(in srgb, var(--success) 12%, transparent)" }}>
                <Check className="w-4 h-4" style={{ color: "var(--success)" }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold" style={{ color: "var(--text-1)" }}>Workout logged today</p>
                <p className="text-xs mt-0.5 font-medium" style={{ color: "var(--text-3)" }}>
                  {todaySession.durationMinutes > 0 ? `${todaySession.durationMinutes} min · ` : ""}
                  {todaySession.exercises.length > 0 ? `${todaySession.exercises.length} exercises · ${todaySession.exercises.reduce((a, e) => a + e.sets.length, 0)} sets` : "Cardio only"}
                </p>
              </div>
              <button onClick={() => setView("history")}
                className="text-xs font-medium px-3 min-h-10 rounded-md transition-colors"
                style={{ background: "var(--accent-soft)", color: "var(--text-2)" }}>
                Full history
              </button>
            </div>

            {/* Stats row */}
            {(() => {
              const exCount  = todaySession.exercises.length;
              const setCount = todaySession.exercises.reduce((a, e) => a + e.sets.length, 0);
              const mins     = todaySession.durationMinutes;
              const cals     = (todaySession.cardioLogs ?? []).reduce((s, c) => s + (c.caloriesBurned ?? 0), 0);
              const stats = [
                { label: "Exercises", val: exCount,  icon: Dumbbell,  color: "text-blue-400 bg-blue-500/10" },
                { label: "Sets",      val: setCount, icon: Activity,  color: "text-violet-400 bg-violet-500/10" },
                { label: "Duration",  val: mins > 0 ? `${mins}m` : "—", icon: Clock,     color: "text-orange-400 bg-orange-500/10" },
                { label: "Kcal",      val: cals > 0 ? cals : "—",      icon: Flame,     color: "text-emerald-400 bg-emerald-500/10" },
              ];
              return (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-3 gap-y-2 rounded-lg px-3 py-3"
                  style={{ background: "var(--surface-raised)" }}>
                  {stats.map((s) => (
                    <div key={s.label} className="flex items-center gap-2 min-w-0">
                      <s.icon className="w-4 h-4 flex-shrink-0" style={{ color: "var(--text-3)" }} />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold leading-tight truncate" style={{ color: "var(--text-1)" }}>{s.val}</p>
                        <p className="metadata truncate">{s.label}</p>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}

            {/* Exercise breakdown */}
            {todaySession.exercises.length > 0 && (
              <div className="card space-y-3">
                <p className="text-xs font-black uppercase tracking-wider" style={{ color: "var(--text-3)" }}>Exercises</p>
                {todaySession.exercises.map((ex) => (
                  <div key={ex.id}>
                    <p className="text-sm font-bold mb-2" style={{ color: "var(--text-2)" }}>{ex.name}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {ex.sets.map((set, i) => (
                        <span key={set.id} className="badge bg-blue-500/10 text-blue-400 font-bold border border-blue-500/20 text-xs">
                          {i + 1}: {set.reps}r {set.unit === "bodyweight" ? "BW" : `× ${set.weight}${set.unit}`}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Cardio already logged today */}
            {(todaySession.cardioLogs ?? []).length > 0 && (
              <div className="card space-y-2">
                <p className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5" style={{ color: "var(--text-3)" }}>
                  <Footprints className="w-3 h-3 text-emerald-400" /> Cardio
                </p>
                {todaySession.cardioLogs!.map((c) => {
                  const meta = CARDIO_META[c.activity];
                  const Icon = meta.icon;
                  return (
                    <div key={c.id} className="flex items-center gap-2.5 p-2.5 rounded-xl" style={{ background: "var(--surface-2)" }}>
                      <span className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-4 h-4 text-emerald-400" />
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold" style={{ color: "var(--text-1)" }}>{meta.label}</p>
                        <p className="text-xs" style={{ color: "var(--text-3)" }}>
                          {c.durationMinutes}min{c.distanceKm ? ` · ${c.distanceKm}${meta.unit}` : ""}
                          {c.caloriesBurned ? ` · ${c.caloriesBurned} kcal` : ""}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* AI coach report */}
            {todaySession.summary && (
              <div className="card">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "var(--accent-soft)" }}>
                    <Sparkles className="w-3.5 h-3.5 text-accent" />
                  </div>
                  <span className="font-bold text-sm" style={{ color: "var(--text-1)" }}>Coach Report</span>
                </div>
                <div className="rounded-xl p-3" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                  <MarkdownText text={todaySession.summary} />
                </div>
              </div>
            )}

            {/* ── Add Cardio for Today ── */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 bg-emerald-500/10 rounded-lg flex items-center justify-center">
                  <Footprints className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <h2 className="text-sm font-black uppercase tracking-wider" style={{ color: "var(--text-2)" }}>Add Cardio</h2>
              </div>

              <div className="space-y-2">
                {cardioLogsToday.map((c) => (
                  <CardioCard key={c.id} log={c} onRemove={() => setCardioLogsToday((prev) => prev.filter((x) => x.id !== c.id))} />
                ))}
              </div>

              {!showAddCardioToday ? (
                <button onClick={() => setShowAddCardioToday(true)}
                  className="w-full card border-2 border-dashed flex items-center justify-center gap-2 text-sm font-semibold py-4 hover:text-emerald-400 hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all"
                  style={{ borderColor: "var(--accent-glow)", color: "var(--text-3)" }}>
                  <Plus className="w-4 h-4" /> Log cardio for today
                </button>
              ) : (
                <AddCardioForm bodyWeightKg={bwKg}
                  onAdd={(log) => { setCardioLogsToday((prev) => [...prev, { ...log, id: generateId() }]); setShowAddCardioToday(false); }}
                  onCancel={() => setShowAddCardioToday(false)} />
              )}

              {cardioLogsToday.length > 0 && (
                <button onClick={handleSaveCardioToday} disabled={savingCardioToday}
                  className="w-full btn-primary flex items-center justify-center gap-2 text-sm py-3 mt-3">
                  {savingCardioToday ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {savingCardioToday ? "Saving..." : "Save Cardio"}
                </button>
              )}
            </div>
          </div>
        ) : (
        <div className="space-y-4">
          {/* Assigned Starter Routine Quick-Launch */}
          {assignedRoutine && exercises.length === 0 && (
            <div className="card p-4 rounded-2xl border-indigo-500/30 bg-gradient-to-r from-indigo-500/10 via-purple-500/5 to-transparent animate-fade-in">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                    <Dumbbell className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                        Assigned Routine
                      </span>
                      <span className="text-xs font-semibold" style={{ color: "var(--text-3)" }}>
                        {assignedRoutine.daysPerWeek} days / week
                      </span>
                    </div>
                    <p className="text-sm font-black mt-0.5" style={{ color: "var(--text-1)" }}>
                      {assignedRoutine.planName}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-3.5 pt-3 border-t border-indigo-500/10">
                <p className="text-xs font-medium mb-2.5" style={{ color: "var(--text-3)" }}>
                  Choose a session to load exercises and start logging:
                </p>
                <div className="flex flex-wrap gap-2">
                  {assignedTemplates.map((tpl) => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => handleLoadTemplate(tpl)}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs flex items-center gap-1.5 transition-all active:scale-95"
                    >
                      <Pencil className="w-3 h-3" />
                      <span>Start {tpl.name}</span>
                    </button>
                  ))}
                  {assignedTemplates.length === 0 && (
                    <button
                      type="button"
                      onClick={() => setView("templates")}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 transition-all flex items-center gap-1.5"
                    >
                      <LayoutTemplate className="w-3 h-3" />
                      <span>View routine in Templates</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Date & Duration */}
          <div className="card">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="min-w-0">
                <label className="label">Date</label>
                <input type="date" className="input text-sm min-w-0 max-w-full appearance-none" value={date}
                  onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="min-w-0">
                <label className="label flex items-center gap-1"><Clock className="w-3 h-3 flex-shrink-0" /><span className="truncate">Duration (min)</span></label>
                <input type="number" inputMode="numeric" className="input text-sm min-w-0 max-w-full" min={0} placeholder="e.g. 60"
                  value={duration || ""} onChange={(e) => setDuration(Number(e.target.value))} />
              </div>
            </div>
          </div>

          {/* Stats bar */}
          {hasAnything && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-3 gap-y-2 rounded-lg px-3 py-3 animate-slide-down"
              style={{ background: "var(--surface-raised)" }}>
              {[
                { label: "Exercises", val: exercises.length, icon: Dumbbell },
                { label: "Sets",      val: totalSets,        icon: Activity },
                { label: "Reps",      val: totalReps,        icon: Flame },
                { label: "Cardio kcal",val: totalCardioCals, icon: Timer },
              ].map((s) => (
                <div key={s.label} className="flex items-center gap-2 min-w-0">
                  <s.icon className="w-4 h-4 flex-shrink-0" style={{ color: "var(--text-3)" }} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold leading-tight tabular-nums" style={{ color: "var(--text-1)" }}>{s.val}</p>
                    <p className="metadata truncate">{s.label}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── STRENGTH SECTION ── */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 bg-blue-500/10 rounded-lg flex items-center justify-center">
                <Dumbbell className="w-3.5 h-3.5 text-blue-400" />
              </div>
              <h2 className="text-sm font-black uppercase tracking-wider" style={{ color: "var(--text-2)" }}>Strength</h2>
            </div>

            {exercises.length === 0 && !showAddExercise && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-y py-4 animate-fade-in" style={{ borderColor: "var(--border-subtle)" }}>
                <div>
                  <p className="text-sm font-medium" style={{ color: "var(--text-1)" }}>No strength exercises yet</p>
                  <p className="text-xs mt-1" style={{ color: "var(--text-3)" }}>Add an exercise or log by voice.</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowAddExercise(true)} className="btn-primary min-h-11 flex-1 sm:flex-none text-sm">
                    <Plus className="w-4 h-4" /> Add exercise
                  </button>
                  <button onClick={() => setShowVoice(true)}
                    className="btn-secondary min-h-11 flex-1 sm:flex-none text-sm">
                    <Mic className="w-4 h-4" /> Voice
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {exercises.map((ex) => (
                <ExerciseCard key={ex.id} exercise={ex}
                  onAddSet={() => addSet(ex.id)}
                  onRemoveSet={(sId) => removeSet(ex.id, sId)}
                  onUpdateSet={(sId, u) => updateSet(ex.id, sId, u)}
                  onRemove={() => removeExercise(ex.id)} />
              ))}
            </div>

            {showAddExercise ? (
              <div className="card flex items-center gap-2 mt-3">
                <input autoFocus className="input flex-1 text-sm" placeholder="Exercise name (e.g. Bench Press)"
                  value={newExerciseName} onChange={(e) => setNewExerciseName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addExercise()} />
                <button onClick={addExercise} className="btn-primary text-sm px-4">Add</button>
                <button onClick={() => setShowAddExercise(false)} className="btn-ghost p-2"><X className="w-4 h-4" /></button>
              </div>
            ) : exercises.length > 0 ? (
              <div className="flex gap-2 mt-3">
                <button onClick={() => setShowAddExercise(true)} className="btn-secondary flex-1 text-sm">
                  <Plus className="w-4 h-4" /> Add exercise
                </button>
                <button onClick={() => setShowVoice(true)} className="btn-secondary text-sm">
                  <Mic className="w-4 h-4" /> Voice
                </button>
              </div>
            ) : null}
          </div>

          {/* ── CARDIO SECTION ── */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 bg-emerald-500/10 rounded-lg flex items-center justify-center">
                <Footprints className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <h2 className="text-sm font-black uppercase tracking-wider" style={{ color: "var(--text-2)" }}>Cardio</h2>
              {totalCardioCals > 0 && (
                <span className="ml-auto flex items-center gap-1 text-xs font-bold text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-full">
                  <Flame className="w-3 h-3" /> {totalCardioCals} kcal
                </span>
              )}
            </div>

            {cardioLogs.length === 0 && !showAddCardio && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-y py-4 animate-fade-in" style={{ borderColor: "var(--border-subtle)" }}>
                <div>
                  <p className="text-sm font-medium" style={{ color: "var(--text-1)" }}>No cardio logged yet</p>
                  <p className="text-xs mt-1" style={{ color: "var(--text-3)" }}>Add a cardio activity to today's session.</p>
                </div>
                <button onClick={() => setShowAddCardio(true)} className="btn-primary min-h-11 text-sm">
                  <Plus className="w-4 h-4" /> Add cardio
                </button>
              </div>
            )}

            <div className="space-y-2">
              {cardioLogs.map((c) => (
                <CardioCard key={c.id} log={c} onRemove={() => removeCardioLog(c.id)} />
              ))}
            </div>

            {!showAddCardio && cardioLogs.length > 0 && (
              <button onClick={() => setShowAddCardio(true)} className="btn-secondary w-full mt-3 text-sm">
                <Plus className="w-4 h-4" /> Add cardio
              </button>
            )}

            {showAddCardio && (
              <AddCardioForm
                bodyWeightKg={bwKg}
                onAdd={addCardioLog}
                onCancel={() => setShowAddCardio(false)}
              />
            )}
          </div>

          {/* Actions */}
          {hasAnything && (
            <div className="space-y-2 pt-1">
              <div className="flex gap-3">
                <button onClick={handleSummarize} disabled={summarizing}
                  className="flex-1 flex items-center justify-center gap-2 text-sm font-semibold px-4 py-3 rounded-xl border transition-all active:scale-[0.97] disabled:opacity-60"
                  style={{ background: "var(--surface-2)", borderColor: "var(--accent-glow)", color: "var(--text-1)" }}>
                  {summarizing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-indigo-400" />}
                  {summarizing ? "Analyzing..." : "AI Summary"}
                </button>
                <button onClick={handleSave} disabled={saving}
                  className="flex-1 btn-primary flex items-center justify-center gap-2 text-sm py-3">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {saving ? "Saving..." : "Save Workout"}
                </button>
              </div>
              {exercises.length > 0 && (
                showSaveTemplate ? (
                  <div className="flex gap-2 animate-slide-down">
                    <input autoFocus className="input flex-1 text-sm" placeholder="Template name (e.g. My Leg Day)"
                      value={templateName} onChange={(e) => setTemplateName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSaveAsTemplate()} />
                    <button onClick={handleSaveAsTemplate} disabled={savingTemplate || !templateName.trim()}
                      className="btn-primary text-sm px-4 flex items-center gap-1.5 disabled:opacity-40">
                      {savingTemplate ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      Save
                    </button>
                    <button onClick={() => { setShowSaveTemplate(false); setTemplateName(""); }} className="btn-ghost p-2.5"><X className="w-4 h-4" /></button>
                  </div>
                ) : (
                  <button onClick={() => setShowSaveTemplate(true)}
                    className="w-full flex items-center justify-center gap-2 text-xs font-semibold py-2.5 rounded-xl transition-all"
                    style={{ color: "var(--text-3)", background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                    <LayoutTemplate className="w-3.5 h-3.5" /> Save as Template
                  </button>
                )
              )}
            </div>
          )}

          {/* AI Summary */}
          {showSummary && summaryResult && (
            <div className="card animate-slide-up">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--accent-soft)" }}>
                    <Sparkles className="w-4 h-4 text-accent" />
                  </div>
                  <span className="font-bold text-sm" style={{ color: "var(--text-1)" }}>Coach Report</span>
                </div>
                <div className="flex items-center gap-2">
                  {caloriesBurned && (
                    <div className="flex items-center gap-1.5 bg-orange-100 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400 px-3 py-1.5 rounded-full border border-orange-200 dark:border-orange-500/20">
                      <Flame className="w-3.5 h-3.5" />
                      <span className="text-xs font-black">{caloriesBurned} kcal</span>
                    </div>
                  )}
                  <button onClick={() => setShowSummary(false)} className="btn-ghost p-1.5"><X className="w-4 h-4" /></button>
                </div>
              </div>
              <div className="rounded-xl p-4" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                <MarkdownText text={summaryResult} />
              </div>
            </div>
          )}
        </div>
        ) /* end: no todaySession */
      ) : view === "templates" ? (
        <div className="space-y-6 animate-fade-in">
          {/* Assigned Routine from Onboarding */}
          {assignedRoutine && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <h2 className="text-sm font-black uppercase tracking-wider" style={{ color: "var(--text-2)" }}>
                  Your Assigned Routine ({assignedRoutine.planName})
                </h2>
                <span className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: "var(--surface-2)", color: "var(--text-3)" }}>
                  {assignedRoutine.daysPerWeek} sessions / wk
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                {assignedTemplates.map((tpl) => (
                  <TemplateCard
                    key={tpl.id}
                    template={tpl}
                    onLoad={() => handleLoadTemplate(tpl)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Preset library */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className="w-4 h-4 text-indigo-400" />
              <h2 className="text-sm font-black uppercase tracking-wider" style={{ color: "var(--text-2)" }}>Starter Library</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {starterLibrary.map((tpl) => (
                <TemplateCard key={tpl.id} template={tpl} onLoad={() => handleLoadTemplate(tpl)} />
              ))}
            </div>
          </div>

          {/* User-saved templates */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <LayoutTemplate className="w-4 h-4 text-violet-400" />
              <h2 className="text-sm font-black uppercase tracking-wider" style={{ color: "var(--text-2)" }}>My Templates</h2>
              <span className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: "var(--surface-2)", color: "var(--text-3)" }}>
                {customTemplates.length}
              </span>
            </div>
            {customTemplates.length === 0 ? (
              <div className="card border-2 border-dashed text-center py-8" style={{ borderColor: "var(--border)" }}>
                <LayoutTemplate className="w-8 h-8 mx-auto mb-2" style={{ color: "var(--text-3)" }} />
                <p className="font-bold text-sm" style={{ color: "var(--text-2)" }}>No saved templates yet</p>
                <p className="text-xs mt-1" style={{ color: "var(--text-3)" }}>Log a workout and hit "Save as Template"</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {customTemplates.map((tpl) => (
                  <TemplateCard key={tpl.id} template={tpl}
                    onLoad={() => handleLoadTemplate(tpl)}
                    onDelete={() => handleDeleteTemplate(tpl.id)} />
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {pastSessions.length === 0 ? (
                              <div className="flex flex-col items-center py-8 border-y text-center" style={{ borderColor: "var(--border-subtle)" }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="mx-auto mb-2" style={{ color: "var(--text-3)" }}>
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                  <path d="M8 12h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>No workouts logged</p>
                <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>Your sessions will appear here.</p>
                <button onClick={() => setView("log")} className="btn-primary mt-2 text-sm min-h-11 px-4">Log workout</button>
            </div>
          ) : pastSessions.map((s) => <PastWorkoutCard key={s.id} session={s} defaultExpanded={s.date === todayString()} />)}
        </div>
      )}

      {/* Body Weight Modal */}
      {showBodyWeightModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pt-4 pb-24 sm:p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowBodyWeightModal(false)} />
          <div className="relative rounded-2xl shadow-2xl w-full max-w-sm p-5 animate-slide-up max-h-[80dvh] overflow-y-auto"
            style={{ background: "var(--surface-2)", border: "1px solid var(--border)", boxShadow: "0 24px 80px rgba(0,0,0,0.4)" }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold" style={{ color: "var(--text-1)" }}>Log Body Weight</h3>
              <button onClick={() => setShowBodyWeightModal(false)} className="btn-ghost p-1.5"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="label">Weight (kg)</label>
                <input autoFocus type="number" step="0.1" className="input text-lg font-bold text-center" placeholder="75.0"
                  value={newBodyWeight} onChange={(e) => setNewBodyWeight(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLogBodyWeight()} />
              </div>
              {bodyWeightEntries.slice(0, 3).length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-bold uppercase tracking-wide" style={{ color: "var(--text-3)" }}>Recent</p>
                  {bodyWeightEntries.slice(0, 3).map((e) => (
                    <div key={e.id} className="flex justify-between items-center text-sm px-3 py-2 rounded-xl"
                      style={{ background: "var(--surface-0)", border: "1px solid var(--border-subtle)" }}>
                      <span style={{ color: "var(--text-2)" }}>{formatDate(e.date)}</span>
                      <span className="font-bold" style={{ color: "var(--text-1)" }}>{e.weightKg} kg</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <button onClick={() => setShowBodyWeightModal(false)} className="btn-secondary flex-1 text-sm">Cancel</button>
                <button onClick={handleLogBodyWeight} disabled={!newBodyWeight} className="btn-primary flex-1 text-sm">Log</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Voice logging */}
      {showVoice && (
        <VoiceLogModal onAdd={addVoiceExercises} onClose={() => setShowVoice(false)} />
      )}
    </div>
  );
}

// ── Add Cardio Form ────────────────────────────────────────────────────────────
function AddCardioForm({ bodyWeightKg, onAdd, onCancel }: {
  bodyWeightKg: number;
  onAdd: (log: Omit<CardioLog, "id">) => void;
  onCancel: () => void;
}) {
  const [activity, setActivity] = useState<CardioActivity>("walking");
  const [duration, setDuration] = useState("");
  const [distance, setDistance] = useState("");

  const meta = CARDIO_META[activity];
  const durationNum = parseFloat(duration) || 0;
  const estCals = durationNum > 0 ? calcCardioCals(activity, durationNum, bodyWeightKg) : 0;

  const handleAdd = () => {
    if (!duration || durationNum <= 0) return;
    onAdd({
      activity,
      durationMinutes: durationNum,
      distanceKm: distance ? parseFloat(distance) : undefined,
      caloriesBurned: estCals,
    });
  };

  return (
    <div className="card mt-3 animate-slide-up space-y-4" style={{ borderColor: "var(--accent-glow)" }}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold" style={{ color: "var(--text-1)" }}>Add Cardio Activity</p>
        <button onClick={onCancel} className="btn-ghost p-1.5"><X className="w-4 h-4" /></button>
      </div>

      {/* Activity picker */}
      <div>
        <label className="label">Activity</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {(Object.keys(CARDIO_META) as CardioActivity[]).map((act) => {
            const m = CARDIO_META[act];
            const Icon = m.icon;
            const isSelected = activity === act;
            return (
              <button key={act} onClick={() => setActivity(act)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold border transition-all",
                  isSelected
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                    : "hover:bg-white/5"
                )}
                style={isSelected ? undefined : { borderColor: "var(--border)", color: "var(--text-2)" }}>
                <span className={cn("w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0", m.color.split(" ")[1])}>
                  <Icon className={cn("w-3.5 h-3.5", m.color.split(" ")[0])} />
                </span>
                {m.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Duration + Distance */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label flex items-center gap-1"><Timer className="w-3 h-3" /> Duration (min)</label>
          <input type="number" inputMode="numeric" min={1} placeholder="30" className="input text-sm font-bold"
            value={duration} onChange={(e) => setDuration(e.target.value)} />
        </div>
        <div>
          <label className="label flex items-center gap-1"><MapPin className="w-3 h-3" /> Distance ({meta.unit})</label>
          <input type="number" inputMode="decimal" step="0.1" min={0} placeholder="optional" className="input text-sm font-bold"
            value={distance} onChange={(e) => setDistance(e.target.value)} />
        </div>
      </div>

      {/* Calorie preview */}
      {estCals > 0 && (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-orange-500/10 border border-orange-500/20">
          <Flame className="w-4 h-4 text-orange-400 flex-shrink-0" />
          <div>
            <p className="text-xs font-black text-orange-400">{estCals} kcal estimated</p>
            <p className="text-[10px] text-orange-400/70">Based on {bodyWeightKg} kg body weight · MET {meta.met}</p>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <button onClick={onCancel} className="btn-secondary flex-1 text-sm">Cancel</button>
        <button onClick={handleAdd} disabled={!duration || durationNum <= 0}
          className="flex-1 text-sm font-semibold px-4 py-2.5 rounded-xl bg-emerald-500 text-white hover:bg-emerald-400 active:scale-[0.97] transition-all disabled:opacity-40">
          Add Cardio
        </button>
      </div>
    </div>
  );
}

// ── CardioCard ─────────────────────────────────────────────────────────────────
function CardioCard({ log, onRemove }: { log: CardioLog; onRemove: () => void }) {
  const meta = CARDIO_META[log.activity];
  const Icon = meta.icon;
  const [iconBg, iconText] = meta.color.split(" ");
  return (
    <div className="card flex items-center gap-3 animate-slide-up" style={{ borderLeftWidth: "3px", borderLeftColor: "var(--status-success)" }}>
      <span className={cn("w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0", iconText.replace("text-", "bg-").replace("-400", "-500/10"))}>
        <Icon className={cn("w-4.5 h-4.5", iconText)} />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold" style={{ color: "var(--text-1)" }}>{meta.label}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className="text-xs font-semibold flex items-center gap-1" style={{ color: "var(--text-3)" }}>
            <Timer className="w-3 h-3" /> {log.durationMinutes} min
          </span>
          {log.distanceKm != null && (
            <span className="text-xs font-semibold flex items-center gap-1" style={{ color: "var(--text-3)" }}>
              <MapPin className="w-3 h-3" /> {log.distanceKm} {meta.unit}
            </span>
          )}
          {log.caloriesBurned != null && log.caloriesBurned > 0 && (
            <span className="text-xs font-bold flex items-center gap-1 text-orange-400">
              <Flame className="w-3 h-3" /> {log.caloriesBurned} kcal
            </span>
          )}
        </div>
      </div>
      <button onClick={onRemove} className="btn-ghost p-1.5 text-gray-400 hover:text-red-400 flex-shrink-0">
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ── ExerciseCard ───────────────────────────────────────────────────────────────
function ExerciseCard({ exercise, onAddSet, onRemoveSet, onUpdateSet, onRemove }: {
  exercise: ExerciseLog; onAddSet: () => void; onRemoveSet: (id: string) => void;
  onUpdateSet: (id: string, u: Partial<SetLog>) => void; onRemove: () => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div className="card animate-slide-up" style={{ borderLeftWidth: "3px", borderLeftColor: "var(--accent)", background: "var(--surface-2)" }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-blue-500/10 rounded-lg flex items-center justify-center">
            <Dumbbell className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <h3 className="font-bold text-sm" style={{ color: "var(--text-1)" }}>{exercise.name}</h3>
          <span className="badge bg-blue-500/10 text-blue-400 text-xs border border-blue-500/20">{exercise.sets.length} sets</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setCollapsed(!collapsed)} className="btn-ghost p-1.5">
            {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
          <button onClick={onRemove} className="btn-ghost p-1.5 hover:text-red-400">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      {!collapsed && (
        <>
          <div className="flex items-center gap-2 mb-2 px-1">
            <span className="w-6 text-center text-[10px] font-bold uppercase tracking-wide flex-shrink-0" style={{ color: "var(--text-3)" }}>#</span>
            <span className="flex-1 text-[10px] font-bold uppercase tracking-wide text-center" style={{ color: "var(--text-3)" }}>Reps</span>
            <span className="flex-[1.4] text-[10px] font-bold uppercase tracking-wide text-center" style={{ color: "var(--text-3)" }}>Weight</span>
            <span className="flex-1 text-[10px] font-bold uppercase tracking-wide text-center" style={{ color: "var(--text-3)" }}>Unit</span>
            <span className="w-8 flex-shrink-0" />
          </div>
          <div className="space-y-2">
            {exercise.sets.map((s, i) => (
              <SetRow key={s.id} set={s} index={i} onUpdate={(u) => onUpdateSet(s.id, u)} onRemove={() => onRemoveSet(s.id)} />
            ))}
          </div>
          <button onClick={onAddSet}
            className="w-full mt-3 flex items-center justify-center gap-1.5 text-xs font-semibold hover:text-blue-400 py-2.5 rounded-xl border border-dashed hover:border-blue-500/30 hover:bg-blue-500/5 transition-all"
            style={{ color: "var(--text-3)", borderColor: "var(--border)" }}>
            <Plus className="w-3.5 h-3.5" /> Add set
          </button>
        </>
      )}
    </div>
  );
}

// ── SetRow ─────────────────────────────────────────────────────────────────────
function SetRow({ set, index, onUpdate, onRemove }: { set: SetLog; index: number; onUpdate: (u: Partial<SetLog>) => void; onRemove: () => void }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-black w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ color: "var(--text-3)", background: "var(--surface-2)" }}>{index + 1}</span>
      <input type="number" inputMode="numeric" min={0} placeholder="0" value={set.reps || ""}
        onChange={(e) => onUpdate({ reps: Number(e.target.value) })}
        className="flex-1 input text-sm text-center py-2.5 px-1 font-bold min-w-0" />
      <input type="number" inputMode="decimal" min={0} step={0.5} placeholder="—"
        value={set.unit === "bodyweight" ? "" : (set.weight || "")}
        disabled={set.unit === "bodyweight"}
        onChange={(e) => onUpdate({ weight: Number(e.target.value) })}
        className="flex-[1.4] input text-sm text-center py-2.5 px-1 font-bold disabled:opacity-40 min-w-0" />
      <select value={set.unit} onChange={(e) => onUpdate({ unit: e.target.value as WeightUnit })}
        className="flex-1 input text-xs py-2.5 px-1 font-semibold min-w-0">
        <option value="kg">kg</option>
        <option value="lbs">lbs</option>
        <option value="bodyweight">BW</option>
      </select>
      <button onClick={onRemove}
        className="w-8 h-8 flex items-center justify-center rounded-lg hover:text-red-400 hover:bg-red-500/10 active:scale-90 transition-all flex-shrink-0"
        style={{ color: "var(--text-3)" }}>
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// ── PastWorkoutCard ────────────────────────────────────────────────────────────
function PastWorkoutCard({ session: s, defaultExpanded = false }: { session: WorkoutSession; defaultExpanded?: boolean }) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const totalSets = s.exercises.reduce((acc, ex) => acc + ex.sets.length, 0);
  const totalCardioCals = (s.cardioLogs ?? []).reduce((sum, c) => sum + (c.caloriesBurned ?? 0), 0);
  return (
    <div className="card transition-all duration-200">
      <div className="flex items-start justify-between cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
            <Dumbbell className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <p className="font-bold text-sm" style={{ color: "var(--text-1)" }}>{formatDate(s.date)}</p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {s.exercises.length > 0 && <span className="badge text-xs font-bold" style={{ background: "var(--surface-2)", color: "var(--text-2)", border: "1px solid var(--border)" }}>{s.exercises.length} exercises · {totalSets} sets</span>}
              {(s.cardioLogs ?? []).length > 0 && <span className="badge text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">{s.cardioLogs!.length} cardio</span>}
              {s.durationMinutes > 0 && <span className="badge text-xs font-bold" style={{ background: "var(--surface-2)", color: "var(--text-2)", border: "1px solid var(--border)" }}>{s.durationMinutes} min</span>}
              {totalCardioCals > 0 && <span className="badge text-xs font-bold bg-orange-500/10 text-orange-400 border border-orange-500/20 flex items-center gap-1"><Flame className="w-3 h-3" />{totalCardioCals} kcal</span>}
            </div>
          </div>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 flex-shrink-0" style={{ color: "var(--text-3)" }} /> : <ChevronDown className="w-4 h-4 flex-shrink-0" style={{ color: "var(--text-3)" }} />}
      </div>
      {expanded && (
        <div className="mt-4 space-y-3 pt-4 animate-fade-in" style={{ borderTop: "1px solid var(--border-subtle)" }}>
          {/* Strength */}
          {s.exercises.map((ex) => (
            <div key={ex.id}>
              <p className="text-xs font-bold mb-2" style={{ color: "var(--text-2)" }}>{ex.name}</p>
              <div className="flex flex-wrap gap-1.5">
                {ex.sets.map((set, i) => (
                  <span key={set.id} className="badge bg-blue-500/10 text-blue-400 font-bold border border-blue-500/20">
                    {i + 1}: {set.reps}r {set.unit === "bodyweight" ? "BW" : `× ${set.weight}${set.unit}`}
                  </span>
                ))}
              </div>
            </div>
          ))}
          {/* Cardio */}
          {(s.cardioLogs ?? []).length > 0 && (
            <div>
              <p className="text-xs font-bold mb-2 flex items-center gap-1.5" style={{ color: "var(--text-2)" }}>
                <Footprints className="w-3 h-3 text-emerald-400" /> Cardio
              </p>
              <div className="flex flex-wrap gap-1.5">
                {s.cardioLogs!.map((c) => {
                  const meta = CARDIO_META[c.activity];
                  return (
                    <span key={c.id} className="badge bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20 flex items-center gap-1">
                      {meta.label} · {c.durationMinutes}min
                      {c.distanceKm ? ` · ${c.distanceKm}${meta.unit}` : ""}
                      {c.caloriesBurned ? ` · ${c.caloriesBurned}kcal` : ""}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
          {s.summary && (
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/40 dark:to-purple-950/40 rounded-xl p-4 border border-indigo-100 dark:border-indigo-900/40">
              <p className="text-xs font-bold mb-3 flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
                <Sparkles className="w-3.5 h-3.5" /> Coach Report
              </p>
              <MarkdownText text={s.summary} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── TemplateCard ───────────────────────────────────────────────────────────────
function TemplateCard({ template: tpl, onLoad, onDelete }: {
  template: WorkoutTemplate;
  onLoad: () => void;
  onDelete?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const accentColor = "var(--accent)";

  return (
    <div className="card transition-all duration-200 group"
      style={{ borderLeftWidth: "3px", borderLeftColor: accentColor }}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-black text-sm" style={{ color: "var(--text-1)" }}>{tpl.name}</p>
            {tpl.isPreset && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                Preset
              </span>
            )}
            {(tpl.source === "onboarding" || tpl.isOnboarding) && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                Assigned
              </span>
            )}
          </div>
          {tpl.description && (
            <p className="text-xs mt-0.5 font-medium" style={{ color: "var(--text-3)" }}>{tpl.description}</p>
          )}
          <p className="text-xs mt-1 font-semibold" style={{ color: "var(--text-3)" }}>
            {tpl.exercises.length} exercises · {tpl.exercises.reduce((a, e) => a + e.defaultSets, 0)} sets
          </p>
        </div>
        <div className="flex items-center gap-1 ml-2 flex-shrink-0">
          <button onClick={() => setExpanded(!expanded)}
            className="btn-ghost p-1.5 text-xs" title="Preview">
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          {onDelete && (
            <button onClick={onDelete}
              className="btn-ghost p-1.5 hover:text-red-400 transition-colors" title="Delete">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          <button onClick={onLoad}
            className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-all active:scale-95"
            style={{ background: `${accentColor}20`, color: accentColor, border: `1px solid ${accentColor}40` }}>
            <Pencil className="w-3 h-3" /> Load
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-3 pt-3 space-y-1 animate-fade-in" style={{ borderTop: "1px solid var(--border-subtle)" }}>
          {tpl.exercises.map((ex) => (
            <div key={ex.id} className="flex items-center justify-between text-xs py-1">
              <span className="font-semibold" style={{ color: "var(--text-2)" }}>{ex.name}</span>
              <span className="font-bold" style={{ color: "var(--text-3)" }}>
                {ex.defaultSets}×{ex.defaultReps}
                {ex.defaultUnit !== "bodyweight" && ex.defaultWeight ? ` @ ${ex.defaultWeight}${ex.defaultUnit}` : ex.defaultUnit === "bodyweight" ? " BW" : ""}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function newSet(): SetLog {
  return { id: generateId(), reps: 0, unit: "kg", completed: false };
}
