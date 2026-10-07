// lib/orbit/contextSerializer.ts
/**
 * Serialize OrbitContext into a concise, structured object for LLM consumption.
 * Only includes the fields required for Phase 1 and omits raw Firebase data.
 */
import type { OrbitContext } from '@/types';

/** Compute aggregated nutrition totals from an array of MealEntry. */
function computeNutritionTotals(meals: any[]) {
  const totals = {
    calories: 0,
    proteinG: 0,
    carbsG: 0,
    fatG: 0,
    fiberG: 0,
  };
  for (const m of meals) {
    if (!m?.macros) continue;
    const { calories, proteinG, carbsG, fatG, fiberG } = m.macros;
    totals.calories += calories ?? 0;
    totals.proteinG += proteinG ?? 0;
    totals.carbsG += carbsG ?? 0;
    totals.fatG += fatG ?? 0;
    totals.fiberG += fiberG ?? 0;
  }
  return totals;
}

/** Build a minimal context object from the full OrbitContext. */
export function serializeOrbitContext(context: OrbitContext | null) {
  if (!context) {
    return null;
  }
  const todayMeals = context.meals?.today ?? [];
  const recentMeals = context.meals?.recent ?? [];
  const nutritionTotals = computeNutritionTotals(todayMeals);

  return {
    profile: context.profile ?? null,
    macroGoals: context.macroGoals ?? null,
    preferences: context.preferences ?? null,
    todayMeals,
    recentMeals,
    nutritionTotals,
    todayTasks: context.tasks?.today ?? [],
    todayWorkout: context.workouts?.today ?? [],
  };
}
