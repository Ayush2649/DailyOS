import { z } from "zod";
import { callJsonStrict, AiResult } from "./groq";
import { MODELS, MAX_TOKENS } from "./models";

export const CalorieRangeSchema = z.object({
  low: z.number().int().nonnegative(),
  high: z.number().int().nonnegative(),
});

export const MealMacrosSchema = z.object({
  calories: z.number().int().nonnegative(),
  calorieRange: CalorieRangeSchema.optional(),
  proteinG: z.number().int().nonnegative(),
  carbsG:   z.number().int().nonnegative(),
  fatG:     z.number().int().nonnegative(),
  fiberG:   z.number().int().nonnegative(),
});

export type MealMacros = z.infer<typeof MealMacrosSchema>;

/**
 * Static instructions placed first so provider-side prompt caching (supported on openai/gpt-oss-120b)
 * can cache the exact prefix and provide 50% discount and reduced latency.
 */
export const ESTIMATE_MEAL_SYSTEM_PROMPT = `You are a precise Indian nutrition calculator. Return integer macros for the meal described.
Always account for cooking oil, ghee, and accompaniments.

REFERENCE VALUES (kcal / P / C / F / Fiber in grams):
- Roti/Chapati (plain 30g): 80 / 3 / 15 / 1 / 2g fiber | with ghee: 110 / 3 / 15 / 3.5 / 2g fiber
- Paratha (plain 60g): 150 / 3 / 22 / 6 / 2.5g fiber | Aloo paratha: 200 / 5 / 28 / 8 / 3.5g fiber | Paneer paratha: 250 / 10 / 28 / 11 / 3g fiber
- Rice (plain cooked 150g): 195 / 4 / 43 / 0.4 / 1g fiber | Jeera rice: 220 / 4 / 43 / 3 / 1g fiber
- Biryani: Veg (200g): 280 / 6 / 45 / 8 / 4g fiber | Chicken (250g): 380 / 22 / 45 / 12 / 3g fiber
- Dal (cooked ~180g / 200ml): Toor/Yellow: 150 / 10 / 25 / 2 / 5g fiber | Dal Makhani: 240 / 11 / 25 / 12 / 6g fiber | Rajma/Chole: 210 / 12 / 32 / 4 / 8g fiber
- Curd/Dahi (100g): 60 / 3 / 5 / 3 / 0g fiber | Raita (150g): 75 / 3 / 6 / 4 / 1g fiber
- Sabzi (cooked 150g): Dry aloo/bhindi/gobi: 120 / 3 / 18 / 5 / 4g fiber | Mixed veg curry: 140 / 3 / 15 / 8 / 5g fiber
- Paneer (cooked 150g): Bhurji: 290 / 20 / 5 / 22 / 1g fiber | Palak Paneer: 280 / 16 / 10 / 20 / 4g fiber | Butter Masala: 350 / 14 / 12 / 28 / 2g fiber
- Snacks/Street: Samosa (1pc): 150 / 3 / 18 / 7 / 2g fiber | Pav Bhaji: 420 / 11 / 62 / 14 / 7g fiber | Poha (150g): 180 / 3 / 36 / 3 / 3g fiber

RULES:
- Whole-wheat roti/chapati, dal, vegetables, beans, and rice-with-dal dishes MUST have positive fiber. Never return 0g fiber if these items are present.
- Provide a realistic calorieRange {low, high} reflecting cooking method / oil / portion variation (typically +/- 15-20% around calories).

Return EXACTLY this JSON:
{"calories":<int>,"calorieRange":{"low":<int>,"high":<int>},"proteinG":<int>,"carbsG":<int>,"fatG":<int>,"fiberG":<int>}`;

/**
 * Enforces plausibility checks on fiber and calorieRange.
 */
function applyPlausibilityChecks(data: MealMacros, dishDescription: string): MealMacros {
  const descLower = dishDescription.toLowerCase();
  let fiberG = data.fiberG;

  // Fiber plausibility check:
  // Whole-wheat roti, dal, vegetables, and rice-with-dal meals should not return 0 g fiber.
  const hasWholeWheat = /\b(roti|chapati|phulka|paratha|thepla|atta)\b/i.test(descLower);
  const hasDalOrLegumes = /\b(dal|daal|lentil|sambar|rajma|chole|chana|moong|toor|urad)\b/i.test(descLower);
  const hasVeg = /\b(sabzi|subzi|vegetable|aloo|bhindi|gobi|gobhi|palak|salad|mixed veg|curry)\b/i.test(descLower);
  const hasRiceWithDal = /\brice\b/i.test(descLower) && hasDalOrLegumes;

  if (fiberG === 0) {
    let minFiber = 0;
    if (hasWholeWheat) minFiber += 2;
    if (hasDalOrLegumes) minFiber += 4;
    if (hasVeg) minFiber += 3;
    if (hasRiceWithDal && minFiber === 0) minFiber += 4;
    if (minFiber > 0) {
      fiberG = minFiber;
    }
  }

  // Ensure calorieRange is present and sensible
  let calorieRange = data.calorieRange;
  if (!calorieRange || calorieRange.low >= calorieRange.high) {
    const spread = Math.max(Math.round(data.calories * 0.15), 30);
    calorieRange = {
      low: Math.max(Math.round(data.calories - spread), 0),
      high: Math.round(data.calories + spread),
    };
  }

  return {
    ...data,
    calorieRange,
    fiberG,
  };
}

/**
 * Calculates macros with full AiResult (including usage).
 */
export async function estimateMealWithUsage(dishDescription: string): Promise<AiResult<MealMacros>> {
  const result = await callJsonStrict({
    feature: "estimateMeal",
    model: MODELS.estimateMeal,
    messages: [
      { role: "system", content: ESTIMATE_MEAL_SYSTEM_PROMPT },
      { role: "user", content: `MEAL: "${dishDescription.trim()}"` },
    ],
    maxTokens: MAX_TOKENS.estimateMeal,
    temperature: 0,
    schema: MealMacrosSchema,
    schemaName: "estimate-meal",
  });

  const checkedData = applyPlausibilityChecks(result.data, dishDescription);

  return {
    ...result,
    data: checkedData,
  };
}

/**
 * Calculates macros for a meal description or list of items using openai/gpt-oss-120b.
 */
export async function estimateMealMacros(dishDescription: string): Promise<MealMacros> {
  const result = await estimateMealWithUsage(dishDescription);
  return result.data;
}
