import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const { mockSendNotification, mockCollectionDocs } = vi.hoisted(() => ({
  mockSendNotification: vi.fn(),
  mockCollectionDocs: vi.fn(),
}));

vi.mock("@/lib/firebaseAdmin", () => ({
  adminDb: {
    collection: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnThis(),
      get: mockCollectionDocs,
    }),
  },
}));

vi.mock("web-push", () => ({
  default: {
    setVapidDetails: vi.fn(),
    sendNotification: mockSendNotification,
  },
}));

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

import { getServerSession } from "next-auth";
import { POST, maxDuration } from "@/app/api/push/send/route";

const FAKE_SESSION_USER_123 = {
  user: { id: "user-123", email: "user@example.com" },
};
const FAKE_SESSION_USER_456 = {
  user: { id: "user-456", email: "other@example.com" },
};

const STORED_SUBSCRIPTION = {
  endpoint: "https://fcm.googleapis.com/fcm/send/device-token-abc",
  keys: {
    p256dh: "BNcRdreALRFXTkOOUHK1EtK2wtwe6MtW71L0zRaiXys7dwz4m_MxKFMj3A0Ux4O89_M6mR8MgEBmKDXHGJsSSw",
    auth: "tBHItJI5svbpez7KI4CCXg",
  },
};

