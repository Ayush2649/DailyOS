import type { WorkoutTemplate } from "@/types";

/**
 * Identifies if a template is a global system/preset template (Starter Library).
 */
export function isSystemTemplate(tpl: WorkoutTemplate): boolean {
  return tpl.source === "system" || tpl.isPreset === true || tpl.userId === "";
}

/**
 * Identifies if a template was generated for the user's starter onboarding routine.
 * Robust against legacy documents that might lack the explicit `source` or `isOnboarding` tag.
 */
export function isOnboardingTemplate(
  tpl: WorkoutTemplate,
  assignedRoutine?: { templateIds: string[] } | null,
  userId?: string
): boolean {
  if (isSystemTemplate(tpl)) return false;
  if (tpl.source === "onboarding") return true;
  if (tpl.isOnboarding === true) return true;
  if (assignedRoutine?.templateIds?.includes(tpl.id)) return true;
  if (tpl.id.startsWith("tpl_onboarding_")) return true;
  if (userId && tpl.id.startsWith(`tpl_onboarding_${userId}_`)) return true;
  return false;
}

/**
 * Identifies if a template is a genuinely user-created custom template.
 * Never includes system presets or onboarding-generated starter templates.
 */
export function isCustomTemplate(
  tpl: WorkoutTemplate,
  assignedRoutine?: { templateIds: string[] } | null,
  userId?: string
): boolean {
  if (isSystemTemplate(tpl)) return false;
  if (isOnboardingTemplate(tpl, assignedRoutine, userId)) return false;
  return true;
}

/**
 * Partitions the full list of templates into:
 * 1. assignedTemplates (onboarding starter routine)
 * 2. starterLibrary (global system presets)
 * 3. customTemplates (user-created templates)
 */
export function partitionWorkoutTemplates(params: {
  userTemplates: WorkoutTemplate[];
  systemPresets: WorkoutTemplate[];
  assignedRoutine?: { templateIds: string[] } | null;
  userId?: string;
}): {
  assignedTemplates: WorkoutTemplate[];
  starterLibrary: WorkoutTemplate[];
  customTemplates: WorkoutTemplate[];
} {
  const { userTemplates, systemPresets, assignedRoutine, userId } = params;

  // 1. Assigned Routine Templates
  const assignedTemplates: WorkoutTemplate[] = [];
  if (assignedRoutine?.templateIds?.length) {
    for (const id of assignedRoutine.templateIds) {
      const found = userTemplates.find((t) => t.id === id);
      if (found) {
        assignedTemplates.push(found);
      }
    }
  }

  // 2. Default Starter Library (always the 5 system presets)
  const starterLibrary = systemPresets.filter(isSystemTemplate);

  // 3. User-created Custom Templates (never system, never onboarding)
  const customTemplates = userTemplates.filter((t) => isCustomTemplate(t, assignedRoutine, userId));

  return {
    assignedTemplates,
    starterLibrary,
    customTemplates,
  };
}

