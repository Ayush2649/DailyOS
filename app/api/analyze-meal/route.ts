import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { callJsonStrict } from "@/lib/ai/groq";
import { MODELS, MAX_TOKENS, GROQ_VISION_ENABLED } from "@/lib/ai/models";
import { preprocessMealImage } from "@/lib/ai/image-preprocessing";
import { calculateMealNutrition, InputFoodItem } from "@/lib/ai/nutrition/calculator";
import {
  getMealVisionProvider,
  PhotoUnavailableError,
} from "@/lib/ai/providers";

export const maxDuration = 30;

// ── Legacy Groq Qwen Vision Schema & Prompts (Kept behind GROQ_VISION_ENABLED) ─

const VisionCandidateSchema = z.object({
  name: z.string().min(1),
  confidence: z.enum(["high", "medium", "low"]),
});

const VisionAnalysisSchema = z.object({
  candidates: z.array(VisionCandidateSchema).min(1).max(3),
  visibleItems: z.array(z.string().min(1)).min(1),
  ambiguity: z.enum(["low", "medium", "high"]),
  notes: z.string(),
});

type VisionAnalysis = z.infer<typeof VisionAnalysisSchema>;

const VISION_SYSTEM_PROMPT = `You are a visual food classifier specializing in Indian cuisine.
Identify dishes and items in the photo. Do NOT calculate macros or calories.

Visual distinction for flatbreads (probability hints, NOT absolutes):
- Stuffing cannot be confirmed from outside visual inspection alone.
- Thick, large, golden-brown with crisp blistered spots suggests paratha.
- Thin, soft, puffed suggests roti.
- Never treat "no visible sheen" as proof of chapati (dry or home-made parathas often lack surface sheen).
- If flatbreads are present, classify ambiguity as at least "medium".

Portion guidelines:
- Give approximate gram weights for each visible item (e.g. "2 rotis ~60g", "rice ~150g", "dal ~120g", "dahi ~100g", "sabzi ~120g") instead of vague units.

Candidates guidelines:
- Candidates must be DISTINCT dishes with different calorie impact.
- Merge synonyms (chapati = roti = phulka). Do NOT return synonyms as separate candidates.
- When flatbread is present, always include at least one alternative candidate with a different calorie class (e.g. if primary candidate is Plain Roti, include Paratha).

Return ONLY raw JSON matching this schema:
{
  "candidates": [{"name": "<distinct dish name>", "confidence": "high"|"medium"|"low"}],
  "visibleItems": ["<item with approximate gram weight, e.g. '2 rotis ~60g', 'dal ~120g'>"],
  "ambiguity": "low"|"medium"|"high",
  "notes": "<short visual deduction note>"
}`;

const VISION_USER_PROMPT = `Identify all visible food items with approximate gram weights and up to 3 distinct candidate dishes with confidence.`;

// ── Candidate Merging & Normalization Helpers ─────────────────────────────────

const FLATBREAD_REGEX = /\b(roti|chapati|chappati|phulka|fulka|paratha|parantha|naan|nan|puri|poori|bhatura|bhatoora|thepla|kulcha)\b/i;

function normalizeDishName(name: string): string {
  return name
    .replace(/\b(chapati|chappati|phulka|fulka)\b/gi, "Roti")
    .replace(/\bcurd\b/gi, "Dahi")
    .replace(/\s+/g, " ")
    .trim();
}

function mergeCandidates(
  candidates: { name: string; confidence: "high" | "medium" | "low" }[],
  hasFlatbread: boolean
): { name: string; confidence: "high" | "medium" | "low" }[] {
  const seen = new Set<string>();
  const merged: { name: string; confidence: "high" | "medium" | "low" }[] = [];

  for (const c of candidates) {
    const normalized = normalizeDishName(c.name);
    const key = normalized.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      merged.push({ name: normalized, confidence: c.confidence });
    }
  }

  // When flatbread is present, ensure there is at least one alternative from a different calorie class
  if (hasFlatbread && merged.length > 0) {
    const hasParatha = merged.some((c) => /paratha|parantha/i.test(c.name));
    const hasRoti = merged.some((c) => /\broti\b/i.test(c.name));

    // Extract accompaniments if any (e.g. "with Dahi")
    const matchWith = merged[0].name.match(/with\s+(.+)$/i);
    const suffix = matchWith ? ` with ${matchWith[1]}` : "";

    if (hasRoti && !hasParatha) {
      merged.push({ name: `Aloo Paratha${suffix}`, confidence: "medium" });
    } else if (hasParatha && !hasRoti) {
      merged.push({ name: `Plain Roti${suffix}`, confidence: "medium" });
    }
  }

  return merged.slice(0, 3);
}