// ── POST /api/push/send ────────────────────────────────────────────────────────
describe("POST /api/push/send", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_VAPID_PUBLIC_KEY: "BHrQj0cAGJ8tn5jm3EpuBe5VFgLSoLZwGdKkv0TqpJdY4oMxs5j8UzNaRtLsAVB",
      VAPID_PRIVATE_KEY: "aTestPrivateKeyLongEnoughForVapid",
      VAPID_EMAIL: "test@example.com",
    };
    mockSendNotification.mockResolvedValue({ statusCode: 201 });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null);

    const req = new NextRequest("http://localhost/api/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "test" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    expect(mockSendNotification).not.toHaveBeenCalled();
  });

  it("sends to all the caller's own subscriptions only", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(FAKE_SESSION_USER_123 as any);

    mockCollectionDocs.mockResolvedValueOnce({
      docs: [
        { data: () => ({ userId: "user-123", subscription: STORED_SUBSCRIPTION }) },
      ],
    });

    const req = new NextRequest("http://localhost/api/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "test" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sent).toBe(1);
    expect(mockSendNotification).toHaveBeenCalledTimes(1);
    expect(mockSendNotification.mock.calls[0][0]).toEqual(STORED_SUBSCRIPTION);
  });

  it("finds caller's subscriptions when session has only an email (no user.id)", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { email: "email-only@example.com" },
    } as any);

    mockCollectionDocs.mockResolvedValueOnce({
      docs: [
        { data: () => ({ userId: "email-only@example.com", subscription: STORED_SUBSCRIPTION }) },
      ],
    });

    const req = new NextRequest("http://localhost/api/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "test" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sent).toBe(1);
    expect(mockSendNotification).toHaveBeenCalledTimes(1);
  });

  it("does not allow targeting another user's subscription (ignores client-supplied subscription)", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(FAKE_SESSION_USER_123 as any);

    mockCollectionDocs.mockResolvedValueOnce({
      docs: [
        { data: () => ({ userId: "user-123", subscription: STORED_SUBSCRIPTION }) },
      ],
    });

    const ATTACKER_ENDPOINT = "https://fcm.googleapis.com/fcm/send/victim-token";

    const req = new NextRequest("http://localhost/api/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "test",
        subscription: {
          endpoint: ATTACKER_ENDPOINT,
          keys: { p256dh: "x", auth: "y" },
        },
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const usedEndpoints = mockSendNotification.mock.calls.map((c) => {
      const sub = c[0] as { endpoint: string };
      return sub.endpoint;
    });
    expect(usedEndpoints).not.toContain(ATTACKER_ENDPOINT);
    expect(usedEndpoints).toContain(STORED_SUBSCRIPTION.endpoint);
  });

  it("returns 200 with sent: 0 when the caller has no subscriptions", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(FAKE_SESSION_USER_456 as any);
    mockCollectionDocs.mockResolvedValueOnce({ docs: [] });

    const req = new NextRequest("http://localhost/api/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "test" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sent).toBe(0);
    expect(mockSendNotification).not.toHaveBeenCalled();
  });

  it("rejects an unknown kind", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(FAKE_SESSION_USER_123 as any);

    const req = new NextRequest("http://localhost/api/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "phishing-message-content" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(mockSendNotification).not.toHaveBeenCalled();
  });

  it("accepts valid kinds from the allow-list (test, meal, workout, tasks)", async () => {
    for (const kind of ["test", "meal", "workout", "tasks"]) {
      vi.clearAllMocks();
      mockSendNotification.mockResolvedValue({ statusCode: 201 });
      vi.mocked(getServerSession).mockResolvedValueOnce(FAKE_SESSION_USER_123 as any);
      mockCollectionDocs.mockResolvedValueOnce({
        docs: [
          { data: () => ({ userId: "user-123", subscription: STORED_SUBSCRIPTION }) },
        ],
      });

      const req = new NextRequest("http://localhost/api/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
    }
  });

  it("rejects an absolute URL", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(FAKE_SESSION_USER_123 as any);

    const req = new NextRequest("http://localhost/api/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "test", url: "https://evil.com/phish" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(mockSendNotification).not.toHaveBeenCalled();
  });

  it("rejects a protocol-relative URL (//evil.com)", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(FAKE_SESSION_USER_123 as any);

    const req = new NextRequest("http://localhost/api/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "test", url: "//evil.com/phish" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(mockSendNotification).not.toHaveBeenCalled();
  });

  it("accepts a valid relative URL starting with /", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(FAKE_SESSION_USER_123 as any);
    mockCollectionDocs.mockResolvedValueOnce({
      docs: [
        { data: () => ({ userId: "user-123", subscription: STORED_SUBSCRIPTION }) },
      ],
    });

    const req = new NextRequest("http://localhost/api/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "test", url: "/dashboard/diet" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const sentPayload = JSON.parse(mockSendNotification.mock.calls[0][1]);
    expect(sentPayload.url).toBe("/dashboard/diet");
  });

  it("skips a stored subscription with a non-allow-listed host and does not call sendNotification", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(FAKE_SESSION_USER_123 as any);
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const INVALID_STORED_SUBSCRIPTION = {
      endpoint: "https://evil.attacker.com/device-token",
      keys: { p256dh: "some-key-123456", auth: "some-auth-key-12" },
    };

    mockCollectionDocs.mockResolvedValueOnce({
      docs: [
        { data: () => ({ userId: "user-123", subscription: INVALID_STORED_SUBSCRIPTION }) },
      ],
    });

    const req = new NextRequest("http://localhost/api/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "test" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sent).toBe(0);
    expect(mockSendNotification).not.toHaveBeenCalled();

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringMatching(/host=evil\.attacker\.com,\s*reason=unsupported_push_host/)
    );
    const allLogs = warnSpy.mock.calls.flat().join(" ");
    expect(allLogs).not.toContain("device-token");
  });

  it("sends a valid subscription when one bad stored subscription is skipped (bad does not stop others)", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(FAKE_SESSION_USER_123 as any);
    vi.spyOn(console, "warn").mockImplementation(() => {});

    const INVALID_STORED_SUBSCRIPTION = {
      endpoint: "https://evil.attacker.com/device-token",
      keys: { p256dh: "some-key-123456", auth: "some-auth-key-12" },
    };

    mockCollectionDocs.mockResolvedValueOnce({
      docs: [
        { data: () => ({ userId: "user-123", subscription: INVALID_STORED_SUBSCRIPTION }) },
        { data: () => ({ userId: "user-123", subscription: STORED_SUBSCRIPTION }) },
      ],
    });

    const req = new NextRequest("http://localhost/api/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "test" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sent).toBe(1);
    expect(mockSendNotification).toHaveBeenCalledTimes(1);
    expect(mockSendNotification.mock.calls[0][0]).toEqual(STORED_SUBSCRIPTION);
  });

  it("exports maxDuration = 30", () => {
    expect(maxDuration).toBe(30);
  });

  it("returns errorStatus when push service rejects the subscription", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(FAKE_SESSION_USER_123 as any);
    mockCollectionDocs.mockResolvedValueOnce({
      docs: [
        { data: () => ({ userId: "user-123", subscription: STORED_SUBSCRIPTION }) },
      ],
    });
    const pushError: any = new Error("Push service rejected");
    pushError.statusCode = 410;
    mockSendNotification.mockRejectedValueOnce(pushError);

    const req = new NextRequest("http://localhost/api/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "test" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sent).toBe(0);
    expect(body.errorStatus).toBe(410);
  });

  it("returns reason: 'no_subscriptions' when caller has no subscriptions", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(FAKE_SESSION_USER_123 as any);
    mockCollectionDocs.mockResolvedValueOnce({ docs: [] });

    const req = new NextRequest("http://localhost/api/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "test" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sent).toBe(0);
    expect(body.reason).toBe("no_subscriptions");
  });
});
