import { NextRequest, NextResponse } from "next/server";
import Groq, { toFile } from "groq-sdk";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { callJsonStrict, AiError } from "@/lib/ai/groq";
import { TRANSCRIPTION_MODEL, MODELS, MAX_TOKENS } from "@/lib/ai/models";

export const runtime = "nodejs";
export const maxDuration = 30;

// ── Zod schemas ────────────────────────────────────────────────────────────────

const MealItemSchema = z.object({
  name:     z.string().min(1),
  calories: z.number().int().nonnegative(),
  proteinG: z.number().int().nonnegative(),
  carbsG:   z.number().int().nonnegative(),
  fatG:     z.number().int().nonnegative(),
  fiberG:   z.number().int().nonnegative(),
});

const VoiceMealSchema = z.object({
  meals: z.array(MealItemSchema),
});

// ── Transcription (shared Groq client for audio API) ──────────────────────────

function groqForAudio() {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY is not set");
  return new Groq({ apiKey: key });
}

// ── Parse prompt (unchanged content) ─────────────────────────────────────────

function buildParsePrompt(transcript: string): string {
  return `You are a precise Indian nutrition database. The user spoke what they ate.

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

Return EXACTLY this JSON (integer values only):
{"meals":[{"name":"2 roti, dal & curd","calories":420,"proteinG":18,"carbsG":60,"fatG":10,"fiberG":8}]}`;
}

// ── Route ─────────────────────────────────────────────────────────────────────

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

    const tr = await groqForAudio().audio.transcriptions.create({
      file,
      model:    TRANSCRIPTION_MODEL,
      language: "en",
      prompt:   "A spoken description of food eaten, e.g. two rotis with dal and a bowl of curd.",
    });
    transcript = (tr.text ?? "").trim();

    if (!transcript) return NextResponse.json({ transcript: "", meals: [] });

    // ── 2. Parse + estimate macros ──
    const result = await callJsonStrict({
      model:      MODELS.voiceMeal,
      messages:   [{ role: "user", content: buildParsePrompt(transcript) }],
      maxTokens:  MAX_TOKENS.voiceMeal,
      temperature: 0,
      schema:     VoiceMealSchema,
      schemaName: "voice-meal",
      feature:    "voiceMeal",
    });

    // Response shape unchanged — frontend reads { transcript, meals: [{ name, macros: {...} }] }
    const meals = result.data.meals
      .filter((m) => m.name.trim())
      .map((m) => ({
        name: m.name.trim(),
        macros: {
          calories: m.calories,
          proteinG: m.proteinG,
          carbsG:   m.carbsG,
          fatG:     m.fatG,
          fiberG:   m.fiberG,
        },
      }));

    return NextResponse.json({ transcript, meals });
  } catch (err: any) {
    console.error("[voice-meal] error:", err?.code, err?.message);
    return NextResponse.json(
      { error: err.message ?? "Failed to process audio", transcript },
      { status: 500 },
    );
  }
}

