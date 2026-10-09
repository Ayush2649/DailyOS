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
- For each visible food item, specify the name, approximate numeric quantity, and unit (e.g. piece, katori, bowl, plate, cup, tbsp, grams, serving).
- Candidates must be DISTINCT dishes with different calorie impacts. Return a numeric confidence from 0.0 to 1.0 for each candidate.
- Return up to 3 candidate dishes sorted by confidence descending.

Return ONLY raw JSON matching this schema:
{
  "foods": [
    {"name": "<dish or item name>", "quantity": <number>, "unit": "<piece|katori|plate|bowl|cup|g|serving>", "confidence": <float 0.0-1.0>}
  ],
  "candidates": [{"name": "<dish name>", "confidence": <float 0.0-1.0>}],
  "visibleItems": ["<item with approximate gram weight>"],
  "ambiguity": "low"|"medium"|"high",
  "notes": "<visual deduction explanation>"
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
      validated.foods = validated.visibleItems.map((item) => ({
        name: cleanDishName(item),
        quantity: 1,
        unit: "serving",
        confidence: 0.6,
      }));
    } else {
      validated.foods = validated.candidates.map((c) => ({
        name: cleanDishName(c.name),
        quantity: 1,
        unit: "serving",
        confidence: c.confidence,
      }));
    }
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

