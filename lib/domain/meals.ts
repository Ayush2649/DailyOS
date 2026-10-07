// lib/domain/meals.ts
import { adminDb } from '@/lib/firebaseAdmin';
import type { MealEntry } from '@/types';

/** Helper to convert a Date to a YYYY-MM-DD string (local). */
function toLocalDateString(date: Date): string {
  // Using en-CA format gives ISO‑like date without timezone complications.
  return date.toLocaleDateString('en-CA');
}

/** Get meals for a specific user on a given date (local). */
export async function getMealsForDate(userId: string, date: string): Promise<MealEntry[]> {
  const snap = await adminDb
    .collection('meals')
    .where('userId', '==', userId)
    .where('date', '==', date)
    .orderBy('createdAt', 'asc')
    .limit(50)
    .get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as MealEntry));
}

/** Get meals for a user within a date range (inclusive). Limited to a reasonable count. */
export async function getMealsForDateRange(
  userId: string,
  start: Date,
  end: Date,
  limit = 30,
): Promise<MealEntry[]> {
  const startStr = toLocalDateString(start);
  const endStr = toLocalDateString(end);
  const snap = await adminDb
    .collection('meals')
    .where('userId', '==', userId)
    .where('date', '>=', startStr)
    .where('date', '<=', endStr)
    .orderBy('date', 'desc')
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as MealEntry));
}

/** Get the most recent meals for a user (by createdAt). */
export async function getRecentMeals(userId: string, limit = 5): Promise<MealEntry[]> {
  const snap = await adminDb
    .collection('meals')
    .where('userId', '==', userId)
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as MealEntry));
}
