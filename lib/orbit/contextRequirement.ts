// lib/orbit/contextRequirement.ts

/**
 * Types representing which parts of the OrbitContext are needed for a request.
 */
export type ContextDomain =
  | "profile"
  | "goals"
  | "preferences"
  | "meals"
  | "nutrition"
  | "workouts"
  | "tasks"
  | "habits"
  | "dailyPlan";

/** Temporal scope for data retrieval */
export type TemporalScope = "today" | "yesterday" | "recent" | "none";

export interface ContextRequirements {
  domains: ContextDomain[];
  temporalScope?: TemporalScope;
}

/**
 * Naïve keyword‑based inference of required context domains and temporal scope.
 * This is deterministic and does not call any external services – suitable for Phase 1.
 */
export function inferContextRequirements(message: string): ContextRequirements {
  const lower = message.toLowerCase();
  const domains: ContextDomain[] = [];
  let temporal: TemporalScope | undefined;

  // Detect domains based on simple keyword matching
  if (/\b(profile|name|age|weight|height)\b/.test(lower)) domains.push("profile");
  if (/\b(goal|target|macro|calorie|protein|carb|fat)\b/.test(lower)) {
    domains.push("goals");
    domains.push("nutrition");
  }
  if (/\b(preference|diet|taste|vegetarian|vegan)\b/.test(lower)) domains.push("preferences");
  if (/\b(meal|eat|food|breakfast|lunch|dinner|snack)\b/.test(lower)) {
    domains.push("meals");
    domains.push("nutrition");
  }
  if (/\b(workout|exercise|train|gym|run)\b/.test(lower)) domains.push("workouts");
  if (/\b(task|todo|habit|schedule|plan)\b/.test(lower)) domains.push("tasks");
  if (/\b(habit)\b/.test(lower)) domains.push("habits");
  if (/\b(daily plan|schedule)\b/.test(lower)) domains.push("dailyPlan");

  // Temporal scope detection
  if (/\btoday\b/.test(lower)) temporal = "today";
  else if (/\byesterday\b/.test(lower) || /\blast night\b/.test(lower) || /\blast afternoon\b/.test(lower)) temporal = "yesterday";
  else if (/\brecent\b/.test(lower) || /\blast week\b/.test(lower) || /\b2 days ago\b/.test(lower)) temporal = "recent";

  // Fallback: if no domains detected, include a minimal safe set
  if (domains.length === 0) {
    domains.push("profile", "goals", "preferences");
  }

  return { domains, temporalScope: temporal };
}
