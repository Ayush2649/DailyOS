/**
 * Satat Starter Workout Composition Engine
 * Deterministic composition rules with universal fallbacks.
 * Source: docs/features/onboarding.md (v2.3, §10)
 */

import type { WorkoutTemplate, TemplateExercise } from "@/types";

export interface WorkoutCompositionInputs {
  userId?: string;
  includeWorkouts: boolean;
  workoutDaysPerWeek?: number | null;
  availableTrainingTimeMinutes?: "<20" | "20-30" | "30-45" | "45-60" | "60+" | null;
  trainingExperience?: "beginner" | "intermediate" | "advanced" | null;
  equipmentAccess?: "commercial_gym" | "home_dumbbells" | "bodyweight_only" | null;
  healthSensitivityMode?: boolean;
  hasPhysicalInjury?: boolean;
}

export interface WorkoutPlanAssignment {
  planName: string;
  templateIds: string[];
  daysPerWeek: number;
}

function ex(
  id: string,
  name: string,
  sets: number,
  reps: number,
  weight: number = 0,
  unit: "kg" | "lbs" | "bodyweight" = "kg"
): TemplateExercise {
  return { id, name, defaultSets: sets, defaultReps: reps, defaultWeight: weight, defaultUnit: unit };
}

/**
 * Deterministically maps equipment, experience, and days/week to plan name and template keys.
 */
export function getStarterWorkoutTemplateKeys(params: {
  equipmentAccess: "commercial_gym" | "home_dumbbells" | "bodyweight_only";
  trainingExperience: "beginner" | "intermediate" | "advanced";
  workoutDaysPerWeek: number;
}): { planName: string; templateKeys: string[] } {
  const days = Math.min(5, Math.max(2, params.workoutDaysPerWeek));
  const exp = params.trainingExperience;
  const equip = params.equipmentAccess;

  if (equip === "bodyweight_only") {
    const planName = `${days}-Day Calisthenics Essentials`;
    const templateKeys =
      days === 2
        ? ["bw_a", "bw_b"]
        : days === 3
        ? ["bw_a", "bw_b", "bw_c"]
        : days === 4
        ? ["bw_upper_a", "bw_lower_a", "bw_upper_b", "bw_lower_b"]
        : ["bw_upper_a", "bw_lower_a", "bw_upper_b", "bw_lower_b", "bw_c"];
    return { planName, templateKeys };
  }

  if (equip === "home_dumbbells") {
    const planName = `${days}-Day Dumbbell Foundations`;
    const templateKeys =
      days === 2
        ? ["db_a", "db_b"]
        : days === 3
        ? ["db_a", "db_b", "db_c"]
        : days === 4
        ? ["db_upper_a", "db_lower_a", "db_upper_b", "db_lower_b"]
        : ["db_upper_a", "db_lower_a", "db_upper_b", "db_lower_b", "db_c"];
    return { planName, templateKeys };
  }

  // Commercial gym
  if (exp === "beginner") {
    const planName =
      days >= 4
        ? `${days}-Day Upper / Lower Machine & DB`
        : `${days}-Day Full Body Machine & DB`;
    const templateKeys =
      days === 2
        ? ["gym_beg_a", "gym_beg_b"]
        : days === 3
        ? ["gym_beg_a", "gym_beg_b", "gym_beg_c"]
        : days === 4
        ? ["gym_beg_upper_a", "gym_beg_lower_a", "gym_beg_upper_b", "gym_beg_lower_b"]
        : ["gym_beg_upper_a", "gym_beg_lower_a", "gym_beg_upper_b", "gym_beg_lower_b", "gym_beg_c"];
    return { planName, templateKeys };
  }

  // Intermediate / Advanced
  const planName = days >= 4 ? `${days}-Day Upper / Lower Split` : `${days}-Day Full Body Compound`;
  const templateKeys =
    days === 2
      ? ["gym_comp_a", "gym_comp_b"]
      : days === 3
      ? ["gym_comp_a", "gym_comp_b", "gym_comp_c"]
      : days === 4
      ? ["gym_comp_upper_a", "gym_comp_lower_a", "gym_comp_upper_b", "gym_comp_lower_b"]
      : ["gym_comp_upper_a", "gym_comp_lower_a", "gym_comp_upper_b", "gym_comp_lower_b", "gym_comp_c"];
  return { planName, templateKeys };
}

