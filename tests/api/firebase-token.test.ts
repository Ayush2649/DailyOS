import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const { mockCreateCustomToken } = vi.hoisted(() => ({
  mockCreateCustomToken: vi.fn(),
}));

vi.mock("@/lib/firebaseAdmin", () => ({
  default: {
    auth: () => ({
      createCustomToken: mockCreateCustomToken,
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
import { POST, GET } from "@/app/api/auth/firebase-token/route";
import { resetRateLimit } from "@/lib/onboarding/rateLimit";

describe("Firebase Custom Token API Route (/api/auth/firebase-token)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetRateLimit();
  });

  it("returns 401 Unauthorized when no session exists", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null);

    const req = new NextRequest("http://localhost/api/auth/firebase-token", {
      method: "POST",
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toEqual({ error: "Unauthorized" });
    expect(mockCreateCustomToken).not.toHaveBeenCalled();
  });

  it("returns 401 Unauthorized when session has no user", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({} as any);

    const req = new NextRequest("http://localhost/api/auth/firebase-token", {
      method: "POST",
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toEqual({ error: "Unauthorized" });
    expect(mockCreateCustomToken).not.toHaveBeenCalled();
  });

  it("returns 400 when session has an empty or invalid user ID", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: "   ", email: "" },
    } as any);

    const req = new NextRequest("http://localhost/api/auth/firebase-token", {
      method: "POST",
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid user identifier");
    expect(mockCreateCustomToken).not.toHaveBeenCalled();
  });

  it("returns 400 when user ID exceeds 128 characters", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: "a".repeat(129) },
    } as any);

    const req = new NextRequest("http://localhost/api/auth/firebase-token", {
      method: "POST",
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid user identifier");
    expect(mockCreateCustomToken).not.toHaveBeenCalled();
  });

  it("mints custom token using user.id from session and returns 200", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: "google_sub_10928374", name: "Test User", email: "test@satat.app" },
    } as any);

    mockCreateCustomToken.mockResolvedValueOnce("mock_firebase_custom_jwt_token");

    const req = new NextRequest("http://localhost/api/auth/firebase-token", {
      method: "POST",
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ token: "mock_firebase_custom_jwt_token" });
    expect(mockCreateCustomToken).toHaveBeenCalledWith("google_sub_10928374");
  });

  it("mints custom token using user.email fallback when user.id is not present", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { email: "fallback_user@satat.app" },
    } as any);

    mockCreateCustomToken.mockResolvedValueOnce("mock_firebase_custom_jwt_token_email");

    const req = new NextRequest("http://localhost/api/auth/firebase-token", {
      method: "POST",
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ token: "mock_firebase_custom_jwt_token_email" });
    expect(mockCreateCustomToken).toHaveBeenCalledWith("fallback_user@satat.app");
  });

  it("strictly ignores any userId supplied in request body or query parameter (anti-spoofing)", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: "legitimate_session_user_id" },
    } as any);

    mockCreateCustomToken.mockResolvedValueOnce("token_for_legitimate_user");

    const req = new NextRequest("http://localhost/api/auth/firebase-token?userId=attacker_spoofed_id", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: "attacker_spoofed_id_in_body" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ token: "token_for_legitimate_user" });
    // Verifies that createCustomToken was called with the session's ID, NEVER the body or query ID
    expect(mockCreateCustomToken).toHaveBeenCalledWith("legitimate_session_user_id");
    expect(mockCreateCustomToken).not.toHaveBeenCalledWith("attacker_spoofed_id");
    expect(mockCreateCustomToken).not.toHaveBeenCalledWith("attacker_spoofed_id_in_body");
  });

  it("returns 500 without leaking credentials when token generation fails", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: "user_fail_token" },
    } as any);

    mockCreateCustomToken.mockRejectedValueOnce(new Error("Internal crypto private key failure"));

    const req = new NextRequest("http://localhost/api/auth/firebase-token", {
      method: "POST",
    });

    const res = await POST(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ error: "Failed to generate authentication token" });
  });

  it("returns 429 when rate limit is exceeded for the same user", async () => {
    const session = { user: { id: "rate_limited_user" } } as any;

    mockCreateCustomToken.mockResolvedValue("sample_token");

    // Send 30 allowed requests
    for (let i = 0; i < 30; i++) {
      vi.mocked(getServerSession).mockResolvedValueOnce(session);
      const req = new NextRequest("http://localhost/api/auth/firebase-token", { method: "POST" });
      const res = await POST(req);
      expect(res.status).toBe(200);
    }

    // 31st request should be rate-limited
    vi.mocked(getServerSession).mockResolvedValueOnce(session);
    const req = new NextRequest("http://localhost/api/auth/firebase-token", { method: "POST" });
    const res = await POST(req);
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error).toContain("Too many requests");
    expect(res.headers.get("Retry-After")).toBeDefined();
  });

  it("supports GET method identically to POST", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: "get_user_uid" },
    } as any);

    mockCreateCustomToken.mockResolvedValueOnce("get_token");

    const req = new NextRequest("http://localhost/api/auth/firebase-token", {
      method: "GET",
    });

    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ token: "get_token" });
    expect(mockCreateCustomToken).toHaveBeenCalledWith("get_user_uid");
  });
});

