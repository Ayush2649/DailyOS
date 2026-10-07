// lib/domain/user.ts
import { adminDb } from '@/lib/firebaseAdmin';
import type { UserProfileDocument, MacroGoals, NotificationPrefs } from '@/types';

/** Retrieve the user's profile document (optional). */
export async function getUserProfile(userId: string): Promise<UserProfileDocument | null> {
  const snap = await adminDb.collection('userProfiles').doc(userId).get();
  if (!snap.exists) return null;
  return snap.data() as UserProfileDocument;
}

/** Retrieve the user's macro goals (nutrition). */
export async function getUserMacroGoals(userId: string): Promise<MacroGoals | null> {
  const snap = await adminDb.collection('macroGoals').doc(userId).get();
  if (!snap.exists) return null;
  return snap.data() as MacroGoals;
}

/** Placeholder for user preferences – currently not stored in Firebase. */
export async function getUserPreferences(_userId: string): Promise<NotificationPrefs | null> {
  // No preferences collection yet; return null to keep optional.
  return null;
}
