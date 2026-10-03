#!/usr/bin/env ts-node
/**
 * scripts/ai-smoke-test.ts
 *
 * Smoke-tests all AI features against the live Groq API.
 * Prints outputs and token usage for quality comparison.
 *
 * Usage:
 *   npm run smoke:ai
 */

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

import { callJsonStrict, callText } from "../lib/ai/groq";
import { MODELS, TRANSCRIPTION_MODEL, MAX_TOKENS } from "../lib/ai/models";
import { z } from "zod";

const RESET = "\x1b[0m";
const BOLD  = "\x1b[1m";
const GREEN = "\x1b[32m";
const RED   = "\x1b[31m";
const CYAN  = "\x1b[36m";
const DIM   = "\x1b[2m";

function section(title: string) {
  console.log(`\n${BOLD}${CYAN}${"═".repeat(60)}${RESET}`);
  console.log(`${BOLD}${CYAN}  ${title}${RESET}`);
  console.log(`${CYAN}${"═".repeat(60)}${RESET}`);
}

function ok(label: string, usage: { promptTokens: number; completionTokens: number; latencyMs: number; model: string }) {
  console.log(`${GREEN}✅ ${label}${RESET}`);
  console.log(`   ${DIM}model=${usage.model} | prompt=${usage.promptTokens} | completion=${usage.completionTokens} | ${usage.latencyMs}ms${RESET}`);
}

function fail(label: string, err: unknown) {
  console.log(`${RED}❌ ${label}: ${(err as Error).message}${RESET}`);
}

// ── Test data ─────────────────────────────────────────────────────────────────

const TEN_DISHES = [
  "2 aloo paratha with curd",
  "chicken biryani 250g",
  "dal makhani with 2 roti",
  "masala dosa with sambar and coconut chutney",
  "paneer bhurji 150g with 3 chapati",
  "rajma chawal (rajma 200ml + plain rice 150g)",
  "pav bhaji",
  "chole bhature",
  "poha 150g",
  "butter chicken 200g with naan",
];

const MEAL_TRANSCRIPTS = [
  "I had two rotis with dal and a bowl of curd for lunch",
  "For breakfast I had poha and a glass of chai, and then for dinner I had chicken curry with rice",
];

const WORKOUT_TRANSCRIPTS = [
  "I did bench press 3 sets of 10 at 80 kg, then incline dumbbell press 4 sets of 12 at 30 kg each hand, and finished with 20 minutes of running on the treadmill at 6 km",
  "Squats 5 sets — first set 10 at 60, second 8 at 70, third 6 at 80 — then leg press 3 sets of 12 at 100 kg and 30 minutes cycling",
];

const NUTRITION_SUMMARY_INPUT = {
  meals: [
    { name: "Poha", macros: { calories: 180, proteinG: 3, carbsG: 36, fatG: 3, fiberG: 2 } },
    { name: "Dal-Chawal", macros: { calories: 345, proteinG: 14, carbsG: 68, fatG: 2.4, fiberG: 5.5 } },
  ],
  goals: { calories: 2200, proteinG: 150, carbsG: 250, fatG: 70 },
  totals: { calories: 525, proteinG: 17, carbsG: 104, fatG: 5.4 },
};

const WORKOUT_SUMMARY_INPUT = {
  exercises: [
    {
      name: "Bench Press",
      sets: [
        { reps: 10, weight: 80, unit: "kg" as const },
        { reps: 10, weight: 80, unit: "kg" as const },
        { reps: 8,  weight: 80, unit: "kg" as const },
      ],
    },
    {
      name: "Pull-ups",
      sets: [
        { reps: 8, unit: "bodyweight" as const },
        { reps: 6, unit: "bodyweight" as const },
      ],
    },
  ],
  cardioLogs: [{ activity: "running", durationMinutes: 20, distanceKm: 3 }],
  durationMinutes: 60,
  bodyWeightKg: 75,
};

const EstimateMealSchema = z.object({
  calories: z.number().int(),
  proteinG: z.number().int(),
  carbsG:   z.number().int(),
  fatG:     z.number().int(),
  fiberG:   z.number().int(),
});

const VoiceMealSchema = z.object({
  meals: z.array(z.object({
    name:     z.string(),
    calories: z.number().int(),
    proteinG: z.number().int(),
    carbsG:   z.number().int(),
    fatG:     z.number().int(),
    fiberG:   z.number().int(),
  })),
});

