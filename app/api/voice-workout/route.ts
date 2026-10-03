import { NextRequest, NextResponse } from "next/server";
import Groq, { toFile } from "groq-sdk";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { callJsonStrict } from "@/lib/ai/groq";
import { TRANSCRIPTION_MODEL, MODELS, MAX_TOKENS } from "@/lib/ai/models";

export const runtime = "nodejs";
export const maxDuration = 30;

// ── Zod schemas ────────────────────────────────────────────────────────────────

const SetSchema = z.object({
  reps:   z.number().int().nonnegative(),
  weight: z.number().optional(),
  unit:   z.enum(["kg", "lbs", "bodyweight"]),
});

const ExerciseSchema = z.object({
  name: z.string().min(1),
  sets: z.array(SetSchema).min(1),
});

const CardioSchema = z.object({
  activity:        z.enum(["walking","running","cycling","hiking","mountain_climbing","swimming","jump_rope","elliptical","stair_climbing","rowing"]),
  durationMinutes: z.number().positive(),
  distanceKm:      z.number().positive().optional(),
});

const VoiceWorkoutSchema = z.object({
  exercises: z.array(ExerciseSchema),
  cardio:    z.array(CardioSchema),
});

// ── Audio client ──────────────────────────────────────────────────────────────

function groqForAudio() {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY is not set");
  return new Groq({ apiKey: key });
}

// ── Parse prompt (unchanged content) ─────────────────────────────────────────

function buildParsePrompt(transcript: string): string {
  return `You convert a spoken gym workout into structured JSON.

TRANSCRIPT: "${transcript}"

Extract STRENGTH exercises (with sets) and CARDIO separately.

STRENGTH rules:
- "3 sets of 10 at 60 kg" → 3 identical sets, each reps 10, weight 60, unit "kg".
- If different reps or weights are given per set ("10, 8 and 6 reps"), create one set for each.
- Bodyweight moves (push ups, pull ups, plank, dips, crunches with no weight mentioned) → unit "bodyweight" and omit weight.
- Default unit is "kg" unless "lbs" or "pounds" is said.
- "plank for 30 seconds" → reps 30, unit "bodyweight" (treat seconds as reps).
- Use clean, properly-capitalised exercise names.

CARDIO rules:
- activity must be EXACTLY one of: walking, running, cycling, hiking, mountain_climbing, swimming, jump_rope, elliptical, stair_climbing, rowing.
- durationMinutes: number of minutes (convert hours to minutes).
- distanceKm: optional number — convert miles to km (1 mile = 1.61 km).
- "ran 5k in 30 minutes" → {"activity":"running","durationMinutes":30,"distanceKm":5}.
- "cycled for an hour" → {"activity":"cycling","durationMinutes":60}.

Ignore filler words. If a section has nothing, return an empty array for it.

Return EXACTLY this JSON:
{"exercises":[{"name":"Bench Press","sets":[{"reps":10,"weight":60,"unit":"kg"}]}],"cardio":[{"activity":"running","durationMinutes":30,"distanceKm":5}]}`;
}

const CARDIO_ACTIVITIES = new Set([
  "walking", "running", "cycling", "hiking", "mountain_climbing",
  "swimming", "jump_rope", "elliptical", "stair_climbing", "rowing",
]);

// ── Route ─────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let transcript = "";

  try {
    const form = await req.formData();
    const audio = form.get("audio") as File | null;
    if (!audio) return NextResponse.json({ error: "No audio" }, { status: 400 });

    // ── 1. Transcribe with Whisper ──
    const buf = Buffer.from(await audio.arrayBuffer());
    const type = audio.type || "audio/webm";
    const ext =
      type.includes("mp4") || type.includes("m4a") || type.includes("aac") ? "m4a"
      : type.includes("mpeg") || type.includes("mp3") ? "mp3"
      : type.includes("wav") ? "wav"
      : "webm";
    const file = await toFile(buf, `workout.${ext}`, { type });

    const tr = await groqForAudio().audio.transcriptions.create({
      file,
      model:    TRANSCRIPTION_MODEL,
      language: "en",
      prompt:   "A spoken gym workout log with exercises, sets, reps and weights in kg or lbs.",
    });
    transcript = (tr.text ?? "").trim();

    if (!transcript) return NextResponse.json({ transcript: "", exercises: [], cardio: [] });

    // ── 2. Parse transcript into structured exercises ──
    const result = await callJsonStrict({
      model:      MODELS.voiceWorkout,
      messages:   [{ role: "user", content: buildParsePrompt(transcript) }],
      maxTokens:  MAX_TOKENS.voiceWorkout,
      temperature: 0,
      schema:     VoiceWorkoutSchema,
      schemaName: "voice-workout",
      feature:    "voiceWorkout",
    });

    // ── 3. Normalise / sanitise (same logic as before) ──
    const exercises = result.data.exercises
      .filter((e) => e.name.trim())
      .map((e) => {
        const sets = e.sets.map((s) => {
          const unit = s.unit === "lbs" || s.unit === "bodyweight" ? s.unit : "kg";
          const out: { reps: number; unit: string; weight?: number } = {
            reps: Math.max(0, Math.round(s.reps)),
            unit,
          };
          if (unit !== "bodyweight" && s.weight != null && !Number.isNaN(s.weight)) {
            out.weight = s.weight;
          }
          return out;
        });
        return { name: e.name.trim(), sets };
      });

    const cardio = result.data.cardio
      .filter((c) => CARDIO_ACTIVITIES.has(c.activity) && c.durationMinutes > 0)
      .map((c) => {
        const entry: { activity: string; durationMinutes: number; distanceKm?: number } = {
          activity: c.activity,
          durationMinutes: Math.round(c.durationMinutes),
        };
        if (c.distanceKm != null && c.distanceKm > 0) {
          entry.distanceKm = Math.round(c.distanceKm * 100) / 100;
        }
        return entry;
      });

    return NextResponse.json({ transcript, exercises, cardio });
  } catch (err: any) {
    console.error("[voice-workout] error:", err?.code, err?.message);
    return NextResponse.json(
      { error: err.message ?? "Failed to process audio", transcript },
      { status: 500 },
    );
  }
}

