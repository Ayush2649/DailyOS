/**
 * scripts/benchmark-phase-2b.ts
 *
 * Real-Provider Integration Benchmark for Phase 2B.
 * Runs the 11 benchmark photos through the actual /api/analyze-meal pipeline with real DeepSeek API.
 */

import { describe, it, expect, vi } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { NextRequest } from "next/server";

// Ensure .env is loaded
const envPath = path.resolve(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const match = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)?\s*$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = (match[2] || "").trim().replace(/^['"]|['"]$/g, "");
    }
  }
}

// Force provider to deepseek
process.env.MEAL_VISION_PROVIDER = "deepseek";

// Mock ONLY next-auth to provide an authenticated session (DeepSeek and pipeline remain 100% real)
vi.mock("next-auth", () => ({
  getServerSession: vi.fn().mockResolvedValue({
    user: { id: "benchmark-user", email: "benchmark@dailyos.internal" },
  }),
}));

import { POST as analyzeMealPOST } from "@/app/api/analyze-meal/route";

export interface FoodBenchmarkDetail {
  name: string;
  confidence: number;
  nutritionStatus: "verified" | "estimated" | "unresolved";
  calories: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  fiberG: number | null;
  source: string;
  verified: boolean;
  unresolved: boolean;
  sentToAi: boolean;
}

export interface MealBenchmarkResult {
  file: string;
  expectedDish: string;
  status: number;
  totalLatencyMs: number;
  primaryCandidate: string;
  detectedFoods: string[];
  foods: FoodBenchmarkDetail[];
  totalCalories: number;
  totalProteinG: number;
  totalCarbsG: number;
  totalFatG: number;
  totalFiberG: number;
  requiresManualReview: boolean;
  hasIncompleteNutrition: boolean;
  estimatedCount: number;
  verifiedCount: number;
  unresolvedCount: number;
  providerCalls: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
  retries: number;
  errors: string[];
  classifications: string[];
}

