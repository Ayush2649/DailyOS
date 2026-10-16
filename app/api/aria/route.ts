import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { callTextWithFallback } from "@/lib/ai/groq";
import { buildOrbitContext } from "@/lib/orbit/contextEngine";
import { inferContextRequirements } from "@/lib/orbit/contextRequirement";
import { serializeOrbitContext } from "@/lib/orbit/contextSerializer";
import { TEXT_FALLBACK, MAX_TOKENS } from "@/lib/ai/models";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userName = session.user?.name?.split(" ")[0] ?? "there";
  const { messages, mode } = await req.json();

  // Determine required context based on user messages (never assistant responses)
  const userMessages = (messages || []).filter((m: any) => m.role === "user");
  const latestUserMessage = userMessages[userMessages.length - 1]?.content || "";

  // Infer requirements primarily from the latest user message
  const latestReq = inferContextRequirements(latestUserMessage);

  // For domain detection on follow-up questions (e.g. "what about protein?"),
  // inspect prior user messages without allowing assistant replies to pollute temporal keywords
  const allUserText = userMessages.map((m: any) => m.content).join(" ");
  const allUserReq = inferContextRequirements(allUserText);

  // Merge inferred domains, add mode‑specific defaults, and resolve temporal scope
  const mergedDomains = new Set([...latestReq.domains, ...allUserReq.domains]);
  if (mode === "workout") mergedDomains.add("workouts");
  if (mode === "diet") { mergedDomains.add("meals"); mergedDomains.add("nutrition"); }
  if (mode === "tasks") mergedDomains.add("tasks");

  const requirements = {
    domains: Array.from(mergedDomains),
    temporalScope: latestReq.temporalScope ?? allUserReq.temporalScope,
  };
  const orbitContext = await buildOrbitContext(requirements);
  const rawTz = orbitContext?.preferences?.timezone || "Asia/Kolkata";
  let userTimezone = "Asia/Kolkata";
  try {
    new Intl.DateTimeFormat("en-IN", { timeZone: rawTz });
    userTimezone = rawTz;
  } catch {
    userTimezone = "Asia/Kolkata";
  }

  const now = new Date();
  const dateStr = now.toLocaleDateString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: userTimezone,
  });
  const timeStr = now.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: userTimezone,
  });

  let system = `You are Orbit — the personal AI coach built into SATAT.
You are talking to ${userName}.
TODAY is ${dateStr}, ${timeStr} IST. Always use this when answering date/time questions.

You are deeply knowledgeable about:
- Strength training, progressive overload, exercise science, injury prevention
- Nutrition, Indian cuisine macros, macro tracking, meal planning, weight management
- Productivity, habits, task prioritization, time management, focus
- How fitness, nutrition, and productivity interconnect

Personality: You are direct, specific, encouraging, and practical — like a coach who actually knows the user's data.
Never give vague generic advice. Always reference the user's REAL data when available.
• If the requested information exists in the retrieved context, answer using that concrete data.
• If the information is not present, explicitly say that the record is unavailable (e.g., "I don't see a meal logged for yesterday night.").
• Do not fabricate meals, calories, workouts, tasks, habits, goals, or preferences. Do not mention Firebase, embeddings, RAG, or internal IDs.
Format: use **bold** for key points and - for bullet lists. Keep responses under 200 words unless the user asks for more detail.
You are deeply familiar with Indian food, Indian lifestyle, Indian portion sizes, and Indian fitness culture.
NEVER say you don't know today's date — you always know it.`;

  if (mode === "workout") {
    system += `\n\n[MODE: WORKOUT COACH]
Focus on exercise programming, form, sets/reps, progressive overload, muscle groups, recovery, and splits.`;

    // Workout mode – use orbitContext.workouts and bodyWeightEntries
    if (orbitContext?.workouts) {
      const workouts = orbitContext.workouts.today; // filtered list based on temporalScope
      const profileWeight = orbitContext.bodyWeightEntries?.slice(-1)[0]?.weightKg;
      if (profileWeight) {
        system += `\n\n=== ${userName.toUpperCase()}'S PROFILE ===\nBody weight: ${profileWeight} kg`;
      }
      if (workouts.length > 0) {
        system += `\n\n=== RECENT WORKOUT HISTORY (last ${workouts.length} sessions) ===`;
        workouts.slice(0, 5).forEach((s: any, i: number) => {
          system += `\n\n[Session ${i + 1} — ${s.date}] ${s.durationMinutes > 0 ? `${s.durationMinutes} min` : ''}`;
          if (s.exercises?.length > 0) {
            system += `\nStrength: ` + s.exercises.map((e: any) => {
              const setsStr = e.sets.map((set: any) => {
                const weightPart = set.weight !== undefined ? `${set.weight}${set.unit}` : '';
                return `${set.reps}${weightPart ? `×${weightPart}` : ''}`;
              }).join(', ');
              return `${e.name} (${setsStr})`;
            }).join(', ');
          }
          if (s.cardioLogs?.length > 0) {
            system += `\nCardio: ` + s.cardioLogs.map((c: any) => `${c.activity} ${c.durationMinutes}min${c.distanceKm ? ` / ${c.distanceKm}km` : ''}${c.caloriesBurned ? ` / ${c.caloriesBurned}kcal` : ''}`).join(', ');
          }
          if (s.summary) system += `\nCoach note: ${s.summary.slice(0, 120)}...`;
        });
        system += `\n\nUse this data to give specific advice — reference their actual exercises, weights, and patterns.`;
      } else {
        system += `\n\n[No workout history yet — give general programming advice and encourage them to start logging.]`;
      }
    }
// Legacy workoutContext block fully removed
    }

  else if (mode === "diet") {
    system += `\n\n[MODE: NUTRITION COACH]
Focus on macros, Indian meal recommendations, calorie targets, protein sources, and meal timing.`;

    if (orbitContext?.meals) {
      const date = new Date().toLocaleDateString('en-CA');
const meals = orbitContext.meals.today;
const goals: any = orbitContext.macroGoals ?? { calories:0, proteinG:0, carbsG:0, fatG:0, fiberG:0 };
    const totals: any = meals.reduce((acc: any, m: any) => ({
      calories: acc.calories + (m.macros?.calories ?? 0),
      proteinG: acc.proteinG + (m.macros?.proteinG ?? 0),
      carbsG: acc.carbsG + (m.macros?.carbsG ?? 0),
      fatG: acc.fatG + (m.macros?.fatG ?? 0),
      fiberG: acc.fiberG + (m.macros?.fiberG ?? 0),
    }), {calories:0,proteinG:0,carbsG:0,fatG:0,fiberG:0});
      const remaining = {
        calories: Math.max(0, goals.calories - totals.calories),
        proteinG: Math.max(0, goals.proteinG - totals.proteinG),
        carbsG:   Math.max(0, goals.carbsG   - totals.carbsG),
        fatG:     Math.max(0, goals.fatG     - totals.fatG),
      };
      const mealLines = meals.length > 0
        ? meals.map((m: any) => `  • ${m.name}: ${m.macros?.calories ?? 0} kcal | ${m.macros?.proteinG ?? 0}g P | ${m.macros?.carbsG ?? 0}g C | ${m.macros?.fatG ?? 0}g F${m.macros?.fiberG ? ` | ${m.macros?.fiberG}g fiber` : ""}`).join("\n")
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

    if (orbitContext?.tasks) {
      const todayDate = new Date().toLocaleDateString('en-CA');
const pendingToday = orbitContext.tasks.today.filter(t => t.status === 'pending');
const completedToday = orbitContext.tasks.today.filter(t => t.status === 'completed');
const overdue = orbitContext.tasks.today.filter(t => t.dueDate && new Date(t.dueDate) < new Date());
const totalPending = pendingToday.length + overdue.length;
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
  try {
    const serializedContext = serializeOrbitContext(orbitContext);
    const result = await callTextWithFallback(TEXT_FALLBACK, {
      messages: [
        { role: "system", content: system },
        { role: "system", content: JSON.stringify(serializedContext) },
        ...messages.map((m: { role: string; content: string }) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      ],
      maxTokens: MAX_TOKENS.aria,
      temperature: 0.65,
      feature: "aria",
    });

    return NextResponse.json({ reply: result.data });
  } catch (err: any) {
    console.error("[aria] AI error:", err?.code, err?.message);
    return NextResponse.json({ error: err.message || "AI response failed" }, { status: 500 });
  }
}

