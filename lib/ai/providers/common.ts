/**
 * lib/ai/providers/common.ts
 *
 * Shared prompts, schemas, vocabulary, and circuit breaker logic
 * for all Meal Vision Providers (Gemini and DeepSeek).
 */

import { z } from "zod";
import dishVocab from "../data/dish-vocab.json";
import { CircuitBreakerState } from "./types";

// ── Shared Vision Prompt & Vocabulary ─────────────────────────────────────────

export const VISION_SYSTEM_PROMPT = `You are an expert visual food classifier specializing in Indian cuisine.
Identify dishes and items in the photo. Do NOT calculate macros or calories.

CRITICAL RULES:
- The plate can be ANY Indian dish (cheela, dosa, uttapam, poha, upma, khichdi, halwa, rice dishes, thalis, street food, snacks, etc.). Do not assume it is a flatbread unless clearly visible.
- Chapati vs Paratha: Chapati is thin, soft, puffed with dry tawa spots; Paratha is thicker, layered, crisp or golden-brown with ghee/oil.
- When unsure or when dishes look visually similar, explain your uncertainty in notes and lower your confidence score.
- Notes must be concise (1-2 sentences maximum, under 40 words). Do not include conversational filler or lengthy essays.
- For each visible food item, specify the name, approximate numeric quantity, and unit (prefer grams 'g' or 'ml' if known/estimated, e.g. 120 g, 160 g, 190 ml, or piece, katori, bowl, plate, cup, tbsp, serving).
- In 'foods', specify the exact numeric quantity and unit corresponding to the detected physical portion.
- Candidates must be DISTINCT dishes with different calorie impacts. Return a numeric confidence from 0.0 to 1.0 for each candidate.
- Return up to 3 candidate dishes sorted by confidence descending.

Return ONLY raw JSON matching this schema:
{
  "foods": [
    {"name": "<dish or item name>", "quantity": <number>, "unit": "<g|ml|piece|katori|plate|bowl|cup|serving>", "confidence": <float 0.0-1.0>}
  ],
  "candidates": [{"name": "<dish name>", "confidence": <float 0.0-1.0>}],
  "visibleItems": ["<item with approximate gram weight>"],
  "ambiguity": "low"|"medium"|"high",
  "notes": "<concise 1-2 sentence visual deduction explanation>"
}`;

export const DISH_NAMES_LIST = (dishVocab as { name: string }[]).map((d) => d.name).join(", ");

export const STATIC_INSTRUCTIONS_AND_VOCAB = `Identify all visible food items with approximate quantities, units, and gram weights, and up to 3 distinct candidate dishes with numeric confidence (0.0 to 1.0).

DISH VOCABULARY LIST: [${DISH_NAMES_LIST}]
RULE: Pick the closest name from this vocabulary list; if none fits, return your best name prefixed with 'other:'.`;

// ── Shared Zod Schema & Output Parsing ───────────────────────────────────────

export const VisionFoodItemSchema = z.object({
  name: z.string().min(1),
  quantity: z.coerce.number().min(0.1).default(1),
  unit: z.string().default("serving"),
  confidence: z.coerce.number().min(0).max(1).default(0.7),
});

export type VisionFoodItem = z.infer<typeof VisionFoodItemSchema>;

export const VisionCandidateSchema = z.object({
  name: z.string().min(1),
  confidence: z.coerce.number().min(0).max(1).default(0.5),
});

export const VisionAnalysisSchema = z.object({
  foods: z.array(VisionFoodItemSchema).default([]),
  candidates: z.array(VisionCandidateSchema).default([]),
  visibleItems: z.array(z.string()).default([]),
  ambiguity: z.enum(["low", "medium", "high"]).default("high"),
  notes: z.string().default(""),
});

export type VisionAnalysis = z.infer<typeof VisionAnalysisSchema>;

export function cleanDishName(name: string): string {
  return name.replace(/^other:\s*/i, "").trim();
}

