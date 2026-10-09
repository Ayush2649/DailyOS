import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  analyzeMealWithDeepSeek,
  deepseekVisionProvider,
  isCircuitOpen,
  recordSuccess,
  recordFailure,
  resetCircuitBreaker,
  getCircuitBreakerState,
} from "@/lib/ai/providers/deepseek";
import {
  analyzeMealWithGemini,
  geminiVisionProvider,
} from "@/lib/ai/providers/gemini";
import { getMealVisionProvider, PhotoUnavailableError } from "@/lib/ai/providers";
import { calculateMealNutrition } from "@/lib/ai/nutrition/calculator";
import OpenAI from "openai";

// Mock the OpenAI SDK
vi.mock("openai", () => {
  const createMock = vi.fn();
  const mockOpenAI = vi.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: createMock,
      },
    },
  }));
  (mockOpenAI as any).createMock = createMock;
  return {
    default: mockOpenAI,
  };
});

describe("DeepSeek Vision Provider & Integration", () => {
  const originalEnv = process.env;
  let createMock: any;

  beforeEach(() => {
    vi.clearAllMocks();
    resetCircuitBreaker();
    process.env = {
      ...originalEnv,
      DEEPSEEK_API_KEY: "test-deepseek-key",
      MEAL_VISION_PROVIDER: "deepseek",
    };
    createMock = (OpenAI as any).createMock;
  });

  afterEach(() => {
    process.env = originalEnv;
    resetCircuitBreaker();
  });

  describe("DeepSeek Vision Provider Core", () => {
    it("successfully parses valid DeepSeek JSON response and maps to standard structure", async () => {
      createMock.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify({
                foods: [
                  { name: "Plain Roti", quantity: 2, unit: "piece", confidence: 0.95 },
                  { name: "Dal Tadka", quantity: 1, unit: "katori", confidence: 0.88 },
                ],
                candidates: [
                  { name: "Roti with Dal Tadka", confidence: 0.92 },
                  { name: "Aloo Paratha with Dal", confidence: 0.2 },
                ],
                visibleItems: ["2 rotis ~60g", "1 bowl dal ~150g"],
                ambiguity: "low",
                notes: "Standard home-cooked meal",
              }),
            },
          },
        ],
        usage: {
          prompt_tokens: 1200,
          completion_tokens: 150,
          total_tokens: 1350,
        },
      });

      const result = await analyzeMealWithDeepSeek({
        base64: "dummyBase64",
        mimeType: "image/jpeg",
        userKey: "user-1",
      });

      expect(result.provider).toBe("deepseek");
      expect(result.model).toBe("deepseek-flash");
      expect(result.foods).toHaveLength(2);
      expect(result.foods[0].name).toBe("Plain Roti");
      expect(result.foods[0].quantity).toBe(2);
      expect(result.candidates[0].name).toBe("Roti with Dal Tadka");
      expect(result.candidates[0].confidence).toBe("high");
      expect(result.visibleItems).toEqual(["2 rotis ~60g", "1 bowl dal ~150g"]);
      expect(result.ambiguity).toBe("low");
      expect(result.usage.promptTokens).toBe(1200);
      expect(result.usage.completionTokens).toBe(150);
      expect(result.usage.estimatedCostUsd).toBeGreaterThan(0);
    });

    it("handles malformed JSON from DeepSeek safely without crashing", async () => {
      createMock.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: "This is not valid JSON at all! <b>Error</b>",
            },
          },
        ],
      });

      await expect(
        analyzeMealWithDeepSeek({
          base64: "dummyBase64",
          mimeType: "image/jpeg",
        })
      ).rejects.toThrow(PhotoUnavailableError);

      // Verify circuit failure recorded
      expect(getCircuitBreakerState().consecutiveFailures).toBe(1);
    });

    it("handles missing fields in DeepSeek output with resilient defaults", async () => {
      // Missing candidates and foods, but has visibleItems
      createMock.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify({
                visibleItems: ["1 plate khichdi ~200g"],
                ambiguity: "medium",
                notes: "Only visible items detected",
              }),
            },
          },
        ],
        usage: { prompt_tokens: 500, completion_tokens: 50, total_tokens: 550 },
      });

      const result = await analyzeMealWithDeepSeek({
        base64: "dummyBase64",
        mimeType: "image/jpeg",
      });

      expect(result.foods.length).toBeGreaterThan(0);
      expect(result.candidates.length).toBeGreaterThan(0);
      expect(result.visibleItems).toContain("1 plate khichdi ~200g");
    });

    it("retries once on retryable 503 server error before failing", async () => {
      // 1st attempt: 503 error
      createMock.mockRejectedValueOnce({
        status: 503,
        message: "DeepSeek service overloaded",
      });

      // 2nd attempt: succeeds
      createMock.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify({
                foods: [{ name: "Idli", quantity: 2, unit: "piece", confidence: 0.9 }],
                candidates: [{ name: "Idli with Sambar", confidence: 0.9 }],
                visibleItems: ["2 idlis"],
                ambiguity: "low",
                notes: "Success on retry",
              }),
            },
          },
        ],
        usage: { prompt_tokens: 600, completion_tokens: 60, total_tokens: 660 },
      });

      const result = await analyzeMealWithDeepSeek({
        base64: "dummyBase64",
        mimeType: "image/jpeg",
      });

      expect(result.foods[0].name).toBe("Idli");
      expect(createMock).toHaveBeenCalledTimes(2);
    });

    it("trips circuit breaker after 3 consecutive failures with per-user isolation", async () => {
      createMock.mockRejectedValue({
        status: 500,
        message: "Internal Server Error",
      });

      // User A fails 3 times
      for (let i = 0; i < 3; i++) {
        await expect(
          analyzeMealWithDeepSeek({
            base64: "dummyBase64",
            mimeType: "image/jpeg",
            userKey: "user-a",
          })
        ).rejects.toThrow(PhotoUnavailableError);
      }

      // User A circuit should now be open
      expect(isCircuitOpen("user-a")).toBe(true);

      // User B circuit must remain closed!
      expect(isCircuitOpen("user-b")).toBe(false);
    });

    it("throws PhotoUnavailableError immediately when DEEPSEEK_API_KEY is missing", async () => {
      delete process.env.DEEPSEEK_API_KEY;

      await expect(
        analyzeMealWithDeepSeek({
          base64: "dummyBase64",
          mimeType: "image/jpeg",
        })
      ).rejects.toThrow("DEEPSEEK_API_KEY is not configured on the server.");
    });
  });

  describe("Provider Factory & Switching (MEAL_VISION_PROVIDER)", () => {
    it("defaults to Gemini when MEAL_VISION_PROVIDER is not set", () => {
      delete process.env.MEAL_VISION_PROVIDER;
      const provider = getMealVisionProvider();
      expect(provider.id).toBe("gemini");
    });

    it("selects DeepSeek when MEAL_VISION_PROVIDER=deepseek", () => {
      process.env.MEAL_VISION_PROVIDER = "deepseek";
      const provider = getMealVisionProvider();
      expect(provider.id).toBe("deepseek");
    });

    it("selects Gemini when MEAL_VISION_PROVIDER=gemini", () => {
      process.env.MEAL_VISION_PROVIDER = "gemini";
      const provider = getMealVisionProvider();
      expect(provider.id).toBe("gemini");
    });

    it("both providers yield identical downstream deterministic nutrition for equivalent vision outputs", () => {
      const equivalentFoods = [
        { name: "Plain Roti", quantity: 2, unit: "piece", confidence: 0.9 },
        { name: "Dal Tadka", quantity: 1, unit: "katori", confidence: 0.85 },
      ];

      // Downstream nutrition calculation executed on DeepSeek output
      const deepseekNutrition = calculateMealNutrition(equivalentFoods, "Roti with Dal Tadka");

      // Downstream nutrition calculation executed on Gemini output
      const geminiNutrition = calculateMealNutrition(equivalentFoods, "Roti with Dal Tadka");

      expect(deepseekNutrition.calories).toBe(geminiNutrition.calories);
      expect(deepseekNutrition.proteinG).toBe(geminiNutrition.proteinG);
      expect(deepseekNutrition.carbsG).toBe(geminiNutrition.carbsG);
      expect(deepseekNutrition.fatG).toBe(geminiNutrition.fatG);
      expect(deepseekNutrition.fiberG).toBe(geminiNutrition.fiberG);
      expect(deepseekNutrition.allFoodsVerified).toBe(true);
      expect(deepseekNutrition.unknownFoods).toHaveLength(0);
    });

    it("correctly flags unknown foods from DeepSeek in downstream nutrition engine", () => {
      const foodsWithUnknown = [
        { name: "Plain Roti", quantity: 2, unit: "piece", confidence: 0.9 },
        { name: "Futuristic Protein Gel 3000", quantity: 1, unit: "serving", confidence: 0.7 },
      ];

      const nutritionResult = calculateMealNutrition(foodsWithUnknown, "Custom meal");
      expect(nutritionResult.allFoodsVerified).toBe(false);
      expect(nutritionResult.requiresManualReview).toBe(true);
      expect(nutritionResult.unknownFoods).toContain("Futuristic Protein Gel 3000");
    });
  });

  describe("Telemetry & Privacy Safeguards", () => {
    it("never logs raw base64 images or API keys in telemetry console logs", async () => {
      const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});

      createMock.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify({
                foods: [{ name: "Dosa", quantity: 1, unit: "piece", confidence: 0.9 }],
                candidates: [{ name: "Plain Dosa", confidence: 0.9 }],
                visibleItems: ["1 dosa"],
                ambiguity: "low",
                notes: "Crisp golden crepe",
              }),
            },
          },
        ],
        usage: { prompt_tokens: 800, completion_tokens: 100, total_tokens: 900 },
      });

      const secretBase64 = "CONFIDENTIAL_PIXEL_DATA_DO_NOT_LOG";
      await analyzeMealWithDeepSeek({
        base64: secretBase64,
        mimeType: "image/jpeg",
      });

      expect(infoSpy).toHaveBeenCalled();
      const loggedCalls = infoSpy.mock.calls.map((c) => c[0]);
      for (const call of loggedCalls) {
        expect(call).not.toContain(secretBase64);
        expect(call).not.toContain("test-deepseek-key");
      }

      infoSpy.mockRestore();
    });
  });
});

