#!/usr/bin/env ts-node
/**
 * scripts/diagnose-pipeline.ts
 *
 * Comprehensive diagnostic harness for the Estimate Meal / Analyze Meal pipeline.
 * Measures latency, tokens, retries, and failure reasons across all 10 images in scripts/photos/.
 */

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

import sharp from "sharp";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import Groq from "groq-sdk";
import { estimateMealMacros } from "../lib/ai/nutrition-calculator";

const PHOTOS_DIR = path.resolve(process.cwd(), "scripts/photos");
const LABELS_FILE = path.join(PHOTOS_DIR, "labels.json");

interface DiagnosticRecord {
  file: string;
  originalSizeBytes: number;
  downscaledSizeBytes: number;
  downscaleTimeMs: number;
  downscaleError?: string;
  provider: string;
  model: string;
  stage1LatencyMs: number;
  stage1Success: boolean;
  stage1Error?: string;
  stage1Retries: number;
  stage1Tokens?: { prompt: number; completion: number; total: number };
  stage1FinishReason?: string;
  schemaValid: boolean;
  stage2LatencyMs: number;
  stage2Success: boolean;
  stage2Error?: string;
  stage2Tokens?: { prompt: number; completion: number; total: number };
  totalLatencyMs: number;
  overallSuccess: boolean;
}

// Downscale with the bug in route.ts: flatten({ background: "var(--surface-0)" })
async function downscaleWithRouteBug(buf: Buffer): Promise<{ buf: Buffer; timeMs: number; error?: string }> {
  const t0 = Date.now();
  try {
    const resized = await sharp(buf)
      .resize(768, 768, { fit: "inside", withoutEnlargement: true })
      .flatten({ background: "var(--surface-0)" as any })
      .jpeg({ quality: 75 })
      .toBuffer();
    return { buf: resized, timeMs: Date.now() - t0 };
  } catch (err: any) {
    return { buf, timeMs: Date.now() - t0, error: err.message };
  }
}

// Downscale with correct background color: flatten({ background: "#ffffff" })
async function downscaleFixed(buf: Buffer): Promise<{ buf: Buffer; timeMs: number }> {
  const t0 = Date.now();
  const resized = await sharp(buf)
    .resize(768, 768, { fit: "inside", withoutEnlargement: true })
    .flatten({ background: "#ffffff" })
    .jpeg({ quality: 75 })
    .toBuffer();
  return { buf: resized, timeMs: Date.now() - t0 };
}

