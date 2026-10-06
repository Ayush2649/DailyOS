"use client";
import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import {
  Plus, Minus, Utensils, Camera, Trash2, X, Loader2, Settings,
  Flame, ChevronLeft, ChevronRight, Sparkles, CheckCircle2,
  Bookmark, BookmarkPlus, Search, Mic, Edit3
} from "lucide-react";
import VoiceMealModal from "@/components/diet/VoiceMealModal";
import { cn, todayString, formatDate, localDateString } from "@/lib/utils";
import {
  getMeals, addMeal, deleteMeal, getMacroGoals, saveMacroGoals,
  getMealTemplates, saveMealTemplate, updateMealTemplate, deleteMealTemplate,
} from "@/lib/firestore";
import { setDietContext } from "@/lib/orbitContext";
import { useToast } from "@/components/ui/Toast";
import type { MealEntry, MealMacros, MacroGoals, MealTemplate } from "@/types";

// ── SVG Ring ─────────────────────────────────────────────────────────────────
function MacroRing({
  value, goal, color, size = 72, stroke = 6,
}: {
  value: number; goal: number; color: string; size?: number; stroke?: number;
}) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(value / goal, 1);
  const offset = circ * (1 - pct);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="macro-ring">
      <circle cx={size / 2} cy={size / 2} r={r} className="macro-ring-track" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        className="macro-ring-fill"
        strokeWidth={stroke}
        stroke={color}
        strokeDasharray={circ}
        strokeDashoffset={offset}
      />
    </svg>
  );
}