const VoiceWorkoutSchema = z.object({
  exercises: z.array(z.object({
    name: z.string(),
    sets: z.array(z.object({ reps: z.number(), weight: z.number().optional(), unit: z.string() })),
  })),
  cardio: z.array(z.object({
    activity: z.string(),
    durationMinutes: z.number(),
    distanceKm: z.number().optional(),
  })),
});

// ── Tests ─────────────────────────────────────────────────────────────────────

async function testEstimateMeal() {
  section("estimate-meal: 10 Indian dishes");
  for (const dish of TEN_DISHES) {
    try {
      const prompt = `You are a precise Indian nutrition database.
DISH: "${dish}"
REFERENCE VALUES:
BREADS: Chapati plain 30g=80kcal/3P/15C/1F | Paratha plain=150/3/22/6 | Aloo paratha=200/5/28/8 | Naan=260/8/45/5
RICE: Plain rice 150g=195/4/43/0.4 | Chicken biryani 250g=380/22/45/12 | Veg biryani 200g=280/6/45/8
DAL: Toor dal 200ml=150/10/25/2 | Dal makhani=240/11/25/12 | Rajma=200/13/30/3 | Chole=210/12/32/4
PANEER: Paneer bhurji 150g=290/20/5/22 | Palak paneer 200g=280/16/10/20
DAIRY: Curd 100g=60/3/5/3 | Lassi sweet 250ml=180/7/28/5
CHICKEN: Curry 150g=230/28/5/10 | Butter chicken 200g=320/26/10/20
BREAKFAST: Poha 150g=180/3/36/3 | Upma 150g=190/5/32/5 | Besan chilla 1pc=130/6/17/4
STREET FOOD: Samosa 1pc=150/3/18/7 | Pav bhaji=420/11/62/14 | Chole bhature=490/15/68/16
Return EXACTLY: {"calories":<int>,"proteinG":<int>,"carbsG":<int>,"fatG":<int>,"fiberG":<int>}`;

      const r = await callJsonStrict({
        model: MODELS.estimateMeal,
        messages: [{ role: "user", content: prompt }],
        maxTokens: MAX_TOKENS.estimateMeal,
        temperature: 0,
        schema: EstimateMealSchema,
        schemaName: "estimate-meal-smoke",
      });
      console.log(`  ${BOLD}"${dish}"${RESET}`);
      console.log(`  → ${JSON.stringify(r.data)}`);
      ok(dish, r.usage);
    } catch (err) {
      fail(`"${dish}"`, err);
    }
  }
}

async function testVoiceMealParse() {
  section("voice-meal: 2 transcripts (parse only)");
  for (const transcript of MEAL_TRANSCRIPTS) {
    const prompt = `You are a precise Indian nutrition database. The user spoke what they ate.
TRANSCRIPT: "${transcript}"
RULES: Group one sitting into one entry. Return EXACTLY:
{"meals":[{"name":"...","calories":<int>,"proteinG":<int>,"carbsG":<int>,"fatG":<int>,"fiberG":<int>}]}`;
    try {
      const r = await callJsonStrict({
        model: MODELS.voiceMeal,
        messages: [{ role: "user", content: prompt }],
        maxTokens: MAX_TOKENS.voiceMeal,
        temperature: 0,
        schema: VoiceMealSchema,
        schemaName: "voice-meal-smoke",
      });
      console.log(`  ${BOLD}Transcript: "${transcript}"${RESET}`);
      console.log(`  → ${JSON.stringify(r.data.meals)}`);
      ok(transcript.slice(0, 30), r.usage);
    } catch (err) {
      fail(`transcript: "${transcript.slice(0, 40)}..."`, err);
    }
  }
}

