import { NextRequest, NextResponse } from "next/server";
import Groq, { toFile } from "groq-sdk";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export const runtime = "nodejs";

// Transcribe a spoken meal description, then estimate macros for each meal.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let transcript = "";

  try {
    const form = await req.formData();
    const audio = form.get("audio") as File | null;
    if (!audio) return NextResponse.json({ error: "No audio" }, { status: 400 });

    // ── 1. Transcribe ──
    const buf = Buffer.from(await audio.arrayBuffer());
    const type = audio.type || "audio/webm";
    const ext =
      type.includes("mp4") || type.includes("m4a") || type.includes("aac") ? "m4a"
      : type.includes("mpeg") || type.includes("mp3") ? "mp3"
      : type.includes("wav") ? "wav"
      : "webm";
    const file = await toFile(buf, `meal.${ext}`, { type });

    const tr = await groq.audio.transcriptions.create({
      file,
      model: "whisper-large-v3-turbo",
      language: "en",
      prompt: "A spoken description of food eaten, e.g. two rotis with dal and a bowl of curd.",
    });
    transcript = (tr.text ?? "").trim();

    if (!transcript) return NextResponse.json({ transcript: "", meals: [] });

    // ── 2. Parse + estimate macros ──
    const parsePrompt = `You are a precise Indian nutrition database. The user spoke what they ate.

TRANSCRIPT: "${transcript}"

REFERENCE VALUES (per item):
BREADS: Chapati plain 30g=80kcal/3P/15C/1F | Paratha plain=150/3/22/6 | Aloo paratha=200/5/28/8 | Naan=260/8/45/5 | Puri=120/2/14/6
RICE: Plain rice 150g=195/4/43/0.4 | Veg biryani 200g=280/6/45/8 | Chicken biryani 250g=380/22/45/12
DAL: Toor dal 200ml=150/10/25/2 | Dal makhani=240/11/25/12 | Rajma=200/13/30/3 | Chole=210/12/32/4
PANEER: Paneer raw 100g=265/18/3/20 | Palak paneer 200g=280/16/10/20 | Shahi paneer=350/16/12/28
DAIRY: Curd 100g=60/3/5/3 | Raita 150g=75/3/6/4 | Lassi sweet 250ml=180/7/28/5
EGGS: Boiled egg=78/6/0.6/5 | Egg bhurji 2eggs=220/13/5/16 | Omelette 2eggs=200/13/4/15
CHICKEN: Curry 150g=230/28/5/10 | Tikka 100g=160/26/4/5 | Butter chicken 200g=320/26/10/20
SOUTH INDIAN: Idli 1pc=40/1.5/8/0.2 | Dosa plain=130/3/24/2 | Masala dosa=210/5/32/7
BREAKFAST: Poha 150g=180/3/36/3 | Upma 150g=190/5/32/5 | Besan chilla 1pc=130/6/17/4

RULES:
- Group everything from ONE sitting into a SINGLE meal entry, combining (summing) the macros of all items, with a short descriptive name like "2 roti, dal & curd".
- Only split into multiple entries if the user clearly describes separate meals (e.g. "breakfast was… and lunch was…").
- Scale for quantities mentioned. Standard single serving if no quantity given.
- Return ONLY raw JSON, no markdown.

Return exactly this shape:
{"meals":[{"name":"2 roti, dal & curd","calories":420,"proteinG":18,"carbsG":60,"fatG":10,"fiberG":8}]}`;

    const completion = await groq.chat.completions.create({
      model: "qwen/qwen3.8-27b",
      messages: [{ role: "user", content: parsePrompt }],
      max_tokens: 600,
      temperature: 0,
    });

    const content = completion.choices[0].message.content ?? "{}";
    const cleaned = content.replace(/```(?:json)?\n?|\n?```/g, "").trim();

    let parsed: any;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("No JSON in parse response");
      parsed = JSON.parse(match[0]);
    }

    const rawMeals = Array.isArray(parsed.meals) ? parsed.meals : [];
    const meals = rawMeals
      .filter((m: any) => m && typeof m.name === "string" && m.name.trim())
      .map((m: any) => ({
        name: m.name.trim(),
        macros: {
          calories: Math.max(0, Math.round(Number(m.calories) || 0)),
          proteinG: Math.max(0, Math.round(Number(m.proteinG) || 0)),
          carbsG: Math.max(0, Math.round(Number(m.carbsG) || 0)),
          fatG: Math.max(0, Math.round(Number(m.fatG) || 0)),
          fiberG: Math.max(0, Math.round(Number(m.fiberG) || 0)),
        },
      }));

    return NextResponse.json({ transcript, meals });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Failed to process audio", transcript }, { status: 500 });
  }
}