/**
 * Extracts approximate numeric quantity and normalized unit from a text string.
 * Examples:
 * - "French fries ~110-120g" -> { quantity: 115, unit: "g" }
 * - "French fries 120g" -> { quantity: 120, unit: "g" }
 * - "Burger ~160g" -> { quantity: 160, unit: "g" }
 * - "160g Burger" -> { quantity: 160, unit: "g" }
 * - "Coffee ~190ml" -> { quantity: 190, unit: "ml" }
 * - "190ml Coffee" -> { quantity: 190, unit: "ml" }
 * - "2 chapatis" -> { quantity: 2, unit: "piece" }
 * - "1 katori dal" -> { quantity: 1, unit: "katori" }
 * - "1 plate rice" -> { quantity: 1, unit: "plate" }
 */
export function parsePortionFromText(
  text: string
): { quantity: number; unit: string } | null {
  if (!text || typeof text !== "string") return null;
  const str = text.trim();

  // 1. Range grams/ml: e.g. ~110-120g, 100 to 150 ml
  const rangeMatch = str.match(
    /(?:~|approx\.?|about)?\s*(\d+(?:\.\d+)?)\s*(?:-|to)\s*(\d+(?:\.\d+)?)\s*(g|grams?|ml|milliliters?)\b/i
  );
  if (rangeMatch) {
    const q1 = parseFloat(rangeMatch[1]);
    const q2 = parseFloat(rangeMatch[2]);
    const avg = Math.round((q1 + q2) / 2);
    const u = rangeMatch[3].toLowerCase().startsWith("m") ? "ml" : "g";
    return { quantity: avg, unit: u };
  }

  // 2. Single grams/ml: e.g. ~120g, 160 g, 190ml, 190 ml
  const gramMlMatch = str.match(
    /(?:~|approx\.?|about)?\s*(\d+(?:\.\d+)?)\s*(g|grams?|ml|milliliters?)\b/i
  );
  if (gramMlMatch) {
    const q = parseFloat(gramMlMatch[1]);
    const u = gramMlMatch[2].toLowerCase().startsWith("m") ? "ml" : "g";
    return { quantity: q, unit: u };
  }

  // 3. Counted standard container/piece units: e.g. 2 katori, 1 bowl, 2 pieces, 3 slices
  const containerMatch = str.match(
    /(?:~|approx\.?|about)?\s*(\d+(?:\.\d+)?)\s*(katori|bowl|plate|cup|glass|piece|pieces|slice|slices|tbsp|tsp|serving|servings)\b/i
  );
  if (containerMatch) {
    const q = parseFloat(containerMatch[1]);
    const rawUnit = containerMatch[2].toLowerCase();
    const u = rawUnit.endsWith("s") && rawUnit !== "glass" ? rawUnit.slice(0, -1) : rawUnit;
    return { quantity: q, unit: u };
  }

  // 4. Count before food name (e.g. "2 chapatis", "2 rotis", "1 paratha", "2 samosas")
  const leadingCountMatch = str.match(
    /^\s*(\d+(?:\.\d+)?)\s+(?:piece|pieces\s+of\s+)?([a-zA-Z]+)/i
  );
  if (leadingCountMatch) {
    const q = parseFloat(leadingCountMatch[1]);
    const nextWord = leadingCountMatch[2].toLowerCase();
    if (
      /^(chapati|chapatis|roti|rotis|paratha|parathas|puri|puris|bhatura|bhature|idli|idlis|vada|vadas|samosa|samosas|dosa|dosas|egg|eggs)$/.test(
        nextWord
      )
    ) {
      return { quantity: q, unit: "piece" };
    }
  }

  return null;
}

/**
 * Reconciles parsed foods with visibleItems strings.
 * If a food item has a generic unit ('serving', 'portion') or unstated portion,
 * this checks visibleItems for matching portion descriptions (e.g. 'French fries ~110-120g')
 * and upgrades the food's quantity and unit to the vision-detected portion.
 */
