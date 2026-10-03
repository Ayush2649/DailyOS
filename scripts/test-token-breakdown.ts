import * as fs from "fs";
import * as path from "path";
import sharp from "sharp";
import Groq from "groq-sdk";

// Load .env
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

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Read the exact prompts from app/api/analyze-meal/route.ts
const routeCode = fs.readFileSync("app/api/analyze-meal/route.ts", "utf-8");
const sysMatch = routeCode.match(/const SYSTEM_PROMPT =\s*`([\s\S]*?)`;/);
const userMatch = routeCode.match(/const USER_PROMPT =\s*`([\s\S]*?)`;/);
const systemPrompt = sysMatch![1];
const userPrompt = userMatch![1];

async function runImageTest(imagePath: string, label: string, sizes: number[]) {
  console.log(`\n========================================================`);
  console.log(`Testing image: ${label} (${imagePath})`);
  console.log(`========================================================`);
  const rawBuf = fs.readFileSync(imagePath);

  for (const maxPx of sizes) {
    const resized = await sharp(rawBuf)
      .resize(maxPx, maxPx, { fit: "inside", withoutEnlargement: false })
      .jpeg({ quality: 85 })
      .toBuffer();

    const meta = await sharp(resized).metadata();
    const base64 = resized.toString("base64");

    const t0 = Date.now();
    try {
      const res = await groq.chat.completions.create({
        model: "qwen/qwen3.8-27b",
        reasoning_effort: "none",
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            content: [
              { type: "text", text: userPrompt },
              {
                type: "image_url",
                image_url: { url: `data:image/jpeg;base64,${base64}` },
              },
            ] as any,
          },
        ],
      });

      const latencyMs = Date.now() - t0;
      const usage = res.usage;
      const rawContent = res.choices[0]?.message?.content || "";
      let parsedName = "Unknown";
      try {
        const parsed = JSON.parse(rawContent);
        parsedName = parsed.name || "Unknown";
      } catch {
        parsedName = rawContent.slice(0, 50);
      }

      console.log(`[${maxPx}px] Actual: ${meta.width}x${meta.height} | File: ${(resized.length / 1024).toFixed(1)} KB`);
      console.log(`       promptTokens:     ${usage?.prompt_tokens}`);
      console.log(`       completionTokens: ${usage?.completion_tokens}`);
      console.log(`       totalTokens:      ${usage?.total_tokens}`);
      console.log(`       latency:          ${latencyMs} ms`);
      console.log(`       dish identified:  "${parsedName}"`);
    } catch (err: any) {
      console.error(`[${maxPx}px] ERROR:`, err.message);
    }

    // Delay slightly to prevent rate limits
    await new Promise((r) => setTimeout(r, 2000));
  }
}

async function main() {
  console.log("Measuring text-only prompt size...");
  const textOnlyRes = await groq.chat.completions.create({
    model: "qwen/qwen3.8-27b",
    reasoning_effort: "none",
    max_tokens: 10,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });
  console.log(`Text-only promptTokens: ${textOnlyRes.usage?.prompt_tokens}\n`);

  const thaliPath = "c:/Users/ayush/Downloads/images (1).jpeg";
  const parathaPath = "c:/Users/ayush/Downloads/images (2).jpeg";

  // Test 1: Thali photo at 512px, 768px, 1024px
  await runImageTest(thaliPath, "Indian Thali", [512, 768, 1024]);

  // Test 2: Paratha photo at 512px, 768px, 1024px
  await runImageTest(parathaPath, "Aloo Paratha / Roti", [512, 768, 1024]);
}

main().catch(console.error);
