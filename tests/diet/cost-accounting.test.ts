/**
 * tests/diet/cost-accounting.test.ts
 *
 * Comprehensive Unit Test Suite for API Cost Accounting Utility.
 * Validates deterministic pricing, rate conversion, cached tokens,
 * retries, failed requests, currency handling (USD and INR), and volume projections.
 *
 * Uses mocked data fixtures only; NEVER calls real external APIs.
 */

import { describe, it, expect } from "vitest";
import {
  calculateApiCost,
  aggregateApiCosts,
  projectVolumeCosts,
  formatUsd,
  formatInr,
  formatCostDual,
  DEFAULT_USD_TO_INR_RATE,
  ApiCostRecord,
} from "@/lib/ai/cost-accounting";

describe("API Cost Accounting Engine (cost-accounting.ts)", () => {
  // ── 1. Basic Token Pricing & Rate Conversion ────────────────────────────────

  describe("Token Pricing & Rate Conversion", () => {
    it("converts per-million rates correctly for 1M tokens", () => {
      // 1M prompt ($0.14) + 1M completion ($0.28) = $0.42 USD
      const record = calculateApiCost({
        provider: "deepseek",
        model: "deepseek-flash",
        operation: "analyzeMeal",
        promptTokens: 1_000_000,
        completionTokens: 1_000_000,
        latencyMs: 1200,
      });

      expect(record.costStatus).toBe("ESTIMATED_FROM_USAGE");
      expect(record.inputCostUsd).toBe(0.14);
      expect(record.outputCostUsd).toBe(0.28);
      expect(record.totalCostUsd).toBe(0.42);

      // INR check at 84.0 rate: 0.42 * 84 = 35.28
      expect(record.totalCostInr).toBe(35.28);
      expect(record.exchangeRateUsdToInr).toBe(84.0);
    });

    it("calculates realistic fractional token costs with high precision", () => {
      // Typical meal scan: 1,500 prompt tokens, 800 completion tokens
      // Input: (1500 / 1M) * 0.14 = $0.00021
      // Output: (800 / 1M) * 0.28 = $0.000224
      // Total: $0.000434 USD
      // INR: 0.000434 * 84 = ₹0.036456 -> ₹0.0365 INR
      const record = calculateApiCost({
        provider: "deepseek",
        model: "deepseek-flash",
        operation: "analyzeMeal",
        promptTokens: 1500,
        completionTokens: 800,
        latencyMs: 6500,
      });

      expect(record.totalCostUsd).toBe(0.000434);
      expect(record.totalCostInr).toBe(0.0365);
    });

    it("respects custom USD-to-INR exchange rates", () => {
      const record = calculateApiCost({
        provider: "deepseek",
        model: "deepseek-flash",
        operation: "analyzeMeal",
        promptTokens: 1_000_000,
        completionTokens: 0,
        latencyMs: 1000,
        usdToInrRate: 85.5,
      });

      expect(record.inputCostUsd).toBe(0.14);
      expect(record.totalCostInr).toBe(11.97); // 0.14 * 85.5
      expect(record.exchangeRateUsdToInr).toBe(85.5);
    });
  });

  // ── 2. Cached Token Pricing ─────────────────────────────────────────────────

  describe("Cached Token Pricing", () => {
    it("applies discounted cached input token pricing correctly", () => {
      // DeepSeek cached rate: $0.014 / 1M vs standard $0.14 / 1M (10x discount)
      // 1M prompt tokens with 600K cached tokens:
      // Cached: 600K * $0.014 / 1M = $0.0084
      // Uncached: 400K * $0.14 / 1M = $0.056
      // Total input: $0.0644 USD
      const record = calculateApiCost({
        provider: "deepseek",
        model: "deepseek-flash",
        operation: "analyzeMeal",
        promptTokens: 1_000_000,
        completionTokens: 0,
        cachedTokens: 600_000,
        latencyMs: 800,
      });

      expect(record.cachedTokens).toBe(600_000);
      expect(record.inputCostUsd).toBe(0.0644);
      expect(record.totalCostUsd).toBe(0.0644);
      expect(record.totalCostInr).toBe(5.4096);
    });
  });

  // ── 3. Exact Provider-Reported Cost ─────────────────────────────────────────

  describe("Provider-Reported Cost Overrides", () => {
    it("preserves exact provider reported cost without re-estimating", () => {
      const record = calculateApiCost({
        provider: "deepseek",
        model: "deepseek-flash",
        operation: "analyzeMeal",
        promptTokens: 1200,
        completionTokens: 300,
        latencyMs: 2500,
        isProviderReportedCost: true,
        exactCostUsd: 0.000355,
      });

      expect(record.costStatus).toBe("EXACT_PROVIDER_REPORTED");
      expect(record.totalCostUsd).toBe(0.000355);
      expect(record.totalCostInr).toBe(0.0298); // 0.000355 * 84
      expect(record.pricingSource).toBe("Provider Direct Billing API");
    });
  });

  // ── 4. Edge Cases: Unknown Models, Failures & Timeouts ──────────────────────

  describe("Edge Cases & Failure Handling", () => {
    it("marks cost as UNKNOWN when model pricing is not in catalog", () => {
      const record = calculateApiCost({
        provider: "unknown-ai",
        model: "unobtanium-v1",
        operation: "analyzeMeal",
        promptTokens: 1000,
        completionTokens: 500,
        latencyMs: 1000,
      });

      expect(record.costStatus).toBe("UNKNOWN");
      expect(record.totalCostUsd).toBeNull();
      expect(record.totalCostInr).toBeNull();
      expect(record.missingDataNotes).toContain("No verified pricing found");
    });

    it("marks cost as UNKNOWN when request timed out with zero usage tokens", () => {
      const record = calculateApiCost({
        provider: "deepseek",
        model: "deepseek-flash",
        operation: "analyzeMeal",
        promptTokens: 0,
        completionTokens: 0,
        latencyMs: 10000,
        status: "timeout",
      });

      expect(record.costStatus).toBe("UNKNOWN");
      expect(record.totalCostUsd).toBeNull();
      expect(record.totalCostInr).toBeNull();
      expect(record.missingDataNotes).toContain("Request ended in timeout");
    });

    it("calculates cost accurately if error occurred but usage was consumed and returned", () => {
      // E.g. Model generated 400 completion tokens before schema validation failed
      const record = calculateApiCost({
        provider: "deepseek",
        model: "deepseek-flash",
        operation: "analyzeMeal",
        promptTokens: 1500,
        completionTokens: 400,
        latencyMs: 3200,
        status: "error",
      });

      expect(record.costStatus).toBe("ESTIMATED_FROM_USAGE");
      expect(record.status).toBe("error");
      expect(record.totalCostUsd).toBeGreaterThan(0);
    });
  });

  // ── 5. Multi-Call Aggregation & Logical Operations ──────────────────────────

  describe("Multi-Call Aggregation (aggregateApiCosts)", () => {
    it("aggregates two stages of a meal scan into total meal economics", () => {
      const visionCall = calculateApiCost({
        provider: "deepseek",
        model: "deepseek-flash",
        operation: "analyzeMeal",
        promptTokens: 1500,
        completionTokens: 800,
        latencyMs: 6000,
      });

      const nutritionCall = calculateApiCost({
        provider: "deepseek",
        model: "deepseek-flash",
        operation: "estimateNutrition",
        promptTokens: 600,
        completionTokens: 400,
        latencyMs: 2000,
      });

      const summary = aggregateApiCosts([visionCall, nutritionCall]);

      expect(summary.totalCalls).toBe(2);
      expect(summary.totalPromptTokens).toBe(2100);
      expect(summary.totalCompletionTokens).toBe(1200);
      expect(summary.totalTokens).toBe(3300);

      // Vision: 0.000434 USD, Nutrition: (600*0.14 + 400*0.28)/1M = 0.000196 USD
      // Total: 0.00063 USD
      expect(summary.totalCostUsd).toBe(0.00063);
      expect(summary.totalCostInr).toBe(0.053);

      // Stage breakdown check
      expect(summary.byStage["analyzeMeal"].calls).toBe(1);
      expect(summary.byStage["estimateNutrition"].calls).toBe(1);
      expect(summary.byStage["analyzeMeal"].totalCostUsd).toBe(0.000434);
      expect(summary.byStage["estimateNutrition"].totalCostUsd).toBe(0.000196);
    });

    it("handles retries distinctly without double-counting success calls", () => {
      const attempt1 = calculateApiCost({
        provider: "deepseek",
        model: "deepseek-flash",
        operation: "analyzeMeal",
        promptTokens: 1500,
        completionTokens: 0,
        latencyMs: 2000,
        status: "error",
        retryAttempt: 0,
      });

      const attempt2 = calculateApiCost({
        provider: "deepseek",
        model: "deepseek-flash",
        operation: "analyzeMeal",
        promptTokens: 1500,
        completionTokens: 800,
        latencyMs: 5000,
        status: "success",
        retryAttempt: 1,
      });

      const summary = aggregateApiCosts([attempt1, attempt2]);
      expect(summary.totalCalls).toBe(2);
      expect(summary.totalRetries).toBe(1);
      expect(summary.totalSuccessfulCalls).toBe(1);
      expect(summary.totalFailedCalls).toBe(1);
    });

    it("does not corrupt calculations when an unknown cost record is included", () => {
      const knownCall = calculateApiCost({
        provider: "deepseek",
        model: "deepseek-flash",
        operation: "analyzeMeal",
        promptTokens: 1000,
        completionTokens: 500,
        latencyMs: 2000,
      });

      const unknownCall = calculateApiCost({
        provider: "unknown-provider",
        model: "mystery-model",
        operation: "analyzeMeal",
        promptTokens: 1000,
        completionTokens: 500,
        latencyMs: 2000,
      });

      const summary = aggregateApiCosts([knownCall, unknownCall]);
      expect(summary.totalCalls).toBe(2);
      expect(summary.unknownCostCalls).toBe(1);
      expect(summary.totalCostUsd).toBe(knownCall.totalCostUsd);
      expect(Number.isNaN(summary.totalCostUsd)).toBe(false);
    });
  });

  // ── 6. Volume Projections ───────────────────────────────────────────────────

  describe("Volume Projections (projectVolumeCosts)", () => {
    it("projects 1K, 10K, and 100K operations in both USD and INR", () => {
      // Cost per meal = $0.00072 (~₹0.0605)
      const costPerMealUsd = 0.00072;
      const projections = projectVolumeCosts(costPerMealUsd, [1_000, 10_000, 100_000], 84.0);

      expect(projections).toHaveLength(3);

      // 1,000 meals
      expect(projections[0].volume).toBe(1_000);
      expect(projections[0].totalCostUsd).toBe(0.72);
      expect(projections[0].totalCostInr).toBe(60.48);

      // 10,000 meals
      expect(projections[1].volume).toBe(10_000);
      expect(projections[1].totalCostUsd).toBe(7.2);
      expect(projections[1].totalCostInr).toBe(604.8);

      // 100,000 meals
      expect(projections[2].volume).toBe(100_000);
      expect(projections[2].totalCostUsd).toBe(72);
      expect(projections[2].totalCostInr).toBe(6048);
    });
  });

  // ── 7. Display Formatters ───────────────────────────────────────────────────

  describe("Display Formatters", () => {
    it("formats USD and INR nicely", () => {
      expect(formatUsd(0.000452)).toBe("$0.000452");
      expect(formatInr(0.038)).toBe("₹0.038");
      expect(formatCostDual(0.000452, 0.038)).toBe("$0.000452 (₹0.038)");

      expect(formatUsd(null)).toBe("UNKNOWN");
      expect(formatInr(null)).toBe("UNKNOWN");
      expect(formatCostDual(null, null)).toBe("UNKNOWN");
    });
  });
});
