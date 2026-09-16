import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { dishName } = await req.json();
  if (!dishName?.trim()) return NextResponse.json({ error: "No dish name" }, { status: 400 });

  const prompt = `You are a precise Indian nutrition database. Estimate macros for the dish described below.

DISH: "${dishName.trim()}"

REFERENCE VALUES:
BREADS: Chapati plain 30g=80kcal/3P/15C/1F | Chapati+ghee=110/3/15/3.5 | Paratha plain 60g=150/3/22/6 | Aloo paratha=200/5/28/8 | Naan=260/8/45/5 | Puri=120/2/14/6
RICE: Plain rice 150g=195/4/43/0.4 | Jeera rice=220/4/43/3 | Veg biryani 200g=280/6/45/8 | Chicken biryani 250g=380/22/45/12
DAL: Toor dal 200ml=150/10/25/2 | Moong dal=120/8/18/1 | Masoor dal=140/10/22/1 | Dal makhani=240/11/25/12 | Rajma=200/13/30/3 | Chole=210/12/32/4
PANEER: Paneer raw 100g=265/18/3/20 | Paneer bhurji 150g=290/20/5/22 | Palak paneer 200g=280/16/10/20 | Shahi paneer=350/16/12/28
DAIRY: Curd 100g=60/3/5/3 | Raita 150g=75/3/6/4 | Lassi sweet 250ml=180/7/28/5
EGGS: Boiled egg=78/6/0.6/5 | Egg bhurji 2eggs=220/13/5/16 | Omelette 2eggs=200/13/4/15
CHICKEN: Curry 150g=230/28/5/10 | Tikka 100g=160/26/4/5 | Butter chicken 200g=320/26/10/20
SOY: Soy chunks cooked 100g=112/15/8/0.5 | Katori with masala=228/22/12/4
SOUTH INDIAN: Idli 1pc=40/1.5/8/0.2 | Dosa plain=130/3/24/2 | Masala dosa=210/5/32/7 | Medu vada=100/3/12/5
BREAKFAST: Poha 150g=180/3/36/3 | Upma 150g=190/5/32/5 | Besan chilla 1pc=130/6/17/4 | Moong dal chilla=110/7/15/2
VEG: Aloo sabzi 100g=90/2/20/0.5 | Bhindi 100g=80/2/10/4 | Mixed veg 150g=130/3/15/6
STREET FOOD: Samosa 1pc=150/3/18/7 | Pav bhaji=420/11/62/14 | Vada pav=290/6/40/12 | Chole bhature=490/15/68/16

RULES: Scale for quantity mentioned. Standard single serving if no quantity. Account for accompaniments. Return ONLY raw JSON, no markdown.

Return exactly: {"calories":<int>,"proteinG":<int>,"carbsG":<int>,"fatG":<int>,"fiberG":<int>}`;

  try {
    const completion = await groq.chat.completions.create({
      model: "qwen/qwen3.8-27b",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 200,
      temperature: 0,
    });

    const content = completion.choices[0].message.content ?? "{}";
    const cleaned = content.replace(/```(?:json)?\n?|\n?```/g, "").trim();

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      const jsonMatch = cleaned.match(/\{[\s\S]*?\}/);
      if (!jsonMatch) throw new Error("No JSON in response");
      parsed = JSON.parse(jsonMatch[0]);
    }

    return NextResponse.json({
      calories: Math.round(Number(parsed.calories ?? 0)),
      proteinG: Math.round(Number(parsed.proteinG ?? 0)),
      carbsG:   Math.round(Number(parsed.carbsG ?? 0)),
      fatG:     Math.round(Number(parsed.fatG ?? 0)),
      fiberG:   Math.round(Number(parsed.fiberG ?? 0)),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
