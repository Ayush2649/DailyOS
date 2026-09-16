import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { adminDb } from "@/lib/firebaseAdmin";
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

interface PushSubscription {
  userId: string;
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } };
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

async function sendPush(sub: PushSubscription["subscription"], payload: PushPayload) {
  try {
    await webpush.sendNotification(
      sub,
      JSON.stringify({ ...payload, tag: `${payload.url}-${Date.now()}` }),
    );
  } catch (err: any) {
    // 410 Gone = subscription expired — could clean it up here
    if (err.statusCode !== 410) console.error("Push failed:", err.message);
  }
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

// ── Cron handler ──────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  // Verify Vercel cron secret
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  let sent = 0;

  try {
    // Load all push subscriptions + notification prefs in parallel
    const [subsSnap, prefsSnap] = await Promise.all([
      adminDb.collection("push_subscriptions").get(),
      adminDb.collection("notificationPrefs").get(),
    ]);

    // Build a map: userId → prefs
    const prefsMap = new Map<string, NotificationPrefs>();
    prefsSnap.docs.forEach(d => prefsMap.set(d.id, d.data() as NotificationPrefs));

    // Group subscriptions by userId
    const subsByUser = new Map<string, PushSubscription["subscription"][]>();
    subsSnap.docs.forEach(d => {
      const data = d.data() as PushSubscription;
      if (!subsByUser.has(data.userId)) subsByUser.set(data.userId, []);
      subsByUser.get(data.userId)!.push(data.subscription);
    });

    // For each user, check which reminders are due right now
    const tasks: Promise<void>[] = [];

    subsByUser.forEach((subs, userId) => {
      const prefs = prefsMap.get(userId);
      if (!prefs) return;

      const tz = prefs.timezone || "UTC";

      const reminders: Array<{ enabled: boolean; time: string; key: string; url: string; actions: PushAction[] }> = [
        { enabled: prefs.mealReminders,    time: prefs.breakfastTime,    key: "breakfast", url: "/dashboard/diet",    actions: ACTIONS.meal },
        { enabled: prefs.mealReminders,    time: prefs.lunchTime,        key: "lunch",     url: "/dashboard/diet",    actions: ACTIONS.meal },
        { enabled: prefs.mealReminders,    time: prefs.dinnerTime,       key: "dinner",    url: "/dashboard/diet",    actions: ACTIONS.meal },
        { enabled: prefs.workoutReminders, time: prefs.workoutTime,      key: "workout",   url: "/dashboard/workout", actions: ACTIONS.workout },
        { enabled: prefs.taskReminders,    time: prefs.taskReminderTime, key: "tasks",     url: "/dashboard/tasks",   actions: ACTIONS.tasks },
      ];

      reminders.forEach(r => {
        if (!r.enabled || !matchesNow(r.time, tz)) return;
        const { title, body } = pick(r.key);
        subs.forEach(sub => {
          tasks.push(sendPush(sub, { title, body, url: r.url, actions: r.actions }));
          sent++;
        });
      });
    });

    await Promise.all(tasks);
  } catch (err) {
    console.error("Cron error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, sent, time: new Date().toISOString() });
}
