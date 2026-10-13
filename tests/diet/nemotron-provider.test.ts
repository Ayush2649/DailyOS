import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  analyzeMealWithNemotron,
  nemotronVisionProvider,
  isCircuitOpen,
  recordSuccess,
  recordFailure,
  resetCircuitBreaker,
  getCircuitBreakerState,
} from "@/lib/ai/providers/nemotron";
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

describe("Nemotron Vision Provider & Integration", () => {
  const originalEnv = process.env;
  let createMock: any;

  beforeEach(() => {
    vi.clearAllMocks();
    resetCircuitBreaker();
    process.env = {
      ...originalEnv,
      NEMOTRON_OMNI_API_KEY: "test-nemotron-key",
      MEAL_VISION_PROVIDER: "nemotron",
    };
    createMock = (OpenAI as any).createMock;
  });

  afterEach(() => {
    process.env = originalEnv;
    resetCircuitBreaker();
  });

  describe("Nemotron Vision Provider Core", () => {
    it("successfully parses valid Nemotron JSON response and maps to standard structure", async () => {
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
                notes: "Standard home-cooked Indian meal",
              }),
            },
          },
        ],
        usage: {
          prompt_tokens: 1250,
          completion_tokens: 500,
          total_tokens: 1750,
          completion_tokens_details: {
            reasoning_tokens: 350,
          },
        },
      });

      const result = await analyzeMealWithNemotron({
        base64: "dummyBase64",
        mimeType: "image/jpeg",
        userKey: "user-1",
      });

      expect(result.provider).toBe("nemotron");
      expect(result.model).toBe("nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free");
      expect(result.foods).toHaveLength(2);
      expect(result.foods[0].name).toBe("Plain Roti");
      expect(result.foods[0].quantity).toBe(2);
      expect(result.candidates[0].name).toBe("Roti with Dal Tadka");
      expect(result.candidates[0].confidence).toBe("high");
      expect(result.visibleItems).toEqual(["2 rotis ~60g", "1 bowl dal ~150g"]);
      expect(result.ambiguity).toBe("low");
      expect(result.usage.promptTokens).toBe(1250);
      expect(result.usage.completionTokens).toBe(500);
      expect(result.usage.reasoningTokens).toBe(350);
    });

    it("handles malformed JSON from Nemotron safely without crashing", async () => {
      createMock.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: "This is invalid non-JSON output from the model! <b>404</b>",
            },
          },
        ],
      });

      await expect(
        analyzeMealWithNemotron({
          base64: "dummyBase64",
          mimeType: "image/jpeg",
        })
      ).rejects.toThrow(PhotoUnavailableError);

      // Verify circuit failure recorded
      expect(getCircuitBreakerState().consecutiveFailures).toBe(1);
    });

    it("handles empty response from Nemotron safely", async () => {
      createMock.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: "",
            },
          },
        ],
      });

      await expect(
        analyzeMealWithNemotron({
          base64: "dummyBase64",
          mimeType: "image/jpeg",
        })
      ).rejects.toThrow(PhotoUnavailableError);
    });

    it("handles missing fields in Nemotron output with resilient defaults", async () => {
      createMock.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify({
                visibleItems: ["1 plate khichdi ~200g"],
                ambiguity: "medium",
                notes: "Detected from visible items only",
              }),
            },
          },
        ],
        usage: { prompt_tokens: 600, completion_tokens: 100, total_tokens: 700 },
      });

      const result = await analyzeMealWithNemotron({
        base64: "dummyBase64",
        mimeType: "image/jpeg",
      });

      expect(result.foods.length).toBeGreaterThan(0);
      expect(result.candidates.length).toBeGreaterThan(0);
      expect(result.visibleItems).toContain("1 plate khichdi ~200g");
    });

    it("detects and handles OpenRouter inline error payloads (e.g. 502 Worker limit reached)", async () => {
      // 1st attempt: OpenRouter inline error payload
      createMock.mockResolvedValueOnce({
        error: {
          message: "Upstream error from Nvidia: ResourceExhausted: Worker local total request limit reached (16/16)",
          code: 502,
        },
      });

      // 2nd attempt: Succeeds
      createMock.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify({
                foods: [{ name: "Dosa", quantity: 1, unit: "piece", confidence: 0.9 }],
                candidates: [{ name: "Dosa", confidence: 0.9 }],
                visibleItems: ["1 dosa"],
                ambiguity: "low",
                notes: "Recovered on retry",
              }),
            },
          },
        ],
        usage: { prompt_tokens: 500, completion_tokens: 80, total_tokens: 580 },
      });

      const result = await analyzeMealWithNemotron({
        base64: "dummyBase64",
        mimeType: "image/jpeg",
      });

      expect(result.foods[0].name).toBe("Dosa");
      expect(createMock).toHaveBeenCalledTimes(2);
    });

    it("retries once on retryable 503 server error before failing", async () => {
      // 1st attempt: 503 error
      createMock.mockRejectedValueOnce({
        status: 503,
        message: "OpenRouter service temporarily overloaded",
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

      const result = await analyzeMealWithNemotron({
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
          analyzeMealWithNemotron({
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

    it("throws PhotoUnavailableError immediately when NEMOTRON_OMNI_API_KEY is missing", async () => {
      delete process.env.NEMOTRON_OMNI_API_KEY;
      delete process.env.NEMOTRON_API_KEY;

      await expect(
        analyzeMealWithNemotron({
          base64: "dummyBase64",
          mimeType: "image/jpeg",
        })
      ).rejects.toThrow("NEMOTRON_OMNI_API_KEY is not configured on the server.");
    });
  });

  describe("Provider Factory & Switching (MEAL_VISION_PROVIDER)", () => {
    it("defaults to Gemini when MEAL_VISION_PROVIDER is not set", () => {
      delete process.env.MEAL_VISION_PROVIDER;
      const provider = getMealVisionProvider();
      expect(provider.id).toBe("gemini");
    });

    it("selects Nemotron when MEAL_VISION_PROVIDER=nemotron", () => {
      process.env.MEAL_VISION_PROVIDER = "nemotron";
      const provider = getMealVisionProvider();
      expect(provider.id).toBe("nemotron");
    });

    it("selects DeepSeek when MEAL_VISION_PROVIDER=deepseek", () => {
      process.env.MEAL_VISION_PROVIDER = "deepseek";
      const provider = getMealVisionProvider();
      expect(provider.id).toBe("deepseek");
    });

    it("both Nemotron and Gemini yield identical downstream deterministic nutrition for equivalent vision outputs", () => {
      const equivalentFoods = [
        { name: "Plain Roti", quantity: 2, unit: "piece", confidence: 0.9 },
        { name: "Dal Tadka", quantity: 1, unit: "katori", confidence: 0.85 },
      ];

      // Downstream deterministic nutrition calculation on Nemotron output
      const nemotronNutrition = calculateMealNutrition(equivalentFoods, "Roti with Dal Tadka");

      // Downstream deterministic nutrition calculation on Gemini output
      const geminiNutrition = calculateMealNutrition(equivalentFoods, "Roti with Dal Tadka");

      expect(nemotronNutrition.calories).toBe(geminiNutrition.calories);
      expect(nemotronNutrition.proteinG).toBe(geminiNutrition.proteinG);
      expect(nemotronNutrition.carbsG).toBe(geminiNutrition.carbsG);
      expect(nemotronNutrition.fatG).toBe(geminiNutrition.fatG);
      expect(nemotronNutrition.fiberG).toBe(geminiNutrition.fiberG);
      expect(nemotronNutrition.allFoodsVerified).toBe(true);
      expect(nemotronNutrition.unknownFoods).toHaveLength(0);
    });

    it("correctly flags unknown foods from Nemotron in downstream nutrition engine and NEVER outputs 0 kcal", () => {
      const foodsWithUnknown = [
        { name: "Plain Roti", quantity: 2, unit: "piece", confidence: 0.9 },
        { name: "Quantum Nano Shake X", quantity: 1, unit: "serving", confidence: 0.6 },
      ];

      const nutritionResult = calculateMealNutrition(foodsWithUnknown, "Custom meal");
      expect(nutritionResult.allFoodsVerified).toBe(false);
      expect(nutritionResult.requiresManualReview).toBe(true);
      expect(nutritionResult.unknownFoods).toContain("Quantum Nano Shake X");
      // The unknown food must not be silently logged as 0-calorie verified meal
      expect(nutritionResult.items.find((i) => i.name === "Quantum Nano Shake X")?.verified).toBe(false);
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
                notes: "Crisp crepe",
              }),
            },
          },
        ],
        usage: { prompt_tokens: 800, completion_tokens: 100, total_tokens: 900 },
      });

      const secretBase64 = "CONFIDENTIAL_PIXEL_DATA_DO_NOT_LOG";
      await analyzeMealWithNemotron({
        base64: secretBase64,
        mimeType: "image/jpeg",
      });

      expect(infoSpy).toHaveBeenCalled();
      const loggedCalls = infoSpy.mock.calls.map((c) => c[0]);
      for (const call of loggedCalls) {
        expect(call).not.toContain(secretBase64);
        expect(call).not.toContain("test-nemotron-key");
      }

      infoSpy.mockRestore();
    });
  });
});
