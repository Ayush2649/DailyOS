// lib/orbit/contextEngine.ts
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import type { OrbitContext } from '@/types';
import { getUserProfile, getUserMacroGoals, getUserPreferences } from '@/lib/domain/user';
import { getAllTasks } from '@/lib/firestore';
import { getAllMeals } from '@/lib/firestore';
import { getWorkoutSessions } from '@/lib/firestore';
import { getBodyWeightEntries } from '@/lib/firestore';
import type { ContextRequirements } from './contextRequirement';

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
      const yesterday = new Date(Date.now() - 86400000).toLocaleDateString('en-CA');
      let filtered: any[] = [];
      switch (req.temporalScope) {
        case "today":
          filtered = meals.filter(m => m.date === today);
          break;
        case "yesterday":
          filtered = meals.filter(m => m.date === yesterday);
          break;
        case "recent":
          filtered = meals.slice(-5).reverse();
          break;
        case "none":
        case undefined:
        default:
          filtered = [];
      }
      results.meals = { all: meals, today: filtered, recent: meals.slice(-5).reverse() } as any;
    }));
  }

  // Workouts
  if (req.domains.includes("workouts")) {
    fetches.push(getWorkoutSessions(userId).then(all => {
      const workouts = all ?? [];
      const today = new Date().toLocaleDateString('en-CA');
      const yesterday = new Date(Date.now() - 86400000).toLocaleDateString('en-CA');
      let filtered: any[] = [];
      switch (req.temporalScope) {
        case "today":
          filtered = workouts.filter(w => w.date === today);
          break;
        case "yesterday":
          filtered = workouts.filter(w => w.date === yesterday);
          break;
        case "recent":
          filtered = workouts.slice(-5).reverse();
          break;
        default:
          filtered = [];
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
      switch (req.temporalScope) {
        case "today":
          filtered = tasks.filter(t => t.dueDate === today);
          break;
        case "yesterday":
          filtered = [];
          break;
        case "recent":
          filtered = tasks.slice(-5).reverse();
          break;
        default:
          filtered = [];
      }
      results.tasks = { all: tasks, today: filtered } as any;
    }));
  }

  await Promise.all(fetches);
  return results as OrbitContext;
}