// ── Calorie Big Ring ──────────────────────────────────────────────────────────
function CalorieRing({ value, goal }: { value: number; goal: number }) {
  const size = 140;
  const stroke = 10;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(value / goal, 1);
  const offset = circ * (1 - pct);
  const remaining = Math.max(goal - value, 0);

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="macro-ring absolute">
        <circle cx={size / 2} cy={size / 2} r={r} className="macro-ring-track" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          className="macro-ring-fill"
          strokeWidth={stroke}
          stroke="#F59E0B"
          strokeDasharray={circ}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="text-center relative z-10">
        <p className="text-2xl font-black text-gray-900 dark:text-white leading-none">{Math.round(remaining)}</p>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">remaining</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{Math.round(value)} / {goal}</p>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function DietPage() {
  const { data: session } = useSession();
  const userId = (session?.user as any)?.id ?? session?.user?.email ?? "";
  const { toast } = useToast();

  const [date, setDate] = useState(todayString());
  const [meals, setMeals] = useState<MealEntry[]>([]);
  const [goals, setGoals] = useState<MacroGoals | null>(null);
  const [loading, setLoading] = useState(false);

  const [showAddMeal, setShowAddMeal] = useState(false);
  const [showGoals, setShowGoals] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [showVoiceMeal, setShowVoiceMeal] = useState(false);
  const [templates, setTemplates] = useState<MealTemplate[]>([]);
  const [savingTemplate, setSavingTemplate] = useState<{ name: string; macros: MealMacros } | null>(null);

  useEffect(() => {
    if (!userId) return;
    getMacroGoals(userId).then((g) => { if (g) setGoals(g); });
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    getMealTemplates(userId).then(setTemplates);
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    getMeals(userId, date).then(setMeals).finally(() => setLoading(false));
  }, [userId, date]);

  const totals: MealMacros = meals.reduce(
    (acc, m) => ({
      calories: acc.calories + m.macros.calories,
      proteinG: acc.proteinG + m.macros.proteinG,
      carbsG: acc.carbsG + m.macros.carbsG,
      fatG: acc.fatG + m.macros.fatG,
    }),
    { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 }
  );

  // Keep Orbit's diet context in sync so it can answer meal-specific questions
  useEffect(() => {
    setDietContext({
      date,
      meals: meals.map((m) => ({
        name: m.name,
        calories: Math.round(m.macros.calories),
        proteinG: Math.round(m.macros.proteinG),
        carbsG: Math.round(m.macros.carbsG),
        fatG: Math.round(m.macros.fatG),
      })),
      totals: {
        calories: Math.round(totals.calories),
        proteinG: Math.round(totals.proteinG),
        carbsG: Math.round(totals.carbsG),
        fatG: Math.round(totals.fatG),
      },
      goals,
    });
  }, [meals, goals, date, totals.calories, totals.proteinG, totals.carbsG, totals.fatG]);

  const handleAddMeal = async (meal: Omit<MealEntry, "id">) => {
    const created = await addMeal(meal);
    setMeals((prev) => [...prev, created]);
    setShowAddMeal(false);
    setShowScanner(false);
    toast("Meal logged! 🍽️", "success");
  };

  const handleLogVoiceMeals = async (parsedMeals: { name: string; macros: MealMacros }[]) => {
    const created: MealEntry[] = [];
    for (const pm of parsedMeals) {
      const c = await addMeal({ userId, date, name: pm.name, macros: pm.macros, createdAt: Date.now() });
      created.push(c);
    }
    setMeals((prev) => [...prev, ...created]);
    setShowVoiceMeal(false);
    if (created.length) toast(`Logged ${created.length} meal${created.length !== 1 ? "s" : ""} 🎤`, "success");
  };

  const handleSaveTemplate = async (t: Omit<MealTemplate, "id">) => {
    const created = await saveMealTemplate(t);
    setTemplates((prev) => [created, ...prev]);
    setSavingTemplate(null);
    toast("Saved to your meals 🔖", "success");
  };

  const handleDeleteTemplate = async (id: string) => {
    await deleteMealTemplate(id);
    setTemplates((prev) => prev.filter((t) => t.id !== id));
    toast("Saved meal removed", "info");
  };

  const handleLogFromTemplate = async (meal: Omit<MealEntry, "id">, templateId: string) => {
    const created = await addMeal(meal);
    setMeals((prev) => [...prev, created]);
    // bump usage so frequently/recently used meals float to the top
    const existing = templates.find((t) => t.id === templateId);
    const patch = { lastUsedAt: Date.now(), useCount: (existing?.useCount ?? 0) + 1 };
    updateMealTemplate(templateId, patch);
    setTemplates((prev) =>
      prev
        .map((t) => (t.id === templateId ? { ...t, ...patch } : t))
        .sort((a, b) => (b.lastUsedAt ?? b.createdAt) - (a.lastUsedAt ?? a.createdAt))
    );
    setShowSaved(false);
    toast("Meal logged! 🍽️", "success");
  };

  const handleDeleteMeal = async (id: string) => {
    await deleteMeal(id);
    setMeals((prev) => prev.filter((m) => m.id !== id));
    toast("Meal removed", "info");
  };

  const handleSaveGoals = async (g: MacroGoals) => {
    await saveMacroGoals(userId, g);
    setGoals(g);
    setShowGoals(false);
    toast("Goals updated!", "success");
  };

  const changeDate = (delta: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + delta);
    setDate(localDateString(d));
  };

  const isToday = date === todayString();

  return (
    <div className="animate-fade-in">
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Diet</h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5 font-medium">Fuel your performance</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowVoiceMeal(true)} className="btn-secondary text-sm flex items-center gap-1.5" title="Log meal by voice">
            <Mic className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Voice</span>
          </button>
          <button onClick={() => setShowSaved(true)} className="btn-secondary text-sm flex items-center gap-1.5">
            <Bookmark className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Saved</span>
          </button>
          <button onClick={() => setShowGoals(true)} className="btn-secondary text-sm flex items-center gap-1.5">
            <Settings className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Goals</span>
          </button>
          <button onClick={() => setShowAddMeal(true)} className="btn-primary text-sm flex items-center gap-1.5">
            <Plus className="w-4 h-4" />
            <span>Log meal</span>
          </button>
        </div>
      </div>

      {/* ── Date navigator ── */}
      <div className="flex items-center justify-between card mb-5">
        <button onClick={() => changeDate(-1)} className="btn-ghost p-2">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="text-center">
          <p className="font-bold text-gray-900 dark:text-white text-sm">{formatDate(date)}</p>
          {isToday && (
            <span className="text-xs font-bold text-emerald-500">Today</span>
          )}
        </div>
        <button onClick={() => changeDate(1)} disabled={isToday} className="btn-ghost p-2 disabled:opacity-30">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* ── Macro Dashboard ── */}
      <div className="card mb-5">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-gray-900 dark:text-white text-sm">Daily Nutrition</h3>
          <span className="text-xs font-semibold text-gray-400 bg-gray-50 dark:bg-gray-700 px-2.5 py-1 rounded-full">
            {meals.length} meal{meals.length !== 1 ? "s" : ""} logged
          </span>
        </div>

        {/* Calorie ring + macros — stacked on mobile, side-by-side on sm+ */}
        {goals ? (
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-5">
            <CalorieRing value={totals.calories} goal={goals.calories} />

            <div className="w-full grid grid-cols-3 gap-3 sm:flex-1">
              {/* Protein */}
              <div className="flex flex-col items-center gap-1.5">
                <div className="relative">
                  <MacroRing value={totals.proteinG} goal={goals.proteinG} color="#3B82F6" size={68} stroke={6} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[10px] font-black text-blue-500">{Math.round((totals.proteinG / goals.proteinG) * 100)}%</span>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-sm font-black text-gray-900 dark:text-white">{Math.round(totals.proteinG)}g</p>
                  <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400">Protein</p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500">/ {goals.proteinG}g</p>
                </div>
              </div>

              {/* Carbs */}
              <div className="flex flex-col items-center gap-1.5">
                <div className="relative">
                  <MacroRing value={totals.carbsG} goal={goals.carbsG} color="#10B981" size={68} stroke={6} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[10px] font-black text-emerald-500">{Math.round((totals.carbsG / goals.carbsG) * 100)}%</span>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-sm font-black text-gray-900 dark:text-white">{Math.round(totals.carbsG)}g</p>
                  <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400">Carbs</p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500">/ {goals.carbsG}g</p>
                </div>
              </div>

              {/* Fat */}
              <div className="flex flex-col items-center gap-1.5">
                <div className="relative">
                  <MacroRing value={totals.fatG} goal={goals.fatG} color="#F43F5E" size={68} stroke={6} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[10px] font-black text-rose-500">{Math.round((totals.fatG / goals.fatG) * 100)}%</span>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-sm font-black text-gray-900 dark:text-white">{Math.round(totals.fatG)}g</p>
                  <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400">Fat</p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500">/ {goals.fatG}g</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl p-3 bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-600 dark:text-emerald-400">
              <span className="font-semibold">Intuitive Habit Tracking Active</span> — Daily numerical targets are not set. You can establish targets anytime in Settings.
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="w-24 h-24 rounded-full border border-amber-500/20 bg-amber-500/5 flex flex-col items-center justify-center shrink-0">
                <span className="text-lg font-black text-amber-500 tabular-nums">{Math.round(totals.calories)}</span>
                <span className="text-[10px] text-gray-400">kcal</span>
              </div>
              <div className="w-full grid grid-cols-3 gap-3 sm:flex-1">
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800 text-center">
                  <p className="text-sm font-black text-blue-500">{Math.round(totals.proteinG)}g</p>
                  <p className="text-[11px] font-semibold text-gray-500">Protein</p>
                </div>
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800 text-center">
                  <p className="text-sm font-black text-emerald-500">{Math.round(totals.carbsG)}g</p>
                  <p className="text-[11px] font-semibold text-gray-500">Carbs</p>
                </div>
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800 text-center">
                  <p className="text-sm font-black text-rose-500">{Math.round(totals.fatG)}g</p>
                  <p className="text-[11px] font-semibold text-gray-500">Fat</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Calorie label row */}
        {goals ? (
          <div className="mt-4 flex items-center gap-3">
            <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${Math.min((totals.calories / goals.calories) * 100, 100)}%`, backgroundColor: "#F59E0B" }}
              />
            </div>
            <span className="text-xs font-bold text-amber-500">
              {Math.round(totals.calories)} / {goals.calories} kcal
            </span>
          </div>
        ) : (
          <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
            <span>{meals.length} logged item{meals.length !== 1 ? "s" : ""} today</span>
            <span className="font-semibold text-amber-500">{Math.round(totals.calories)} kcal total</span>
          </div>
        )}
      </div>

      {/* ── Scan CTA ── */}
      <button
        onClick={() => setShowScanner(true)}
        className="group w-full mb-5 rounded-2xl p-3.5 flex items-center gap-3 transition-all duration-200 active:scale-[0.99]"
        style={{
          background: "linear-gradient(135deg, rgba(16,185,129,0.14), rgba(13,148,136,0.04))",
          border: "1px solid rgba(16,185,129,0.28)",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 16px 40px -16px rgba(16,185,129,0.4)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}
      >
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md transition-transform duration-300 group-hover:scale-105 group-hover:rotate-3"
          style={{ background: "linear-gradient(135deg,#10B981,#0D9488)" }}>
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div className="text-left flex-1 min-w-0">
          <p className="text-sm font-bold flex items-center gap-1.5" style={{ color: "var(--text-1)" }}>
            Scan meal with AI
            <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ background: "rgba(16,185,129,0.16)", color: "#10b981" }}>AI</span>
          </p>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-3)" }}>Snap a photo — instant macros in seconds</p>
        </div>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(16,185,129,0.12)" }}>
          <Camera className="w-4 h-4" style={{ color: "#10b981" }} />
        </div>
      </button>

      {/* ── Meals list ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold" style={{ color: "var(--text-2)" }}>
            Meals <span className="font-semibold" style={{ color: "var(--text-3)" }}>({meals.length})</span>
          </h3>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <div key={i} className="h-20 skeleton" />)}
          </div>
        ) : meals.length === 0 ? (
          <div className="text-center py-12 card border-dashed border-2 border-gray-200">
            <Utensils className="w-10 h-10 text-gray-200 mx-auto mb-2" />
            <p className="text-gray-400 text-sm font-medium">No meals logged yet</p>
            <p className="text-gray-300 text-xs mt-1">Log a meal or scan a photo</p>
            <button onClick={() => setShowAddMeal(true)} className="mt-3 text-sm font-semibold text-emerald-500 hover:text-emerald-700 transition-colors">
              + Add meal
            </button>
          </div>
        ) : (
          <div className="space-y-2 stagger">
            {meals.map((m) => (
              <MealCard
                key={m.id}
                meal={m}
                onDelete={() => handleDeleteMeal(m.id)}
                onSave={() => setSavingTemplate({ name: m.name, macros: m.macros })}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      {showAddMeal && (
        <AddMealModal
          userId={userId}
          date={date}
          onSave={handleAddMeal}
          onSaveTemplate={handleSaveTemplate}
          onClose={() => setShowAddMeal(false)}
        />
      )}
      {showScanner && (
        <MealScannerModal
          userId={userId}
          date={date}
          onSave={handleAddMeal}
          onClose={() => setShowScanner(false)}
          onSwitchToManual={() => {
            setShowScanner(false);
            setShowAddMeal(true);
          }}
          onSwitchToVoice={() => {
            setShowScanner(false);
            setShowVoiceMeal(true);
          }}
        />
      )}
      {showGoals && (
        <GoalsModal goals={goals} onSave={handleSaveGoals} onClose={() => setShowGoals(false)} />
      )}
      {showSaved && (
        <SavedMealsModal
          templates={templates}
          userId={userId}
          date={date}
          onLog={handleLogFromTemplate}
          onDelete={handleDeleteTemplate}
          onClose={() => setShowSaved(false)}
        />
      )}
      {savingTemplate && (
        <SaveTemplateModal
          userId={userId}
          initial={savingTemplate}
          onSave={handleSaveTemplate}
          onClose={() => setSavingTemplate(null)}
        />
      )}
      {showVoiceMeal && (
        <VoiceMealModal onAdd={handleLogVoiceMeals} onClose={() => setShowVoiceMeal(false)} />
      )}
    </div>
  );
}

// ── MealCard ──────────────────────────────────────────────────────────────────
function MealCard({ meal, onDelete, onSave }: { meal: MealEntry; onDelete: () => void; onSave: () => void }) {
  const macros = [
    { label: "P", value: Math.round(meal.macros.proteinG), color: "#60a5fa" },
    { label: "C", value: Math.round(meal.macros.carbsG),   color: "#34d399" },
    { label: "F", value: Math.round(meal.macros.fatG),     color: "#fb7185" },
    ...(meal.macros.fiberG != null && meal.macros.fiberG > 0
      ? [{ label: "Fib", value: Math.round(meal.macros.fiberG), color: "#a78bfa" }]
      : []),
  ];

  return (
    <div
      className="group relative rounded-2xl p-3 flex items-center gap-3 transition-all duration-200 animate-slide-up"
      style={{ background: "var(--surface-0)", border: "1px solid var(--border)" }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.borderColor = "rgba(16,185,129,0.32)"; e.currentTarget.style.boxShadow = "0 14px 38px -16px rgba(16,185,129,0.4)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.boxShadow = ""; }}
    >
      {/* emerald gradient tile */}
      <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm transition-transform duration-300 group-hover:scale-105"
        style={{ background: "linear-gradient(135deg,#10B981,#0D9488)" }}>
        <Utensils className="w-5 h-5 text-white" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm truncate pr-1" style={{ color: "var(--text-1)" }}>{meal.name}</p>
        <div className="flex items-center gap-2 mt-1.5">
          {/* calories — the hero stat */}
          <span className="font-display text-sm font-extrabold leading-none" style={{ color: "var(--text-1)" }}>
            {Math.round(meal.macros.calories)}
            <span className="text-[10px] font-bold ml-0.5" style={{ color: "var(--text-3)" }}>kcal</span>
          </span>
          <span className="w-px h-3 rounded-full" style={{ background: "var(--border)" }} />
          {/* macros — sleek dotted values */}
          {macros.map(({ label, value, color }) => (
            <span key={label} className="inline-flex items-center gap-1 text-[11px] font-bold whitespace-nowrap" style={{ color: "var(--text-2)" }}>
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
              {value}<span style={{ color: "var(--text-3)" }}>{label}</span>
            </span>
          ))}
        </div>
      </div>

      <div className="flex items-center flex-shrink-0">
        <button
          onClick={onSave}
          title="Save as a reusable meal"
          className="p-2 rounded-lg hover:text-emerald-500 hover:bg-emerald-500/10 active:scale-90 transition-all"
          style={{ color: "var(--text-3)" }}
        >
          <BookmarkPlus className="w-4 h-4" />
        </button>
        <button
          onClick={onDelete}
          className="p-2 rounded-lg hover:text-red-400 hover:bg-red-500/10 active:scale-90 transition-all"
          style={{ color: "var(--text-3)" }}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ── Modal wrapper ─────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pt-4 pb-24 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative rounded-2xl shadow-2xl w-full max-w-md p-5 animate-slide-up max-h-[80dvh] overflow-y-auto"
        style={{ background: "var(--surface-2)", border: "1px solid var(--border)", boxShadow: "0 24px 80px rgba(0,0,0,0.4)" }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold" style={{ color: "var(--text-1)" }}>{title}</h3>
          <button onClick={onClose} className="btn-ghost p-1.5"><X className="w-4 h-4" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── AddMealModal ──────────────────────────────────────────────────────────────
function AddMealModal({ userId, date, onSave, onSaveTemplate, onClose }: {
  userId: string;
  date: string;
  onSave: (m: Omit<MealEntry, "id">) => void;
  onSaveTemplate: (t: Omit<MealTemplate, "id">) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [estimating, setEstimating] = useState(false);
  const [estimated, setEstimated] = useState(false);
  const lastEstimated = useRef("");

  const estimateMacros = async (dishName: string) => {
    if (!dishName.trim() || dishName.trim().length < 3) return;
    if (dishName.trim() === lastEstimated.current) return;
    // Only auto-estimate if user hasn't already filled in macros manually
    if (calories || protein || carbs || fat) return;

    setEstimating(true);
    setEstimated(false);
    try {
      const res = await fetch("/api/estimate-meal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dishName: dishName.trim() }),
      });
      const data = await res.json();
      if (!data.error) {
        setCalories(String(data.calories));
        setProtein(String(data.proteinG));
        setCarbs(String(data.carbsG));
        setFat(String(data.fatG));
        lastEstimated.current = dishName.trim();
        setEstimated(true);
      }
    } catch { /* silently fail — user can fill manually */ }
    finally { setEstimating(false); }
  };

  const handleSave = () => {
    if (!name.trim()) return;
    const macros = {
      calories: Number(calories) || 0,
      proteinG: Number(protein) || 0,
      carbsG: Number(carbs) || 0,
      fatG: Number(fat) || 0,
    };
    if (saveAsTemplate) {
      onSaveTemplate({
        userId, name: name.trim(),
        baseQuantity: 1, unit: "serving",
        macros, createdAt: Date.now(), useCount: 0,
      });
    }
    onSave({ userId, date, name: name.trim(), macros, createdAt: Date.now() });
  };

  return (
    <Modal title="Log a meal" onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className="label">Meal name *</label>
          <input
            autoFocus
            className="input"
            placeholder="e.g. 2 besan cheela with curd"
            value={name}
            onChange={(e) => { setName(e.target.value); setEstimated(false); }}
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
          />
          <p className="text-[11px] mt-1 font-medium" style={{ color: "var(--text-3)" }}>
            Tap the Calories field to auto-fill macros ✨
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label flex items-center gap-1.5">
              Calories (kcal)
              {estimating && <Loader2 className="w-3 h-3 animate-spin text-emerald-500" />}
              {estimated && !estimating && <Sparkles className="w-3 h-3 text-emerald-500" />}
            </label>
            <input
              type="number"
              className={cn("input text-sm transition-all", estimated && "border-emerald-400/60 bg-emerald-500/5")}
              placeholder="0"
              value={calories}
              onFocus={() => estimateMacros(name)}
              onChange={(e) => { setCalories(e.target.value); setEstimated(false); }}
            />
          </div>
          <div>
            <label className="label">Protein (g)</label>
            <input
              type="number"
              className={cn("input text-sm transition-all", estimated && "border-emerald-400/60 bg-emerald-500/5")}
              placeholder="0"
              value={protein}
              onChange={(e) => { setProtein(e.target.value); setEstimated(false); }}
            />
          </div>
          <div>
            <label className="label">Carbs (g)</label>
            <input
              type="number"
              className={cn("input text-sm transition-all", estimated && "border-emerald-400/60 bg-emerald-500/5")}
              placeholder="0"
              value={carbs}
              onChange={(e) => { setCarbs(e.target.value); setEstimated(false); }}
            />
          </div>
          <div>
            <label className="label">Fat (g)</label>
            <input
              type="number"
              className={cn("input text-sm transition-all", estimated && "border-emerald-400/60 bg-emerald-500/5")}
              placeholder="0"
              value={fat}
              onChange={(e) => { setFat(e.target.value); setEstimated(false); }}
            />
          </div>
        </div>

        {estimated && (
          <p className="text-[11px] font-semibold text-emerald-500 flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> AI estimated — edit if needed
          </p>
        )}

        {/* Save as reusable meal */}
        <button
          type="button"
          onClick={() => setSaveAsTemplate((v) => !v)}
          className="w-full flex items-center gap-2.5 py-2 px-1 group"
        >
          <span className={cn(
            "w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all flex-shrink-0",
            saveAsTemplate ? "bg-emerald-500 border-emerald-500" : "border-gray-300 dark:border-gray-600"
          )}>
            {saveAsTemplate && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
          </span>
          <span className="flex items-center gap-1.5 text-sm font-medium" style={{ color: "var(--text-2)" }}>
            <Bookmark className="w-3.5 h-3.5 text-emerald-500" />
            Save as a reusable meal
          </span>
        </button>

        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="btn-secondary flex-1 text-sm">Cancel</button>
          <button onClick={handleSave} disabled={!name.trim()} className="btn-primary flex-1 text-sm">Log meal</button>
        </div>
      </div>
    </Modal>
  );
}

// TODO: When dedicated user AI consent modal/settings are implemented, ensure consent disclosure states: "Photos are processed by Google Gemini for nutritional identification."

// ── MealScannerModal ──────────────────────────────────────────────────────────
function MealScannerModal({
  userId,
  date,
  onSave,
  onClose,
  onSwitchToManual,
  onSwitchToVoice,
}: {
  userId: string;
  date: string;
  onSave: (m: Omit<MealEntry, "id">) => void;
  onClose: () => void;
  onSwitchToManual?: () => void;
  onSwitchToVoice?: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string>("");
  const [scanning, setScanning] = useState(false);
  const [reestimating, setReestimating] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [hint, setHint] = useState("");
  const [selectedOption, setSelectedOption] = useState<string>("");
  const [calorieRange, setCalorieRange] = useState<{ low: number; high: number } | null>(null);
  const [editedName, setEditedName] = useState("");
  const [editedMacros, setEditedMacros] = useState({ calories: "", protein: "", carbs: "", fat: "", fiber: "" });
  const [error, setError] = useState("");
  const [isPhotoUnavailable, setIsPhotoUnavailable] = useState(false);

  const handleFile = async (file: File) => {
    setError("");
    setIsPhotoUnavailable(false);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      setPreview(dataUrl);
      setScanning(true);
      try {
        const base64 = dataUrl.split(",")[1];
        const mimeType = file.type;
        const res = await fetch("/api/analyze-meal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageBase64: base64,
            mimeType,
            hint: hint.trim() || undefined,
          }),
        });
        const data = await res.json();
        if (data.error) {
          if (data.error === "PHOTO_UNAVAILABLE" || data.message?.includes("Photo scan is busy")) {
            setIsPhotoUnavailable(true);
            setError("Photo scan is busy. Type or speak your meal instead.");
          } else {
            setError(data.error);
          }
        } else {
          setResult(data);
          setEditedName(data.name || "");
          setSelectedOption(data.name || "");
          if (data.calorieRange) {
            setCalorieRange(data.calorieRange);
          } else {
            setCalorieRange(null);
          }
          setEditedMacros({
            calories: String(data.calories ?? ""),
            protein: String(data.proteinG ?? ""),
            carbs: String(data.carbsG ?? ""),
            fat: String(data.fatG ?? ""),
            fiber: String(data.fiberG ?? ""),
          });
        }
      } catch {
        setError("Failed to analyze image. Please try again.");
      } finally {
        setScanning(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSelectOption = async (optionName: string) => {
    setSelectedOption(optionName);
    setReestimating(true);
    setError("");
    try {
      // Re-run ONLY Stage 2: text macro estimate with the chosen dish
      // Preserve any non-flatbread visible accompaniments from stage 1 (e.g. dahi, dal, sabzi)
      const visibleAcc = (result?.visibleItems || [])
        .filter((item: string) => !/\b(roti|chapati|phulka|paratha|naan|puri|bhatura|thepla)\b/i.test(item))
        .join(", ");
      const dishDescription = visibleAcc ? `${optionName} with ${visibleAcc}` : optionName;

      const res = await fetch("/api/estimate-meal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dishName: dishDescription }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setEditedName(optionName);
        if (data.calorieRange) {
          setCalorieRange(data.calorieRange);
        }
        setEditedMacros({
          calories: String(data.calories ?? ""),
          protein: String(data.proteinG ?? ""),
          carbs: String(data.carbsG ?? ""),
          fat: String(data.fatG ?? ""),
          fiber: String(data.fiberG ?? ""),
        });
      }
    } catch {
      setError("Failed to recalculate macros. Please try again.");
    } finally {
      setReestimating(false);
    }
  };

  const handleLog = () => {
    onSave({
      userId, date, name: editedName || "Scanned meal",
      macros: {
        calories: Number(editedMacros.calories) || 0,
        proteinG: Number(editedMacros.protein) || 0,
        carbsG: Number(editedMacros.carbs) || 0,
        fatG: Number(editedMacros.fat) || 0,
        ...(editedMacros.fiber ? { fiberG: Number(editedMacros.fiber) } : {}),
      },
      createdAt: Date.now(),
    });
  };

  const isAmbiguous =
    result?.ambiguity === "medium" ||
    result?.ambiguity === "high" ||
    Boolean(result?.needsClarification);

  const confidenceColor = result?.confidence === "high"
    ? "bg-emerald-100 text-emerald-700"
    : result?.confidence === "medium"
    ? "bg-amber-100 text-amber-700"
    : "bg-red-100 text-red-700";

  // Derive options chips to display
  const optionsToDisplay: string[] = result?.needsClarification?.options
    ? result.needsClarification.options
    : (result?.candidates || []).map((c: any) => c.name);

  return (
    <Modal title="Scan meal with AI" onClose={onClose}>
      {!preview ? (
        <div className="space-y-3">
          <div>
            <label className="label text-xs font-semibold text-gray-600 dark:text-gray-300">
              Optional hint (helps identify flatbreads / hidden fillings)
            </label>
            <input
              type="text"
              placeholder="What is this? (optional, e.g. 2 aloo parathas, sugar-free chai)"
              value={hint}
              onChange={(e) => setHint(e.target.value)}
              className="input text-sm"
            />
          </div>
          <div
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-gray-200 rounded-2xl p-10 text-center cursor-pointer hover:border-emerald-300 hover:bg-emerald-50/30 transition-all group"
          >
            <div className="w-14 h-14 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl flex items-center justify-center mx-auto mb-3 group-hover:scale-105 transition-transform">
              <Camera className="w-7 h-7 text-white" />
            </div>
            <p className="text-sm font-bold text-gray-700">Tap to upload a photo</p>
            <p className="text-xs text-gray-400 mt-1">JPG, PNG, HEIC · Photos are processed by Google Gemini</p>
          </div>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="relative">
            <img src={preview} alt="meal" className="w-full h-44 object-cover rounded-xl" />
            {(scanning || reestimating) && (
              <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center gap-2 text-white">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm font-semibold">
                  {scanning ? "Analyzing the meal for you..." : "Recalculating macros..."}
                </span>
              </div>
            )}
          </div>

          {isPhotoUnavailable ? (
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4 text-center space-y-3">
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                Photo scan is busy. Type or speak your meal instead.
              </p>
              <div className="flex gap-2 justify-center pt-1">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onSwitchToManual?.();
                  }}
                  className="btn-secondary text-xs flex items-center gap-1.5 px-3 py-2 font-medium"
                >
                  <Edit3 className="w-3.5 h-3.5 text-emerald-600" /> Type meal
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onSwitchToVoice?.();
                  }}
                  className="btn-secondary text-xs flex items-center gap-1.5 px-3 py-2 font-medium"
                >
                  <Mic className="w-3.5 h-3.5 text-emerald-600" /> Speak meal
                </button>
              </div>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600 font-medium">
              {error}
            </div>
          ) : null}

          {!scanning && result && (
            <div className="space-y-3">
              {/* Confidence / Ambiguity Badge & Notes */}
              <div className="flex items-center gap-2 flex-wrap">
                {isAmbiguous ? (
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800">
                    Check this
                  </span>
                ) : result?.confidence ? (
                  <span className={cn("text-xs font-bold px-2.5 py-1 rounded-full", confidenceColor)}>
                    {result.confidence} confidence
                  </span>
                ) : null}
                {result.notes && (
                  <span className="text-xs text-gray-400 truncate flex-1">{result.notes}</span>
                )}
              </div>

              {/* One-Tap Option Chips */}
              {optionsToDisplay.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                      {result?.needsClarification ? "Choose flatbread type:" : "Suggested options:"}
                    </span>
                    {reestimating && (
                      <span className="text-xs text-emerald-600 flex items-center gap-1 font-medium">
                        <Loader2 className="w-3 h-3 animate-spin" /> Updating...
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {optionsToDisplay.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        disabled={reestimating}
                        onClick={() => handleSelectOption(opt)}
                        className={cn(
                          "text-xs px-2.5 py-1 rounded-lg border font-medium transition-all",
                          selectedOption.toLowerCase() === opt.toLowerCase()
                            ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                            : "bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700"
                        )}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="label">Meal name</label>
                <input
                  className="input text-sm"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="flex justify-between items-baseline mb-1">
                    <label className="label mb-0">Calories (kcal)</label>
                    {calorieRange && (
                      <span className="text-[11px] text-gray-500 dark:text-gray-400">
                        ≈{editedMacros.calories} kcal ({calorieRange.low}–{calorieRange.high})
                      </span>
                    )}
                  </div>
                  <input
                    type="number"
                    className="input text-sm"
                    value={editedMacros.calories}
                    onChange={(e) => setEditedMacros((m) => ({ ...m, calories: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="label">Protein (g)</label>
                  <input
                    type="number"
                    className="input text-sm"
                    value={editedMacros.protein}
                    onChange={(e) => setEditedMacros((m) => ({ ...m, protein: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="label">Carbs (g)</label>
                  <input
                    type="number"
                    className="input text-sm"
                    value={editedMacros.carbs}
                    onChange={(e) => setEditedMacros((m) => ({ ...m, carbs: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="label">Fat (g)</label>
                  <input
                    type="number"
                    className="input text-sm"
                    value={editedMacros.fat}
                    onChange={(e) => setEditedMacros((m) => ({ ...m, fat: e.target.value }))}
                  />
                </div>
                <div className="col-span-2">
                  <label className="label">Fiber (g)</label>
                  <input
                    type="number"
                    className="input text-sm"
                    value={editedMacros.fiber}
                    placeholder="0"
                    onChange={(e) => setEditedMacros((m) => ({ ...m, fiber: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setPreview("");
                    setResult(null);
                    setError("");
                    setIsPhotoUnavailable(false);
                    setCalorieRange(null);
                    setSelectedOption("");
                  }}
                  className="btn-secondary flex-1 text-sm"
                >
                  Retake
                </button>
                <button
                  onClick={handleLog}
                  className="btn-primary flex-1 text-sm flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" /> Log meal
                </button>
              </div>
            </div>
          )}

          {!scanning && !result && (
            <button
              onClick={() => {
                setPreview("");
                setError("");
                setIsPhotoUnavailable(false);
              }}
              className="btn-secondary w-full text-sm"
            >
              Try again with another photo
            </button>
          )}
        </div>
      )}
      <p className="text-[11px] text-gray-400 dark:text-gray-500 text-center pt-2">
        Photos are processed by Google Gemini for nutritional identification.
      </p>
    </Modal>
  );
}

// ── GoalsModal ────────────────────────────────────────────────────────────────
function GoalsModal({ goals, onSave, onClose }: {
  goals: MacroGoals | null; onSave: (g: MacroGoals) => void; onClose: () => void;
}) {
  const [form, setForm] = useState({
    calories: goals ? String(goals.calories) : "",
    proteinG: goals ? String(goals.proteinG) : "",
    carbsG: goals ? String(goals.carbsG) : "",
    fatG: goals ? String(goals.fatG) : "",
  });

  const handleSave = () => {
    const cal = Number(form.calories);
    const p = Number(form.proteinG);
    const c = Number(form.carbsG);
    const f = Number(form.fatG);
    if (!cal || !p || !c || !f || cal <= 0 || p <= 0 || c <= 0 || f <= 0) return;
    onSave({
      calories: Math.round(cal),
      proteinG: Math.round(p),
      carbsG: Math.round(c),
      fatG: Math.round(f),
    });
  };

  const fields = [
    { key: "calories" as const, label: "Calories", unit: "kcal", color: "text-amber-500" },
    { key: "proteinG" as const, label: "Protein", unit: "g", color: "text-blue-500" },
    { key: "carbsG" as const, label: "Carbs", unit: "g", color: "text-emerald-500" },
    { key: "fatG" as const, label: "Fat", unit: "g", color: "text-rose-500" },
  ];

  return (
    <Modal title="Daily macro goals" onClose={onClose}>
      <p className="text-xs text-gray-400 -mt-2 mb-4 font-medium">Set your daily nutrition targets</p>
      <div className="space-y-3 mb-4">
        {fields.map(({ key, label, unit, color }) => (
          <div key={key} className="flex items-center gap-3">
            <label className={cn("text-xs font-bold w-16 flex-shrink-0", color)}>{label}</label>
            <input
              type="number"
              className="input text-sm flex-1"
              value={form[key]}
              onChange={(e) => setForm(f => ({ ...f, [key]: e.target.value }))}
            />
            <span className="text-xs text-gray-400 w-8">{unit}</span>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <button onClick={onClose} className="btn-secondary flex-1 text-sm">Cancel</button>
        <button onClick={handleSave} className="btn-primary flex-1 text-sm">Save goals</button>
      </div>
    </Modal>
  );
}

// ── SaveTemplateModal ─────────────────────────────────────────────────────────
// Save a meal (its macros) as a reusable template tied to a base quantity + unit.
function SaveTemplateModal({ userId, initial, onSave, onClose }: {
  userId: string;
  initial: { name: string; macros: MealMacros };
  onSave: (t: Omit<MealTemplate, "id">) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(initial.name);
  const [baseQuantity, setBaseQuantity] = useState("1");
  const [unit, setUnit] = useState("serving");
  const [macros, setMacros] = useState({
    calories: String(Math.round(initial.macros.calories)),
    protein: String(Math.round(initial.macros.proteinG)),
    carbs: String(Math.round(initial.macros.carbsG)),
    fat: String(Math.round(initial.macros.fatG)),
    fiber: initial.macros.fiberG != null ? String(Math.round(initial.macros.fiberG)) : "",
  });

  const units = ["serving", "g", "bowl", "piece", "cup", "plate"];

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({
      userId,
      name: name.trim(),
      baseQuantity: Number(baseQuantity) || 1,
      unit: unit.trim() || "serving",
      macros: {
        calories: Number(macros.calories) || 0,
        proteinG: Number(macros.protein) || 0,
        carbsG: Number(macros.carbs) || 0,
        fatG: Number(macros.fat) || 0,
        ...(macros.fiber ? { fiberG: Number(macros.fiber) } : {}),
      },
      createdAt: Date.now(),
      useCount: 0,
    });
  };

  const fields = [
    { key: "calories" as const, label: "Calories (kcal)" },
    { key: "protein" as const, label: "Protein (g)" },
    { key: "carbs" as const, label: "Carbs (g)" },
    { key: "fat" as const, label: "Fat (g)" },
  ];

  return (
    <Modal title="Save as a reusable meal" onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className="label">Meal name *</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </div>

        <div>
          <label className="label">These macros are for…</label>
          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="number"
              className="input text-sm w-20 flex-shrink-0"
              value={baseQuantity}
              onChange={(e) => setBaseQuantity(e.target.value)}
            />
            <div className="flex flex-wrap gap-1.5">
              {units.map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setUnit(u)}
                  className={cn(
                    "px-2.5 py-1 rounded-full text-xs font-bold transition-all",
                    unit === u ? "bg-emerald-500 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                  )}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>
          <p className="text-[11px] mt-1.5 font-medium" style={{ color: "var(--text-3)" }}>
            Later you can log any quantity and the macros scale automatically.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {fields.map(({ key, label }) => (
            <div key={key}>
              <label className="label">{label}</label>
              <input
                type="number"
                className="input text-sm"
                value={macros[key]}
                onChange={(e) => setMacros((m) => ({ ...m, [key]: e.target.value }))}
              />
            </div>
          ))}
          <div className="col-span-2">
            <label className="label">Fiber (g)</label>
            <input
              type="number"
              className="input text-sm"
              placeholder="0"
              value={macros.fiber}
              onChange={(e) => setMacros((m) => ({ ...m, fiber: e.target.value }))}
            />
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="btn-secondary flex-1 text-sm">Cancel</button>
          <button onClick={handleSave} disabled={!name.trim()} className="btn-primary flex-1 text-sm">Save meal</button>
        </div>
      </div>
    </Modal>
  );
}

// ── SavedMealsModal ───────────────────────────────────────────────────────────
// Browse saved meals; selecting one opens the quantity-scaling view to log it.
function SavedMealsModal({ templates, userId, date, onLog, onDelete, onClose }: {
  templates: MealTemplate[];
  userId: string;
  date: string;
  onLog: (meal: Omit<MealEntry, "id">, templateId: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<MealTemplate | null>(null);

  if (selected) {
    return (
      <LogTemplateView
        template={selected}
        userId={userId}
        date={date}
        onBack={() => setSelected(null)}
        onLog={onLog}
        onClose={onClose}
      />
    );
  }

  const filtered = templates.filter((t) =>
    t.name.toLowerCase().includes(search.trim().toLowerCase())
  );

  return (
    <Modal title="Saved meals" onClose={onClose}>
      {templates.length === 0 ? (
        <div className="text-center py-10">
          <Bookmark className="w-10 h-10 text-gray-200 dark:text-gray-700 mx-auto mb-2" />
          <p className="text-sm font-medium" style={{ color: "var(--text-2)" }}>No saved meals yet</p>
          <p className="text-xs mt-1 px-4" style={{ color: "var(--text-3)" }}>
            Tap the bookmark icon on any logged meal to save it here for one-tap logging.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-3)" }} />
            <input
              className="input pl-9 text-sm"
              placeholder="Search saved meals…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="space-y-2 max-h-[52dvh] overflow-y-auto -mx-1 px-1">
            {filtered.map((t) => (
              <div
                key={t.id}
                role="button"
                onClick={() => setSelected(t)}
                className="card flex items-center gap-3 cursor-pointer hover:shadow-md transition-all"
                style={{ borderLeftColor: "#10B981", borderLeftWidth: "3px" }}
              >
                <div className="w-9 h-9 bg-emerald-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Utensils className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate" style={{ color: "var(--text-1)" }}>{t.name}</p>
                  <p className="text-xs mt-0.5 truncate" style={{ color: "var(--text-3)" }}>
                    Per {t.baseQuantity} {t.unit} · {Math.round(t.macros.calories)} kcal · {Math.round(t.macros.proteinG)}P {Math.round(t.macros.carbsG)}C {Math.round(t.macros.fatG)}F
                  </p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(t.id); }}
                  className="p-2 rounded-lg hover:text-red-400 hover:bg-red-500/10 active:scale-90 transition-all flex-shrink-0"
                  style={{ color: "var(--text-3)" }}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            {filtered.length === 0 && (
              <p className="text-center text-xs py-6" style={{ color: "var(--text-3)" }}>
                No meals match “{search}”.
              </p>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}

// ── LogTemplateView ───────────────────────────────────────────────────────────
// Pick a quantity for a saved meal; macros scale proportionally and stay editable.
function LogTemplateView({ template, userId, date, onBack, onLog, onClose }: {
  template: MealTemplate;
  userId: string;
  date: string;
  onBack: () => void;
  onLog: (meal: Omit<MealEntry, "id">, templateId: string) => void;
  onClose: () => void;
}) {
  const scaledFor = (q: number) => {
    const f = (q || 0) / (template.baseQuantity || 1);
    return {
      calories: String(Math.round(template.macros.calories * f)),
      protein: String(Math.round(template.macros.proteinG * f)),
      carbs: String(Math.round(template.macros.carbsG * f)),
      fat: String(Math.round(template.macros.fatG * f)),
      fiber: template.macros.fiberG != null ? String(Math.round(template.macros.fiberG * f)) : "",
    };
  };

  const [qty, setQty] = useState(String(template.baseQuantity));
  const [macros, setMacros] = useState(scaledFor(template.baseQuantity));

  // Changing quantity re-scales the macros; editing a macro field afterwards is preserved.
  const setQtyAndScale = (v: string) => {
    setQty(v);
    setMacros(scaledFor(Number(v)));
  };

  const stepSize = template.baseQuantity >= 1 ? 1 : 0.5;
  const step = (delta: number) => {
    const next = Math.max(0, Math.round(((Number(qty) || 0) + delta) * 10) / 10);
    setQtyAndScale(String(next));
  };

  const handleLog = () => {
    const q = Number(qty) || 0;
    const label = q === template.baseQuantity ? template.name : `${template.name} (${qty} ${template.unit})`;
    onLog(
      {
        userId,
        date,
        name: label,
        macros: {
          calories: Number(macros.calories) || 0,
          proteinG: Number(macros.protein) || 0,
          carbsG: Number(macros.carbs) || 0,
          fatG: Number(macros.fat) || 0,
          ...(macros.fiber ? { fiberG: Number(macros.fiber) } : {}),
        },
        createdAt: Date.now(),
      },
      template.id,
    );
  };

  const fields = [
    { key: "calories" as const, label: "Calories (kcal)" },
    { key: "protein" as const, label: "Protein (g)" },
    { key: "carbs" as const, label: "Carbs (g)" },
    { key: "fat" as const, label: "Fat (g)" },
  ];

  return (
    <Modal title={template.name} onClose={onClose}>
      <div className="space-y-4">
        <button onClick={onBack} className="text-xs font-semibold text-emerald-500 flex items-center gap-1 -mt-1">
          <ChevronLeft className="w-3.5 h-3.5" /> All saved meals
        </button>

        {/* Quantity stepper */}
        <div>
          <label className="label">Quantity</label>
          <div className="flex items-center gap-2">
            <button onClick={() => step(-stepSize)} className="btn-secondary px-3 py-2"><Minus className="w-4 h-4" /></button>
            <input
              type="number"
              className="input text-sm text-center flex-1"
              value={qty}
              onChange={(e) => setQtyAndScale(e.target.value)}
            />
            <span className="text-xs font-bold w-14 text-center truncate" style={{ color: "var(--text-2)" }}>{template.unit}</span>
            <button onClick={() => step(stepSize)} className="btn-secondary px-3 py-2"><Plus className="w-4 h-4" /></button>
          </div>
        </div>

        {/* Scaled macros — editable */}
        <div className="grid grid-cols-2 gap-3">
          {fields.map(({ key, label }) => (
            <div key={key}>
              <label className="label">{label}</label>
              <input
                type="number"
                className="input text-sm"
                value={macros[key]}
                onChange={(e) => setMacros((m) => ({ ...m, [key]: e.target.value }))}
              />
            </div>
          ))}
          {template.macros.fiberG != null && (
            <div className="col-span-2">
              <label className="label">Fiber (g)</label>
              <input
                type="number"
                className="input text-sm"
                value={macros.fiber}
                onChange={(e) => setMacros((m) => ({ ...m, fiber: e.target.value }))}
              />
            </div>
          )}
        </div>

        <p className="text-[11px] font-medium" style={{ color: "var(--text-3)" }}>
          Macros scale with quantity — tweak any value before logging.
        </p>

        <div className="flex gap-2 pt-1">
          <button onClick={onBack} className="btn-secondary flex-1 text-sm">Back</button>
          <button onClick={handleLog} className="btn-primary flex-1 text-sm">Log meal</button>
        </div>
      </div>
    </Modal>
  );
}
