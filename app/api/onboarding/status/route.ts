import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserKey } from "@/lib/auth/userKey";
import { adminDb } from "@/lib/firebaseAdmin";
import { checkRateLimit } from "@/lib/onboarding/rateLimit";

import { POLICY_LIMITS } from "@/lib/onboarding/constants";

export const maxDuration = 30;

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = getUserKey(session);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit: 60 requests / min
  const rateLimit = checkRateLimit(`status_${userId}`, 60);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please slow down." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } }
    );
  }

  try {
    const docRef = adminDb.collection("userProfiles").doc(userId);
    const snap = await docRef.get();

    if (!snap.exists) {
      return NextResponse.json({
        completed: false,
        lastStep: "step_0_consent",
        draftBaseline: null,
        persistedBaseline: null,
      });
    }

    const data = snap.data();
    const isCompleted = typeof data?.completedAt === "number";

    // Draft TTL Enforcement (§16 & docs/features/onboarding.md)
    let draft = data?.draft ?? null;
    if (draft && typeof data?.draftUpdatedAt === "number") {
      const ttlMs = POLICY_LIMITS.DRAFT_TTL_DAYS * 24 * 60 * 60 * 1000;
      if (Date.now() - data.draftUpdatedAt > ttlMs) {
        draft = null;
      }
    }

    return NextResponse.json({
      completed: isCompleted,
      lastStep: data?.lastStepCompleted ?? "step_0_consent",
      draftBaseline: draft,
      persistedBaseline: isCompleted ? (data?.baseline ?? null) : null,
      consentGivenAt: data?.consentGivenAt ?? null,
      consentVersion: data?.consentVersion ?? null,
    });
  } catch (error: any) {
    console.error("[onboarding/status] Error:", error?.message);
    return NextResponse.json({ error: "Failed to retrieve onboarding status" }, { status: 500 });
  }
}

