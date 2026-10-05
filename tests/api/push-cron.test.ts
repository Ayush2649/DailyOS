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

  describe("Resilience, cleanup on 404/410, error logging, and minute deduplication", () => {
    it("deletes subscription on 410 and the loop continues to subsequent subscriptions", async () => {
      process.env.CRON_SECRET = "super-secret-cron-key-123";
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "test-pub-key";
      process.env.VAPID_PRIVATE_KEY = "test-priv-key";
      vi.spyOn(console, "error").mockImplementation(() => {});

      const nowTime = new Intl.DateTimeFormat("en-GB", {
        timeZone: "UTC",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(new Date());

      const deadSubDoc = {
        userId: "user-1",
        subscription: {
          endpoint: "https://web.push.apple.com/send/dead-token-123",
          keys: { p256dh: "key-1234567890", auth: "auth-12345678" },
        },
      };

      const validSubDoc = {
        userId: "user-1",
        subscription: {
          endpoint: "https://fcm.googleapis.com/fcm/send/valid-token-456",
          keys: { p256dh: "key-1234567890", auth: "auth-12345678" },
        },
      };

      const deleteMock1 = vi.fn().mockResolvedValue(undefined);
      const deleteMock2 = vi.fn().mockResolvedValue(undefined);

      vi.mocked(adminDb.collection).mockImplementation((colName: string) => {
        if (colName === "push_subscriptions") {
          return {
            get: vi.fn().mockResolvedValue({
              docs: [
                { id: "sub_apple_111111", data: () => deadSubDoc },
                { id: "sub_fcm_222222", data: () => validSubDoc },
              ],
            }),
            doc: vi.fn().mockImplementation((id: string) => {
              if (id === "sub_apple_111111") return { delete: deleteMock1, set: vi.fn() };
              return { delete: deleteMock2, set: vi.fn() };
            }),
          } as any;
        }
        if (colName === "notificationPrefs") {
          return {
            get: vi.fn().mockResolvedValue({
              docs: [{
                id: "user-1",
                data: () => ({ timezone: "UTC", mealReminders: true, breakfastTime: nowTime }),
              }],
            }),
          } as any;
        }
        return { get: vi.fn().mockResolvedValue({ docs: [] }) } as any;
      });

      const err410: any = new Error("Subscription gone");
      err410.statusCode = 410;
      vi.mocked(webpush.sendNotification)
        .mockRejectedValueOnce(err410)
        .mockResolvedValueOnce({ statusCode: 201 } as any);

      const req = new NextRequest("http://localhost/api/push/cron", {
        method: "GET",
        headers: { authorization: "Bearer super-secret-cron-key-123" },
      });

      const res = await GET(req);
      expect(res.status).toBe(200);
      const body = await res.json();

      expect(deleteMock1).toHaveBeenCalledTimes(1);
      expect(deleteMock2).not.toHaveBeenCalled();
      expect(webpush.sendNotification).toHaveBeenCalledTimes(2);
      expect(body.ok).toBe(true);
      expect(body.removed).toBe(1);
      expect(body.sent).toBe(1);
      expect(body.failed).toBe(0);
      expect(body.due).toBe(2);
    });

    it("logs 403 with minimal metadata and keeps subscription without deleting", async () => {
      process.env.CRON_SECRET = "super-secret-cron-key-123";
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "test-pub-key";
      process.env.VAPID_PRIVATE_KEY = "test-priv-key";
      const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const nowTime = new Intl.DateTimeFormat("en-GB", {
        timeZone: "UTC",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(new Date());

      const subDoc = {
        userId: "user-1",
        subscription: {
          endpoint: "https://fcm.googleapis.com/fcm/send/secret-device-token-12345",
          keys: { p256dh: "key-1234567890", auth: "auth-12345678" },
        },
      };

      const deleteMock = vi.fn().mockResolvedValue(undefined);

      vi.mocked(adminDb.collection).mockImplementation((colName: string) => {
        if (colName === "push_subscriptions") {
          return {
            get: vi.fn().mockResolvedValue({
              docs: [{ id: "doc_user1_abcdef", data: () => subDoc }],
            }),
            doc: vi.fn().mockReturnValue({ delete: deleteMock, set: vi.fn() }),
          } as any;
        }
        if (colName === "notificationPrefs") {
          return {
            get: vi.fn().mockResolvedValue({
              docs: [{
                id: "user-1",
                data: () => ({ timezone: "UTC", mealReminders: true, breakfastTime: nowTime }),
              }],
            }),
          } as any;
        }
        return { get: vi.fn().mockResolvedValue({ docs: [] }) } as any;
      });

      const err403: any = new Error("Forbidden VAPID mismatch");
      err403.statusCode = 403;
      vi.mocked(webpush.sendNotification).mockRejectedValueOnce(err403);

      const req = new NextRequest("http://localhost/api/push/cron", {
        method: "GET",
        headers: { authorization: "Bearer super-secret-cron-key-123" },
      });

      const res = await GET(req);
      expect(res.status).toBe(200);
      const body = await res.json();

      expect(deleteMock).not.toHaveBeenCalled();
      expect(body.failed).toBe(1);
      expect(body.removed).toBe(0);
      expect(body.sent).toBe(0);

      const loggedErrors = errSpy.mock.calls.flat().join(" ");
      expect(loggedErrors).toMatch(/403/);
      expect(loggedErrors).toMatch(/fcm\.googleapis\.com/);
      expect(loggedErrors).toMatch(/abcdef/); // last 6 chars of doc ID
      expect(loggedErrors).toMatch(/breakfast/);
      expect(loggedErrors).not.toContain("secret-device-token");
      expect(loggedErrors).not.toContain("key-1234567890");
    });

    it("gives a user with two subscriptions (one dead, one valid) exactly one successful send", async () => {
      process.env.CRON_SECRET = "super-secret-cron-key-123";
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "test-pub-key";
      process.env.VAPID_PRIVATE_KEY = "test-priv-key";
      vi.spyOn(console, "error").mockImplementation(() => {});

      const nowTime = new Intl.DateTimeFormat("en-GB", {
        timeZone: "UTC",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(new Date());

      const deadSub = {
        userId: "user-1",
        subscription: {
          endpoint: "https://updates.push.services.mozilla.com/wpush/v2/dead-token",
          keys: { p256dh: "key-1234567890", auth: "auth-12345678" },
        },
      };
      const validSub = {
        userId: "user-1",
        subscription: {
          endpoint: "https://fcm.googleapis.com/fcm/send/valid-token",
          keys: { p256dh: "key-1234567890", auth: "auth-12345678" },
        },
      };

      const deleteMock = vi.fn().mockResolvedValue(undefined);

      vi.mocked(adminDb.collection).mockImplementation((colName: string) => {
        if (colName === "push_subscriptions") {
          return {
            get: vi.fn().mockResolvedValue({
              docs: [
                { id: "sub-dead-111111", data: () => deadSub },
                { id: "sub-live-222222", data: () => validSub },
              ],
            }),
            doc: vi.fn().mockReturnValue({ delete: deleteMock, set: vi.fn() }),
          } as any;
        }
        if (colName === "notificationPrefs") {
          return {
            get: vi.fn().mockResolvedValue({
              docs: [{
                id: "user-1",
                data: () => ({ timezone: "UTC", mealReminders: true, breakfastTime: nowTime }),
              }],
            }),
          } as any;
        }
        return { get: vi.fn().mockResolvedValue({ docs: [] }) } as any;
      });

      const err404: any = new Error("Subscription not found");
      err404.statusCode = 404;
      vi.mocked(webpush.sendNotification)
        .mockRejectedValueOnce(err404)
        .mockResolvedValueOnce({ statusCode: 201 } as any);

      const req = new NextRequest("http://localhost/api/push/cron", {
        method: "GET",
        headers: { authorization: "Bearer super-secret-cron-key-123" },
      });

      const res = await GET(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.sent).toBe(1);
      expect(body.removed).toBe(1);
      expect(body.due).toBe(2);
      expect(deleteMock).toHaveBeenCalledTimes(1);
    });

    it("ensures a failure in one user does not stop the next user", async () => {
      process.env.CRON_SECRET = "super-secret-cron-key-123";
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "test-pub-key";
      process.env.VAPID_PRIVATE_KEY = "test-priv-key";
      vi.spyOn(console, "error").mockImplementation(() => {});

      const nowTime = new Intl.DateTimeFormat("en-GB", {
        timeZone: "UTC",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(new Date());

      const user1Sub = {
        userId: "user-1",
        subscription: {
          endpoint: "https://fcm.googleapis.com/fcm/send/u1-token",
          keys: { p256dh: "key-1234567890", auth: "auth-12345678" },
        },
      };
      const user2Sub = {
        userId: "user-2",
        subscription: {
          endpoint: "https://fcm.googleapis.com/fcm/send/u2-token",
          keys: { p256dh: "key-1234567890", auth: "auth-12345678" },
        },
      };

      vi.mocked(adminDb.collection).mockImplementation((colName: string) => {
        if (colName === "push_subscriptions") {
          return {
            get: vi.fn().mockResolvedValue({
              docs: [
                { id: "sub-u1-111111", data: () => user1Sub },
                { id: "sub-u2-222222", data: () => user2Sub },
              ],
            }),
            doc: vi.fn().mockReturnValue({ delete: vi.fn(), set: vi.fn() }),
          } as any;
        }
        if (colName === "notificationPrefs") {
          return {
            get: vi.fn().mockResolvedValue({
              docs: [
                {
                  id: "user-1",
                  data: () => ({ timezone: "UTC", mealReminders: true, breakfastTime: nowTime }),
                },
                {
                  id: "user-2",
                  data: () => ({ timezone: "UTC", mealReminders: true, breakfastTime: nowTime }),
                },
              ],
            }),
          } as any;
        }
        return { get: vi.fn().mockResolvedValue({ docs: [] }) } as any;
      });

      const err500: any = new Error("Push service internal error");
      err500.statusCode = 500;
      vi.mocked(webpush.sendNotification)
        .mockRejectedValueOnce(err500)
        .mockResolvedValueOnce({ statusCode: 201 } as any);

      const req = new NextRequest("http://localhost/api/push/cron", {
        method: "GET",
        headers: { authorization: "Bearer super-secret-cron-key-123" },
      });

      const res = await GET(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.failed).toBe(1);
      expect(body.sent).toBe(1);
      expect(webpush.sendNotification).toHaveBeenCalledTimes(2);
    });

    it("does not send the same reminder to the same subscription twice in the same minute", async () => {
      process.env.CRON_SECRET = "super-secret-cron-key-123";
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "test-pub-key";
      process.env.VAPID_PRIVATE_KEY = "test-priv-key";

      const now = new Date();
      const nowTime = new Intl.DateTimeFormat("en-GB", {
        timeZone: "UTC",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(now);
      const currentMinute = now.toISOString().slice(0, 16);

      const alreadySentSub = {
        userId: "user-1",
        subscription: {
          endpoint: "https://fcm.googleapis.com/fcm/send/already-sent-token",
          keys: { p256dh: "key-1234567890", auth: "auth-12345678" },
        },
        lastSent: {
          breakfast: currentMinute,
        },
      };

      vi.mocked(adminDb.collection).mockImplementation((colName: string) => {
        if (colName === "push_subscriptions") {
          return {
            get: vi.fn().mockResolvedValue({
              docs: [{ id: "sub-already-sent", data: () => alreadySentSub }],
            }),
            doc: vi.fn().mockReturnValue({ delete: vi.fn(), set: vi.fn() }),
          } as any;
        }
        if (colName === "notificationPrefs") {
          return {
            get: vi.fn().mockResolvedValue({
              docs: [{
                id: "user-1",
                data: () => ({ timezone: "UTC", mealReminders: true, breakfastTime: nowTime }),
              }],
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
      const body = await res.json();
      expect(webpush.sendNotification).not.toHaveBeenCalled();
      expect(body.due).toBe(1);
      expect(body.skipped).toBe(1);
      expect(body.sent).toBe(0);
    });

    it("returns counts only in the response JSON: { ok, due, sent, failed, removed, skipped, time }", async () => {
      process.env.CRON_SECRET = "super-secret-cron-key-123";

      const req = new NextRequest("http://localhost/api/push/cron", {
        method: "GET",
        headers: { authorization: "Bearer super-secret-cron-key-123" },
      });

      const res = await GET(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(Object.keys(body).sort()).toEqual(
        ["due", "failed", "ok", "removed", "sent", "skipped", "time"].sort()
      );
    });
  });
});
