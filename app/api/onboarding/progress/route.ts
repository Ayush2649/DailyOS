import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserKey } from "@/lib/auth/userKey";
import { adminDb } from "@/lib/firebaseAdmin";
import { OnboardingProgressPayloadSchema } from "@/lib/onboarding/validation";
import { checkRateLimit } from "@/lib/onboarding/rateLimit";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = getUserKey(session);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit: 30 requests / min
  const rateLimit = checkRateLimit(`progress_${userId}`, 30);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please slow down." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Validate payload (strictly rejects any health screening keys)
  const parseResult = OnboardingProgressPayloadSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parseResult.error.format() },
      { status: 400 }
    );
  }

  const { currentStep, draft } = parseResult.data;

  try {
    const docRef = adminDb.collection("userProfiles").doc(userId);
    const now = Date.now();

    await docRef.set(
      {
        userId,
        lastStepCompleted: currentStep,
        draft,
        draftUpdatedAt: now,
        updatedAt: now,
      },
      { merge: true }
    );

    return NextResponse.json({ ok: true, lastStep: currentStep });
  } catch (error: any) {
    console.error("[onboarding/progress] Error saving draft:", error?.message);
    return NextResponse.json({ error: "Failed to persist onboarding draft" }, { status: 500 });
  }
}

