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
import { analyzeMealWithGemini, getCircuitBreakerState, resetCircuitBreaker } from "../lib/ai/providers/gemini";
import { calculateMealNutrition } from "../lib/ai/nutrition/calculator";

interface BenchmarkRecord {
  file: string;
  originalSizeBytes: number;
  preprocessedSizeBytes: number;
  preprocessLatencyMs: number;
  model: string;
  modelLatencyMs: number;
  nutritionLatencyMs: number;
  totalLatencyMs: number;
  success: boolean;
  error?: string;
  circuitBreakerOpen: boolean;
  foodsIdentified: string[];
  unknownFoods: string[];
  confidence: string;
  calories: number;
}

async function runBenchmark() {
  console.log("=== RUNNING STRICT EVIDENCE BENCHMARK ON scripts/photos/ ===\n");
  resetCircuitBreaker();

  const photosDir = path.resolve(process.cwd(), "scripts", "photos");
  const files = fs.readdirSync(photosDir).filter(f => /\.(jpe?g|png)$/i.test(f));

  console.log(`Discovered ${files.length} test photos: ${files.join(", ")}\n`);

  const results: BenchmarkRecord[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const filePath = path.join(photosDir, file);
    const rawBuffer = fs.readFileSync(filePath);
    const rawBase64 = rawBuffer.toString("base64");
    const mimeType = file.endsWith(".png") ? "image/png" : "image/jpeg";

    console.log(`[${i + 1}/${files.length}] Processing ${file} (${(rawBuffer.length / 1024).toFixed(1)} KB)...`);

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
        model: "N/A",
        modelLatencyMs: 0,
        nutritionLatencyMs: 0,
        totalLatencyMs: Date.now() - t0,
        success: false,
        error: `Preprocessing: ${err.message}`,
        circuitBreakerOpen: getCircuitBreakerState().isOpen,
        foodsIdentified: [],
        unknownFoods: [],
        confidence: "none",
        calories: 0,
      });
      continue;
    }

    // Call analyzeMealWithGemini
    let visionRes: any = null;
    let modelLatency = 0;
    let modelName = process.env.GEMINI_VISION_MODEL || "gemini-3.8-flash";
    let errorMsg: string | undefined;

    const tv0 = Date.now();
    try {
      visionRes = await analyzeMealWithGemini({
        base64: prepRes.base64,
        mimeType: prepRes.mimeType,
      });
      modelLatency = Date.now() - tv0;
      modelName = visionRes.model;
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
    const cbState = getCircuitBreakerState();

    const record: BenchmarkRecord = {
      file,
      originalSizeBytes: rawBuffer.length,
      preprocessedSizeBytes: prepRes.processedSizeBytes,
      preprocessLatencyMs: prepLatency,
      model: modelName,
      modelLatencyMs: modelLatency,
      nutritionLatencyMs: nutritionLatency,
      totalLatencyMs: totalLatency,
      success: Boolean(visionRes),
      error: errorMsg,
      circuitBreakerOpen: cbState.isOpen,
      foodsIdentified: visionRes ? visionRes.foods.map((f: any) => `${f.name} (${f.quantity} ${f.unit})`) : [],
      unknownFoods: nutritionRes ? nutritionRes.unknownFoods : [],
      confidence: visionRes ? (visionRes.candidates[0]?.confidence || "unknown") : "none",
      calories: nutritionRes ? nutritionRes.calories : 0,
    };

    results.push(record);
    console.log(`  -> Status: ${record.success ? "SUCCESS" : "FAIL"} | Model: ${record.model} (${record.modelLatencyMs}ms) | Total: ${record.totalLatencyMs}ms | Preprocessed: ${(record.preprocessedSizeBytes / 1024).toFixed(1)} KB`);

    // Pause between calls to avoid bursting free tier
    if (i < files.length - 1) {
      console.log("  Pausing 13s for rate limit pacing...");
      await new Promise(r => setTimeout(r, 13000));
    }
  }

  console.log("\n================ BENCHMARK SUMMARY ================");
  console.log(JSON.stringify(results, null, 2));

  // Compute aggregate statistics
  const total = results.length;
  const successes = results.filter(r => r.success);
  const failures = results.filter(r => !r.success);

  const latencies = results.map(r => r.totalLatencyMs).sort((a, b) => a - b);
  const avgLatency = latencies.reduce((a, b) => a + b, 0) / (total || 1);
  const medianLatency = latencies[Math.floor(latencies.length / 2)] || 0;
  const p95Latency = latencies[Math.floor(latencies.length * 0.95)] || 0;
  const maxLatency = Math.max(...latencies, 0);

  const avgPreprocessLatency = results.reduce((a, b) => a + b.preprocessLatencyMs, 0) / (total || 1);
  const avgNutritionLatency = successes.reduce((a, b) => a + b.nutritionLatencyMs, 0) / (successes.length || 1);

  const avgOriginalSize = results.reduce((a, b) => a + b.originalSizeBytes, 0) / (total || 1);
  const avgProcessedSize = results.reduce((a, b) => a + b.preprocessedSizeBytes, 0) / (total || 1);

  console.log("\n--- AGGREGATE METRICS ---");
  console.log(`Total Images Evaluated: ${total}`);
  console.log(`Success Rate: ${((successes.length / total) * 100).toFixed(1)}% (${successes.length}/${total})`);
  console.log(`Failure Rate: ${((failures.length / total) * 100).toFixed(1)}% (${failures.length}/${total})`);
  console.log(`Average Latency: ${avgLatency.toFixed(0)} ms`);
  console.log(`Median Latency: ${medianLatency} ms`);
  console.log(`P95 Latency: ${p95Latency} ms`);
  console.log(`Max Latency: ${maxLatency} ms`);
  console.log(`Average Preprocessing Latency: ${avgPreprocessLatency.toFixed(1)} ms`);
  console.log(`Average Nutrition Calculation Latency: ${avgNutritionLatency.toFixed(2)} ms`);
  console.log(`Average Original Image Size: ${(avgOriginalSize / 1024).toFixed(1)} KB`);
  console.log(`Average Preprocessed Image Size: ${(avgProcessedSize / 1024).toFixed(1)} KB`);
  console.log(`Payload Reduction: ${(((avgOriginalSize - avgProcessedSize) / avgOriginalSize) * 100).toFixed(1)}%`);
}

runBenchmark().catch(console.error);

