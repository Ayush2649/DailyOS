import { NextRequest, NextResponse } from "next/server";
import Groq, { toFile } from "groq-sdk";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export const runtime = "nodejs";

// Transcribe a spoken workout, then parse it into structured exercises + sets.
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

    const tr = await groq.audio.transcriptions.create({
      file,
      model: "whisper-large-v3-turbo",
      language: "en",
      prompt: "A spoken gym workout log with exercises, sets, reps and weights in kg or lbs.",
    });
    transcript = (tr.text ?? "").trim();

    if (!transcript) {
      return NextResponse.json({ transcript: "", exercises: [] });
    }

    // ── 2. Parse transcript into structured exercises ──
    const parsePrompt = `You convert a spoken gym workout into structured JSON.

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

Return ONLY raw JSON, no markdown, exactly in this shape:
{"exercises":[{"name":"Bench Press","sets":[{"reps":10,"weight":60,"unit":"kg"}]}],"cardio":[{"activity":"running","durationMinutes":30,"distanceKm":5}]}`;

    const completion = await groq.chat.completions.create({
      model: "qwen/qwen3.8-27b",
      messages: [{ role: "user", content: parsePrompt }],
      max_tokens: 800,
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

    // ── 3. Normalise / sanitise ──
    const exercises = Array.isArray(parsed.exercises) ? parsed.exercises : [];
    const clean = exercises
      .filter((e: any) => e && typeof e.name === "string" && e.name.trim())
      .map((e: any) => {
        const rawSets = Array.isArray(e.sets) && e.sets.length ? e.sets : [{ reps: 0, unit: "kg" }];
        const sets = rawSets.map((s: any) => {
          const unit = s.unit === "lbs" || s.unit === "bodyweight" ? s.unit : "kg";
          const set: { reps: number; unit: string; weight?: number } = {
            reps: Math.max(0, Math.round(Number(s.reps) || 0)),
            unit,
          };
          if (unit !== "bodyweight" && s.weight != null && !Number.isNaN(Number(s.weight))) {
            set.weight = Number(s.weight);
          }
          return set;
        });
        return { name: e.name.trim(), sets };
      });

    const CARDIO_ACTIVITIES = new Set([
      "walking", "running", "cycling", "hiking", "mountain_climbing",
      "swimming", "jump_rope", "elliptical", "stair_climbing", "rowing",
    ]);
    const rawCardio = Array.isArray(parsed.cardio) ? parsed.cardio : [];
    const cardio = rawCardio
      .filter((c: any) => c && CARDIO_ACTIVITIES.has(c.activity) && Number(c.durationMinutes) > 0)
      .map((c: any) => {
        const entry: { activity: string; durationMinutes: number; distanceKm?: number } = {
          activity: c.activity,
          durationMinutes: Math.round(Number(c.durationMinutes)),
        };
        if (c.distanceKm != null && !Number.isNaN(Number(c.distanceKm)) && Number(c.distanceKm) > 0) {
          entry.distanceKm = Math.round(Number(c.distanceKm) * 100) / 100;
        }
        return entry;
      });

    return NextResponse.json({ transcript, exercises: clean, cardio });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Failed to process audio", transcript }, { status: 500 });
  }
}