/**
 * Decides whether a workout plan should be assigned and determines plan name and template keys.
 */
export function composeStarterWorkout(
  inputs: WorkoutCompositionInputs
): WorkoutPlanAssignment | null {
  const {
    userId,
    includeWorkouts,
    workoutDaysPerWeek,
    availableTrainingTimeMinutes,
    trainingExperience,
    equipmentAccess,
    healthSensitivityMode = false,
    hasPhysicalInjury = false,
  } = inputs;

  // 1. Opt-out check
  if (!includeWorkouts) {
    return null;
  }

  // 2. Health-Sensitive & Physical Injury Withholding (Default: NO in v1)
  if (healthSensitivityMode || hasPhysicalInjury) {
    return null;
  }

  // 3. Completeness check
  if (!workoutDaysPerWeek || !equipmentAccess) {
    return null;
  }

  const days = Math.min(5, Math.max(2, workoutDaysPerWeek));
  const exp = trainingExperience ?? "beginner";
  const equip = equipmentAccess;

  const { planName, templateKeys } = getStarterWorkoutTemplateKeys({
    equipmentAccess: equip,
    trainingExperience: exp,
    workoutDaysPerWeek: days,
  });

  const templateIds = userId
    ? templateKeys.map((k) => `tpl_onboarding_${userId}_${k}`)
    : templateKeys;

  return {
    planName,
    templateIds,
    daysPerWeek: days,
  };
}

/**
 * Builds actual WorkoutTemplate documents for Firestore with deterministic IDs
 */