async function testVoiceWorkoutParse() {
  section("voice-workout: 2 transcripts (parse only)");
  for (const transcript of WORKOUT_TRANSCRIPTS) {
    const prompt = `You convert a spoken gym workout into structured JSON.
TRANSCRIPT: "${transcript}"
Return EXACTLY: {"exercises":[{"name":"...","sets":[{"reps":<int>,"weight":<num>,"unit":"kg"}]}],"cardio":[{"activity":"...","durationMinutes":<num>}]}`;
    try {
      const r = await callJsonStrict({
        model: MODELS.voiceWorkout,
        messages: [{ role: "user", content: prompt }],
        maxTokens: MAX_TOKENS.voiceWorkout,
        temperature: 0,
        schema: VoiceWorkoutSchema,
        schemaName: "voice-workout-smoke",
      });
      console.log(`  ${BOLD}Transcript: "${transcript.slice(0, 60)}..."${RESET}`);
      console.log(`  → exercises: ${r.data.exercises.length}, cardio: ${r.data.cardio.length}`);
      console.log(`     ${JSON.stringify(r.data)}`);
      ok(transcript.slice(0, 30), r.usage);
    } catch (err) {
      fail(`transcript: "${transcript.slice(0, 40)}..."`, err);
    }
  }
}

async function testSummarizeNutrition() {
  section("summarize-nutrition: 1 input");
  const { meals, goals, totals } = NUTRITION_SUMMARY_INPUT;
  const mealList = meals.map((m) =>
    `- ${m.name}: ${m.macros.calories} kcal | P: ${m.macros.proteinG}g | C: ${m.macros.carbsG}g | F: ${m.macros.fatG}g`
  ).join("\n");
  const prompt = `You are a personal nutrition coach specializing in Indian cuisine.
DAILY GOALS: Calories: ${goals.calories} | Protein: ${goals.proteinG}g | Carbs: ${goals.carbsG}g | Fat: ${goals.fatG}g
MEALS TODAY:\n${mealList}
TOTALS: ${totals.calories} kcal | P: ${totals.proteinG}g | C: ${totals.carbsG}g | F: ${totals.fatG}g
Provide structured advice in under 220 words (Today's Score, Biggest Gap, What to Eat Next, One Thing to Avoid, Tomorrow's Focus).`;
  try {
    const r = await callText({
      model: MODELS.summarizeNutrition,
      messages: [{ role: "user", content: prompt }],
      maxTokens: MAX_TOKENS.summarizeNutrition,
      temperature: 0.6,
    });
    console.log(r.data);
    ok("summarize-nutrition", r.usage);
  } catch (err) {
    fail("summarize-nutrition", err);
  }
}

async function testSummarizeWorkout() {
  section("summarize-workout: 1 input");
  const { exercises, cardioLogs, durationMinutes, bodyWeightKg } = WORKOUT_SUMMARY_INPUT;
  const exerciseText = exercises.map((ex) => {
    const sets = ex.sets.map((s, i) => `  Set ${i+1}: ${s.reps} reps × ${s.unit === "bodyweight" ? "bodyweight" : `${s.weight}${s.unit}`}`).join("\n");
    return `${ex.name}:\n${sets}`;
  }).join("\n\n");
  const cardioText = cardioLogs.map((c) => `  • ${c.activity} — ${c.durationMinutes} min${c.distanceKm ? `, ${c.distanceKm} km` : ""}`).join("\n");
  const prompt = `You are a professional fitness coach.
Body weight: ${bodyWeightKg} kg | Duration: ${durationMinutes} min
Strength:\n${exerciseText}
Cardio:\n${cardioText}
Provide a structured summary under 280 words (Overall Performance, What You Did Well, Intensity Level, Areas to Improve, Next Session Tip, Cardio Insight).`;
  try {
    const r = await callText({
      model: MODELS.summarizeWorkout,
      messages: [{ role: "user", content: prompt }],
      maxTokens: MAX_TOKENS.summarizeWorkout,
      temperature: 0.6,
    });
    console.log(r.data);
    ok("summarize-workout", r.usage);
  } catch (err) {
    fail("summarize-workout", err);
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`${BOLD}DailyOS AI Smoke Test${RESET}`);
  console.log(`Groq key: ${process.env.GROQ_API_KEY ? "✅ present" : "❌ missing"}`);
  console.log(`Text model: ${MODELS.estimateMeal}`);
  console.log(`Vision model: ${MODELS.analyzeMeal}`);
  console.log(`Transcription: ${TRANSCRIPTION_MODEL}`);

  await testEstimateMeal();
  await testVoiceMealParse();
  await testVoiceWorkoutParse();
  await testSummarizeNutrition();
  await testSummarizeWorkout();

  section("Summary");
  console.log("Smoke test completed.");
}

main().catch((err) => {
  console.error("Smoke test crashed:", err);
  process.exit(1);
});