async function runDiagnosis() {
  console.log("===============================================================");
  console.log("   ESTIMATE MEAL PIPELINE RECONNAISSANCE & DIAGNOSIS HARNESS   ");
  console.log("===============================================================\n");

  const labels = JSON.parse(fs.readFileSync(LABELS_FILE, "utf-8")) as Array<{ file: string }>;
  const testImages = labels.slice(0, 10);

  console.log(`Found ${testImages.length} test images in dataset.\n`);

  // 1. Diagnose Image Preprocessing on all 10 images
  console.log("--- STAGE 1: IMAGE PREPROCESSING & COMPRESSION DIAGNOSIS ---");
  for (const item of testImages) {
    const filePath = path.join(PHOTOS_DIR, item.file);
    if (!fs.existsSync(filePath)) continue;
    const rawBuf = fs.readFileSync(filePath);

    const bugResult = await downscaleWithRouteBug(rawBuf);
    const fixedResult = await downscaleFixed(rawBuf);

    console.log(`\nImage: ${item.file}`);
    console.log(`  Raw File Size: ${(rawBuf.length / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  Route.ts Downscale Result: ${bugResult.error ? `FAILED (${bugResult.error}) -> Size: ${(bugResult.buf.length / 1024 / 1024).toFixed(2)} MB (UNCOMPRESSED!)` : "SUCCESS"}`);
    console.log(`  Fixed Downscale Result: ${(fixedResult.buf.length / 1024).toFixed(1)} KB in ${fixedResult.timeMs}ms (Compression ratio: ${((1 - fixedResult.buf.length / rawBuf.length) * 100).toFixed(1)}%)`);
  }

  // 2. Test Live Gemini Provider on 3 sample images
  console.log("\n--- STAGE 2: LIVE GEMINI PROVIDER CALL DIAGNOSIS ---");
  const geminiKey = process.env.GEMINI_API_KEY!;
  const ai = new GoogleGenAI({ apiKey: geminiKey });

  for (const item of testImages.slice(0, 3)) {
    const filePath = path.join(PHOTOS_DIR, item.file);
    const rawBuf = fs.readFileSync(filePath);
    const fixed = await downscaleFixed(rawBuf);
    const base64 = fixed.buf.toString("base64");

    console.log(`\nTesting Gemini on ${item.file}...`);
    for (const model of ["gemini-3.8-flash", "gemini-3.7-flash"]) {
      const t0 = Date.now();
      try {
        const resp = await ai.models.generateContent({
          model,
          contents: [
            "Identify food items and dishes in this image as JSON: { candidates: [{name, confidence}], visibleItems: [] }",
            { inlineData: { data: base64, mimeType: "image/jpeg" } }
          ],
          config: {
            responseMimeType: "application/json",
            abortSignal: AbortSignal.timeout(15_000), // 15s timeout
          }
        });
        const lat = Date.now() - t0;
        console.log(`  ✅ ${model}: SUCCESS in ${lat}ms`);
      } catch (err: any) {
        const lat = Date.now() - t0;
        console.log(`  ❌ ${model}: FAILED in ${lat}ms: status=${err?.status} message=${err?.message || err}`);
      }
    }
  }

  // 3. Test Groq Qwen Vision on 3 sample images
  console.log("\n--- STAGE 3: LIVE GROQ QWEN VISION DIAGNOSIS ---");
  const groqKey = process.env.GROQ_API_KEY!;
  const groq = new Groq({ apiKey: groqKey });

  for (const item of testImages.slice(0, 3)) {
    const filePath = path.join(PHOTOS_DIR, item.file);
    const rawBuf = fs.readFileSync(filePath);
    const fixed = await downscaleFixed(rawBuf);
    const base64 = fixed.buf.toString("base64");

    console.log(`\nTesting Groq qwen/qwen3.8-27b on ${item.file}...`);
    const t0 = Date.now();
    try {
      const resp = await groq.chat.completions.create({
        model: "qwen/qwen3.8-27b",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "Identify food items and dishes in this image as JSON: { candidates: [{name, confidence}], visibleItems: [] }" },
              { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64}` } },
            ] as any,
          }
        ],
        response_format: { type: "json_object" },
        max_tokens: 500,
      });
      const lat = Date.now() - t0;
      console.log(`  ✅ qwen/qwen3.8-27b: SUCCESS in ${lat}ms`);
      console.log(`     Usage: prompt=${resp.usage?.prompt_tokens}, completion=${resp.usage?.completion_tokens}, total=${resp.usage?.total_tokens}`);
      console.log(`     Response snippet:`, resp.choices[0]?.message?.content?.slice(0, 100));
    } catch (err: any) {
      const lat = Date.now() - t0;
      console.log(`  ❌ qwen/qwen3.8-27b: FAILED in ${lat}ms: status=${err?.status} message=${err?.message || err}`);
    }
  }

  // 4. Test Stage 2 Macro Calculator
  console.log("\n--- STAGE 4: STAGE 2 NUTRITION CALCULATOR (openai/gpt-oss-120b) ---");
  const sampleDishes = [
    "Aloo Paratha: 2 parathas ~100g, dahi ~50g",
    "Dal Makhani with 2 Plain Roti",
    "Indori Poha with sev ~150g",
  ];
  for (const dish of sampleDishes) {
    const t0 = Date.now();
    try {
      const macros = await estimateMealMacros(dish);
      const lat = Date.now() - t0;
      console.log(`  ✅ "${dish}": SUCCESS in ${lat}ms -> ${macros.calories} kcal (P: ${macros.proteinG}g, C: ${macros.carbsG}g, F: ${macros.fatG}g, Fib: ${macros.fiberG}g)`);
    } catch (err: any) {
      const lat = Date.now() - t0;
      console.log(`  ❌ "${dish}": FAILED in ${lat}ms: ${err?.message || err}`);
    }
  }

  console.log("\n===============================================================");
  console.log("   DIAGNOSIS COMPLETE                                          ");
  console.log("===============================================================\n");
}

runDiagnosis().catch(console.error);

