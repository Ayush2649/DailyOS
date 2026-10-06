import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserKey } from "@/lib/auth/userKey";
import { adminDb } from "@/lib/firebaseAdmin";
import { validatePushEndpoint } from "@/lib/push/allowlist";
import webpush from "web-push";

function initVapid() {
  const pubKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privKey = process.env.VAPID_PRIVATE_KEY;
  if (!pubKey || !privKey || pubKey.includes("your_vapid")) return false;
  try {
    webpush.setVapidDetails(
      "mailto:" + (process.env.VAPID_EMAIL ?? "admin@dailyos.app"),
      pubKey,
      privKey
    );
    return true;
  } catch {
    return false;
  }
}

const FIXED_MESSAGES: Record<string, { title: string; body: string; url: string }> = {
  test: {
    title: "🔔 DailyOS test",
    body: "Notifications are working! You'll get reminders at your configured times.",
    url: "/dashboard",
  },
  meal: {
    title: "🥗 Meal reminder",
    body: "Don't forget to log your meal and hit your daily nutrition goals.",
    url: "/dashboard/diet",
  },
  "meal-reminder": {
    title: "🥗 Meal reminder",
    body: "Don't forget to log your meal and hit your daily nutrition goals.",
    url: "/dashboard/diet",
  },
  workout: {
    title: "💪 Workout reminder",
    body: "Time for today's training session! Log it to track your progress.",
    url: "/dashboard/workout",
  },
  tasks: {
    title: "✅ Task reminder",
    body: "Don't forget to review and complete your pending tasks today.",
    url: "/dashboard/tasks",
  },
};

function isValidRelativeUrl(url: string): boolean {
  return typeof url === "string" && url.startsWith("/") && !url.startsWith("//") && !url.includes("://");
}

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = getUserKey(session);
  if (!userId) return NextResponse.json({ error: "No user ID" }, { status: 400 });

  if (!initVapid()) {
    return NextResponse.json({ error: "Push notifications not configured" }, { status: 500 });
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    // Empty body defaults to "test"
  }

  const kind = (body?.kind || "test").toString().toLowerCase().trim();
  if (!FIXED_MESSAGES[kind]) {
    return NextResponse.json({ error: "Invalid notification kind" }, { status: 400 });
  }

  const template = FIXED_MESSAGES[kind];
  let url = template.url;

  if (body?.url !== undefined && body?.url !== null) {
    const customUrl = String(body.url).trim();
    if (!isValidRelativeUrl(customUrl)) {
      return NextResponse.json(
        { error: "Invalid URL: Must be a relative path starting with '/'" },
        { status: 400 }
      );
    }
    url = customUrl;
  }

  // Look up only the caller's own subscriptions from Firestore
  const snap = await adminDb.collection("push_subscriptions").where("userId", "==", userId).get();
  if (snap.empty || !snap.docs || snap.docs.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, reason: "no_subscriptions" });
  }

  const payload = JSON.stringify({
    title: template.title,
    body: template.body,
    url,
    tag: `${url}-${Date.now()}`,
  });

  let sent = 0;
  let lastErrorStatus: number | null = null;
  for (const doc of snap.docs) {
    const data = doc.data() as any;
    const sub = data?.subscription;
    if (sub?.endpoint) {
      const check = validatePushEndpoint(sub.endpoint);
      if (!check.valid) {
        console.warn(`[push/send] Skipped invalid endpoint: host=${check.hostname ?? "unknown"}, reason=${check.reason}`);
        continue;
      }
      try {
        await webpush.sendNotification(sub, payload);
        sent++;
      } catch (err: any) {
        const statusCode = typeof err?.statusCode === "number" ? err.statusCode : null;
        if (statusCode) {
          lastErrorStatus = statusCode;
        }
        // Never log endpoints, keys or notification bodies. Log status code only.
        console.error("Push dispatch failed with status:", statusCode ?? "unknown");
      }
    }
  }

  return NextResponse.json({
    ok: true,
    sent,
    ...(sent === 0 && lastErrorStatus !== null ? { errorStatus: lastErrorStatus } : {}),
  });
}
