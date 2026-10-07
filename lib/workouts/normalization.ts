import type { WorkoutTemplate, ExerciseLog, SetLog, TemplateExercise } from "@/types";
import { generateId } from "@/lib/utils";

/**
 * Normalizes a WorkoutTemplate into canonical ExerciseLog[] for an active workout logger session.
 * Guarantees zero `undefined` properties (such as weight on bodyweight exercises),
 * producing the exact canonical shape expected by the workout logger and Firestore.
 */
export function normalizeTemplateToExercises(
  template: WorkoutTemplate,
  idGenerator: () => string = generateId
): ExerciseLog[] {
  return template.exercises.map((te) => {
    const exercise: ExerciseLog = {
      id: idGenerator(),
      name: te.name,
      sets: Array.from({ length: te.defaultSets }, () => {
        const set: SetLog = {
          id: idGenerator(),
          reps: te.defaultReps,
          unit: te.defaultUnit,
          completed: false,
        };

        // For bodyweight exercises, weight is not applicable and must NEVER be set to undefined.
        // For weighted movements (kg/lbs), initialize to defaultWeight if provided, else 0.
        if (te.defaultUnit !== "bodyweight") {
          set.weight = te.defaultWeight ?? 0;
        }

        return set;
      }),
    };

    return exercise;
  });
}

/**
 * Normalizes an active ExerciseLog[] into TemplateExercise[] when saving a custom template.
 * Guarantees zero `undefined` properties are saved to the workoutTemplates Firestore collection.
 */
export function normalizeExercisesToTemplateExercises(
  exercises: ExerciseLog[],
  idGenerator: () => string = generateId
): TemplateExercise[] {
  return exercises.map((ex) => {
    const firstSet = ex.sets[0];
    const isBw = firstSet?.unit === "bodyweight";

    const te: TemplateExercise = {
      id: idGenerator(),
      name: ex.name,
      defaultSets: ex.sets.length,
      defaultReps: firstSet?.reps ?? 8,
      defaultUnit: firstSet?.unit ?? "kg",
    };

    if (!isBw) {
      te.defaultWeight = firstSet?.weight ?? 0;
    }

    return te;
  });
}

/**
 * Recursively inspects an object for undefined values that would trigger
 * Firestore's `Unsupported field value: undefined` serialization failure.
 */
export function findUndefinedPaths(data: unknown, path = ""): string[] {
  if (data === undefined) {
    return [path || "<root>"];
  }

  if (data === null || typeof data !== "object") {
    return [];
  }

  const undefinedPaths: string[] = [];

  if (Array.isArray(data)) {
    for (let i = 0; i < data.length; i++) {
      const currentPath = `${path}[${i}]`;
      if (data[i] === undefined) {
        undefinedPaths.push(currentPath);
      } else {
        undefinedPaths.push(...findUndefinedPaths(data[i], currentPath));
      }
    }
  } else {
    for (const [key, val] of Object.entries(data)) {
      const currentPath = path ? `${path}.${key}` : key;
      if (val === undefined) {
        undefinedPaths.push(currentPath);
      } else {
        undefinedPaths.push(...findUndefinedPaths(val, currentPath));
      }
    }
  }

  return undefinedPaths;
}

