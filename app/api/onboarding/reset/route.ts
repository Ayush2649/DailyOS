import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserKey } from "@/lib/auth/userKey";
import admin, { adminDb } from "@/lib/firebaseAdmin";
import { PRELAUNCH_EXEMPT_USER_IDS } from "@/lib/onboarding/constants";
import { checkRateLimit } from "@/lib/onboarding/rateLimit";
import { isOnboardingTemplate } from "@/lib/workouts/classification";
import type { WorkoutTemplate } from "@/types";

export const maxDuration = 30;

/**
 * Developer Reset Route (§9, §10, §11, §12)
 * Strictly resets ONLY onboarding state:
 * - unsets completedAt, lastStepCompleted, baseline, computedTargets, workoutPlanAssignment, draft on userProfiles
 * - deletes macroGoals document for this user
 * - deletes only onboarding-generated workout templates
 *
 * GUARANTEES:
 * - Never deletes authentication credentials or account
 * - Never deletes historical meals, workout logs, bodyweight logs, tasks, projects, or habits
 * - Never deletes user-created custom templates or system presets
 * - Authenticates via server session (never trusts client-supplied userId)
 * - Server-side authorization check (NODE_ENV === "development" or PRELAUNCH_EXEMPT_USER_IDS or ALLOW_DEV_RESET)
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = getUserKey(session);

  // 1. Authentication Guard (§19)
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Server-side Authorization Guard (§11)
  const isDev = process.env.NODE_ENV === "development";
  const isExplicitAllowed = process.env.ALLOW_DEV_RESET === "true";
  const isExempt = PRELAUNCH_EXEMPT_USER_IDS.includes(userId);
  const adminIds = process.env.ADMIN_USER_IDS ? process.env.ADMIN_USER_IDS.split(",").map((s) => s.trim()) : [];
  const isAdmin = adminIds.includes(userId);

  const isAuthorized = isDev || isExplicitAllowed || isExempt || isAdmin;
  if (!isAuthorized) {
    return NextResponse.json(
      { error: "Forbidden: Developer reset is only available in development or for authorized accounts." },
      { status: 403 }
    );
  }

  // 3. Rate Limit: 10 requests / min
  const rateLimit = checkRateLimit(`reset_${userId}`, 10);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many reset attempts. Please slow down." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } }
    );
  }

  try {
    const batch = adminDb.batch();

    // A. Unset onboarding fields on userProfiles
    const profileRef = adminDb.collection("userProfiles").doc(userId);
    const profileSnap = await profileRef.get();

    if (profileSnap.exists) {
      batch.update(profileRef, {
        completedAt: admin.firestore.FieldValue.delete(),
        lastStepCompleted: admin.firestore.FieldValue.delete(),
        baseline: admin.firestore.FieldValue.delete(),
        computedTargets: admin.firestore.FieldValue.delete(),
        workoutPlanAssignment: admin.firestore.FieldValue.delete(),
        draft: admin.firestore.FieldValue.delete(),
        draftUpdatedAt: admin.firestore.FieldValue.delete(),
        safety: admin.firestore.FieldValue.delete(),
        updatedAt: Date.now(),
      });
    }

    // B. Delete macroGoals document
    const macroRef = adminDb.collection("macroGoals").doc(userId);
    batch.delete(macroRef);

    // C. Query and delete ONLY onboarding-generated workout templates
    const templatesSnap = await adminDb
      .collection("workoutTemplates")
      .where("userId", "==", userId)
      .get();

    if (templatesSnap && Array.isArray(templatesSnap.docs)) {
      for (const doc of templatesSnap.docs) {
        const tpl = doc.data() as WorkoutTemplate;
        if (isOnboardingTemplate(tpl, null, userId)) {
          batch.delete(doc.ref);
        }
      }
    }

    await batch.commit();

    return NextResponse.json({
      ok: true,
      reset: true,
      message: "Onboarding state reset successfully.",
    });
  } catch (error: any) {
    console.error("[onboarding/reset] Error during reset:", error?.message);
    return NextResponse.json({ error: "Failed to reset onboarding state" }, { status: 500 });
  }
}

