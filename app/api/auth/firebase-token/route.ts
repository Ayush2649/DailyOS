import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserKey } from "@/lib/auth/userKey";
import admin from "@/lib/firebaseAdmin";
import { checkRateLimit } from "@/lib/onboarding/rateLimit";

export const runtime = "nodejs";
export const maxDuration = 30;

async function handleTokenRequest(_req: NextRequest) {
  // 1. Verify NextAuth session using server-side session
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Derive Firebase UID strictly from the verified session (never body or query)
  const userId = getUserKey(session);

  // 3. Validate user identifier: non-empty string, trimmed, 1 to 128 characters
  if (!userId || typeof userId !== "string" || !userId.trim() || userId.length > 128) {
    return NextResponse.json({ error: "Invalid user identifier" }, { status: 400 });
  }

  const cleanUserId = userId.trim();

  // 4. Rate limiting: 30 requests / minute per user identifier
  const rateLimit = checkRateLimit(`firebase_token_${cleanUserId}`, 30);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please slow down." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } }
    );
  }

  // 5. Mint Firebase Custom Token using Firebase Admin SDK
  try {
    const token = await admin.auth().createCustomToken(cleanUserId);
    return NextResponse.json({ token });
  } catch (err: unknown) {
    // Avoid logging tokens, credentials, or leaking internal error details
    console.error("[firebase-token] Failed to mint custom token");
    return NextResponse.json(
      { error: "Failed to generate authentication token" },
      { status: 500 }
    );
  }
}

export const POST = handleTokenRequest;
export const GET = handleTokenRequest;

