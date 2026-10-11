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
export type TemporalScope = "today" | "yesterday" | "recent" | "none" | "last7Days" | "thisWeek" | "lastWeek" | "twoWeeksAgo";

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
  if (/\b(profiles?|names?|age|weights?|heights?)\b/.test(lower)) domains.push("profile");
  if (/\b(goals?|targets?|macros?|calories?|proteins?|carbs?|fats?)\b/.test(lower)) {
    domains.push("goals");
    domains.push("nutrition");
  }
  if (/\b(preferences?|tastes?|vegetarian|vegan)\b/.test(lower)) domains.push("preferences");
  if (/\b(meals?|eat|eating|ate|food|breakfast|lunch|dinner|snacks?|nutrition|nutrients)\b/.test(lower)) {
    domains.push("meals");
    domains.push("nutrition");
  }
  if (/\b(workouts?|exercises?|train|training|gym|runs?|running|cardio)\b/.test(lower)) domains.push("workouts");
  if (/\b(tasks?|todos?|habits?|schedules?|plans?)\b/.test(lower)) domains.push("tasks");
  if (/\b(habits?)\b/.test(lower)) domains.push("habits");
  if (/\b(daily plan|schedules?)\b/.test(lower)) domains.push("dailyPlan");

  // Temporal scope detection
  if (/\btoday\b/.test(lower)) temporal = "today";
  else if (/\byesterday\b/.test(lower) || /\blast night\b/.test(lower) || /\blast afternoon\b/.test(lower)) temporal = "yesterday";
  else if (/\b(last\s+7\s+days|past\s+7\s+days|last\s+seven\s+days)\b/.test(lower)) temporal = "last7Days";
  else if (/\bthis\s+week\b/.test(lower)) temporal = "thisWeek";
  else if (/\blast\s+week\b/.test(lower)) temporal = "lastWeek";
  else if (/\btwo\s+weeks\s+ago\b/.test(lower)) temporal = "twoWeeksAgo";
  else if (/\brecent\b/.test(lower) || /\b2\s+days\s+ago\b/.test(lower)) temporal = "recent";

  // Fallback: if no domains detected, include a minimal safe set
  if (domains.length === 0) {
    domains.push("profile", "goals", "preferences");
  }

  return { domains, temporalScope: temporal };
}