// ── Route ─────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { imageBase64, mimeType, hint } = body as {
    imageBase64: string;
    mimeType: string;
    hint?: string;
  };

  if (!imageBase64 || !mimeType) {
    return NextResponse.json({ error: "imageBase64 and mimeType are required" }, { status: 400 });
  }

  const userId = (session?.user as any)?.id || session?.user?.email || "anonymous";

  // Server-side image preprocessing & downscaling
  let scaledBase64 = imageBase64;
  let scaledMime = mimeType;
  try {
    const preprocessed = await preprocessMealImage(imageBase64, mimeType);
    scaledBase64 = preprocessed.base64;
    scaledMime = preprocessed.mimeType;
  } catch (prepErr: any) {
    console.warn("[analyze-meal] Preprocessing warning, using raw buffer:", prepErr?.message);
  }

  try {
    let visionData: {
      foods: { name: string; quantity: number; unit: string; confidence: number }[];
      candidates: { name: string; confidence: "high" | "medium" | "low" }[];
      visibleItems: string[];
      ambiguity: "low" | "medium" | "high";
      notes: string;
    };

    if (GROQ_VISION_ENABLED) {
      // ── Optional Groq Qwen Vision Path (behind GROQ_VISION_ENABLED flag) ──
      const userPromptText =
        hint && hint.trim()
          ? `${VISION_USER_PROMPT}\nUSER HINT: "${hint.trim()}" (Take this into account if compatible with the image)`
          : VISION_USER_PROMPT;

      const visionResult = await callJsonStrict({
        model: MODELS.analyzeMeal,
        messages: [
          { role: "system", content: VISION_SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: userPromptText },
              {
                type: "image_url",
                image_url: { url: `data:${scaledMime};base64,${scaledBase64}` },
              },
            ] as any,
          },
        ],
        maxTokens: MAX_TOKENS.analyzeMeal,
        temperature: 0,
        schema: VisionAnalysisSchema,
        schemaName: "analyze-meal-vision",
        feature: "analyzeMeal",
      });
      visionData = {
        foods: visionResult.data.visibleItems.map((item) => ({
          name: item,
          quantity: 1,
          unit: "serving",
          confidence: 0.6,
        })),
        candidates: visionResult.data.candidates,
        visibleItems: visionResult.data.visibleItems,
        ambiguity: visionResult.data.ambiguity,
        notes: visionResult.data.notes,
      };
    } else {
      // ── Stage 1 Vision Path: Configured Provider (Default: Gemini) ───────────
      const provider = getMealVisionProvider();
      const visionResult = await provider.analyzeMeal({
        base64: scaledBase64,
        mimeType: scaledMime,
        hint,
        userKey: userId,
      });

      visionData = {
        foods: visionResult.foods,
        candidates: visionResult.candidates,
        visibleItems: visionResult.visibleItems,
        ambiguity: visionResult.ambiguity,
        notes: visionResult.notes,
      };
    }

    // Flatbread rule: check visible items and candidates for flatbread presence
    const hasFlatbread =
      visionData.visibleItems.some((i) => FLATBREAD_REGEX.test(i)) ||
      visionData.candidates.some((c) => FLATBREAD_REGEX.test(c.name));

    let ambiguity = visionData.ambiguity;
    let needsClarification:
      | { type: string; options: string[] }
      | undefined = undefined;

    if (hasFlatbread) {
      // If flatbread is present, set ambiguity to at least "medium"
      if (ambiguity === "low") ambiguity = "medium";

      const userSuppliedHint = Boolean(hint && hint.trim() && FLATBREAD_REGEX.test(hint));
      if (!userSuppliedHint) {
        needsClarification = {
          type: "flatbread",
          options: [
            "Plain roti",
            "Aloo paratha",
            "Other stuffed paratha",
            "Plain paratha",
            "Puri/Bhatura",
            "Naan",
          ],
        };
      }
    }

    // Merge synonyms and guarantee distinct calorie class alternative
    const distinctCandidates = mergeCandidates(visionData.candidates, hasFlatbread);
    const primaryCandidate =
      distinctCandidates[0] || { name: "Indian Meal", confidence: "medium" as const };

    // Stage 2: Deterministic Nutrition Calculation (standard Indian food composition references, zero LLM calls)
    const nutritionFoods: InputFoodItem[] =
      visionData.foods && visionData.foods.length > 0
        ? visionData.foods
        : visionData.visibleItems.map((item) => ({ name: item, quantity: 1, unit: "serving" }));

    const nutritionResult = calculateMealNutrition(nutritionFoods, primaryCandidate.name);

    // Response preserves all fields required by DietPage.tsx frontend, enriched with candidate & range details
    return NextResponse.json({
      name: primaryCandidate.name,
      calories: nutritionResult.calories,
      calorieRange: nutritionResult.calorieRange,
      proteinG: nutritionResult.proteinG,
      carbsG: nutritionResult.carbsG,
      fatG: nutritionResult.fatG,
      fiberG: nutritionResult.fiberG,
      confidence: primaryCandidate.confidence,
      notes: visionData.notes,
      candidates: distinctCandidates,
      visibleItems: visionData.visibleItems,
      ambiguity,
      foods: nutritionResult.items,
      unknownFoods: nutritionResult.unknownFoods,
      allFoodsVerified: nutritionResult.allFoodsVerified,
      requiresManualReview: nutritionResult.requiresManualReview,
      ...(needsClarification ? { needsClarification } : {}),
    });
  } catch (err: any) {
    console.error("[analyze-meal] AI error:", err?.code, err?.message);

    // Typed error PHOTO_UNAVAILABLE: UI prompts user to type or speak meal instead
    if (err instanceof PhotoUnavailableError || err?.code === "PHOTO_UNAVAILABLE" || err?.message?.includes("PHOTO_UNAVAILABLE")) {
      return NextResponse.json(
        {
          error: "PHOTO_UNAVAILABLE",
          message: "Photo scan is busy. Type or speak your meal instead.",
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: err?.message || "Failed to analyze meal image" },
      { status: 500 }
    );
  }
}
