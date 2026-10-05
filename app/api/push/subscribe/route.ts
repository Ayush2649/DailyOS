import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserKey } from "@/lib/auth/userKey";
import { adminDb } from "@/lib/firebaseAdmin";
import { validatePushEndpoint } from "@/lib/push/allowlist";

const PushEndpointSchema = z
  .string()
  .max(2048)
  .superRefine((val, ctx) => {
    const res = validatePushEndpoint(val);
    if (!res.valid) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: res.reason || "Invalid push service endpoint",
      });
    }
  });

const SubscribeSchema = z.object({
  subscription: z.object({
    endpoint: PushEndpointSchema,
    keys: z.object({
      p256dh: z.string().min(10).max(256),
      auth: z.string().min(10).max(256),
    }),
  }),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = getUserKey(session);
  if (!userId) return NextResponse.json({ error: "No user ID" }, { status: 400 });

  let rawBody: any;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Validate endpoint using boundary allowlist & lookalike checks
  const endpointCheck = validatePushEndpoint(rawBody?.subscription?.endpoint);
  if (!endpointCheck.valid) {
    // Log ONLY hostname and reason, NEVER full endpoint or keys
    console.warn(`[push/subscribe] Rejected endpoint: host=${endpointCheck.hostname ?? "unknown"}, reason=${endpointCheck.reason}`);
    return NextResponse.json(
      { error: "Notifications aren't supported in this browser" },
      { status: 422 }
    );
  }

  const parsed = SubscribeSchema.safeParse(rawBody);
  if (!parsed.success) {
    console.warn(`[push/subscribe] Rejected subscription: host=${endpointCheck.hostname ?? "unknown"}, reason=invalid_keys`);
    return NextResponse.json(
      { error: "Notifications aren't supported in this browser" },
      { status: 422 }
    );
  }

  const { subscription } = parsed.data;

  // Store subscription keyed by endpoint hash so multiple devices work
  const key = Buffer.from(subscription.endpoint).toString("base64").slice(-32);
  const docId = `${userId}_${key}`;

  await adminDb.collection("push_subscriptions").doc(docId).set({
    userId,
    subscription,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = getUserKey(session);
  if (!userId) return NextResponse.json({ error: "No user ID" }, { status: 400 });

  let rawBody: any;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const endpointCheck = validatePushEndpoint(rawBody?.endpoint);
  if (!endpointCheck.valid) {
    console.warn(`[push/subscribe] Rejected delete endpoint: host=${endpointCheck.hostname ?? "unknown"}, reason=${endpointCheck.reason}`);
    return NextResponse.json(
      { error: "Notifications aren't supported in this browser" },
      { status: 422 }
    );
  }

  const { endpoint } = rawBody;
  const key = Buffer.from(endpoint).toString("base64").slice(-32);
  const docId = `${userId}_${key}`;

  await adminDb.collection("push_subscriptions").doc(docId).delete();

  return NextResponse.json({ ok: true });
}
