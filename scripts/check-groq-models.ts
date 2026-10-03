#!/usr/bin/env ts-node
/**
 * scripts/check-groq-models.ts
 *
 * Startup / CI check: fetches live model list from Groq API and warns
 * if any model ID configured in lib/ai/models.ts is missing.
 *
 * Exit code 0 = all models present (or API unreachable — non-fatal).
 * Exit code 1 = one or more configured models are missing from the live list.
 */

import * as https from "https";
import * as fs from "fs";
import * as path from "path";

// Load .env automatically if GROQ_API_KEY is not set in environment
if (!process.env.GROQ_API_KEY) {
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
}

const GROQ_MODELS_URL = "https://api.groq.com/openai/v1/models";

const CONFIGURED_MODELS: { id: string; feature: string }[] = [
  { id: process.env.GROQ_MODEL_ARIA                ?? "openai/gpt-oss-120b",     feature: "aria" },
  { id: process.env.GROQ_MODEL_ESTIMATE_MEAL        ?? "openai/gpt-oss-120b",     feature: "estimateMeal" },
  { id: process.env.GROQ_MODEL_VOICE_MEAL           ?? "openai/gpt-oss-120b",     feature: "voiceMeal" },
  { id: process.env.GROQ_MODEL_VOICE_WORKOUT        ?? "openai/gpt-oss-120b",     feature: "voiceWorkout" },
  { id: process.env.GROQ_MODEL_SUMMARIZE_NUTRITION  ?? "openai/gpt-oss-120b",     feature: "summarizeNutrition" },
  { id: process.env.GROQ_MODEL_SUMMARIZE_WORKOUT    ?? "openai/gpt-oss-120b",     feature: "summarizeWorkout" },
  { id: process.env.GROQ_MODEL_ANALYZE_MEAL         ?? "qwen/qwen3.8-27b",        feature: "analyzeMeal" },
  { id: process.env.GROQ_MODEL_TEXT_FALLBACK        ?? "openai/gpt-oss-20b",      feature: "textFallback" },
  { id: process.env.GROQ_MODEL_TRANSCRIPTION        ?? "whisper-large-v3-turbo", feature: "transcription" },
];

function httpGet(url: string, apiKey: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: { Authorization: `Bearer ${apiKey}` },
      timeout: 10_000,
    }, (res) => {
      let data = "";
      res.on("data", (chunk: Buffer) => (data += chunk.toString()));
      res.on("end", () => resolve(data));
    });
    req.on("error", reject);
    req.on("timeout", () => reject(new Error("Request timed out")));
  });
}

async function main(): Promise<void> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.warn("[check-groq-models] ⚠  GROQ_API_KEY not set — skipping model check");
    process.exit(0);
  }

  let liveIds: Set<string>;
  try {
    const body = await httpGet(GROQ_MODELS_URL, apiKey);
    const parsed = JSON.parse(body) as { data?: { id: string }[] };
    liveIds = new Set((parsed.data ?? []).map((m) => m.id));
  } catch (err) {
    console.warn(`[check-groq-models] ⚠  Could not fetch model list: ${(err as Error).message}`);
    process.exit(0);
  }

  const unique = Array.from(new Map(CONFIGURED_MODELS.map((m) => [m.id, m])).values());
  let missing = 0;

  for (const { id, feature } of unique) {
    if (liveIds.has(id)) {
      console.log(`[check-groq-models] ✅ ${id}  (${feature})`);
    } else {
      console.error(`[check-groq-models] ❌ MISSING: ${id}  (${feature}) — not in live model list`);
      missing++;
    }
  }

  if (missing > 0) {
    console.error(
      `\n[check-groq-models] ${missing} configured model(s) not found on Groq API. ` +
      `Check https://console.groq.com/docs/models and update lib/ai/models.ts or env vars.`,
    );
    process.exit(1);
  }

  console.log(`\n[check-groq-models] All ${unique.length} models are live. ✅`);
  process.exit(0);
}

main().catch((err) => {
  console.error("[check-groq-models] Unexpected error:", err);
  process.exit(1);
});