export function generateWorkoutTemplateDocs(params: {
  userId: string;
  equipmentAccess: "commercial_gym" | "home_dumbbells" | "bodyweight_only";
  trainingExperience: "beginner" | "intermediate" | "advanced";
  availableTrainingTimeMinutes: "<20" | "20-30" | "30-45" | "45-60" | "60+" | null;
  workoutDaysPerWeek: number;
}): WorkoutTemplate[] {
  const { userId, equipmentAccess, trainingExperience, availableTrainingTimeMinutes, workoutDaysPerWeek } = params;

  const isExpress = availableTrainingTimeMinutes === "<20" || availableTrainingTimeMinutes === "20-30";
  const isExtended = availableTrainingTimeMinutes === "45-60" || availableTrainingTimeMinutes === "60+";
  const isBeginner = trainingExperience === "beginner";
  const now = Date.now();

  const { templateKeys } = getStarterWorkoutTemplateKeys({
    equipmentAccess,
    trainingExperience,
    workoutDaysPerWeek,
  });

  const uniqueKeys = Array.from(new Set(templateKeys));
  const templates: WorkoutTemplate[] = [];

  for (const key of uniqueKeys) {
    const docId = `tpl_onboarding_${userId}_${key}`;

    if (key === "bw_a") {
      const exercises: TemplateExercise[] = [
        ex("bwa-1", "Bodyweight Box Squats", 3, 12, 0, "bodyweight"),
        ex("bwa-2", "Incline Push-ups", 3, 10, 0, "bodyweight"),
        ex("bwa-3", "Doorframe Rows", 3, 10, 0, "bodyweight"),
      ];
      if (!isExpress) {
        exercises.push(ex("bwa-4", "Glute Bridges", 3, 15, 0, "bodyweight"));
        exercises.push(ex("bwa-5", "Plank", 3, 30, 0, "bodyweight"));
      }
      if (isExtended) {
        exercises.push(ex("bwa-6", "Bird Dog", 3, 12, 0, "bodyweight"));
      }
      templates.push({
        id: docId,
        userId,
        name: "Calisthenics Essentials A",
        description: "Bodyweight strength foundations",
        exercises,
        isPreset: false,
        createdAt: now,
      });
    } else if (key === "bw_b") {
      const exercises: TemplateExercise[] = [
        ex("bwb-1", "Reverse Lunges", 3, 10, 0, "bodyweight"),
        ex("bwb-2", "Knee Push-ups", 3, 8, 0, "bodyweight"),
        ex("bwb-3", "Superman Back Extensions", 3, 12, 0, "bodyweight"),
      ];
      if (!isExpress) {
        exercises.push(ex("bwb-4", "Dead Bug", 3, 12, 0, "bodyweight"));
        exercises.push(ex("bwb-5", "Wall Sit", 3, 30, 0, "bodyweight"));
      }
      templates.push({
        id: docId,
        userId,
        name: "Calisthenics Essentials B",
        description: "Core and lower-body stability",
        exercises,
        isPreset: false,
        createdAt: now,
      });
    } else if (key === "bw_c") {
      const exercises: TemplateExercise[] = [
        ex("bwc-1", "Step-ups", 3, 10, 0, "bodyweight"),
        ex("bwc-2", "Pike Push-up Holds", 3, 8, 0, "bodyweight"),
        ex("bwc-3", "Towel Doorway Rows", 3, 10, 0, "bodyweight"),
      ];
      if (!isExpress) {
        exercises.push(ex("bwc-4", "Side Plank", 3, 20, 0, "bodyweight"));
        exercises.push(ex("bwc-5", "Calf Raises", 3, 15, 0, "bodyweight"));
      }
      templates.push({
        id: docId,
        userId,
        name: "Calisthenics Essentials C",
        description: "Full body mobility & endurance",
        exercises,
        isPreset: false,
        createdAt: now,
      });
    } else if (key === "bw_upper_a" || key === "bw_upper_b") {
      const suffix = key === "bw_upper_a" ? "A" : "B";
      const exercises: TemplateExercise[] = [
        ex(`bwu-${suffix}-1`, "Incline Push-ups", 3, 10, 0, "bodyweight"),
        ex(`bwu-${suffix}-2`, "Doorframe Rows", 3, 10, 0, "bodyweight"),
        ex(`bwu-${suffix}-3`, "Superman Back Extensions", 3, 12, 0, "bodyweight"),
      ];
      if (!isExpress) {
        exercises.push(ex(`bwu-${suffix}-4`, "Plank", 3, 30, 0, "bodyweight"));
      }
      templates.push({
        id: docId,
        userId,
        name: `Calisthenics Upper ${suffix}`,
        description: "Upper body posture & push/pull",
        exercises,
        isPreset: false,
        createdAt: now,
      });
    } else if (key === "bw_lower_a" || key === "bw_lower_b") {
      const suffix = key === "bw_lower_a" ? "A" : "B";
      const exercises: TemplateExercise[] = [
        ex(`bwl-${suffix}-1`, "Bodyweight Box Squats", 3, 12, 0, "bodyweight"),
        ex(`bwl-${suffix}-2`, "Reverse Lunges", 3, 10, 0, "bodyweight"),
        ex(`bwl-${suffix}-3`, "Glute Bridges", 3, 15, 0, "bodyweight"),
      ];
      if (!isExpress) {
        exercises.push(ex(`bwl-${suffix}-4`, "Dead Bug", 3, 12, 0, "bodyweight"));
      }
      templates.push({
        id: docId,
        userId,
        name: `Calisthenics Lower ${suffix}`,
        description: "Lower body strength & knee stability",
        exercises,
        isPreset: false,
        createdAt: now,
      });
    } else if (key === "db_a") {
      const exercises: TemplateExercise[] = [
        ex("dba-1", "Dumbbell Goblet Squat", 3, 10, 10),
        ex("dba-2", "Dumbbell Flat Bench Press", 3, 10, 12),
        ex("dba-3", "Dumbbell Single-Arm Row", 3, 10, 10),
      ];
      if (!isExpress) {
        exercises.push(ex("dba-4", "Dumbbell Lateral Raise", 3, 12, 5));
        exercises.push(ex("dba-5", "Plank", 3, 30, 0, "bodyweight"));
      }
      if (isExtended) {
        exercises.push(ex("dba-6", "Dumbbell Hammer Curls", 3, 10, 8));
      }
      templates.push({
        id: docId,
        userId,
        name: "Dumbbell Foundations A",
        description: "Full body dumbbell compounds",
        exercises,
        isPreset: false,
        createdAt: now,
      });
    } else if (key === "db_b") {
      const exercises: TemplateExercise[] = [
        ex("dbb-1", "Dumbbell Romanian Deadlift", 3, 10, 12),
        ex("dbb-2", "Dumbbell Seated Overhead Press", 3, 10, 8),
        ex("dbb-3", "Dumbbell Bicep Curls", 3, 12, 8),
      ];
      if (!isExpress) {
        exercises.push(ex("dbb-4", "Dumbbell Floor Press", 3, 10, 12));
        exercises.push(ex("dbb-5", "Dead Bug", 3, 12, 0, "bodyweight"));
      }
      templates.push({
        id: docId,
        userId,
        name: "Dumbbell Foundations B",
        description: "Posterior chain and shoulder focus",
        exercises,
        isPreset: false,
        createdAt: now,
      });
    } else if (key === "db_c") {
      const exercises: TemplateExercise[] = [
        ex("dbc-1", "Dumbbell Split Squat", 3, 8, 8),
        ex("dbc-2", "Dumbbell Incline Bench Press", 3, 10, 10),
        ex("dbc-3", "Dumbbell Chest-Supported Row", 3, 10, 10),
      ];
      if (!isExpress) {
        exercises.push(ex("dbc-4", "Dumbbell Shrugs", 3, 12, 12));
        exercises.push(ex("dbc-5", "Plank", 3, 30, 0, "bodyweight"));
      }
      templates.push({
        id: docId,
        userId,
        name: "Dumbbell Foundations C",
        description: "Unilateral strength and upper back",
        exercises,
        isPreset: false,
        createdAt: now,
      });
    } else if (key === "db_upper_a" || key === "db_upper_b") {
      const suffix = key === "db_upper_a" ? "A" : "B";
      const exercises: TemplateExercise[] = [
        ex(`dbu-${suffix}-1`, "Dumbbell Bench Press", 3, 10, 12),
        ex(`dbu-${suffix}-2`, "Dumbbell Single-Arm Row", 3, 10, 10),
        ex(`dbu-${suffix}-3`, "Dumbbell Overhead Press", 3, 10, 8),
      ];
      if (!isExpress) {
        exercises.push(ex(`dbu-${suffix}-4`, "Dumbbell Lateral Raise", 3, 12, 5));
        exercises.push(ex(`dbu-${suffix}-5`, "Dumbbell Bicep Curls", 3, 10, 8));
      }
      templates.push({
        id: docId,
        userId,
        name: `Dumbbell Upper ${suffix}`,
        description: "Dumbbell chest, back, and shoulder progression",
        exercises,
        isPreset: false,
        createdAt: now,
      });
    } else if (key === "db_lower_a" || key === "db_lower_b") {
      const suffix = key === "db_lower_a" ? "A" : "B";
      const exercises: TemplateExercise[] = [
        ex(`dbl-${suffix}-1`, "Dumbbell Goblet Squat", 3, 10, 12),
        ex(`dbl-${suffix}-2`, "Dumbbell Romanian Deadlift", 3, 10, 12),
        ex(`dbl-${suffix}-3`, "Dumbbell Lunges", 3, 8, 8),
      ];
      if (!isExpress) {
        exercises.push(ex(`dbl-${suffix}-4`, "Plank", 3, 30, 0, "bodyweight"));
      }
      templates.push({
        id: docId,
        userId,
        name: `Dumbbell Lower ${suffix}`,
        description: "Dumbbell quads, glutes, and hamstrings",
        exercises,
        isPreset: false,
        createdAt: now,
      });
    } else if (key === "gym_beg_a") {
      const exercises: TemplateExercise[] = [
        ex("gyma-1", "Leg Press", 3, 10, 60),
        ex("gyma-2", "Chest Press Machine", 3, 10, 30),
        ex("gyma-3", "Lat Pulldown", 3, 10, 35),
      ];
      if (!isExpress) {
        exercises.push(ex("gyma-4", "Seated Cable Row", 3, 10, 30));
        exercises.push(ex("gyma-5", "Plank", 3, 30, 0, "bodyweight"));
      }
      if (isExtended) {
        exercises.push(ex("gyma-6", "Cable Bicep Curls", 3, 12, 15));
      }
      templates.push({
        id: docId,
        userId,
        name: "Full Body Machine & DB A",
        description: "Joint-friendly beginner progression",
        exercises,
        isPreset: false,
        createdAt: now,
      });
    } else if (key === "gym_beg_b") {
      const exercises: TemplateExercise[] = [
        ex("gymb-1", "Dumbbell Goblet Squat", 3, 10, 12),
        ex("gymb-2", "Incline Dumbbell Press", 3, 10, 14),
        ex("gymb-3", "Seated Leg Curl Machine", 3, 12, 35),
      ];
      if (!isExpress) {
        exercises.push(ex("gymb-4", "Cable Face Pulls", 3, 15, 15));
        exercises.push(ex("gymb-5", "Dumbbell Lateral Raise", 3, 12, 5));
      }
      templates.push({
        id: docId,
        userId,
        name: "Full Body Machine & DB B",
        description: "Machine & dumbbell upper/lower balance",
        exercises,
        isPreset: false,
        createdAt: now,
      });
    } else if (key === "gym_beg_c") {
      const exercises: TemplateExercise[] = [
        ex("gymc-1", "Seated Cable Row", 3, 10, 35),
        ex("gymc-2", "Machine Shoulder Press", 3, 10, 20),
        ex("gymc-3", "Leg Extension Machine", 3, 12, 30),
      ];
      if (!isExpress) {
        exercises.push(ex("gymc-4", "Cable Tricep Pushdown", 3, 12, 15));
        exercises.push(ex("gymc-5", "Dead Bug", 3, 12, 0, "bodyweight"));
      }
      templates.push({
        id: docId,
        userId,
        name: "Full Body Machine & DB C",
        description: "Machines & cables full body circuit",
        exercises,
        isPreset: false,
        createdAt: now,
      });
    } else if (key === "gym_beg_upper_a" || key === "gym_beg_upper_b") {
      const suffix = key === "gym_beg_upper_a" ? "A" : "B";
      const exercises: TemplateExercise[] = [
        ex(`gymbu-${suffix}-1`, "Chest Press Machine", 3, 10, 30),
        ex(`gymbu-${suffix}-2`, "Lat Pulldown", 3, 10, 35),
        ex(`gymbu-${suffix}-3`, "Machine Shoulder Press", 3, 10, 20),
      ];
      if (!isExpress) {
        exercises.push(ex(`gymbu-${suffix}-4`, "Seated Cable Row", 3, 10, 30));
        exercises.push(ex(`gymbu-${suffix}-5`, "Cable Tricep Pushdown", 3, 12, 15));
      }
      templates.push({
        id: docId,
        userId,
        name: `Machine & DB Upper ${suffix}`,
        description: "Machine & cable upper body foundations",
        exercises,
        isPreset: false,
        createdAt: now,
      });
    } else if (key === "gym_beg_lower_a" || key === "gym_beg_lower_b") {
      const suffix = key === "gym_beg_lower_a" ? "A" : "B";
      const exercises: TemplateExercise[] = [
        ex(`gymbl-${suffix}-1`, "Leg Press", 3, 10, 60),
        ex(`gymbl-${suffix}-2`, "Seated Leg Curl Machine", 3, 12, 35),
        ex(`gymbl-${suffix}-3`, "Dumbbell Goblet Squat", 3, 10, 12),
      ];
      if (!isExpress) {
        exercises.push(ex(`gymbl-${suffix}-4`, "Leg Extension Machine", 3, 12, 30));
        exercises.push(ex(`gymbl-${suffix}-5`, "Plank", 3, 30, 0, "bodyweight"));
      }
      templates.push({
        id: docId,
        userId,
        name: `Machine & DB Lower ${suffix}`,
        description: "Machine & dumbbell lower body foundations",
        exercises,
        isPreset: false,
        createdAt: now,
      });
    } else if (key === "gym_comp_a") {
      const exercises: TemplateExercise[] = [
        ex("compa-1", "Barbell Squat", 3, 6, 70),
        ex("compa-2", "Barbell Bench Press", 3, 6, 60),
        ex("compa-3", "Barbell Row", 3, 8, 50),
      ];
      if (!isExpress) {
        exercises.push(ex("compa-4", "Lat Pulldown", 3, 10, 50));
        exercises.push(ex("compa-5", "Plank", 3, 45, 0, "bodyweight"));
      }
      if (isExtended) {
        exercises.push(ex("compa-6", "Barbell Bicep Curls", 3, 10, 25));
      }
      templates.push({
        id: docId,
        userId,
        name: "Full Body Compound A",
        description: "Core barbell compound lifting",
        exercises,
        isPreset: false,
        createdAt: now,
      });
    } else if (key === "gym_comp_b") {
      const exercises: TemplateExercise[] = [
        ex("compb-1", "Barbell Romanian Deadlift", 3, 8, 70),
        ex("compb-2", "Overhead Press", 3, 8, 40),
        ex("compb-3", "Pull-ups", 3, 6, 0, "bodyweight"),
      ];
      if (!isExpress) {
        exercises.push(ex("compb-4", "Dumbbell Incline Press", 3, 10, 20));
        exercises.push(ex("compb-5", "Hanging Knee Raises", 3, 12, 0, "bodyweight"));
      }
      templates.push({
        id: docId,
        userId,
        name: "Full Body Compound B",
        description: "Overhead press and hinge focus",
        exercises,
        isPreset: false,
        createdAt: now,
      });
    } else if (key === "gym_comp_c") {
      const exercises: TemplateExercise[] = [
        ex("compc-1", "Barbell Front Squat", 3, 8, 50),
        ex("compc-2", "Dumbbell Flat Bench Press", 3, 8, 24),
        ex("compc-3", "Cable Seated Row", 3, 10, 45),
      ];
      if (!isExpress) {
        exercises.push(ex("compc-4", "Cable Face Pulls", 3, 15, 20));
        exercises.push(ex("compc-5", "Ab Wheel Rollout", 3, 10, 0, "bodyweight"));
      }
      templates.push({
        id: docId,
        userId,
        name: "Full Body Compound C",
        description: "Compound strength & posterior chain balance",
        exercises,
        isPreset: false,
        createdAt: now,
      });
    } else if (key === "gym_comp_upper_a" || key === "gym_comp_upper_b") {
      const suffix = key === "gym_comp_upper_a" ? "A" : "B";
      const exercises: TemplateExercise[] = [
        ex(`compu-${suffix}-1`, "Barbell Bench Press", 3, 6, 60),
        ex(`compu-${suffix}-2`, "Barbell Row", 3, 8, 50),
        ex(`compu-${suffix}-3`, "Overhead Press", 3, 8, 40),
      ];
      if (!isExpress) {
        exercises.push(ex(`compu-${suffix}-4`, "Lat Pulldown", 3, 10, 50));
        exercises.push(ex(`compu-${suffix}-5`, "Dumbbell Lateral Raise", 3, 12, 8));
      }
      templates.push({
        id: docId,
        userId,
        name: `Compound Upper ${suffix}`,
        description: "Upper body strength and heavy compounds",
        exercises,
        isPreset: false,
        createdAt: now,
      });
    } else if (key === "gym_comp_lower_a" || key === "gym_comp_lower_b") {
      const suffix = key === "gym_comp_lower_a" ? "A" : "B";
      const exercises: TemplateExercise[] = [
        ex(`compl-${suffix}-1`, "Barbell Squat", 3, 6, 70),
        ex(`compl-${suffix}-2`, "Barbell Romanian Deadlift", 3, 8, 70),
        ex(`compl-${suffix}-3`, "Leg Press", 3, 10, 80),
      ];
      if (!isExpress) {
        exercises.push(ex(`compl-${suffix}-4`, "Seated Calf Raise", 3, 15, 30));
        exercises.push(ex(`compl-${suffix}-5`, "Plank", 3, 45, 0, "bodyweight"));
      }
      templates.push({
        id: docId,
        userId,
        name: `Compound Lower ${suffix}`,
        description: "Lower body strength and hip hinge focus",
        exercises,
        isPreset: false,
        createdAt: now,
      });
    }
  }

  return templates.map((t) => ({
    ...t,
    source: "onboarding" as const,
    isOnboarding: true,
  }));
}
