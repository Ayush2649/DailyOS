"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useSession } from "next-auth/react";
import {
  Plus, Minus, Utensils, Camera, Trash2, X, Loader2, Settings,
  ChevronLeft, ChevronRight, Sparkles, CheckCircle2,
  Bookmark, BookmarkPlus, Search, Mic, Edit3
} from "lucide-react";
import VoiceMealModal from "@/components/diet/VoiceMealModal";
import { cn, todayString, formatDate, localDateString } from "@/lib/utils";
import {
  getMeals, addMeal, deleteMeal, getMacroGoals, saveMacroGoals,
  getMealTemplates, saveMealTemplate, updateMealTemplate, deleteMealTemplate,
} from "@/lib/firestore";
import { setDietContext } from "@/lib/orbitContext";

import type { MealEntry, MealMacros, MacroGoals, MealTemplate } from "@/types";
import EmptyState from "@/components/ui/EmptyState";


const defaultGoals: MacroGoals = { calories: 2000, proteinG: 150, carbsG: 200, fatG: 65 };

function MacroProgress({ label, value, goal, unit, color }: {
  label: string; value: number; goal?: number | null; unit: string; color: string;
}) {
  const percent = goal && goal > 0 ? Math.min((value / goal) * 100, 100) : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 mb-1.5">
        <span className="text-sm font-medium" style={{ color: "var(--text-1)" }}>{label}</span>
        <span className="text-sm font-semibold tabular-nums" style={{ color: "var(--text-2)" }}>
          {Math.round(value)}{goal ? <span className="text-xs font-normal" style={{ color: "var(--text-3)" }}> / {goal}{unit}</span> : <span className="text-xs font-normal" style={{ color: "var(--text-3)" }}> {unit}</span>}
        </span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--surface-inset)" }}>
        {goal && goal > 0 ? (
          <div className="h-full rounded-full transition-all duration-300" style={{ width: `${percent}%`, background: color }} />
        ) : (
          <div className="h-full rounded-full bg-surface-2" />
        )}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function DietPage() {
  const { data: session } = useSession();
  const userId = (session?.user as any)?.id ?? session?.user?.email ?? "";

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

  // Load the selected day's meals, goals, and saved meal templates.
  useEffect(() => {
    if (!userId) {
      setMeals([]);
      return;
    }

    let cancelled = false;

    const loadDietData = async () => {
      setLoading(true);
      try {
        const [mealData, goalData, templateData] = await Promise.all([
          (getMeals as any)(userId, date),
          (getMacroGoals as any)(userId),
          (getMealTemplates as any)(userId),
        ]);

        if (cancelled) return;

        setMeals(Array.isArray(mealData) ? mealData : []);
        setGoals(goalData ? { ...defaultGoals, ...goalData } : defaultGoals);
        setTemplates(Array.isArray(templateData) ? templateData : []);
      } catch (error) {
        console.error("Failed to load diet data:", error);
        if (!cancelled) {
          setMeals([]);
          setTemplates([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadDietData();

    return () => {
      cancelled = true;
    };
  }, [userId, date]);

  const totals = meals.reduce<MealMacros>(
    (acc, meal) => ({
      calories: acc.calories + (Number(meal.macros.calories) || 0),
      proteinG: acc.proteinG + (Number(meal.macros.proteinG) || 0),
      carbsG: acc.carbsG + (Number(meal.macros.carbsG) || 0),
      fatG: acc.fatG + (Number(meal.macros.fatG) || 0),
      ...(acc.fiberG != null || meal.macros.fiberG != null
        ? { fiberG: (acc.fiberG || 0) + (Number(meal.macros.fiberG) || 0) }
        : {}),
    }),
    { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 },
  );

  const isToday = date === todayString();

  // Keep Orbit's diet context in sync so it can answer meal-specific questions.
  useEffect(() => {
    if (!userId) return;

    setDietContext({
      meals: meals.map((meal) => ({
        name: meal.name,
        calories: Math.round(meal.macros.calories),
        proteinG: Math.round(meal.macros.proteinG),
        carbsG: Math.round(meal.macros.carbsG),
        fatG: Math.round(meal.macros.fatG),
      })),
      totals: {
        calories: Math.round(totals.calories),
        proteinG: Math.round(totals.proteinG),
        carbsG: Math.round(totals.carbsG),
        fatG: Math.round(totals.fatG),
      },
      goals: goals
        ? {
            calories: Math.round(goals.calories),
            proteinG: Math.round(goals.proteinG),
            carbsG: Math.round(goals.carbsG),
            fatG: Math.round(goals.fatG),
          }
        : null,
      date,
    } as any);
  }, [userId, date, meals, goals, totals.calories, totals.proteinG, totals.carbsG, totals.fatG]);

  const changeDate = (days: number) => {
    setDate((current) => {
      const next = new Date(`${current}T12:00:00`);
      next.setDate(next.getDate() + days);
      return localDateString(next);
    });
  };

  const handleAddMeal = async (meal: Omit<MealEntry, "id">) => {
    try {
      const created = await (addMeal as any)(meal);
      setMeals((prev) => [...prev, created]);
      setShowAddMeal(false);
      setShowScanner(false);
    } catch (error) {
      console.error("Failed to add meal:", error);
    }
  };

  const handleDeleteMeal = async (mealId: string) => {
    try {
      // Passing userId is harmless for implementations that only accept the id,
      // while supporting implementations that scope deletion by user.
      await (deleteMeal as any)(mealId, userId);
      setMeals((prev) => prev.filter((meal) => meal.id !== mealId));
    } catch (error) {
      console.error("Failed to delete meal:", error);
    }
  };

  const handleSaveGoals = async (nextGoals: MacroGoals) => {
    try {
      await (saveMacroGoals as any)(userId, nextGoals);
      setGoals(nextGoals);
      setShowGoals(false);
    } catch (error) {
      console.error("Failed to save macro goals:", error);
    }
  };

  const handleSaveTemplate = async (template: Omit<MealTemplate, "id">) => {
    try {
      const saved = await (saveMealTemplate as any)(template);
      setTemplates((prev) => {
        const next = saved?.id ? saved : { ...template, id: crypto.randomUUID() };
        return [...prev, next];
      });
      setSavingTemplate(null);
    } catch (error) {
      console.error("Failed to save meal template:", error);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    try {
      await (deleteMealTemplate as any)(templateId, userId);
      setTemplates((prev) => prev.filter((template) => template.id !== templateId));
    } catch (error) {
      console.error("Failed to delete meal template:", error);
    }
  };

  const handleLogFromTemplate = async (
    meal: Omit<MealEntry, "id">,
    templateId: string,
  ) => {
    try {
      const created = await (addMeal as any)(meal);
      setMeals((prev) => [...prev, created]);

      const template = templates.find((item) => item.id === templateId);
      if (template) {
        const updatedTemplate = {
          ...template,
          useCount: (template.useCount || 0) + 1,
          lastUsedAt: Date.now(),
        };
        try {
          await (updateMealTemplate as any)(templateId, updatedTemplate);
          setTemplates((prev) => prev.map((item) => item.id === templateId ? updatedTemplate : item));
        } catch (templateError) {
          console.warn("Meal was logged, but the template usage count could not be updated:", templateError);
        }
      }

      setShowSaved(false);
    } catch (error) {
      console.error("Failed to log saved meal:", error);
    }
  };

  // VoiceMealModal can return either one meal, an array of meals, or an object
  // containing a meals array. Normalize all supported shapes here.
  const handleLogVoiceMeals = async (payload: any) => {
    const candidates = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.meals)
        ? payload.meals
        : [payload];

    const validMeals = candidates.filter(Boolean);

    for (const item of validMeals) {
      const meal = item?.meal ?? item;
      if (!meal?.name || !meal?.macros) continue;

      const normalized: Omit<MealEntry, "id"> = {
        userId,
        date,
        name: meal.name,
        macros: {
          calories: Number(meal.macros.calories) || 0,
          proteinG: Number(meal.macros.proteinG) || 0,
          carbsG: Number(meal.macros.carbsG) || 0,
          fatG: Number(meal.macros.fatG) || 0,
          ...(meal.macros.fiberG != null ? { fiberG: Number(meal.macros.fiberG) || 0 } : {}),
        },
        createdAt: meal.createdAt || Date.now(),
      };

      await handleAddMeal(normalized);
    }

    setShowVoiceMeal(false);
  };

  return (
    <div className="animate-fade-in space-y-4 sm:space-y-5">
      {/* ── Page header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <h1 className="page-title">Diet</h1>
          <p className="page-description mt-1">Daily nutrition</p>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowVoiceMeal(true)}
            type="button"
            className="btn-icon"
            title="Log meal by voice"
            aria-label="Log meal by voice"
          >
            <Mic className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowSaved(true)}
            type="button"
            className="btn-icon"
            title="Saved meals"
            aria-label="Saved meals"
          >
            <Bookmark className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowGoals(true)}
            type="button"
            className="btn-icon"
            title="Nutrition goals"
            aria-label="Nutrition goals"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowAddMeal(true)}
            type="button"
            className="btn-primary min-h-11 text-sm flex items-center gap-1.5 px-3"
          >
            <Plus className="w-4 h-4" />
            Log meal
          </button>
        </div>
      </div>

      {/* ── Date navigator ── */}
      <div className="flex items-center justify-between border-y py-1" style={{ borderColor: "var(--border-subtle)" }}>
        <button
          onClick={() => changeDate(-1)}
          type="button"
          className="btn-icon"
          aria-label="Previous day"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="text-center">
          <p className="text-sm font-medium truncate" style={{ color: "var(--text-1)" }}>{formatDate(date)}</p>
          <p className="metadata">{isToday ? "Today" : "Daily log"}</p>
        </div>
        <button
          onClick={() => changeDate(1)}
          disabled={isToday}
          type="button"
          className="btn-icon disabled:opacity-30"
          aria-label="Next day"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* ── Daily nutrition ── */}
      <div className="card">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="card-title">Daily intake</h2>
          <span className="metadata">
            {meals.length} meal{meals.length !== 1 ? "s" : ""}
          </span>
        </div>

        <div className="card p-4 rounded-lg" style={{ background: "var(--surface-base)", border: "1px solid var(--border-subtle)" }}>
          <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,0.85fr)_minmax(0,1.4fr)] gap-5 sm:gap-6">
            <div className="min-w-0">
              <p className="metadata">Calories</p>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-3xl font-semibold tabular-nums leading-none" style={{ color: "var(--text-1)" }}>
                  {Math.round(totals.calories).toLocaleString()}
                </span>
                <span className="text-sm" style={{ color: "var(--text-3)" }}>kcal</span>
              </div>
              {goals ? (
                <>
                  <p className="secondary-text mt-1">
                    {totals.calories > goals.calories
                      ? `${Math.round(totals.calories - goals.calories)} kcal above goal`
                      : `${Math.max(0, Math.round(goals.calories - totals.calories))} kcal remaining`}
                    <span style={{ color: "var(--text-3)" }}> · goal {goals.calories.toLocaleString()}</span>
                  </p>
                  <div className="h-1.5 rounded-full overflow-hidden mt-3" style={{ background: "var(--surface-inset)" }}>
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min((totals.calories / Math.max(goals.calories, 1)) * 100, 100)}%`,
                        background: totals.calories > goals.calories ? "var(--warning)" : "var(--accent)",
                      }}
                    />
                  </div>
                </>
              ) : (
                <p className="secondary-text mt-1">
                  Intuitive Habit Tracking Active
                </p>
              )}
            </div>

            <div className="space-y-3">
              <MacroProgress label="Protein" value={totals.proteinG} goal={goals?.proteinG} unit="g" color="var(--macro-protein)" />
              <MacroProgress label="Carbs" value={totals.carbsG} goal={goals?.carbsG} unit="g" color="var(--macro-carbs)" />
              <MacroProgress label="Fat" value={totals.fatG} goal={goals?.fatG} unit="g" color="var(--macro-fat)" />
            </div>
          </div>
        </div>
      </div>

      {/* ── AI photo logging ── */}
      <button
        onClick={() => setShowScanner(true)}
        type="button"
        className="w-full rounded-lg p-3 flex items-center gap-3 text-left border transition-colors hover:bg-surface-tertiary"
        style={{ background: "var(--surface-base)", borderColor: "var(--border-subtle)" }}
      >
        <div className="w-10 h-10 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: "var(--accent-soft)" }}>
          <Camera className="w-5 h-5" style={{ color: "var(--accent)" }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium" style={{ color: "var(--text-1)" }}>Estimate from a photo</p>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-3)" }}>Review the result before logging</p>
        </div>
        <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: "var(--text-3)" }} />
      </button>

      {/* ── Meals list ── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="card-title">Meals</h2>
          <span className="metadata">{meals.length} logged</span>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <div key={i} className="h-20 skeleton" />)}
          </div>
        ) : meals.length === 0 ? (
          <EmptyState
            title="No meals logged today"
            description="Add a meal to start tracking your nutrition."
            actionLabel="Log meal"
            onAction={() => setShowAddMeal(true)}
          />
        ) : (
          <div className="space-y-2 stagger">
            {meals.map((meal) => (
              <MealCard
                key={meal.id}
                meal={meal}
                onDelete={() => void handleDeleteMeal(meal.id)}
                onSave={() => setSavingTemplate({ name: meal.name, macros: meal.macros })}
              />
            ))}
          </div>
        )}
      </div>

      <div className="card mt-4 p-4 rounded-lg" style={{ background: "var(--surface-subtle)", border: "1px solid var(--border-subtle)" }}>
        <h2 className="card-title" style={{ color: "var(--text-1)" }}>Nutrition Insights</h2>
        <p className="text-sm" style={{ color: "var(--text-2)" }}>Your nutrition is on track today. Keep up the good work and stay hydrated!</p>
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
        <GoalsModal
          goals={goals}
          onSave={handleSaveGoals}
          onClose={() => setShowGoals(false)}
        />
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
        <VoiceMealModal
          onAdd={handleLogVoiceMeals}
          onClose={() => setShowVoiceMeal(false)}
        />
      )}
    </div>
  );
}

// ── MealCard ──────────────────────────────────────────────────────────────────
function MealCard({ meal, onDelete, onSave }: { meal: MealEntry; onDelete: () => void; onSave: () => void }) {
  const macros = [
    { label: "P", value: Math.round(meal.macros.proteinG), color: "var(--macro-protein)" },
    { label: "C", value: Math.round(meal.macros.carbsG),   color: "var(--macro-carbs)" },
    { label: "F", value: Math.round(meal.macros.fatG),     color: "var(--macro-fat)" },
    ...(meal.macros.fiberG != null && meal.macros.fiberG > 0
      ? [{ label: "Fib", value: Math.round(meal.macros.fiberG), color: "var(--accent)" }]
      : []),
  ];

  return (
    <div
      className="group relative rounded-lg p-3 flex items-start gap-2 sm:gap-3 transition-colors duration-150 animate-slide-up"
      style={{ background: "var(--surface-base)", border: "1px solid var(--border-subtle)" }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent-glow)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border-subtle)"; }}
    >
      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-md flex items-center justify-center flex-shrink-0"
        style={{ background: "var(--accent-soft)" }}>
        <Utensils className="w-4 h-4" style={{ color: "var(--accent)" }} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm truncate pr-1" style={{ color: "var(--text-1)" }}>{meal.name}</p>
        <div className="mt-1">
          <span className="text-base font-semibold leading-none tabular-nums" style={{ color: "var(--text-1)" }}>
            {Math.round(meal.macros.calories)}
            <span className="text-xs font-medium ml-0.5" style={{ color: "var(--text-3)" }}>kcal</span>
          </span>
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 mt-1.5">
            {macros.map(({ label, value, color }) => (
              <span key={label} className="inline-flex items-center gap-1 text-xs font-medium whitespace-nowrap" style={{ color: "var(--text-2)" }}>
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
                {value}<span style={{ color: "var(--text-3)" }}>{label}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center flex-shrink-0">
        <button
          onClick={onSave}
          title="Save as a reusable meal"
          type="button"
          aria-label={`Save ${meal.name} as a reusable meal`}
          className="btn-icon"
          style={{ color: "var(--text-3)" }}
        >
          <BookmarkPlus className="w-4 h-4" />
        </button>
        <button
          onClick={onDelete}
          type="button"
          aria-label={`Delete ${meal.name}`}
          className="btn-icon hover:text-danger hover:bg-danger-soft"
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-3 pt-4 pb-24 sm:p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-label={title}
        className="relative dialog-surface w-full max-w-md p-4 sm:p-5 animate-slide-up max-h-[80dvh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="card-title">{title}</h3>
          <button onClick={onClose} type="button" className="btn-icon" aria-label={`Close ${title}`}><X className="w-4 h-4" /></button>
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
          <p className="field-helper">
            Enter a dish name, then tap Calories to estimate macros.
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
          <p className="field-helper flex items-center gap-1" style={{ color: "var(--success)" }}>
            <CheckCircle2 className="w-3.5 h-3.5" /> Estimated values — review before logging
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
    ? "badge-success"
    : result?.confidence === "medium"
    ? "badge-warning"
    : "badge-danger";

  // Derive options chips to display
  const optionsToDisplay: string[] = result?.needsClarification?.options
    ? result.needsClarification.options
    : (result?.candidates || []).map((c: any) => c.name);

  return (
    <Modal title="Estimate from photo" onClose={onClose}>
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
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="w-full border border-dashed rounded-lg p-6 sm:p-8 text-center transition-colors hover:bg-surface-tertiary"
            style={{ borderColor: "var(--border)" }}
          >
            <div className="w-10 h-10 rounded-md flex items-center justify-center mx-auto mb-3" style={{ background: "var(--accent-soft)" }}>
              <Camera className="w-5 h-5" style={{ color: "var(--accent)" }} />
            </div>
            <p className="text-sm font-medium" style={{ color: "var(--text-1)" }}>Choose a meal photo</p>
            <p className="text-xs mt-1" style={{ color: "var(--text-3)" }}>JPG, PNG, or HEIC</p>
          </button>
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
            <div className="rounded-lg p-4 text-center space-y-3 border" style={{ background: "var(--warning-soft)", borderColor: "color-mix(in srgb, var(--warning) 24%, transparent)" }}>
              <p className="text-sm font-medium" style={{ color: "var(--warning)" }}>
                Photo scan is busy. Type or speak your meal instead.
              </p>
              <div className="flex gap-2 justify-center pt-1">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onSwitchToManual?.();
                  }}
                  className="btn-secondary min-h-11 text-sm flex items-center gap-1.5 px-3"
                >
                  <Edit3 className="w-4 h-4" style={{ color: "var(--accent)" }} /> Type meal
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onSwitchToVoice?.();
                  }}
                  className="btn-secondary min-h-11 text-sm flex items-center gap-1.5 px-3"
                >
                  <Mic className="w-4 h-4" style={{ color: "var(--accent)" }} /> Speak meal
                </button>
              </div>
            </div>
          ) : error ? (
            <div className="rounded-md p-3 text-sm font-medium bg-danger-soft text-danger">
              {error}
            </div>
          ) : null}

          {!scanning && result && (
            <div className="space-y-3">
              {/* Confidence / Ambiguity Badge & Notes */}
              <div className="flex items-center gap-2 flex-wrap">
                {isAmbiguous ? (
                  <span className="text-xs font-medium px-2 py-1 rounded-md badge-warning">
                    Check this
                  </span>
                ) : result?.confidence ? (
                  <span className={cn("text-xs font-medium px-2 py-1 rounded-md", confidenceColor)}>
                    {result.confidence} confidence
                  </span>
                ) : null}
                {result.notes && (
                  <span className="text-xs truncate flex-1" style={{ color: "var(--text-3)" }}>{result.notes}</span>
                )}
              </div>

              {/* One-Tap Option Chips */}
              {optionsToDisplay.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium" style={{ color: "var(--text-2)" }}>
                      {result?.needsClarification ? "Choose flatbread type:" : "Suggested options:"}
                    </span>
                    {reestimating && (
                      <span className="text-xs flex items-center gap-1 font-medium" style={{ color: "var(--success)" }}>
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
                        className="min-h-11 px-3 rounded-md border text-sm font-medium transition-colors"
                        style={selectedOption.toLowerCase() === opt.toLowerCase()
                          ? { background: "var(--accent)", color: "var(--on-accent)", borderColor: "var(--accent)" }
                          : { background: "var(--surface-base)", color: "var(--text-2)", borderColor: "var(--border)" }}
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
                style={{ borderLeftColor: "var(--accent)", borderLeftWidth: "3px" }}
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