describe("Phase 2B Real-Provider Benchmark", () => {
  it("executes all 11 benchmark photos through real /api/analyze-meal pipeline", async () => {
    const photosDir = path.resolve(process.cwd(), "scripts", "photos");
    const testCases = [
      { file: "Aloo_ka_paratha.jpg", expected: "Aloo Paratha" },
      { file: "Besan Cheela.jpg", expected: "Besan Cheela + Curd" },
      { file: "Dal_Bhat_Tarkari_2.jpg", expected: "Dal Bhat Tarkari" },
      { file: "Dosa.jpg", expected: "Dosa" },
      { file: "Idli_sambar_and_coconut_chutney.jpg", expected: "Idli + Sambar + Rasam" },
      { file: "Indori_Poha,_New_Delhi.jpg", expected: "Indori Poha + Onion Pakora + Curd" },
      { file: "Khichdi_(Khichrri).jpeg", expected: "Khichdi" },
      { file: "Rajma_Chawal_from_India(1).jpg", expected: "Rajma Chawal + Salad" },
      { file: "Roti-Sabzi-Raita.jpeg", expected: "Roti + Cucumber Raita + Dal" },
      { file: "Sooji_Halwa_(Rava_Sheera).jpg", expected: "Sooji Halwa" },
      { file: "Vegetable Pulao.jpeg", expected: "Vegetable Pulao" },
    ];

    const results: MealBenchmarkResult[] = [];

    // Spy on console.info to capture structured ai_usage telemetry
    const originalInfo = console.info;
    const originalWarn = console.warn;
    const originalError = console.error;

    for (let i = 0; i < testCases.length; i++) {
      const tc = testCases[i];
      const filePath = path.join(photosDir, tc.file);

      if (!fs.existsSync(filePath)) {
        throw new Error(`Benchmark photo missing: ${filePath}`);
      }

      const rawBuffer = fs.readFileSync(filePath);
      const rawBase64 = rawBuffer.toString("base64");
      const mimeType = tc.file.endsWith(".png") ? "image/png" : "image/jpeg";

      console.log(`\n[${i + 1}/${testCases.length}] Testing ${tc.file} (${tc.expected})...`);

      // Intercept telemetry logs for this run
      const telemetryEvents: any[] = [];
      const warnings: string[] = [];
      const errors: string[] = [];

      console.info = (...args: any[]) => {
        try {
          if (typeof args[0] === "string" && args[0].includes('"type":"ai_usage"')) {
            telemetryEvents.push(JSON.parse(args[0]));
          }
        } catch {}
        originalInfo(...args);
      };

      console.warn = (...args: any[]) => {
        warnings.push(args.map((a) => (typeof a === "object" ? JSON.stringify(a) : String(a))).join(" "));
        originalWarn(...args);
      };

      console.error = (...args: any[]) => {
        errors.push(args.map((a) => (typeof a === "object" ? JSON.stringify(a) : String(a))).join(" "));
        originalError(...args);
      };

      const t0 = Date.now();
      let status = 500;
      let body: any = null;

      try {
        const req = new NextRequest("http://localhost:3000/api/analyze-meal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageBase64: rawBase64,
            mimeType,
          }),
        });

        const res = await analyzeMealPOST(req);
        status = res.status;
        body = await res.json();
      } catch (err: any) {
        errors.push(`Pipeline error: ${err.message}`);
      } finally {
        console.info = originalInfo;
        console.warn = originalWarn;
        console.error = originalError;
      }

      const latency = Date.now() - t0;
      console.log(`  -> HTTP ${status} in ${latency}ms`);
      if (body) {
        console.log(`  -> Dish: "${body.name}", Cals: ${body.calories}, Verified: ${body.verifiedCount}, Estimated: ${body.estimatedCount}, Unresolved: ${body.unresolvedCount}`);
      }

      // Aggregate telemetry
      let promptTokens = 0;
      let completionTokens = 0;
      let totalTokens = 0;
      let estimatedCostUsd = 0;
      let retries = 0;

      for (const ev of telemetryEvents) {
        promptTokens += ev.promptTokens ?? 0;
        completionTokens += ev.completionTokens ?? 0;
        totalTokens += ev.totalTokens ?? 0;
        estimatedCostUsd += ev.estimatedCostUsd ?? 0;
        retries += ev.retries ?? 0;
      }

      const providerCalls = telemetryEvents.length;

      // Extract foods details
      const foodDetails: FoodBenchmarkDetail[] = [];
      const classifications: string[] = [];

      if (body && Array.isArray(body.foods)) {
        for (const f of body.foods) {
          const isUnresolved = f.nutritionStatus === "unresolved";
          const isEstimated = f.nutritionStatus === "estimated";
          const isVerified = f.nutritionStatus === "verified";
          const sentToAi = isEstimated || (isUnresolved && f.source === "unresolved");

          foodDetails.push({
            name: f.name,
            confidence: f.confidence,
            nutritionStatus: f.nutritionStatus,
            calories: f.calories,
            proteinG: f.proteinG,
            carbsG: f.carbsG,
            fatG: f.fatG,
            fiberG: f.fiberG,
            source: f.source,
            verified: f.verified,
            unresolved: isUnresolved,
            sentToAi,
          });

          if (isVerified) {
            classifications.push("B. Canonical database match");
          } else if (isEstimated) {
            classifications.push("C. AI-estimated successfully");
          } else {
            classifications.push("F. Unresolved");
          }
        }
      }

      if (body?.requiresManualReview) {
        classifications.push("G. User/manual review required");
      }

      results.push({
        file: tc.file,
        expectedDish: tc.expected,
        status,
        totalLatencyMs: latency,
        primaryCandidate: body?.name || "Unknown",
        detectedFoods: foodDetails.map((f) => f.name),
        foods: foodDetails,
        totalCalories: body?.calories ?? 0,
        totalProteinG: body?.proteinG ?? 0,
        totalCarbsG: body?.carbsG ?? 0,
        totalFatG: body?.fatG ?? 0,
        totalFiberG: body?.fiberG ?? 0,
        requiresManualReview: body?.requiresManualReview ?? true,
        hasIncompleteNutrition: body?.hasIncompleteNutrition ?? true,
        estimatedCount: body?.estimatedCount ?? 0,
        verifiedCount: body?.verifiedCount ?? 0,
        unresolvedCount: body?.unresolvedCount ?? 0,
        providerCalls,
        promptTokens,
        completionTokens,
        totalTokens,
        estimatedCostUsd: Math.round(estimatedCostUsd * 100000) / 100000,
        retries,
        errors,
        classifications: Array.from(new Set(classifications)),
      });

      // Brief delay between requests to be gentle on rate limits
      await new Promise((r) => setTimeout(r, 800));
    }

    // Write raw results JSON
    const resultsJsonPath = path.resolve(process.cwd(), "scripts", "phase-2b-benchmark-results.json");
    fs.writeFileSync(resultsJsonPath, JSON.stringify(results, null, 2), "utf-8");
    console.log(`\nRaw results saved to: ${resultsJsonPath}`);

    expect(results).toHaveLength(11);
    const successCount = results.filter((r) => r.status === 200).length;
    expect(successCount).toBe(11);
  }, 600000);
});
