import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { exercises, cardioLogs, durationMinutes, bodyWeightKg } = await req.json();

  const CARDIO_MET: Record<string, number> = {
    walking: 3.5, running: 9.8, cycling: 7.5, hiking: 5.3,
    mountain_climbing: 8.0, swimming: 7.0, jump_rope: 11.8,
    elliptical: 5.0, stair_climbing: 9.0, rowing: 7.0,
  };

  const weight = bodyWeightKg ?? 70;

  const cardioWithCalories = (cardioLogs ?? []).map((c: any) => {
    const met = CARDIO_MET[c.activity] ?? 5.0;
    const cals = Math.round(met * weight * (c.durationMinutes / 60));
    return { ...c, caloriesBurned: cals };
  });
  const totalCardioCals = cardioWithCalories.reduce((sum: number, c: any) => sum + c.caloriesBurned, 0);

  const exerciseText = (exercises ?? [])
    .map((ex: any) => {
      const setsText = ex.sets
        .map((s: any, i: number) => {
          const weightStr = s.unit === "bodyweight" ? "bodyweight" : `${s.weight}${s.unit}`;
          return `  Set ${i + 1}: ${s.reps} reps × ${weightStr}`;
        })
        .join("\n");
      return `${ex.name}:\n${setsText}`;
    })
    .join("\n\n");

  const cardioText = cardioWithCalories.length > 0
    ? cardioWithCalories
        .map((c: any) => `  • ${c.activity.replace(/_/g, " ")} — ${c.durationMinutes} min${c.distanceKm ? `, ${c.distanceKm} km` : ""} (~${c.caloriesBurned} kcal)`)
        .join("\n")
    : "None";

  const hasStrength = (exercises ?? []).length > 0;
  const hasCardio = cardioWithCalories.length > 0;

  const prompt = `You are a professional fitness coach. Analyze this workout and provide a concise, motivating summary.

Athlete body weight: ${bodyWeightKg ? `${bodyWeightKg} kg` : "not provided"}
Workout duration: ${durationMinutes} minutes
${hasStrength ? `\nStrength exercises:\n${exerciseText}` : ""}
${hasCardio ? `\nCardio performed:\n${cardioText}\nTotal cardio calories burned: ~${totalCardioCals} kcal` : ""}

Provide a structured summary with:
1. **Overall Performance** – how was this session overall (1-2 sentences)
2. **What You Did Well** – specific strengths (2-3 bullet points)
3. **Intensity Level** – rate as exactly one of: Low / Moderate / High / Very High — brief explanation
4. **Areas to Improve** – actionable suggestions (2-3 bullet points)
5. **Next Session Tip** – one specific recommendation for next time
${hasCardio ? "6. **Cardio Insight** – brief comment on the cardio work and its fitness impact" : ""}

Keep it encouraging, specific, and under 280 words.`;

  try {
    const completion = await groq.chat.completions.create({
      model: "qwen/qwen3.8-27b",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 700,
      temperature: 0.6,
    });

    const summary = completion.choices[0].message.content ?? "";

    const lowerSummary = summary.toLowerCase();
    let strengthMet = 5.0;
    if (lowerSummary.includes("very high")) strengthMet = 8.5;
    else if (lowerSummary.includes("high")) strengthMet = 6.5;
    else if (lowerSummary.includes("moderate")) strengthMet = 5.0;
    else if (lowerSummary.includes("low")) strengthMet = 3.5;

    const strengthCals = hasStrength ? Math.round(strengthMet * weight * (durationMinutes / 60)) : 0;
    const caloriesBurned = strengthCals + totalCardioCals;

    return NextResponse.json({ summary, caloriesBurned, cardioWithCalories });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
