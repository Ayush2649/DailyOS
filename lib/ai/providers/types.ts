/**
 * lib/ai/providers/types.ts
 *
 * Core interfaces and types for Stage 1 (Vision) Meal Analysis Providers.
 * Both Gemini and DeepSeek implement these identical contracts.
 */

export interface MealVisionInput {
  base64: string;
  mimeType: string;
  hint?: string;
  userKey?: string;
}

export interface MealVisionFoodItem {
  name: string;
  quantity: number;
  unit: string;
  confidence: number;
}

export interface MealVisionCandidate {
  name: string;
  confidence: "high" | "medium" | "low";
  rawConfidence: number;
}

export interface MealVisionUsage {
  promptTokens: number;
  completionTokens: number;
  thinkingTokens?: number;
  cachedTokens?: number;
  totalTokens: number;
  latencyMs: number;
  estimatedCostUsd?: number;
}

export interface MealVisionResult {
  foods: MealVisionFoodItem[];
  candidates: MealVisionCandidate[];
  visibleItems: string[];
  ambiguity: "low" | "medium" | "high";
  notes: string;
  model: string;
  provider: "gemini" | "deepseek";
  usage: MealVisionUsage;
}

export interface CircuitBreakerState {
  consecutiveFailures: number;
  circuitOpenUntil: number;
  halfOpenInFlight: boolean;
  isOpen: boolean;
}

export interface MealVisionProvider {
  readonly id: "gemini" | "deepseek";
  analyzeMeal(input: MealVisionInput): Promise<MealVisionResult>;
  isCircuitOpen(userKey?: string): boolean;
  recordSuccess(userKey?: string): void;
  recordFailure(userKey?: string): void;
  resetCircuitBreaker(userKey?: string): void;
  getCircuitBreakerState(userKey?: string): CircuitBreakerState;
}

export class PhotoUnavailableError extends Error {
  readonly code = "PHOTO_UNAVAILABLE";
  constructor(message = "Photo scan is busy. Type or speak your meal instead.") {
    super(message);
    this.name = "PhotoUnavailableError";
  }
}

