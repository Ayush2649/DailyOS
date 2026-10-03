/**
 * scripts/verify-gemini-vision.ts
 *
 * Verifies production Gemini vision provider (analyzeMealWithGemini)
 * on at most 3 real photos. Reports tokens, cached tokens, and latency.
 * No loops.
 */

import * as fs from "fs";
import * as path from "path";
import sharp from "sharp";

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

import { analyzeMealWithGemini } from "../lib/ai/providers/gemini";

const TEST_PHOTOS = [
  "Aloo_ka_paratha.jpg",
  "Dal_Bhat_Tarkari_2.jpg",
  "Khichdi_(Khichrri).jpeg",
];

async function run() {
  console.log("=== VERIFYING GEMINI VISION PROVIDER (AT MOST 3 PHOTOS) ===\n");
  const photosDir = path.resolve(process.cwd(), "scripts", "photos");

  for (let i = 0; i < TEST_PHOTOS.length; i++) {
    const filename = TEST_PHOTOS[i];
    const filePath = path.join(photosDir, filename);

    if (!fs.existsSync(filePath)) {
      console.warn(`[SKIP] File not found: ${filePath}`);
      continue;
    }

    console.log(`[Photo ${i + 1}/${TEST_PHOTOS.length}] Analyzing: ${filename}`);

    const rawBuf = fs.readFileSync(filePath);
    const resizedBuf = await sharp(rawBuf)
      .resize(768, 768, { fit: "inside", withoutEnlargement: true })
      .flatten({ background: "#ffffff" })
      .jpeg({ quality: 75 })
      .toBuffer();

    const base64 = resizedBuf.toString("base64");
    const mimeType = "image/jpeg";

    const t0 = Date.now();
    try {
      const result = await analyzeMealWithGemini({
        base64,
        mimeType,
      });
      const wallLatency = Date.now() - t0;

      console.log(`  Top Dish:         ${result.candidates[0]?.name} (${result.candidates[0]?.confidence}, raw: ${result.candidates[0]?.rawConfidence?.toFixed(2)})`);
      console.log(`  All Candidates:   ${result.candidates.map((c: any) => `${c.name} [${c.confidence}]`).join(", ")}`);
      console.log(`  Visible Items:    ${result.visibleItems.join(", ")}`);
      console.log(`  Ambiguity:        ${result.ambiguity}`);
      console.log(`  Notes:            ${result.notes}`);
      console.log(`  Model Used:       ${result.model}`);
      console.log(`  Usage:`);
      console.log(`    - Prompt Tokens:     ${result.usage.promptTokens}`);
      console.log(`    - Completion Tokens: ${result.usage.completionTokens}`);
      console.log(`    - Thinking Tokens:   ${result.usage.thinkingTokens}`);
      console.log(`    - Cached Tokens:     ${result.usage.cachedTokens}`);
      console.log(`    - Total Tokens:      ${result.usage.totalTokens}`);
      console.log(`    - API Latency:       ${result.usage.latencyMs} ms`);
      console.log(`    - Total Latency:     ${wallLatency} ms\n`);
    } catch (err: any) {
      console.error(`  [RESULT/ERROR] on ${filename}:`, err?.message || err, "\n");
    }

    // Safety pause of 13s between calls for 5 RPM limit (if not last)
    if (i < TEST_PHOTOS.length - 1) {
      console.log("  Waiting 13s to respect free-tier rate limits...\n");
      await new Promise((r) => setTimeout(r, 13_000));
    }
  }

  console.log("=== VERIFICATION COMPLETE ===");
}

run().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
