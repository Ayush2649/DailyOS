import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import {
  isCircuitOpen,
  recordSuccess,
  recordFailure,
  resetCircuitBreaker,
  getCircuitBreakerState,
  PhotoUnavailableError,
} from "@/lib/ai/providers/gemini";
import { POST as analyzeMealPOST } from "@/app/api/analyze-meal/route";

// Mock getServerSession
vi.mock("next-auth", () => ({
  getServerSession: vi.fn().mockResolvedValue({
    user: { id: "test-user-123", email: "user@test.com" },
  }),
}));

// Mock Gemini provider for route tests
vi.mock("@/lib/ai/providers/gemini", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/ai/providers/gemini")>();
  return {
    ...actual,
    analyzeMealWithGemini: vi.fn(),
  };
});

// Import the mocked analyzeMealWithGemini
import { analyzeMealWithGemini } from "@/lib/ai/providers/gemini";

describe("Vision Pipeline & Circuit Breaker Architecture", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetCircuitBreaker();
    vi.useRealTimers();
  });

  afterEach(() => {
    resetCircuitBreaker();
    vi.useRealTimers();
  });

  describe("Circuit Breaker Behavior", () => {
    it("starts in CLOSED state with 0 failures", () => {
      const state = getCircuitBreakerState();
      expect(state.isOpen).toBe(false);
      expect(state.consecutiveFailures).toBe(0);
      expect(state.circuitOpenUntil).toBe(0);
    });

    it("remains closed on 1 and 2 failures", () => {
      recordFailure();
      expect(isCircuitOpen()).toBe(false);
      expect(getCircuitBreakerState().consecutiveFailures).toBe(1);

      recordFailure();
      expect(isCircuitOpen()).toBe(false);
      expect(getCircuitBreakerState().consecutiveFailures).toBe(2);
    });

    it("trips to OPEN state on 3rd failure with a 30s cooldown", () => {
      vi.useFakeTimers();
      const startTime = Date.now();
      vi.setSystemTime(startTime);

      recordFailure();
      recordFailure();
      recordFailure();

      const state = getCircuitBreakerState();
      expect(state.isOpen).toBe(true);
      expect(state.consecutiveFailures).toBe(3);
      expect(state.circuitOpenUntil).toBe(startTime + 30_000);

      // Still open at 29 seconds
      vi.advanceTimersByTime(29_000);
      expect(isCircuitOpen()).toBe(true);
    });

    it("transitions to HALF-OPEN after 30s and allows exactly 1 probe request", () => {
      vi.useFakeTimers();
      const startTime = Date.now();
      vi.setSystemTime(startTime);

      // Trip circuit
      recordFailure();
      recordFailure();
      recordFailure();
      expect(isCircuitOpen()).toBe(true);

      // Advance past 30s cooldown
      vi.advanceTimersByTime(30_001);

      // First request should be allowed as probe (returns false for isCircuitOpen)
      expect(isCircuitOpen()).toBe(false);

      // Concurrent request while probe is in flight should be blocked (returns true)
      expect(isCircuitOpen()).toBe(true);

      // If probe succeeds, circuit resets to CLOSED
      recordSuccess();
      expect(isCircuitOpen()).toBe(false);
      expect(getCircuitBreakerState().consecutiveFailures).toBe(0);
      expect(getCircuitBreakerState().circuitOpenUntil).toBe(0);
    });

    it("trips back to OPEN if the half-open probe fails", () => {
      vi.useFakeTimers();
      const startTime = Date.now();
      vi.setSystemTime(startTime);

      // Trip circuit
      recordFailure();
      recordFailure();
      recordFailure();

      // Advance past cooldown
      vi.advanceTimersByTime(30_001);

      // Probe request allowed
      expect(isCircuitOpen()).toBe(false);

      // Probe fails
      recordFailure();
      expect(isCircuitOpen()).toBe(true);
      expect(getCircuitBreakerState().circuitOpenUntil).toBe(startTime + 30_001 + 30_000);
    });

    it("resetCircuitBreaker completely clears state", () => {
      recordFailure();
      recordFailure();
      recordFailure();
      expect(isCircuitOpen()).toBe(true);

      resetCircuitBreaker();
      expect(isCircuitOpen()).toBe(false);
      expect(getCircuitBreakerState().consecutiveFailures).toBe(0);
      expect(getCircuitBreakerState().circuitOpenUntil).toBe(0);
    });

    it("isolates circuit breaker state per user", () => {
      recordFailure("user-a");
      recordFailure("user-a");
      recordFailure("user-a");

      expect(isCircuitOpen("user-a")).toBe(true);
      expect(isCircuitOpen("user-b")).toBe(false);

      // User B can succeed without interference
      recordSuccess("user-b");
      expect(isCircuitOpen("user-b")).toBe(false);
      expect(isCircuitOpen("user-a")).toBe(true);
    });
  });

  describe("API Route: /api/analyze-meal", () => {
    it("successfully integrates vision model output with deterministic standard reference nutrition calculation", async () => {
      // Mock Gemini output returning structured foods and candidates
      vi.mocked(analyzeMealWithGemini).mockResolvedValueOnce({
        foods: [
          { name: "Roti", quantity: 2, unit: "piece", confidence: 0.9 },
          { name: "Dal Tadka", quantity: 1, unit: "katori", confidence: 0.85 },
        ],
        candidates: [
          { name: "Roti with Dal Tadka", confidence: "high", rawConfidence: 0.88 },
        ],
        visibleItems: ["2 rotis", "1 bowl dal tadka"],
        ambiguity: "low",
        notes: "Clear photo of standard meal",
        model: "gemini-3.8-flash",
        provider: "gemini",
        usage: {
          promptTokens: 150,
          completionTokens: 60,
          thinkingTokens: 10,
          cachedTokens: 0,
          totalTokens: 220,
          latencyMs: 1200,
        },
      });

      // 1x1 dummy JPEG base64
      const dummyBase64 = "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=";

      const req = new NextRequest("http://localhost/api/analyze-meal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: dummyBase64,
          mimeType: "image/jpeg",
        }),
      });

      const res = await analyzeMealPOST(req);
      expect(res.status).toBe(200);

      const body = await res.json();

      // Check deterministic nutrition:
      // 2 rotis: 2 * 80 = 160 kcal, 6g P, 30g C, 2g F, 4g Fiber
      // 1 katori dal: 150g = 125 kcal, 8g P, 21g C, 2g F, 4g Fiber
      // Total calories = 285
      expect(body.calories).toBe(285);
      expect(body.proteinG).toBe(14);
      expect(body.carbsG).toBe(51);
      expect(body.fatG).toBe(4);
      expect(body.fiberG).toBe(8);

      // Check range
      expect(body.calorieRange).toBeDefined();
      expect(body.calorieRange.low).toBeLessThan(body.calories);
      expect(body.calorieRange.high).toBeGreaterThan(body.calories);

      // Check backward compatibility fields
      expect(body.name).toBe("Roti with Dal Tadka");
      expect(body.confidence).toBe("high");
      // Flatbread rule adds alternative candidate from different calorie class
      expect(body.candidates).toHaveLength(2);
      expect(body.candidates[1].name).toContain("Aloo Paratha");
      expect(body.visibleItems).toEqual(["2 rotis", "1 bowl dal tadka"]);
      expect(body.allFoodsVerified).toBe(true);
      expect(body.requiresManualReview).toBe(false);
      expect(body.unknownFoods).toHaveLength(0);
      expect(body.foods).toHaveLength(2);
    });

    it("returns allFoodsVerified: false and requiresManualReview: true when unrecognized foods are detected", async () => {
      vi.mocked(analyzeMealWithGemini).mockResolvedValueOnce({
        foods: [
          { name: "Unrecognized Exotic Item 9000", quantity: 1, unit: "piece", confidence: 0.8 },
        ],
        candidates: [
          { name: "Unrecognized Exotic Item 9000", confidence: "medium", rawConfidence: 0.6 },
        ],
        visibleItems: ["1 unrecognized exotic item"],
        ambiguity: "high",
        notes: "Unfamiliar food item",
        model: "gemini-3.8-flash",
        provider: "gemini",
        usage: {
          promptTokens: 100,
          completionTokens: 50,
          thinkingTokens: 0,
          cachedTokens: 0,
          totalTokens: 150,
          latencyMs: 900,
        },
      });

      const dummyBase64 = "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=";

      const req = new NextRequest("http://localhost/api/analyze-meal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: dummyBase64,
          mimeType: "image/jpeg",
        }),
      });

      const res = await analyzeMealPOST(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.allFoodsVerified).toBe(false);
      expect(body.requiresManualReview).toBe(true);
      expect(body.unknownFoods).toContain("Unrecognized Exotic Item 9000");
      expect(body.calories).toBe(0);
    });

    it("returns 503 PHOTO_UNAVAILABLE when PhotoUnavailableError is thrown", async () => {
      vi.mocked(analyzeMealWithGemini).mockRejectedValueOnce(
        new PhotoUnavailableError("Photo scan is busy. Type or speak your meal instead.")
      );

      const dummyBase64 = "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=";

      const req = new NextRequest("http://localhost/api/analyze-meal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: dummyBase64,
          mimeType: "image/jpeg",
        }),
      });

      const res = await analyzeMealPOST(req);
      expect(res.status).toBe(503);

      const body = await res.json();
      expect(body.error).toBe("PHOTO_UNAVAILABLE");
      expect(body.message).toContain("Photo scan is busy");
    });
  });
});
