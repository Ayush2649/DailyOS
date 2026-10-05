import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import webpush from "web-push";

// Mock dependencies before importing the route
vi.mock("@/lib/firebaseAdmin", () => ({
  adminDb: {
    collection: vi.fn().mockReturnValue({
      get: vi.fn().mockResolvedValue({
        docs: [],
      }),
    }),
  },
}));

vi.mock("web-push", () => ({
  default: {
    setVapidDetails: vi.fn(),
    sendNotification: vi.fn().mockResolvedValue({ statusCode: 201 }),
  },
}));

// Import the route handler under test
import { GET } from "@/app/api/push/cron/route";

describe("GET /api/push/cron - Authentication", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("fails closed with 500 when CRON_SECRET is missing from environment and calls no external services", async () => {
    delete process.env.CRON_SECRET;

    const req = new NextRequest("http://localhost/api/push/cron", {
      method: "GET",
    });

    const res = await GET(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBeDefined();
    expect(adminDb.collection).not.toHaveBeenCalled();
    expect(webpush.sendNotification).not.toHaveBeenCalled();
  });

  it("fails closed with 500 when CRON_SECRET is empty string and calls no external services", async () => {
    process.env.CRON_SECRET = "";

    const req = new NextRequest("http://localhost/api/push/cron", {
      method: "GET",
    });

    const res = await GET(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBeDefined();
    expect(adminDb.collection).not.toHaveBeenCalled();
    expect(webpush.sendNotification).not.toHaveBeenCalled();
  });

  it("returns 401 when Authorization header is missing and calls no external services", async () => {
    process.env.CRON_SECRET = "super-secret-cron-key-123";

    const req = new NextRequest("http://localhost/api/push/cron", {
      method: "GET",
    });

    const res = await GET(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
    expect(adminDb.collection).not.toHaveBeenCalled();
    expect(webpush.sendNotification).not.toHaveBeenCalled();
  });

  it("returns 401 when Authorization header contains incorrect secret and calls no external services", async () => {
    process.env.CRON_SECRET = "super-secret-cron-key-123";

    const req = new NextRequest("http://localhost/api/push/cron", {
      method: "GET",
      headers: {
        authorization: "Bearer wrong-secret-key",
      },
    });

    const res = await GET(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
    expect(adminDb.collection).not.toHaveBeenCalled();
    expect(webpush.sendNotification).not.toHaveBeenCalled();
  });

  it("returns 401 when Authorization header has wrong scheme and calls no external services", async () => {
    process.env.CRON_SECRET = "super-secret-cron-key-123";

    const req = new NextRequest("http://localhost/api/push/cron", {
      method: "GET",
      headers: {
        authorization: "Basic super-secret-cron-key-123",
      },
    });

    const res = await GET(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
    expect(adminDb.collection).not.toHaveBeenCalled();
    expect(webpush.sendNotification).not.toHaveBeenCalled();
  });

  it("returns 200 when Authorization header has exactly Bearer <CRON_SECRET> and executes Firestore queries", async () => {
    process.env.CRON_SECRET = "super-secret-cron-key-123";

    const req = new NextRequest("http://localhost/api/push/cron", {
      method: "GET",
      headers: {
        authorization: "Bearer super-secret-cron-key-123",
      },
    });

    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(adminDb.collection).toHaveBeenCalled();
  });

  describe("Endpoint allow-list validation before sending in cron", () => {
    it("skips stored subscription with non-allow-listed host and does not call sendNotification", async () => {
      process.env.CRON_SECRET = "super-secret-cron-key-123";
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "test-pub-key";
      process.env.VAPID_PRIVATE_KEY = "test-priv-key";
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const nowTime = new Intl.DateTimeFormat("en-GB", {
        timeZone: "UTC",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(new Date());

      const badSub = {
        userId: "user-1",
        subscription: {
          endpoint: "https://evil.attacker.com/device-token",
          keys: { p256dh: "some-key-123456", auth: "some-auth-key-12" },
        },
      };

      const userPrefs = {
        timezone: "UTC",
        mealReminders: true,
        breakfastTime: nowTime,
      };

      vi.mocked(adminDb.collection).mockImplementation((colName: string) => {
        if (colName === "push_subscriptions") {
          return {
            get: vi.fn().mockResolvedValue({
              docs: [{ id: "sub-1", data: () => badSub }],
            }),
          } as any;
        }
        if (colName === "notificationPrefs") {
          return {
            get: vi.fn().mockResolvedValue({
              docs: [{ id: "user-1", data: () => userPrefs }],
            }),
          } as any;
        }
        return { get: vi.fn().mockResolvedValue({ docs: [] }) } as any;
      });

      const req = new NextRequest("http://localhost/api/push/cron", {
        method: "GET",
        headers: { authorization: "Bearer super-secret-cron-key-123" },
      });

      const res = await GET(req);
      expect(res.status).toBe(200);
      expect(webpush.sendNotification).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringMatching(/host=evil\.attacker\.com,\s*reason=unsupported_push_host/)
      );
      const allLogs = warnSpy.mock.calls.flat().join(" ");
      expect(allLogs).not.toContain("device-token");
    });

    it("sends valid subscription when one bad stored subscription is skipped in cron (bad does not stop others)", async () => {
      process.env.CRON_SECRET = "super-secret-cron-key-123";
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "test-pub-key";
      process.env.VAPID_PRIVATE_KEY = "test-priv-key";
      vi.spyOn(console, "warn").mockImplementation(() => {});

      const nowTime = new Intl.DateTimeFormat("en-GB", {
        timeZone: "UTC",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(new Date());

      const badSub = {
        userId: "user-1",
        subscription: {
          endpoint: "https://evil.attacker.com/device-token",
          keys: { p256dh: "some-key-123456", auth: "some-auth-key-12" },
        },
      };
      const goodSub = {
        userId: "user-1",
        subscription: {
          endpoint: "https://fcm.googleapis.com/fcm/send/valid-token-123",
          keys: { p256dh: "some-key-123456", auth: "some-auth-key-12" },
        },
      };

      const userPrefs = {
        timezone: "UTC",
        mealReminders: true,
        breakfastTime: nowTime,
      };

      vi.mocked(adminDb.collection).mockImplementation((colName: string) => {
        if (colName === "push_subscriptions") {
          return {
            get: vi.fn().mockResolvedValue({
              docs: [
                { id: "sub-1", data: () => badSub },
                { id: "sub-2", data: () => goodSub },
              ],
            }),
          } as any;
        }
        if (colName === "notificationPrefs") {
          return {
            get: vi.fn().mockResolvedValue({
              docs: [{ id: "user-1", data: () => userPrefs }],
            }),
          } as any;
        }
        return { get: vi.fn().mockResolvedValue({ docs: [] }) } as any;
      });

      const req = new NextRequest("http://localhost/api/push/cron", {
        method: "GET",
        headers: { authorization: "Bearer super-secret-cron-key-123" },
      });

      const res = await GET(req);
      expect(res.status).toBe(200);
      expect(webpush.sendNotification).toHaveBeenCalledTimes(1);
      expect(webpush.sendNotification).toHaveBeenCalledWith(
        goodSub.subscription,
        expect.any(String)
      );
    });
  });
});
