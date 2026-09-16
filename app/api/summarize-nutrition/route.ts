import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { meals, goals, totals } = await req.json();

  const mealList = meals.length > 0
    ? meals.map((m: any) =>
        `- ${m.name}: ${Math.round(m.macros.calories)} kcal | P: ${Math.round(m.macros.proteinG)}g | C: ${Math.round(m.macros.carbsG)}g | F: ${Math.round(m.macros.fatG)}g`
      ).join("\n")
    : "No meals logged yet today.";

  const calPct  = Math.round((totals.calories  / goals.calories)  * 100);
  const protPct = Math.round((totals.proteinG  / goals.proteinG)  * 100);
  const carbPct = Math.round((totals.carbsG    / goals.carbsG)    * 100);
  const fatPct  = Math.round((totals.fatG      / goals.fatG)      * 100);

  const calRemaining  = Math.max(goals.calories  - totals.calories,  0);
  const protRemaining = Math.max(goals.proteinG  - totals.proteinG,  0);
  const carbRemaining = Math.max(goals.carbsG    - totals.carbsG,    0);
  const fatRemaining  = Math.max(goals.fatG      - totals.fatG,      0);

  const prompt = `You are a personal nutrition coach specializing in Indian cuisine. Analyze today's meals and give practical, specific advice to help meet daily macro goals.

DAILY GOALS:
- Calories: ${goals.calories} kcal
- Protein: ${goals.proteinG}g
- Carbs: ${goals.carbsG}g
- Fat: ${goals.fatG}g

MEALS LOGGED TODAY:
${mealList}

CURRENT TOTALS vs GOALS:
- Calories:  ${Math.round(totals.calories)}/${goals.calories} kcal (${calPct}%) — ${Math.round(calRemaining)} kcal remaining
- Protein:   ${Math.round(totals.proteinG)}/${goals.proteinG}g (${protPct}%) — ${Math.round(protRemaining)}g remaining
- Carbs:     ${Math.round(totals.carbsG)}/${goals.carbsG}g (${carbPct}%) — ${Math.round(carbRemaining)}g remaining
- Fat:       ${Math.round(totals.fatG)}/${goals.fatG}g (${fatPct}%) — ${Math.round(fatRemaining)}g remaining

Provide a structured response:
1. **Today's Score** – One sentence on how today is tracking overall.
2. **Biggest Gap** – Which macro is most off target and why it matters.
3. **What to Eat Next** – 2-3 specific Indian food suggestions (with approximate macros) to close the biggest gaps before end of day.
4. **One Thing to Avoid** – What to skip or limit for the rest of today.
5. **Tomorrow's Focus** – One specific habit or meal change for tomorrow.

Be concise, motivating, and specific. Under 220 words. No generic advice.`;

  try {
    const completion = await groq.chat.completions.create({
      model: "qwen/qwen3.8-27b",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 600,
      temperature: 0.6,
    });
    const summary = completion.choices[0].message.content ?? "";
    return NextResponse.json({ summary });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