export function reconcileFoodPortions(
  foods: VisionFoodItem[],
  visibleItems: string[]
): VisionFoodItem[] {
  if (!foods || foods.length === 0) return [];
  if (!visibleItems || visibleItems.length === 0) return foods;

  return foods.map((food) => {
    // 1. Check if the food's own name has portion information
    const selfPortion = parsePortionFromText(food.name);
    if (selfPortion) {
      const cleaned = cleanDishName(
        food.name
          .replace(
            /(?:~|approx\.?|about)?\s*\d+(?:\.\d+)?\s*(?:(?:-|to)\s*\d+(?:\.\d+)?\s*)?(?:g|grams?|ml|milliliters?|katori|bowl|plate|cup|glass|piece|pieces|slice|slices|tbsp|tsp|serving|servings)\b/gi,
            ""
          )
          .replace(/[()]/g, "")
          .trim()
      );
      return {
        ...food,
        name: cleaned || food.name,
        quantity: selfPortion.quantity,
        unit: selfPortion.unit,
      };
    }

    // 2. If the food has a generic unit ('serving', 'portion'), look in visibleItems
    const u = (food.unit || "").toLowerCase().trim();
    if (u === "serving" || u === "portion" || u === "") {
      const foodNameLower = food.name.toLowerCase();
      const matchedVisible = visibleItems.find((v) => {
        const vLower = v.toLowerCase();
        return (
          vLower.includes(foodNameLower) ||
          foodNameLower.includes(cleanDishName(vLower).replace(/~.*$/, "").trim())
        );
      });

      if (matchedVisible) {
        const portion = parsePortionFromText(matchedVisible);
        if (portion) {
          return {
            ...food,
            quantity: portion.quantity,
            unit: portion.unit,
          };
        }
      }
    }

    return food;
  });
}

export function parseVisionJsonWithDefaults(rawJsonStr: string): VisionAnalysis {
  let parsed: any;
  try {
    parsed = JSON.parse(rawJsonStr);
  } catch (err: any) {
    throw new Error(`JSON parse error: ${err.message}. Raw output: ${rawJsonStr.slice(0, 150)}`);
  }

  const validated = VisionAnalysisSchema.parse(parsed);

  if (validated.candidates.length === 0) {
    validated.candidates.push({ name: "Unknown Indian Dish", confidence: 0.2 });
  }

  if (validated.foods.length === 0) {
    if (validated.visibleItems.length > 0) {
      validated.foods = validated.visibleItems.map((item) => {
        const portion = parsePortionFromText(item);
        const name =
          cleanDishName(
            item
              .replace(
                /(?:~|approx\.?|about)?\s*\d+(?:\.\d+)?\s*(?:(?:-|to)\s*\d+(?:\.\d+)?\s*)?(?:g|grams?|ml|milliliters?|katori|bowl|plate|cup|glass|piece|pieces|slice|slices|tbsp|tsp|serving|servings)\b/gi,
                ""
              )
              .replace(/[()]/g, "")
              .trim()
          ) || cleanDishName(item);
        return {
          name,
          quantity: portion?.quantity ?? 1,
          unit: portion?.unit ?? "serving",
          confidence: 0.6,
        };
      });
    } else {
      validated.foods = validated.candidates.map((c) => ({
        name: cleanDishName(c.name),
        quantity: 1,
        unit: "serving",
        confidence: c.confidence,
      }));
    }
  } else {
    validated.foods = reconcileFoodPortions(validated.foods, validated.visibleItems);
  }

  return validated;
}

