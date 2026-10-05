import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import webpush from "web-push";
import { adminDb } from "@/lib/firebaseAdmin";
import { getUserKey } from "@/lib/auth/userKey";
import { validatePushEndpoint } from "@/lib/push/allowlist";
import type { NotificationPrefs } from "@/types";

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

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Returns current HH:MM in a given IANA timezone */
function nowHHMM(tz: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
}

/** Check if a reminder time matches the current minute in the user's timezone */
function matchesNow(time: string, tz: string): boolean {
  return nowHHMM(tz) === time;
}

interface StoredSubscriptionDoc {
  id: string;
  userId: string;
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } };
  lastSent?: Record<string, string>;
}

interface PushAction {
  action: string;
  title: string;
}

interface PushPayload {
  title: string;
  body: string;
  url: string;
  actions?: PushAction[];
}

// ── Notification copy ───────────────────────────────────────────────────────────
// Multiple variants per reminder, rotated daily so they never feel robotic.
const MESSAGES: Record<string, { title: string; body: string }[]> = {
  breakfast: [
    { title: "☀️ Morning fuel",     body: "You've fasted all night — break it right. Log breakfast 🍳" },
    { title: "🍳 Rise & dine",       body: "What's powering your morning? Tap to log it." },
    { title: "⚡ Kickstart the day",  body: "Protein now = focus later. Log your first meal." },
    { title: "🥑 Good morning!",      body: "First meal sets the tone. Don't skip the log." },
  ],
  lunch: [
    { title: "🥗 Midday refuel",     body: "Halfway there — keep the momentum. Log lunch." },
    { title: "🍱 Lunch o'clock",     body: "Fuel the afternoon grind. What did you eat?" },
    { title: "🌮 Hungry yet?",        body: "Log lunch and stay on top of your macros." },
    { title: "⏱️ Lunch check-in",    body: "Quick log now — future-you will thank you." },
  ],
  dinner: [
    { title: "🍽️ Dinner time",       body: "Last meal of the day — log it and close the loop." },
    { title: "🌙 Evening fuel",       body: "Wind down right. Log dinner to hit today's goals." },
    { title: "🥘 What's cooking?",    body: "Don't let dinner slip by un-logged." },
    { title: "✨ Finish strong",      body: "One log away from a perfect nutrition day." },
  ],
  workout: [
    { title: "💪 Time to move",       body: "Your session is calling. Show up for yourself today." },
    { title: "🔥 Let's get it",       body: "Sweat now, shine later. Log your workout." },
    { title: "🏋️ Training time",      body: "Consistency beats intensity. Don't skip today." },
    { title: "⚡ Body check",         body: "Even 20 minutes counts. Log your session." },
  ],
  tasks: [
    { title: "📋 Day's almost done",  body: "Got pending tasks? Knock them out before bed." },
    { title: "✅ Quick check-in",     body: "Review what's left and end the day on a win." },
    { title: "🌟 Finish the list",    body: "Close out your tasks — momentum into tomorrow." },
    { title: "⏳ Evening review",      body: "A clear list = a clear mind. Tap to check in." },
  ],
};

const ACTIONS: Record<string, PushAction[]> = {
  meal:    [{ action: "log", title: "🍽️ Log meal" },   { action: "dismiss", title: "Later" }],
  workout: [{ action: "log", title: "💪 Log workout" }, { action: "dismiss", title: "Later" }],
  tasks:   [{ action: "log", title: "📋 View tasks" },  { action: "dismiss", title: "Later" }],
};

/** Day-of-year, used to rotate message variants so they feel fresh each day */
function dayOfYear(d: Date): number {
  const start = new Date(d.getFullYear(), 0, 0);
  return Math.floor((d.getTime() - start.getTime()) / 86_400_000);
}

/** Pick today's variant for a given reminder category */
function pick(key: string): { title: string; body: string } {
  const variants = MESSAGES[key];
  return variants[dayOfYear(new Date()) % variants.length];
}

