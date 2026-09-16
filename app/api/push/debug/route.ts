import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { adminDb } from "@/lib/firebaseAdmin";

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

// GET /api/push/debug          → list all subscriptions + their push host
// GET /api/push/debug?send=1    → also fire a real push to each, report the actual result
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const send = req.nextUrl.searchParams.get("send") === "1";

  try {
    const snap = await adminDb.collection("push_subscriptions").get();
    const results: any[] = [];

    for (const d of snap.docs) {
      const data = d.data() as any;
      const endpoint: string = data?.subscription?.endpoint ?? "";
      let host = "";
      try { host = new URL(endpoint).host; } catch { /* ignore */ }

      const entry: any = {
        id: d.id,
        userId: data.userId,
        host,                                   // web.push.apple.com = iPhone; fcm.googleapis.com = Chrome
        createdAt: data.createdAt,
      };

      if (send && data.subscription?.endpoint) {
        try {
          const res = await webpush.sendNotification(
            data.subscription,
            JSON.stringify({ title: "🔔 DailyOS debug", body: "Direct test push — if you see this, delivery works.", url: "/dashboard" })
          );
          entry.sendStatus = res.statusCode;     // 201 = accepted
        } catch (err: any) {
          entry.sendError = err?.statusCode ?? err?.body ?? err?.message ?? String(err);
        }
      }

      results.push(entry);
    }

    // Also dump notificationPrefs so we can see times + timezone vs current time
    const prefsSnap = await adminDb.collection("notificationPrefs").get();
    const prefs = prefsSnap.docs.map(d => {
      const p = d.data() as any;
      const tz = p.timezone || "UTC";
      let nowInTz = "";
      try {
        nowInTz = new Intl.DateTimeFormat("en-GB", {
          timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false,
        }).format(new Date());
      } catch { /* ignore */ }
      return {
        userId: d.id,
        timezone: tz,
        serverNowInThatTz: nowInTz,
        mealReminders: p.mealReminders,
        breakfastTime: p.breakfastTime,
        lunchTime: p.lunchTime,
        dinnerTime: p.dinnerTime,
        workoutReminders: p.workoutReminders,
        workoutTime: p.workoutTime,
        taskReminders: p.taskReminders,
        taskReminderTime: p.taskReminderTime,
      };
    });

    return NextResponse.json({
      count: results.length,
      vapidPublicKeyTail: (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "").slice(-8),
      serverUtcNow: new Date().toISOString(),
      subscriptions: results,
      prefs,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? String(err) }, { status: 500 });
  }
}
