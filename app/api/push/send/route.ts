import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
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
  } catch (err) {
    console.warn("VAPID init failed:", err);
    return false;
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!initVapid()) {
    return NextResponse.json({ error: "Push notifications not configured" }, { status: 500 });
  }

  const { subscription, title, body, url, tag } = await req.json();

  if (!subscription || !title) {
    return NextResponse.json({ error: "Missing subscription or title" }, { status: 400 });
  }

  const payload = JSON.stringify({ title, body, url, tag });

  try {
    await webpush.sendNotification(subscription, payload);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("Push send error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
