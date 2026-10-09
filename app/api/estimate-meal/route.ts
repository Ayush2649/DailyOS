import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { estimateMealMacros } from "@/lib/ai/nutrition-calculator";
import { calculateMealNutrition, resolveFoodItem } from "@/lib/ai/nutrition/calculator";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { dishName } = await req.json();
  if (!dishName?.trim()) return NextResponse.json({ error: "No dish name" }, { status: 400 });

  try {
    // 1. Fast deterministic path: if food matches ICMR/IFCT verified database
    const resolved = resolveFoodItem(dishName);
    if (resolved) {
      const calc = calculateMealNutrition(
        [{ name: dishName, quantity: 1, unit: resolved.defaultUnit }],
        dishName
      );
      return NextResponse.json({
        calories:     calc.calories,
        calorieRange: calc.calorieRange,
        proteinG:     calc.proteinG,
        carbsG:       calc.carbsG,
        fatG:         calc.fatG,
        fiberG:       calc.fiberG,
      });
    }

    // 2. Fallback to LLM macro estimation for complex free-text descriptions
    const macros = await estimateMealMacros(dishName);

    // Response includes point macros plus calorieRange
    return NextResponse.json({
      calories:     macros.calories,
      calorieRange: macros.calorieRange,
      proteinG:     macros.proteinG,
      carbsG:       macros.carbsG,
      fatG:         macros.fatG,
      fiberG:       macros.fiberG,
    });
  } catch (err: any) {
    console.error("[estimate-meal] AI error:", err?.code, err?.message);
    return NextResponse.json({ error: err.message || "Failed to estimate meal" }, { status: 500 });
  }
}
