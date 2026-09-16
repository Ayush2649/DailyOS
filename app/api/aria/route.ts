import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userName = session.user?.name?.split(" ")[0] ?? "there";
  const { messages, mode, dietContext, workoutContext, taskContext } = await req.json();

  const now = new Date();
  const dateStr = now.toLocaleDateString("en-IN", {
    weekday: "long", year: "numeric", month: "long", day: "numeric", timeZone: "Asia/Kolkata",
  });
  const timeStr = now.toLocaleTimeString("en-IN", {
    hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata",
  });

  let system = `You are Orbit — the personal AI life coach built into DailyOS.
You are talking to ${userName}.
TODAY is ${dateStr}, ${timeStr} IST. Always use this when answering date/time questions.

You are deeply knowledgeable about:
- Strength training, progressive overload, exercise science, injury prevention
- Nutrition, Indian cuisine macros, macro tracking, meal planning, weight management
- Productivity, habits, task prioritization, time management, focus
- How fitness, nutrition, and productivity interconnect

Personality: You are direct, specific, encouraging, and practical — like a coach who actually knows the user's data.
Never give vague generic advice. Always reference the user's REAL data when available.
Format: use **bold** for key points and - for bullet lists. Keep responses under 200 words unless the user asks for more detail.
You are deeply familiar with Indian food, Indian lifestyle, Indian portion sizes, and Indian fitness culture.
NEVER say you don't know today's date — you always know it.`;

  if (mode === "workout") {
    system += `\n\n[MODE: WORKOUT COACH]
Focus on exercise programming, form, sets/reps, progressive overload, muscle groups, recovery, and splits.`;

    if (workoutContext) {
      const { bodyWeightKg, recentSessions } = workoutContext;
      if (bodyWeightKg) {
        system += `\n\n=== ${userName.toUpperCase()}'S PROFILE ===\nBody weight: ${bodyWeightKg} kg`;
      }
      if (recentSessions?.length > 0) {
        system += `\n\n=== RECENT WORKOUT HISTORY (last ${recentSessions.length} sessions) ===`;
        recentSessions.slice(0, 5).forEach((s: any, i: number) => {
          system += `\n\n[Session ${i + 1} — ${s.date}] ${s.durationMinutes > 0 ? `${s.durationMinutes} min` : ""}`;
          if (s.exercises?.length > 0) {
            system += `\nStrength: ` + s.exercises.map((e: any) =>
              `${e.name} (${e.sets} sets${e.topWeight ? `, up to ${e.topWeight}${e.unit ?? "kg"}` : ""})`
            ).join(", ");
          }
          if (s.cardio?.length > 0) {
            system += `\nCardio: ` + s.cardio.map((c: any) =>
              `${c.activity} ${c.durationMinutes}min${c.distanceKm ? ` / ${c.distanceKm}km` : ""}${c.caloriesBurned ? ` / ${c.caloriesBurned}kcal` : ""}`
            ).join(", ");
          }
          if (s.summary) system += `\nCoach note: ${s.summary.slice(0, 120)}...`;
        });
        system += `\n\nUse this data to give specific advice — reference their actual exercises, weights, and patterns.`;
      } else {
        system += `\n\n[No workout history yet — give general programming advice and encourage them to start logging.]`;
      }
    }
  }

  else if (mode === "diet") {
    system += `\n\n[MODE: NUTRITION COACH]
Focus on macros, Indian meal recommendations, calorie targets, protein sources, and meal timing.`;

    if (dietContext) {
      const { date, meals, totals, goals } = dietContext;
      const remaining = {
        calories: Math.max(0, goals.calories - totals.calories),
        proteinG: Math.max(0, goals.proteinG - totals.proteinG),
        carbsG:   Math.max(0, goals.carbsG   - totals.carbsG),
        fatG:     Math.max(0, goals.fatG     - totals.fatG),
      };
      const mealLines = meals.length > 0
        ? meals.map((m: any) => `  • ${m.name}: ${m.calories} kcal | ${m.proteinG}g P | ${m.carbsG}g C | ${m.fatG}g F${m.fiberG ? ` | ${m.fiberG}g fiber` : ""}`).join("\n")
        : "  (nothing logged yet today)";

      system += `\n\n=== ${userName.toUpperCase()}'S NUTRITION — ${date} ===
Meals logged:\n${mealLines}

Totals:    ${totals.calories} kcal | ${totals.proteinG}g P | ${totals.carbsG}g C | ${totals.fatG}g F
Goals:     ${goals.calories} kcal | ${goals.proteinG}g P | ${goals.carbsG}g C | ${goals.fatG}g F
Remaining: ${remaining.calories} kcal | ${remaining.proteinG}g P | ${remaining.carbsG}g C | ${remaining.fatG}g F

Progress: ${Math.round((totals.calories / goals.calories) * 100)}% of calorie goal, ${Math.round((totals.proteinG / goals.proteinG) * 100)}% of protein goal.

Always reference these exact numbers when answering diet questions. Give specific Indian meal suggestions that fit the remaining macros.`;
    }
  }

  else if (mode === "tasks") {
    system += `\n\n[MODE: PRODUCTIVITY COACH]
Focus on task prioritization, habit building, focus strategies, breaking down goals, and overcoming procrastination.`;

    if (taskContext) {
      const { todayDate, pendingToday, completedToday, overdue, totalPending } = taskContext;
      system += `\n\n=== ${userName.toUpperCase()}'S TASKS — ${todayDate} ===`;
      if (overdue.length > 0) {
        system += `\nOVERDUE (${overdue.length}): ` + overdue.map((t: any) =>
          `"${t.title}" (due ${t.dueDate}${t.priority ? `, ${t.priority} priority` : ""})`
        ).join(", ");
      }
      if (pendingToday.length > 0) {
        system += `\nDUE TODAY (${pendingToday.length}): ` + pendingToday.map((t: any) =>
          `"${t.title}"${t.priority ? ` [${t.priority}]` : ""}${t.projectName ? ` (${t.projectName})` : ""}`
        ).join(", ");
      } else {
        system += `\nNo tasks scheduled for today.`;
      }
      if (completedToday.length > 0) {
        system += `\nCOMPLETED TODAY (${completedToday.length}): ` + completedToday.map((t: any) => `"${t.title}"`).join(", ");
      }
      system += `\nTotal pending tasks: ${totalPending}\n\nReference their actual tasks when giving advice. Celebrate completed tasks. Help them prioritise what's overdue.`;
    }
  }

  else {
    system += `\n\n[MODE: GENERAL]
The user has opened Orbit without selecting a specific mode. Give helpful, grounded advice across fitness, nutrition, and productivity. Suggest they type /workout, /diet, or /tasks for more focused coaching.`;
  }

  const MODELS = ["qwen/qwen3.8-27b", "openai/gpt-oss-20b"];
  let reply = "";
  let lastErr: any = null;

  for (const model of MODELS) {
    try {
      const completion = await groq.chat.completions.create({
        model,
        messages: [
          { role: "system", content: system },
          ...messages.map((m: { role: string; content: string }) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          })),
        ],
        max_tokens: 550,
        temperature: 0.65,
      });

      reply = completion.choices[0]?.message?.content ?? "";
      if (reply) break;
    } catch (err: any) {
      console.warn(`Orbit model ${model} failed:`, err?.message || err);
      lastErr = err;
    }
  }

  if (reply) {
    return NextResponse.json({ reply });
  }

  console.error("Orbit API error (all models failed):", lastErr);
  return NextResponse.json({ error: lastErr?.message || "AI response failed" }, { status: 500 });
}