export function computeEffectiveAmbiguity(
  candidates: { name: string; confidence: number }[],
  modelReportedAmbiguity: "low" | "medium" | "high"
): "low" | "medium" | "high" {
  if (candidates.length === 0) return "high";
  const top1 = candidates[0];
  const top2 = candidates[1];

  if (top1 && top2) {
    const diff = Math.abs(top1.confidence - top2.confidence);
    if (diff < 0.15 && top1.confidence >= 0.35) {
      return "high";
    }
    if (diff < 0.25) {
      return modelReportedAmbiguity === "high" ? "high" : "medium";
    }
  }

  if (top1 && top1.confidence < 0.5) {
    return modelReportedAmbiguity === "low" ? "medium" : modelReportedAmbiguity;
  }

  return modelReportedAmbiguity;
}

// ── Isolated Per-User Circuit Breaker Factory ─────────────────────────────────

interface UserCircuitState {
  consecutiveFailures: number;
  circuitOpenUntil: number;
  halfOpenInFlight: boolean;
  lastUpdated: number;
}

export interface UserCircuitBreaker {
  isCircuitOpen(userKey?: string): boolean;
  recordSuccess(userKey?: string): void;
  recordFailure(userKey?: string): void;
  resetCircuitBreaker(userKey?: string): void;
  getCircuitBreakerState(userKey?: string): CircuitBreakerState;
}

export function createUserCircuitBreaker(providerName: string): UserCircuitBreaker {
  const userCircuitMap = new Map<string, UserCircuitState>();
  const PRUNE_INTERVAL_MS = 60 * 60 * 1000;
  let lastPruneTime = Date.now();

  function getOrCreateUserState(userKey: string): UserCircuitState {
    const now = Date.now();
    if (now - lastPruneTime > PRUNE_INTERVAL_MS) {
      userCircuitMap.forEach((state, key) => {
        if (now - state.lastUpdated > PRUNE_INTERVAL_MS) {
          userCircuitMap.delete(key);
        }
      });
      lastPruneTime = now;
    }

    let state = userCircuitMap.get(userKey);
    if (!state) {
      state = {
        consecutiveFailures: 0,
        circuitOpenUntil: 0,
        halfOpenInFlight: false,
        lastUpdated: now,
      };
      userCircuitMap.set(userKey, state);
    }
    state.lastUpdated = now;
    return state;
  }

  return {
    isCircuitOpen(userKey = "global"): boolean {
      const state = getOrCreateUserState(userKey);
      const now = Date.now();
      if (state.circuitOpenUntil === 0) {
        return false;
      }
      if (now < state.circuitOpenUntil) {
        return true;
      }
      if (state.halfOpenInFlight) {
        return true;
      }
      state.halfOpenInFlight = true;
      return false;
    },

    recordSuccess(userKey = "global"): void {
      const state = getOrCreateUserState(userKey);
      state.consecutiveFailures = 0;
      state.circuitOpenUntil = 0;
      state.halfOpenInFlight = false;
    },

    recordFailure(userKey = "global"): void {
      const state = getOrCreateUserState(userKey);
      state.halfOpenInFlight = false;
      state.consecutiveFailures++;
      if (state.consecutiveFailures >= 3 || state.circuitOpenUntil > 0) {
        state.circuitOpenUntil = Date.now() + 30 * 1000;
        console.warn(
          `[ai/${providerName}] Circuit breaker TRIPPED for user '${userKey}' after ${state.consecutiveFailures} failures. Skipping ${providerName} until ${new Date(
            state.circuitOpenUntil
          ).toISOString()}`
        );
      }
    },

    resetCircuitBreaker(userKey?: string): void {
      if (userKey) {
        userCircuitMap.delete(userKey);
      } else {
        userCircuitMap.clear();
      }
    },

    getCircuitBreakerState(userKey = "global"): CircuitBreakerState {
      const state = getOrCreateUserState(userKey);
      const now = Date.now();
      return {
        consecutiveFailures: state.consecutiveFailures,
        circuitOpenUntil: state.circuitOpenUntil,
        halfOpenInFlight: state.halfOpenInFlight,
        isOpen: state.circuitOpenUntil > 0 && now < state.circuitOpenUntil,
      };
    },
  };
}

