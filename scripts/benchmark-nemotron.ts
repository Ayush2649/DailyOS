import * as fs from "fs";
import * as path from "path";

// Load .env
const envPath = path.resolve(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const match = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)?\s*$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = (match[2] || "").trim().replace(/^['"]|['"]$/g, "");
    }
  }
}

import { preprocessMealImage } from "../lib/ai/image-preprocessing";
import {
  analyzeMealWithNemotron,
  getCircuitBreakerState,
  resetCircuitBreaker,
} from "../lib/ai/providers/nemotron";
import { calculateMealNutrition } from "../lib/ai/nutrition/calculator";

export type FailureCategory =
  | "none"
  | "provider_failure"
  | "timeout"
  | "rate_capacity_failure"
  | "malformed_json"
  | "schema_failure";

export interface NemotronBenchmarkRecord {
  file: string;
  originalSizeBytes: number;
  preprocessedSizeBytes: number;
  preprocessLatencyMs: number;
  provider: string;
  model: string;
  modelLatencyMs: number;
  nutritionLatencyMs: number;
  totalLatencyMs: number;
  success: boolean;
  failureCategory: FailureCategory;
  error?: string;
  circuitBreakerOpen: boolean;
  foodsIdentified: string[];
  portionEstimates: string[];
  unknownFoods: string[];
  calories: number;
  macros: { proteinG: number; carbsG: number; fatG: number; fiberG: number };
  allFoodsVerified: boolean;
  manualReviewRequired: boolean;
  retryCount: number;
  promptTokens: number;
  completionTokens: number;
  reasoningTokens: number;
  totalTokens: number;
}

