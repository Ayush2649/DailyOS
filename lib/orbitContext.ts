/**
 * Module-level store so any page can share live data with Orbit.
 * Each page writes its own slice; AriaChatbot reads all slices
 * and forwards them to /api/aria.
 */

// ── Diet ──────────────────────────────────────────────────────────────────────
export interface DietContextData {
  date: string;
  meals: Array<{ name: string; calories: number; proteinG: number; carbsG: number; fatG: number; fiberG?: number }>;
  totals: { calories: number; proteinG: number; carbsG: number; fatG: number };
  goals:  { calories: number; proteinG: number; carbsG: number; fatG: number } | null;
}

// ── Workout ───────────────────────────────────────────────────────────────────
export interface WorkoutContextData {
  bodyWeightKg?: number;
  recentSessions: Array<{
    date: string;
    durationMinutes: number;
    exercises: Array<{ name: string; sets: number; topWeight?: number; unit?: string }>;
    cardio?: Array<{ activity: string; durationMinutes: number; distanceKm?: number; caloriesBurned?: number }>;
    summary?: string;
  }>;
}

// ── Tasks ─────────────────────────────────────────────────────────────────────
export interface TaskContextData {
  todayDate: string;
  pendingToday: Array<{ title: string; priority?: string; projectName?: string }>;
  completedToday: Array<{ title: string; completedAt?: number }>;
  overdue: Array<{ title: string; dueDate: string; priority?: string }>;
  totalPending: number;
}

// ── Store ─────────────────────────────────────────────────────────────────────
let _diet:    DietContextData    | null = null;
let _workout: WorkoutContextData | null = null;
let _tasks:   TaskContextData    | null = null;

export const setDietContext    = (d: DietContextData)    => { _diet    = d; };
export const setWorkoutContext = (d: WorkoutContextData) => { _workout = d; };
export const setTaskContext    = (d: TaskContextData)    => { _tasks   = d; };

export const getDietContext    = () => _diet;
export const getWorkoutContext = () => _workout;
export const getTaskContext    = () => _tasks;
