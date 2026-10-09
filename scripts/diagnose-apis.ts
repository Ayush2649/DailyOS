#!/usr/bin/env ts-node
import * as path from "path";
import * as fs from "fs";

// Load environment variables from .env
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

async function testGemini() {
  console.log("=== TESTING GEMINI API ===");
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    console.log("GEMINI_API_KEY is NOT set!");
    return;
  }
  console.log("GEMINI_API_KEY is present (length:", key.length, ")");

  try {
    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey: key });

    // Test models
    const modelsToTest = [
      "gemini-3.8-flash",
      "gemini-3.7-flash",
      "gemini-2.5-flash",
      "gemini-2.0-flash",
      "gemini-1.5-flash"
    ];
    for (const m of modelsToTest) {
      console.log(`\nTesting Gemini model: ${m}...`);
      const t0 = Date.now();
      try {
        const res = await ai.models.generateContent({
          model: m,
          contents: "Say hello in 5 words",
        });
        const latency = Date.now() - t0;
        console.log(`✅ ${m} SUCCESS in ${latency}ms:`, res.text?.trim());
      } catch (err: any) {
        const latency = Date.now() - t0;
        console.error(`❌ ${m} FAILED in ${latency}ms: status=${err?.status} code=${err?.code} message=${err?.message || err}`);
      }
    }
  } catch (err) {
    console.error("Gemini SDK import error:", err);
  }
}

async function testGroq() {
  console.log("\n=== TESTING GROQ API ===");
  const key = process.env.GROQ_API_KEY;
  if (!key) {
    console.log("GROQ_API_KEY is NOT set!");
    return;
  }
  console.log("GROQ_API_KEY is present (length:", key.length, ")");

  try {
    const Groq = (await import("groq-sdk")).default;
    const groq = new Groq({ apiKey: key });

    const modelsToTest = [
      "openai/gpt-oss-120b",
      "openai/gpt-oss-20b",
      "qwen/qwen3.8-27b",
      "deepseek-r1-distill-llama-70b",
    ];
    for (const m of modelsToTest) {
      console.log(`\nTesting Groq model: ${m}...`);
      const t0 = Date.now();
      try {
        const res = await groq.chat.completions.create({
          model: m,
          messages: [{ role: "user", content: "Say hello in 5 words" }],
          max_tokens: 50,
        });
        const latency = Date.now() - t0;
        console.log(`✅ ${m} SUCCESS in ${latency}ms:`, res.choices[0]?.message?.content?.trim());
        console.log(`   Tokens: prompt=${res.usage?.prompt_tokens}, completion=${res.usage?.completion_tokens}`);
      } catch (err: any) {
        const latency = Date.now() - t0;
        console.error(`❌ ${m} FAILED in ${latency}ms: status=${err?.status} code=${err?.code} message=${err?.message || err}`);
      }
    }
  } catch (err) {
    console.error("Groq SDK error:", err);
  }
}

async function run() {
  await testGemini();
  await testGroq();
}

run().catch(console.error);

