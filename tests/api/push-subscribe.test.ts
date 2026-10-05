import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const { mockCollectionGet, mockDocDelete, mockDocSet } = vi.hoisted(() => ({
  mockCollectionGet: vi.fn(),
  mockDocDelete: vi.fn(),
  mockDocSet: vi.fn(),
}));

vi.mock("@/lib/firebaseAdmin", () => ({
  adminDb: {
    collection: vi.fn().mockReturnValue({
      doc: vi.fn().mockReturnValue({
        set: mockDocSet,
        delete: mockDocDelete,
      }),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      get: mockCollectionGet,
    }),
  },
}));

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

import { getServerSession } from "next-auth";
import { POST, DELETE } from "@/app/api/push/subscribe/route";

// A valid FCM endpoint — changes here if tests fail, verify against real subscriptions
const VALID_FCM_ENDPOINT =
  "https://fcm.googleapis.com/fcm/send/some-device-token";
const VALID_APPLE_ENDPOINT =
  "https://web.push.apple.com/some/path";
const VALID_MOZILLA_ENDPOINT =
  "https://updates.push.services.mozilla.com/push/some/path";
const VALID_WNS_ENDPOINT =
  "https://db5.notify.windows.com/w/?token=some-wns-token";
const VALID_KEYS = {
  p256dh: "BNcRdreALRFXTkOOUHK1EtK2wtwe6MtW71L0zRaiXys7dwz4m_MxKFMj3A0Ux4O89_M6mR8MgEBmKDXHGJsSSw",
  auth: "tBHItJI5svbpez7KI4CCXg",
};
const VALID_SUBSCRIPTION = {
  endpoint: VALID_FCM_ENDPOINT,
  keys: VALID_KEYS,
};

// ── POST /api/push/subscribe ───────────────────────────────────────────────────
describe("POST /api/push/subscribe", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    mockCollectionGet.mockResolvedValue({ docs: [] });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  // ── Auth ──────────────────────────────────────────────────────────────────
  it("returns 401 when unauthenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null);

    const req = new NextRequest("http://localhost/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscription: VALID_SUBSCRIPTION }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  // ── Endpoint allow-list ───────────────────────────────────────────────────
  it("accepts a valid FCM endpoint", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: "user-123", email: "user@example.com" },
    } as any);

    const req = new NextRequest("http://localhost/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscription: VALID_SUBSCRIPTION }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  it("accepts a valid Apple Web Push endpoint", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: "user-123", email: "user@example.com" },
    } as any);

    const req = new NextRequest("http://localhost/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subscription: { endpoint: VALID_APPLE_ENDPOINT, keys: VALID_KEYS },
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
  });

  it("accepts a valid Mozilla autopush endpoint", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: "user-123", email: "user@example.com" },
    } as any);

    const req = new NextRequest("http://localhost/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subscription: {
          endpoint: VALID_MOZILLA_ENDPOINT,
          keys: VALID_KEYS,
        },
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
  });

  it("accepts a valid Windows WNS endpoint", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: "user-123", email: "user@example.com" },
    } as any);

    const req = new NextRequest("http://localhost/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subscription: {
          endpoint: VALID_WNS_ENDPOINT,
          keys: VALID_KEYS,
        },
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
  });

  it("rejects a non-allow-listed endpoint host", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: "user-123", email: "user@example.com" },
    } as any);

    const req = new NextRequest("http://localhost/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subscription: {
          endpoint: "https://evil.attacker.com/exfiltrate",
          keys: VALID_KEYS,
        },
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it("rejects lookalike fcm.googleapis.com.attacker.com and logs ONLY hostname and reason", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: "user-123", email: "user@example.com" },
    } as any);

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const secretEndpoint = "https://fcm.googleapis.com.attacker.com/send/secret-user-token";
    const req = new NextRequest("http://localhost/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subscription: {
          endpoint: secretEndpoint,
          keys: VALID_KEYS,
        },
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(422);

    expect(warnSpy).toHaveBeenCalled();
    const allLogArgs = warnSpy.mock.calls.flat().join(" ");
    expect(allLogArgs).toContain("fcm.googleapis.com.attacker.com");
    expect(allLogArgs).not.toContain("secret-user-token");
    expect(allLogArgs).not.toContain(VALID_KEYS.p256dh);
    expect(allLogArgs).not.toContain(VALID_KEYS.auth);
  });

  it("rejects lookalike evil-fcm.googleapis.com.attacker.com", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: "user-123", email: "user@example.com" },
    } as any);

    const req = new NextRequest("http://localhost/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subscription: {
          endpoint: "https://evil-fcm.googleapis.com.attacker.com/send",
          keys: VALID_KEYS,
        },
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(422);
  });

  it("rejects userinfo lookalike https://fcm.googleapis.com@attacker.com/", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: "user-123", email: "user@example.com" },
    } as any);

    const req = new NextRequest("http://localhost/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subscription: {
          endpoint: "https://fcm.googleapis.com@attacker.com/",
          keys: VALID_KEYS,
        },
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(422);
  });

  it("rejects a non-https endpoint", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: "user-123", email: "user@example.com" },
    } as any);

    const req = new NextRequest("http://localhost/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subscription: {
          endpoint: "http://fcm.googleapis.com/fcm/send/token",
          keys: VALID_KEYS,
        },
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(422);
  });

  it("rejects a protocol-relative endpoint URL (// prefix)", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: "user-123", email: "user@example.com" },
    } as any);

    const req = new NextRequest("http://localhost/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subscription: {
          endpoint: "//fcm.googleapis.com/fcm/send/token",
          keys: VALID_KEYS,
        },
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(422);
  });

  it("rejects an endpoint that is too long", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: "user-123", email: "user@example.com" },
    } as any);

    const req = new NextRequest("http://localhost/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subscription: {
          endpoint: "https://fcm.googleapis.com/fcm/send/" + "a".repeat(3000),
          keys: VALID_KEYS,
        },
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(422);
  });

  it("rejects a subscription with missing keys", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: "user-123", email: "user@example.com" },
    } as any);

    const req = new NextRequest("http://localhost/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subscription: { endpoint: VALID_FCM_ENDPOINT },
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(422);
  });
});

// ── DELETE /api/push/subscribe ─────────────────────────────────────────────────
describe("DELETE /api/push/subscribe", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCollectionGet.mockResolvedValue({ docs: [] });
  });

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null);

    const req = new NextRequest("http://localhost/api/push/subscribe", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: VALID_FCM_ENDPOINT }),
    });

    const res = await DELETE(req);
    expect(res.status).toBe(401);
  });

  it("rejects a non-allow-listed endpoint on DELETE", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: "user-123", email: "user@example.com" },
    } as any);

    const req = new NextRequest("http://localhost/api/push/subscribe", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint: "https://evil.attacker.com/endpoint",
      }),
    });

    const res = await DELETE(req);
    expect(res.status).toBe(422);
  });
});
