// lib/orbit/contextEngine.ts

// Added support for 7‑day rolling window and habits
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import type { OrbitContext } from '@/types';
import { resolveTemporalReference } from './temporalResolver';
import { getUserProfile, getUserMacroGoals, getUserPreferences } from '@/lib/domain/user';
import { getAllTasks, getAllHabits } from '@/lib/firestore';
import { getAllMeals } from '@/lib/firestore';
import { getWorkoutSessions } from '@/lib/firestore';
import { getBodyWeightEntries } from '@/lib/firestore';
import type { ContextRequirements } from './contextRequirement';
function dateSetInRange(start: Date, end: Date, tz: string): Set<string> {
  const set = new Set<string>();
  const dayMs = 86400000;
  for (let d = start.getTime(); d < end.getTime(); d += dayMs) {
    const dateStr = new Date(d).toLocaleDateString('en-CA', { timeZone: tz });
    set.add(dateStr);
  }
  return set;
}
/**
 * Build a read‑only OrbitContext for the authenticated user.
 * Aggregates data from domain services without performing any writes.
 */

export async function buildOrbitContext(requirements?: ContextRequirements): Promise<OrbitContext | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;
  const userId = (session.user as any).id ?? session.user.email;

  const req: ContextRequirements = requirements ?? {
    domains: [
      "profile",
      "goals",
      "preferences",
      "meals",
      "nutrition",
      "workouts",
      "tasks",
      "habits",
      "dailyPlan",
    ],
  };

  const results: Partial<OrbitContext> = {};
  const fetches: Promise<any>[] = [];

  // Profile & body weight
  if (req.domains.includes("profile")) {
    fetches.push(getUserProfile(userId).then(p => { results.profile = p ?? undefined; }));
    fetches.push(getBodyWeightEntries(userId).then(bw => { results.bodyWeightEntries = bw ?? []; }));
  }

  // Goals
  if (req.domains.includes("goals")) {
    fetches.push(getUserMacroGoals(userId).then(g => { results.macroGoals = g ?? undefined; }));
  }

  // Preferences
  if (req.domains.includes("preferences")) {
    fetches.push(getUserPreferences(userId).then(p => { results.preferences = p ?? undefined; }));
  }

  // Meals (and nutrition) – apply temporal filter
  if (req.domains.includes("meals") || req.domains.includes("nutrition")) {
    fetches.push(getAllMeals(userId).then(all => {
      const meals = all ?? [];
      const today = new Date().toLocaleDateString('en-CA');
      let filtered: any[] = [];
      if (req.temporalScope === 'recent') {
        filtered = meals.slice(-5).reverse();
      } else if (req.temporalScope && req.temporalScope !== 'none') {
        const range = resolveTemporalReference(req.temporalScope, undefined, new Date());
        const dateSet = dateSetInRange(range.start, range.end, range.timezone);
        filtered = meals.filter(m => dateSet.has(m.date));
      } else if (req.temporalScope === 'none') {
        filtered = meals;
      } else {
        const range = resolveTemporalReference('today', undefined, new Date());
        const dateSet = dateSetInRange(range.start, range.end, range.timezone);
        filtered = meals.filter(m => dateSet.has(m.date) || m.date === today);
      }
      results.meals = { all: meals, today: filtered, recent: meals.slice(-5).reverse() } as any;
    }));
  }

  // Workouts
  if (req.domains.includes("workouts")) {
    fetches.push(getWorkoutSessions(userId).then(all => {
      const workouts = all ?? [];
      const today = new Date().toLocaleDateString('en-CA');
      let filtered: any[] = [];
      if (req.temporalScope === 'recent') {
        filtered = workouts.slice(-5).reverse();
      } else if (req.temporalScope && req.temporalScope !== 'none') {
        const range = resolveTemporalReference(req.temporalScope, undefined, new Date());
        const dateSet = dateSetInRange(range.start, range.end, range.timezone);
        filtered = workouts.filter(w => dateSet.has(w.date));
      } else if (req.temporalScope === 'none') {
        filtered = workouts;
      } else {
        const range = resolveTemporalReference('today', undefined, new Date());
        const dateSet = dateSetInRange(range.start, range.end, range.timezone);
        filtered = workouts.filter(w => dateSet.has(w.date) || w.date === today);
      }
      results.workouts = { all: workouts, today: filtered } as any;
    }));
  }

  // Tasks
  if (req.domains.includes("tasks")) {
    fetches.push(getAllTasks(userId).then(all => {
      const tasks = all ?? [];
      const today = new Date().toLocaleDateString('en-CA');
      let filtered: any[] = [];
      if (req.temporalScope === 'recent') {
        filtered = tasks.slice(-5).reverse();
      } else if (req.temporalScope && req.temporalScope !== 'none') {
        const range = resolveTemporalReference(req.temporalScope, undefined, new Date());
        const dateSet = dateSetInRange(range.start, range.end, range.timezone);
        filtered = tasks.filter(t => t.dueDate && dateSet.has(t.dueDate));
      } else if (req.temporalScope === 'none') {
        filtered = tasks;
      } else {
        const range = resolveTemporalReference('today', undefined, new Date());
        const dateSet = dateSetInRange(range.start, range.end, range.timezone);
        filtered = tasks.filter(t => {
          if (!t.dueDate) return true;
          if (dateSet.has(t.dueDate) || t.dueDate === today) return true;
          if (t.status === 'pending' && new Date(t.dueDate) < range.start) return true;
          if (t.completedAt) {
            const compDate = new Date(t.completedAt).toLocaleDateString('en-CA');
            if (dateSet.has(compDate) || compDate === today) return true;
          }
          return false;
        });
      }
      results.tasks = { all: tasks, today: filtered } as any;
    }));
  }

  // Habits
  if (req.domains.includes("habits")) {
    fetches.push(getAllHabits(userId).then(all => {
      const habits = all ?? [];
      const today = new Date().toLocaleDateString('en-CA');
      let filtered: any[] = [];
      if (req.temporalScope === 'recent') {
        filtered = habits.slice(-5).reverse();
      } else if (req.temporalScope && req.temporalScope !== 'none') {
        const range = resolveTemporalReference(req.temporalScope, undefined, new Date());
        const dateSet = dateSetInRange(range.start, range.end, range.timezone);
        filtered = habits.filter(h => dateSet.has(h.date));
      } else if (req.temporalScope === 'none') {
        filtered = habits;
      } else {
        const range = resolveTemporalReference('today', undefined, new Date());
        const dateSet = dateSetInRange(range.start, range.end, range.timezone);
        filtered = habits.filter(h => dateSet.has(h.date) || h.date === today);
      }
      results.habits = { all: habits, today: filtered } as any;
    }));
  }
  await Promise.all(fetches);
  return results as OrbitContext;
}