export async function runNemotronBenchmark(): Promise<NemotronBenchmarkRecord[]> {
  console.log("==================================================================");
  console.log("  NVIDIA NEMOTRON 3 NANO OMNI 30B (OPENROUTER) VISION BENCHMARK");
  console.log("==================================================================\n");

  resetCircuitBreaker();

  const apiKey = process.env.NEMOTRON_OMNI_API_KEY || process.env.NEMOTRON_API_KEY;
  if (!apiKey) {
    console.warn("⚠️  WARNING: NEMOTRON_OMNI_API_KEY is not set in environment or .env!");
    console.warn("   The benchmark will run and record this reality without faking data.\n");
  }

  const photosDir = path.resolve(process.cwd(), "scripts", "photos");
  const files = [
    "Aloo_ka_paratha.jpg",
    "Besan Cheela.jpg",
    "Dal_Bhat_Tarkari_2.jpg",
    "Dosa.jpg",
    "Idli_sambar_and_coconut_chutney.jpg",
    "Indori_Poha,_New_Delhi.jpg",
    "Khichdi_(Khichrri).jpeg",
    "Rajma_Chawal_from_India(1).jpg",
    "Roti-Sabzi-Raita.jpeg",
    "Sooji_Halwa_(Rava_Sheera).jpg",
    "Vegetable Pulao.jpeg",
  ];

  console.log(`Evaluating ${files.length} benchmark photos with identical pipeline:\n${files.map((f, i) => `  ${i + 1}. ${f}`).join("\n")}\n`);

  const results: NemotronBenchmarkRecord[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const filePath = path.join(photosDir, file);

    if (!fs.existsSync(filePath)) {
      console.warn(`File missing: ${filePath}`);
      continue;
    }

    const rawBuffer = fs.readFileSync(filePath);
    const rawBase64 = rawBuffer.toString("base64");
    const mimeType = file.endsWith(".png") ? "image/png" : "image/jpeg";

    console.log(`[${i + 1}/${files.length}] Testing ${file} (${(rawBuffer.length / 1024).toFixed(1)} KB)...`);

    const t0 = Date.now();
    let prepRes: any = null;
    let prepLatency = 0;

    // 1. Existing server image preprocessing (Sharp)
    try {
      const tp0 = Date.now();
      prepRes = await preprocessMealImage(rawBase64, mimeType);
      prepLatency = Date.now() - tp0;
    } catch (e: any) {
      console.error(`  Preprocess error for ${file}:`, e?.message);
      prepRes = { base64: rawBase64, mimeType, width: 0, height: 0, bytes: rawBuffer.length };
    }

    // 2. Stage 1: Call Nemotron Vision Provider
    const tm0 = Date.now();
    let visionRes: any = null;
    let visionErr: any = null;
    let modelLatency = 0;
    let failureCat: FailureCategory = "none";

    try {
      visionRes = await analyzeMealWithNemotron({
        base64: prepRes.base64,
        mimeType: prepRes.mimeType,
        userKey: `bench-${i}`,
      });
      modelLatency = Date.now() - tm0;
    } catch (err: any) {
      modelLatency = Date.now() - tm0;
      visionErr = err;
      const rootErr = (err as any)?.cause || err;
      const rootMsg = String(rootErr?.message || rootErr || "").toLowerCase();
      const outerMsg = String(err?.message || "").toLowerCase();
      const combined = `${outerMsg} ${rootMsg}`;

      if (
        combined.includes("resourceexhausted") ||
        combined.includes("worker local total request limit reached") ||
        combined.includes("429") ||
        combined.includes("rate limit") ||
        combined.includes("capacity")
      ) {
        failureCat = "rate_capacity_failure";
      } else if (
        combined.includes("timeout") ||
        combined.includes("timed out") ||
        rootErr?.name === "TimeoutError" ||
        err?.name === "TimeoutError"
      ) {
        failureCat = "timeout";
      } else if (
        combined.includes("json parse") ||
        combined.includes("not valid json") ||
        combined.includes("unexpected token") ||
        combined.includes("syntaxerror")
      ) {
        failureCat = "malformed_json";
      } else if (
        combined.includes("validation") ||
        combined.includes("zod") ||
        combined.includes("schema")
      ) {
        failureCat = "schema_failure";
      } else {
        failureCat = "provider_failure";
      }
    }

    // 3. Stage 2: Deterministic Nutrition Calculation
    let nutritionRes: any = null;
    let nutLatency = 0;
    if (visionRes) {
      const tn0 = Date.now();
      try {
        nutritionRes = calculateMealNutrition(visionRes.foods, visionRes.candidates[0]?.name || "Indian Dish");
        nutLatency = Date.now() - tn0;
      } catch (err: any) {
        console.error(`  Nutrition engine error for ${file}:`, err?.message);
      }
    }

    const totalLatency = Date.now() - t0;
    const isSuccess = Boolean(visionRes && nutritionRes);

    const rootCauseMsg = (visionErr as any)?.cause?.message || visionErr?.message;
    const sanitizedError = rootCauseMsg
      ? String(rootCauseMsg).slice(0, 120).replace(/\r?\n/g, " ")
      : undefined;

    const record: NemotronBenchmarkRecord = {
      file,
      originalSizeBytes: rawBuffer.length,
      preprocessedSizeBytes: prepRes.bytes,
      preprocessLatencyMs: prepLatency,
      provider: visionRes?.provider || "nemotron",
      model: visionRes?.model || (process.env.NEMOTRON_VISION_MODEL || "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free"),
      modelLatencyMs: modelLatency,
      nutritionLatencyMs: nutLatency,
      totalLatencyMs: totalLatency,
      success: isSuccess,
      failureCategory: isSuccess ? "none" : failureCat,
      error: sanitizedError,
      circuitBreakerOpen: getCircuitBreakerState(`bench-${i}`).isOpen,
      foodsIdentified: visionRes ? visionRes.foods.map((f: any) => `${f.name} (${f.quantity} ${f.unit})`) : [],
      portionEstimates: visionRes ? visionRes.visibleItems : [],
      unknownFoods: nutritionRes?.unknownFoods || [],
      calories: nutritionRes?.calories || 0,
      macros: {
        proteinG: nutritionRes?.proteinG || 0,
        carbsG: nutritionRes?.carbsG || 0,
        fatG: nutritionRes?.fatG || 0,
        fiberG: nutritionRes?.fiberG || 0,
      },
      allFoodsVerified: nutritionRes?.allFoodsVerified ?? false,
      manualReviewRequired: nutritionRes?.requiresManualReview ?? true,
      retryCount: 0,
      promptTokens: visionRes?.usage?.promptTokens || 0,
      completionTokens: visionRes?.usage?.completionTokens || 0,
      reasoningTokens: visionRes?.usage?.reasoningTokens || 0,
      totalTokens: visionRes?.usage?.totalTokens || 0,
    };

    results.push(record);

    if (isSuccess) {
      console.log(`  ✓ Success in ${totalLatency}ms (${modelLatency}ms model) | Cal: ${record.calories} | Foods: ${record.foodsIdentified.join(", ")}`);
      if (record.unknownFoods.length > 0) {
        console.log(`    ⚠️ Unknown foods requiring review: ${record.unknownFoods.join(", ")}`);
      }
    } else {
      console.log(`  ✗ FAILED in ${totalLatency}ms [${failureCat}]: ${record.error}`);
    }

    // Respect rate limits between photos (800ms)
    await new Promise((r) => setTimeout(r, 800));
  }

  // ── Summary Statistics ────────────────────────────────────────────────────────
  console.log("\n==================================================================");
  console.log("  NEMOTRON BENCHMARK SUMMARY");
  console.log("==================================================================");

  const successful = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);

  const latencies = successful.map((r) => r.modelLatencyMs).sort((a, b) => a - b);
  const medianLatency = latencies.length > 0 ? latencies[Math.floor(latencies.length / 2)] : 0;
  const p95Latency = latencies.length > 0 ? latencies[Math.min(latencies.length - 1, Math.floor(latencies.length * 0.95))] : 0;
  const maxLatency = latencies.length > 0 ? latencies[latencies.length - 1] : 0;

  console.log(`Evaluated: ${results.length}`);
  console.log(`Success:   ${successful.length} (${((successful.length / results.length) * 100).toFixed(1)}%)`);
  console.log(`Failed:    ${failed.length} (${((failed.length / results.length) * 100).toFixed(1)}%)`);

  const breakdown = {
    successful_analysis: successful.length,
    provider_failure: results.filter((r) => r.failureCategory === "provider_failure").length,
    timeout: results.filter((r) => r.failureCategory === "timeout").length,
    rate_capacity_failure: results.filter((r) => r.failureCategory === "rate_capacity_failure").length,
    malformed_json: results.filter((r) => r.failureCategory === "malformed_json").length,
    schema_failure: results.filter((r) => r.failureCategory === "schema_failure").length,
  };
  console.log(`Failure Breakdown:`, JSON.stringify(breakdown, null, 2));

  console.log(`Model Latency (ms):`);
  console.log(`  Median: ${medianLatency}ms`);
  console.log(`  P95:    ${p95Latency}ms`);
  console.log(`  Max:    ${maxLatency}ms`);

  const unknownFoodItems = results.flatMap((r) => r.unknownFoods);
  const manualReviewCount = results.filter((r) => r.manualReviewRequired).length;
  console.log(`Unknown Foods detected: ${unknownFoodItems.length}`);
  console.log(`Manual Review Required: ${manualReviewCount} / ${results.length}`);

  // Write raw JSON benchmark record
  const outPath = path.resolve(process.cwd(), "scripts", "nemotron-benchmark-results.json");
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
  console.log(`Raw results saved to: ${outPath}\n`);

  return results;
}

runNemotronBenchmark().catch(console.error);

