import * as fs from "fs";
import * as path from "path";
import OpenAI from "openai";

// Load .env manually
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
const apiKey = process.env.NEMOTRON_OMNI_API_KEY || process.env.NEMOTRON_API_KEY;
console.log("NEMOTRON Key found:", Boolean(apiKey));

const client = new OpenAI({
  apiKey,
  baseURL: process.env.NEMOTRON_BASE_URL || "https://openrouter.ai/api/v1",
});

async function testText() {
  console.log("\n--- Testing Text Request ---");
  try {
    const res = await client.chat.completions.create({
      model: process.env.NEMOTRON_VISION_MODEL || "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
      messages: [{ role: "user", content: "Say hello in JSON format: {\"greeting\": \"hello\"}" }],
      max_tokens: 1000,
    });
    console.log("Raw res object:", JSON.stringify(res, null, 2));
  } catch (err: any) {
    console.error("Text call error:", err?.status, err?.message);
  }
}

async function testImage() {
  console.log("\n--- Testing Full SATAT Vision Prompt on Image ---");
  const testPhoto = path.resolve(process.cwd(), "scripts", "photos", "Dosa.jpg");
  if (!fs.existsSync(testPhoto)) {
    console.log("Test photo not found at:", testPhoto);
    return;
  }
  const imgBase64 = fs.readFileSync(testPhoto).toString("base64");
  
  const systemPrompt = `You are an expert visual food classifier specializing in Indian cuisine.
Identify dishes and items in the photo. Do NOT calculate macros or calories.

CRITICAL RULES:
- For each visible food item, specify the name, approximate numeric quantity, and unit (e.g. piece, katori, bowl, plate, cup, tbsp, grams, serving).
- Candidates must be DISTINCT dishes with different calorie impacts. Return a numeric confidence from 0.0 to 1.0 for each candidate.
- Return up to 3 candidate dishes sorted by confidence descending.

Return ONLY raw JSON matching this schema:
{
  "foods": [
    {"name": "<dish or item name>", "quantity": <number>, "unit": "<piece|katori|plate|bowl|cup|g|serving>", "confidence": <float 0.0-1.0>}
  ],
  "candidates": [{"name": "<dish name>", "confidence": <float 0.0-1.0>}],
  "visibleItems": ["<item with approximate gram weight>"],
  "ambiguity": "low"|"medium"|"high",
  "notes": "<visual deduction explanation>"
}`;

  try {
    const res: any = await client.chat.completions.create({
      model: process.env.NEMOTRON_VISION_MODEL || "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            { type: "text", text: "Identify all visible food items with approximate quantities and units, and up to 3 candidate dishes." },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${imgBase64}`,
              },
            },
          ],
        },
      ],
      max_tokens: 1500,
      temperature: 0,
    });

    if (res.error) {
      console.error("OpenRouter inline error:", res.error);
      return;
    }

    const content = res.choices?.[0]?.message?.content;
    console.log("Full Model Response Content:\n", content);
    console.log("Usage:\n", res.usage);

    // Try parsing
    const cleaned = content.replace(/```(?:json)?\n?/g, "").replace(/\n?```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    console.log("Successfully parsed JSON!", JSON.stringify(parsed, null, 2));
  } catch (err: any) {
    console.error("Full vision call error:", err?.status, err?.message);
    if (err?.error) console.error("Error details:", JSON.stringify(err.error));
  }
}

async function listOpenRouterModels() {
  console.log("\n--- Listing Models on OpenRouter ---");
  try {
    const res = await fetch("https://openrouter.ai/api/v1/models");
    const json = await res.json();
    const matches = (json.data || []).filter((m: any) =>
      m.id.toLowerCase().includes("nemotron") ||
      m.id.toLowerCase().includes("nano") ||
      m.id.toLowerCase().includes("omni") ||
      m.id.toLowerCase().includes("nvidia")
    );
    console.log(`Found ${matches.length} matching models:`);
    matches.forEach((m: any) => {
      console.log(`ID: ${m.id} | Name: ${m.name} | Architecture: ${JSON.stringify(m.architecture?.modality || m.modality || "")}`);
    });
  } catch (err: any) {
    console.error("List models error:", err?.message);
  }
}

async function run() {
  await listOpenRouterModels();
  await testText();
  await testImage();
}

run();

