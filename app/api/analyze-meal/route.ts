import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SYSTEM_PROMPT = `You are a highly accurate nutritionist AI with deep expertise in Indian cuisine from all regions — North Indian, South Indian, Maharashtrian, Bengali, Gujarati, Punjabi, and street food.
Your job is to analyse a meal photo and return precise macro + fiber estimates.
You MUST use the reference values provided. Do NOT use the USDA dry-weight database values for cooked Indian food — those are always wrong.
You MUST account for cooking oil, ghee, and masala used in Indian cooking.
Return ONLY raw JSON with no markdown, no explanation, no code block.`;

const USER_PROMPT = `Analyse the meal in this photo carefully.

=== STEP 0: VISUAL IDENTIFICATION GUIDE ===
Before estimating macros, correctly identify each dish using these visual cues:

FLATBREADS / PANCAKES (flat, round, cooked on tawa):
- Besan/Moong dal chilla: FLAT PANCAKE shape, golden-yellow, smooth or slightly pitted surface, edges slightly crispy. NOT scrambled. NOT in a bowl.
- Chapati/Roti: thin, dry, light brown spots from tawa, no batter sheen
- Paratha: thicker than roti, layered, flaky, often with ghee sheen
- Dosa: very thin, large, crispy edges, pale or golden

SCRAMBLED / CRUMBLED dishes (loose, broken-up texture):
- Egg bhurji / Paneer bhurji: loose, scrambled curds, chunks visible, usually with onion/tomato pieces
- Poha: flattened rice flakes, soft and fluffy, with mustard seeds visible

LIQUID / GRAVY dishes (in a bowl or katori, has visible liquid):
- Dal: liquid, pourable, in a bowl or katori
- Curry (chicken/paneer/etc): chunks in thick gravy, served in bowl
- Sambar: thin brownish liquid with vegetables

RICE dishes:
- Plain rice: white grains, fluffy, in a mound or bowl
- Biryani: layered rice, brownish/orange tint, with visible meat/veg pieces

⚠️ KEY RULE: If food is FLAT and ROUND like a pancake on a plate → it is a chilla/dosa/roti, NOT a bhurji or dal.

=== STEP 1: IDENTIFY EVERY ITEM ===
Look at the SHAPE, TEXTURE and FORM first, then name the dish.
List each visible food item, estimated portion size, preparation method, and visible ghee/oil.
Be specific: "2 besan chilla (flat round pancakes, golden yellow)", "~120g cooked soy nuggets in masala", "small katori dal (~150ml)", etc.

=== STEP 2: APPLY EXACT REFERENCE VALUES (per item) ===

── BREADS ──────────────────────────────────────────────────────────
Chapati/Roti (plain, 1 piece, 30g): 80 kcal | 3g P | 15g C | 1g F | 1.5g fiber
Chapati with ghee (1 piece): 110 kcal | 3g P | 15g C | 3.5g F | 1.5g fiber
Paratha plain (1 piece, 60g): 150 kcal | 3g P | 22g C | 6g F | 2g fiber
Aloo paratha (1 piece): 200 kcal | 5g P | 28g C | 8g F | 3g fiber
Methi/stuffed paratha (1 piece): 190 kcal | 5g P | 26g C | 7g F | 3g fiber
Naan (1 piece, restaurant): 260 kcal | 8g P | 45g C | 5g F | 2g fiber
Tandoori roti (1 piece): 100 kcal | 3g P | 18g C | 2g F | 2g fiber
Bhatura (1 piece, large): 280 kcal | 7g P | 40g C | 10g F | 2g fiber
Puri (1 piece, deep fried): 120 kcal | 2g P | 14g C | 6g F | 1g fiber

── RICE & RICE DISHES ──────────────────────────────────────────────
Plain rice cooked (150g): 195 kcal | 4g P | 43g C | 0.4g F | 0.5g fiber
Jeera rice (150g): 220 kcal | 4g P | 43g C | 3g F | 0.5g fiber
Biryani — veg (200g): 280 kcal | 6g P | 45g C | 8g F | 3g fiber
Biryani — chicken (250g): 380 kcal | 22g P | 45g C | 12g F | 3g fiber
Biryani — mutton (250g): 420 kcal | 24g P | 45g C | 14g F | 3g fiber
Pulao/veg (150g): 230 kcal | 5g P | 40g C | 5g F | 2g fiber
Curd rice (150g): 180 kcal | 5g P | 30g C | 4g F | 1g fiber
Lemon rice (150g): 210 kcal | 4g P | 40g C | 4g F | 1.5g fiber

── DAL & LEGUMES ───────────────────────────────────────────────────
Toor/arhar dal cooked (200ml katori): 150 kcal | 10g P | 25g C | 2g F | 5g fiber
Moong dal cooked (200ml): 120 kcal | 8g P | 18g C | 1g F | 4g fiber
Masoor dal cooked (200ml): 140 kcal | 10g P | 22g C | 1g F | 8g fiber
Chana dal cooked (200ml): 180 kcal | 12g P | 28g C | 3g F | 8g fiber
Dal makhani (200ml): 240 kcal | 11g P | 25g C | 12g F | 7g fiber
Rajma cooked (200ml): 200 kcal | 13g P | 30g C | 3g F | 9g fiber
Chole/chickpeas cooked (200ml): 210 kcal | 12g P | 32g C | 4g F | 9g fiber
Sambar (150ml): 65 kcal | 3g P | 10g C | 1.5g F | 3g fiber

── PANEER & DAIRY ──────────────────────────────────────────────────
Paneer raw (100g): 265 kcal | 18g P | 3g C | 20g F | 0g fiber
Paneer bhurji (150g): 290 kcal | 20g P | 5g C | 22g F | 1g fiber
Palak paneer (200g): 280 kcal | 16g P | 10g C | 20g F | 4g fiber
Matar paneer (200g): 260 kcal | 14g P | 14g C | 18g F | 4g fiber
Shahi paneer (200g): 350 kcal | 16g P | 12g C | 28g F | 2g fiber
Curd/dahi (100g): 60 kcal | 3g P | 5g C | 3g F | 0g fiber
Raita (150g): 75 kcal | 3g P | 6g C | 4g F | 1g fiber
Lassi sweet (250ml): 180 kcal | 7g P | 28g C | 5g F | 0g fiber
Lassi salted/chaas (250ml): 70 kcal | 4g P | 8g C | 2g F | 0g fiber

── EGG DISHES ──────────────────────────────────────────────────────
Boiled egg (1 large): 78 kcal | 6g P | 0.6g C | 5g F | 0g fiber
Egg bhurji 2 eggs (with onion, oil): 220 kcal | 13g P | 5g C | 16g F | 1g fiber
Egg curry 2 eggs: 260 kcal | 14g P | 6g C | 20g F | 2g fiber
Omelette 2 eggs (masala): 200 kcal | 13g P | 4g C | 15g F | 1g fiber

── CHICKEN & MEAT ──────────────────────────────────────────────────
Chicken curry (150g with gravy): 230 kcal | 28g P | 5g C | 10g F | 1g fiber
Chicken tikka (100g, grilled): 160 kcal | 26g P | 4g C | 5g F | 0g fiber
Butter chicken (200g with gravy): 320 kcal | 26g P | 10g C | 20g F | 1g fiber
Mutton curry (150g): 280 kcal | 25g P | 5g C | 18g F | 1g fiber
Fish curry (150g): 200 kcal | 22g P | 5g C | 10g F | 1g fiber

── SOY / PLANT PROTEIN ─────────────────────────────────────────────
Soy chunks/nuggets COOKED (100g): 112 kcal | 15g P | 8g C | 0.5g F | 1g fiber
  ALWAYS use cooked weight (1 dry = 2.5x cooked). Add 60 kcal for masala/oil.
  Typical katori (~150g cooked + masala): 228 kcal | 22g P | 12g C | 4g F | 1.5g fiber
Tofu (100g): 75 kcal | 8g P | 2g C | 4g F | 0.3g fiber

── SOUTH INDIAN ────────────────────────────────────────────────────
Idli (1 piece, 40g): 40 kcal | 1.5g P | 8g C | 0.2g F | 0.5g fiber
Dosa plain medium: 130 kcal | 3g P | 24g C | 2g F | 1g fiber
Masala dosa: 210 kcal | 5g P | 32g C | 7g F | 3g fiber
Uttapam medium: 180 kcal | 5g P | 28g C | 5g F | 2g fiber
Medu vada (1 piece): 100 kcal | 3g P | 12g C | 5g F | 1g fiber
Appam (1 piece): 90 kcal | 2g P | 17g C | 1g F | 0.5g fiber
Coconut chutney (30g): 55 kcal | 0.5g P | 2g C | 5g F | 1g fiber

── BREAKFAST DISHES ────────────────────────────────────────────────
Poha (150g cooked): 180 kcal | 3g P | 36g C | 3g F | 2g fiber
Upma (150g): 190 kcal | 5g P | 32g C | 5g F | 3g fiber
Besan chilla (1 piece, 80g): 130 kcal | 6g P | 17g C | 4g F | 3g fiber
Moong dal chilla (1 piece): 110 kcal | 7g P | 15g C | 2g F | 4g fiber

── VEGETABLES & SIDES ──────────────────────────────────────────────
Aloo sabzi (100g): 90 kcal | 2g P | 20g C | 0.5g F | 2g fiber
Aloo gobhi (150g): 120 kcal | 3g P | 18g C | 4g F | 4g fiber
Bhindi/okra masala (100g): 80 kcal | 2g P | 10g C | 4g F | 3g fiber
Baingan bharta (100g): 90 kcal | 2g P | 10g C | 5g F | 4g fiber
Palak/spinach sabzi (100g): 80 kcal | 3g P | 8g C | 4g F | 4g fiber
Mixed veg curry (150g): 130 kcal | 3g P | 15g C | 6g F | 4g fiber
Raw salad mix (100g): 35 kcal | 1g P | 7g C | 0.2g F | 2g fiber
Pickle/achaar (10g): 20 kcal | 0g P | 2g C | 1g F | 0.2g fiber

── STREET FOOD ─────────────────────────────────────────────────────
Samosa (1 medium): 150 kcal | 3g P | 18g C | 7g F | 2g fiber
Kachori (1 medium): 180 kcal | 4g P | 22g C | 8g F | 3g fiber
Pav bhaji (2 pav + bhaji): 420 kcal | 11g P | 62g C | 14g F | 8g fiber
Vada pav (1): 290 kcal | 6g P | 40g C | 12g F | 3g fiber
Bhel puri (1 plate): 200 kcal | 5g P | 38g C | 4g F | 4g fiber
Dhokla (2 pieces, 80g): 150 kcal | 5g P | 24g C | 4g F | 2g fiber
Chole bhature (1 bhatura + 150ml chole): 490 kcal | 15g P | 68g C | 16g F | 10g fiber

── SWEETS & DESSERTS ───────────────────────────────────────────────
Kheer (150ml): 200 kcal | 5g P | 32g C | 6g F | 0g fiber
Gulab jamun (1 piece): 140 kcal | 2g P | 22g C | 5g F | 0g fiber
Rasgulla (1 piece): 100 kcal | 3g P | 20g C | 1g F | 0g fiber
Halwa sooji (100g): 220 kcal | 3g P | 35g C | 8g F | 1g fiber
Ladoo besan (1 piece, 50g): 180 kcal | 4g P | 25g C | 8g F | 2g fiber
Barfi/milk barfi (1 piece, 40g): 160 kcal | 4g P | 22g C | 6g F | 0g fiber

── BEVERAGES ───────────────────────────────────────────────────────
Chai with milk + sugar (150ml): 70 kcal | 2g P | 10g C | 2g F | 0g fiber
Black chai no sugar (150ml): 5 kcal | 0g P | 1g C | 0g F | 0g fiber

=== OIL/GHEE ADJUSTMENTS ===
- If ghee is visible/shiny on food: add 45 kcal per tsp (visible drizzle = 1 tsp)
- Home-cooked sabzi uses ~1 tbsp oil per serving: +120 kcal, +14g F
- Restaurant dishes use 1.5–2× more oil than home cooking
- Tadka/tempering dal: +30 kcal per serving

=== PORTION CALIBRATION ===
- Standard katori = ~150–200ml
- A typical Indian thali (home): 500–750 kcal
- A restaurant thali: 700–1100 kcal
- Student/small meal: 350–500 kcal
- NEVER exceed 1000 kcal unless the plate is clearly very large
- Do NOT use USDA dry-weight protein values — they are always 2-3× too high for cooked Indian food

=== STEP 3: VERIFY ===
1. Sum all items. Does the total match what you see on the plate?
2. Would a typical Indian person eating this at home feel this is reasonable?
3. If total exceeds 900 kcal, re-check portions — you have likely overestimated.

Return EXACTLY this JSON (integers only, no decimals):
{
  "name": "Short descriptive name (e.g. 'Dal-Chawal with Sabzi')",
  "calories": <integer>,
  "proteinG": <integer>,
  "carbsG": <integer>,
  "fatG": <integer>,
  "fiberG": <integer>,
  "confidence": "high|medium|low",
  "notes": "Breakdown: item1 (~Xkcal, Yg P) + item2 (~Xkcal, Yg P) + ..."
}`;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { imageBase64, mimeType } = body;

  const VISION_MODELS = ["openai/gpt-oss-120b", "qwen/qwen3.8-27b"];
  let content = "";
  let lastErr: any = null;

  for (const model of VISION_MODELS) {
    try {
      const completion = await groq.chat.completions.create({
        model,
        temperature: 0,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: USER_PROMPT },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${imageBase64}`,
                },
              },
            ],
          },
        ],
        max_tokens: 650,
      });

      content = completion.choices[0]?.message?.content ?? "";
      if (content) break;
    } catch (err: any) {
      console.warn(`Vision model ${model} failed:`, err?.message || err);
      lastErr = err;
    }
  }

  if (!content) {
    console.error("analyze-meal error (all vision models failed):", lastErr);
    return NextResponse.json({ error: lastErr?.message || "Failed to analyze meal image" }, { status: 500 });
  }

  const cleaned = content.replace(/```(?:json)?\n?|\n?```/g, "").trim();

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return NextResponse.json({ error: "No JSON found in AI response" }, { status: 500 });
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      return NextResponse.json({ error: "Invalid JSON from AI response" }, { status: 500 });
    }
  }

  const result = {
    name:       String(parsed.name ?? "Scanned meal"),
    calories:   Math.round(Number(parsed.calories ?? 0)),
    proteinG:   Math.round(Number(parsed.proteinG ?? 0)),
    carbsG:     Math.round(Number(parsed.carbsG ?? 0)),
    fatG:       Math.round(Number(parsed.fatG ?? 0)),
    fiberG:     Math.round(Number(parsed.fiberG ?? 0)),
    confidence: String(parsed.confidence ?? "medium"),
    notes:      String(parsed.notes ?? ""),
  };

  return NextResponse.json(result);
}