/** Constant-time string comparison to prevent timing attacks */
function timingSafeEqualStr(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const hashA = crypto.createHash("sha256").update(a).digest();
  const hashB = crypto.createHash("sha256").update(b).digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

export const maxDuration = 60;

// ── Cron handler ──────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  // Initialize VAPID details for webpush signing
  initVapid();

  // Verify Vercel cron secret (fail closed: missing or empty secret returns 500)
  const secret = process.env.CRON_SECRET;
  if (!secret || !secret.trim()) {
    console.error("CRON_SECRET is not configured or empty.");
    return NextResponse.json(
      { error: "Server misconfiguration: CRON_SECRET is missing or empty" },
      { status: 500 }
    );
  }

  const auth = req.headers.get("authorization") || "";
  if (!timingSafeEqualStr(auth, `Bearer ${secret}`)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let due = 0;
  let sent = 0;
  let failed = 0;
  let removed = 0;
  let skipped = 0;

  const now = new Date();
  const currentMinute = now.toISOString().slice(0, 16); // e.g. "2026-10-05T10:45"
  const sentInRun = new Set<string>();

  try {
    // Load all push subscriptions + notification prefs in parallel
    const [subsSnap, prefsSnap] = await Promise.all([
      adminDb.collection("push_subscriptions").get(),
      adminDb.collection("notificationPrefs").get(),
    ]);

    // Build a map: userId → prefs
    const prefsMap = new Map<string, NotificationPrefs>();
    prefsSnap.docs.forEach(d => prefsMap.set(d.id, d.data() as NotificationPrefs));

    // Group subscriptions by userId, preserving doc id and lastSent tracking
    const subsByUser = new Map<string, StoredSubscriptionDoc[]>();
    subsSnap.docs.forEach(d => {
      const data = d.data() as any;
      const rawUserId = data?.userId;
      const userId = getUserKey({ id: rawUserId }) || rawUserId;
      if (!userId || !data?.subscription) return;
      if (!subsByUser.has(userId)) subsByUser.set(userId, []);
      subsByUser.get(userId)!.push({
        id: d.id,
        userId,
        subscription: data.subscription,
        lastSent: data.lastSent,
      });
    });

    // For each user, check which reminders are due right now
    for (const [userId, subs] of Array.from(subsByUser.entries())) {
      const prefs = prefsMap.get(userId);
      if (!prefs) continue;

      const tz = prefs.timezone || "UTC";

      const reminders: Array<{
        enabled: boolean;
        time: string;
        key: string;
        url: string;
        actions: PushAction[];
      }> = [
        { enabled: !!prefs.mealReminders,    time: prefs.breakfastTime,    key: "breakfast", url: "/dashboard/diet",    actions: ACTIONS.meal },
        { enabled: !!prefs.mealReminders,    time: prefs.lunchTime,        key: "lunch",     url: "/dashboard/diet",    actions: ACTIONS.meal },
        { enabled: !!prefs.mealReminders,    time: prefs.dinnerTime,       key: "dinner",    url: "/dashboard/diet",    actions: ACTIONS.meal },
        { enabled: !!prefs.workoutReminders, time: prefs.workoutTime,      key: "workout",   url: "/dashboard/workout", actions: ACTIONS.workout },
        { enabled: !!prefs.taskReminders,    time: prefs.taskReminderTime, key: "tasks",     url: "/dashboard/tasks",   actions: ACTIONS.tasks },
      ];

      for (const r of reminders) {
        if (!r.enabled || !matchesNow(r.time, tz)) continue;
        const { title, body } = pick(r.key);

        // Send to EVERY subscription of the user whose reminder is due, one by one;
        // one failure must not stop the others.
        for (const subDoc of subs) {
          due++;
          const sub = subDoc.subscription;
          const docId = subDoc.id;
          const inMemoryDocKey = `${docId}_${r.key}_${currentMinute}`;
          const inMemoryEndpointKey = `${sub?.endpoint}_${r.key}_${currentMinute}`;

          // Deduplication: do not send same reminder to same subscription twice in same minute
          if (
            subDoc.lastSent?.[r.key] === currentMinute ||
            sentInRun.has(inMemoryDocKey) ||
            sentInRun.has(inMemoryEndpointKey)
          ) {
            skipped++;
            continue;
          }

          // Endpoint allowlist validation
          const check = validatePushEndpoint(sub?.endpoint);
          if (!check.valid) {
            console.warn(
              `[push/cron] Skipped invalid endpoint: host=${check.hostname ?? "unknown"}, reason=${check.reason}`
            );
            skipped++;
            continue;
          }

          const payload = JSON.stringify({
            title,
            body,
            url: r.url,
            actions: r.actions,
            tag: `${r.url}-${Date.now()}`,
          });

          try {
            await webpush.sendNotification(sub, payload);
            sent++;
            sentInRun.add(inMemoryDocKey);
            if (sub?.endpoint) sentInRun.add(inMemoryEndpointKey);

            // Record that this reminder was sent to this subscription at this minute
            try {
              if (typeof adminDb?.collection === "function") {
                const col = adminDb.collection("push_subscriptions");
                if (typeof col?.doc === "function") {
                  const docRef = col.doc(docId);
                  if (typeof docRef?.set === "function") {
                    await docRef.set(
                      {
                        lastSent: {
                          ...(subDoc.lastSent || {}),
                          [r.key]: currentMinute,
                        },
                        updatedAt: Date.now(),
                      },
                      { merge: true }
                    );
                  }
                }
              }
            } catch {
              // Non-fatal error updating lastSent in Firestore
            }
          } catch (err: any) {
            const statusCode = typeof err?.statusCode === "number" ? err.statusCode : "unknown";
            const host = check.hostname ?? "unknown";
            const shortDocId = typeof docId === "string" ? docId.slice(-6) : "unknown";

            // Log ONLY route, error.statusCode, host, last 6 chars of docId, and reminderType
            console.error(
              `[push/cron] Push error: route=/api/push/cron, statusCode=${statusCode}, host=${host}, docId=${shortDocId}, reminderType=${r.key}`
            );

            // 404 or 410 -> delete subscription document and count as removed
            if (statusCode === 404 || statusCode === 410) {
              try {
                if (typeof adminDb?.collection === "function") {
                  const col = adminDb.collection("push_subscriptions");
                  if (typeof col?.doc === "function") {
                    const docRef = col.doc(docId);
                    if (typeof docRef?.delete === "function") {
                      await docRef.delete();
                    }
                  }
                }
              } catch (delErr) {
                console.error(
                  `[push/cron] Failed to delete push_subscription docId=${shortDocId}`
                );
              }
              removed++;
            } else {
              // 400, 401, 403 or other errors: keep document and count as failed
              failed++;
            }
          }
        }
      }
    }
  } catch (err) {
    console.error("Cron error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    due,
    sent,
    failed,
    removed,
    skipped,
    time: now.toISOString(),
  });
}
