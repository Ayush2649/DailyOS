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
  analyzeMealWithDeepSeek,
  getCircuitBreakerState,
  resetCircuitBreaker,
} from "../lib/ai/providers/deepseek";
import { calculateMealNutrition } from "../lib/ai/nutrition/calculator";

export interface DeepSeekBenchmarkRecord {
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
  error?: string;
  circuitBreakerOpen: boolean;
  foodsIdentified: string[];
  portionEstimates: string[];
  unknownFoods: string[];
  calories: number;
  macros: { proteinG: number; carbsG: number; fatG: number; fiberG: number };
  manualCorrectionRequired: boolean;
  retryCount: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
}

async function runBenchmark() {
  console.log("==================================================================");
  console.log("  DEEPSEEK V4.1 FLASH (deepseek-flash) VISION BENCHMARK");
  console.log("==================================================================\n");

  resetCircuitBreaker();

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    console.warn("⚠️  WARNING: DEEPSEEK_API_KEY is not set in environment or .env!");
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

  console.log(`Evaluating ${files.length} benchmark photos:\n${files.map((f, i) => `  ${i + 1}. ${f}`).join("\n")}\n`);

  const results: DeepSeekBenchmarkRecord[] = [];

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

    try {
      const tp0 = Date.now();
      prepRes = await preprocessMealImage(rawBase64, mimeType);
      prepLatency = Date.now() - tp0;
    } catch (err: any) {
      console.error(`  Preprocessing error: ${err.message}`);
      results.push({
        file,
        originalSizeBytes: rawBuffer.length,
        preprocessedSizeBytes: 0,
        preprocessLatencyMs: Date.now() - t0,
        provider: "deepseek",
        model: "deepseek-flash",
        modelLatencyMs: 0,
        nutritionLatencyMs: 0,
        totalLatencyMs: Date.now() - t0,
        success: false,
        error: `Preprocessing: ${err.message}`,
        circuitBreakerOpen: getCircuitBreakerState().isOpen,
        foodsIdentified: [],
        portionEstimates: [],
        unknownFoods: [],
        calories: 0,
        macros: { proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0 },
        manualCorrectionRequired: true,
        retryCount: 0,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        estimatedCostUsd: 0,
      });
      continue;
    }

    // Call DeepSeek vision
    let visionRes: any = null;
    let modelLatency = 0;
    let errorMsg: string | undefined;

    const tv0 = Date.now();
    try {
      visionRes = await analyzeMealWithDeepSeek({
        base64: prepRes.base64,
        mimeType: prepRes.mimeType,
        userKey: `bench-${i}`, // isolate per photo so breaker doesn't halt entire benchmark on key missing
      });
      modelLatency = Date.now() - tv0;
    } catch (err: any) {
      modelLatency = Date.now() - tv0;
      errorMsg = err.message || String(err);
      console.warn(`  Vision error: ${errorMsg}`);
    }

    let nutritionLatency = 0;
    let nutritionRes: any = null;

    if (visionRes) {
      const tn0 = Date.now();
      nutritionRes = calculateMealNutrition(visionRes.foods, visionRes.candidates[0]?.name);
      nutritionLatency = Date.now() - tn0;
    }

    const totalLatency = Date.now() - t0;
    const cbState = getCircuitBreakerState(`bench-${i}`);

    const record: DeepSeekBenchmarkRecord = {
      file,
      originalSizeBytes: rawBuffer.length,
      preprocessedSizeBytes: prepRes.processedSizeBytes,
      preprocessLatencyMs: prepLatency,
      provider: "deepseek",
      model: visionRes?.model || process.env.DEEPSEEK_VISION_MODEL || "deepseek-flash",
      modelLatencyMs: modelLatency,
      nutritionLatencyMs: nutritionLatency,
      totalLatencyMs: totalLatency,
      success: Boolean(visionRes),
      error: errorMsg,
      circuitBreakerOpen: cbState.isOpen,
      foodsIdentified: visionRes ? visionRes.foods.map((f: any) => f.name) : [],
      portionEstimates: visionRes ? visionRes.foods.map((f: any) => `${f.quantity} ${f.unit}`) : [],
      unknownFoods: nutritionRes ? nutritionRes.unknownFoods : [],
      calories: nutritionRes ? nutritionRes.calories : 0,
      macros: nutritionRes
        ? {
            proteinG: nutritionRes.proteinG,
            carbsG: nutritionRes.carbsG,
            fatG: nutritionRes.fatG,
            fiberG: nutritionRes.fiberG,
          }
        : { proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0 },
      manualCorrectionRequired: Boolean(
        !visionRes ||
          (nutritionRes && (!nutritionRes.allFoodsVerified || nutritionRes.requiresManualReview || nutritionRes.unknownFoods.length > 0))
      ),
      retryCount: 0,
      promptTokens: visionRes?.usage?.promptTokens || 0,
      completionTokens: visionRes?.usage?.completionTokens || 0,
      totalTokens: visionRes?.usage?.totalTokens || 0,
      estimatedCostUsd: visionRes?.usage?.estimatedCostUsd || 0,
    };

    results.push(record);
    console.log(
      `  -> Status: ${record.success ? "SUCCESS" : "FAIL"} | Model: ${record.model} (${record.modelLatencyMs}ms) | Total: ${record.totalLatencyMs}ms`
    );

    // Brief pacing delay between benchmark requests
    if (i < files.length - 1) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  console.log("\n==================== BENCHMARK RESULTS TABLE ====================");
  console.log(JSON.stringify(results, null, 2));

  // Compute aggregate statistics
  const total = results.length;
  const successes = results.filter((r) => r.success);
  const failures = results.filter((r) => !r.success);

  const latencies = results.map((r) => r.totalLatencyMs).sort((a, b) => a - b);
  const avgLatency = latencies.reduce((a, b) => a + b, 0) / (total || 1);
  const medianLatency = latencies[Math.floor(latencies.length / 2)] || 0;
  const p95Latency = latencies[Math.floor(latencies.length * 0.95)] || 0;
  const maxLatency = Math.max(...latencies, 0);

  const unknownFoodScans = results.filter((r) => r.unknownFoods.length > 0);
  const unknownFoodRate = (unknownFoodScans.length / (total || 1)) * 100;

  const retryScans = results.filter((r) => r.retryCount > 0);
  const retryRate = (retryScans.length / (total || 1)) * 100;

  const totalCost = results.reduce((a, b) => a + b.estimatedCostUsd, 0);
  const avgCost = totalCost / (total || 1);
  const costPerSuccess = successes.length > 0 ? totalCost / successes.length : 0;

  console.log("\n==================== AGGREGATE SUMMARY ====================");
  console.log(`Total Photos: ${total}`);
  console.log(`Success Rate: ${((successes.length / total) * 100).toFixed(1)}% (${successes.length}/${total})`);
  console.log(`Median Latency: ${medianLatency} ms`);
  console.log(`P95 Latency: ${p95Latency} ms`);
  console.log(`Max Latency: ${maxLatency} ms`);
  console.log(`Unknown-Food Rate: ${unknownFoodRate.toFixed(1)}%`);
  console.log(`Retry Rate: ${retryRate.toFixed(1)}%`);
  console.log(`Average Cost: $${avgCost.toFixed(5)}`);
  console.log(`Cost Per Successful Scan: $${costPerSuccess.toFixed(5)}`);
}

runBenchmark().catch(console.error);

