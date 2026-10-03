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
});

