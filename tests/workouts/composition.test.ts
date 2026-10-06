import { describe, it, expect } from "vitest";
import {
  composeStarterWorkout,
  generateWorkoutTemplateDocs,
  getStarterWorkoutTemplateKeys,
  type WorkoutCompositionInputs,
} from "@/lib/workouts/composition";

describe("Workout Composition Engine (§10)", () => {
  it("withholds workout assignment when workouts are not opted-in", () => {
    const inputs: WorkoutCompositionInputs = {
      includeWorkouts: false,
    };
    expect(composeStarterWorkout(inputs)).toBeNull();
  });

  it("withholds workout assignment in Health-Sensitive Mode by default", () => {
    const inputs: WorkoutCompositionInputs = {
      includeWorkouts: true,
      workoutDaysPerWeek: 3,
      equipmentAccess: "commercial_gym",
      trainingExperience: "beginner",
      healthSensitivityMode: true,
    };
    expect(composeStarterWorkout(inputs)).toBeNull();
  });

  it("withholds workout assignment when physical injury is flagged", () => {
    const inputs: WorkoutCompositionInputs = {
      includeWorkouts: true,
      workoutDaysPerWeek: 3,
      equipmentAccess: "commercial_gym",
      trainingExperience: "beginner",
      hasPhysicalInjury: true,
    };
    expect(composeStarterWorkout(inputs)).toBeNull();
  });

  it("assigns bodyweight calisthenics routine when equipment is bodyweight_only", () => {
    const inputs: WorkoutCompositionInputs = {
      includeWorkouts: true,
      workoutDaysPerWeek: 3,
      availableTrainingTimeMinutes: "30-45",
      equipmentAccess: "bodyweight_only",
      trainingExperience: "beginner",
    };
    const result = composeStarterWorkout(inputs);
    expect(result).not.toBeNull();
    expect(result?.planName).toContain("Calisthenics");
  });

  it("never prescribes heavy barbell deadlifts or back squats to gym beginners", () => {
    const templates = generateWorkoutTemplateDocs({
      userId: "usr_test",
      equipmentAccess: "commercial_gym",
      trainingExperience: "beginner",
      availableTrainingTimeMinutes: "30-45",
      workoutDaysPerWeek: 3,
    });

    const allExercises = templates.flatMap((t) => t.exercises.map((e) => e.name.toLowerCase()));
    expect(allExercises).not.toContain("barbell deadlift");
    expect(allExercises).not.toContain("barbell back squat");
    // Beginners use leg press / goblet squat / machines
    expect(allExercises.some((e) => e.includes("leg press") || e.includes("goblet") || e.includes("machine") || e.includes("cable") || e.includes("dumbbell"))).toBe(true);
  });

  it("scales exercise count down to 3 movements for express sessions (<20 min)", () => {
    const templates = generateWorkoutTemplateDocs({
      userId: "usr_test",
      equipmentAccess: "home_dumbbells",
      trainingExperience: "intermediate",
      availableTrainingTimeMinutes: "<20",
      workoutDaysPerWeek: 2,
    });

    for (const tpl of templates) {
      expect(tpl.exercises.length).toBeLessThanOrEqual(4);
      expect(tpl.exercises.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("generates deterministic template IDs based on userId", () => {
    const templates1 = generateWorkoutTemplateDocs({
      userId: "user_abc",
      equipmentAccess: "commercial_gym",
      trainingExperience: "intermediate",
      availableTrainingTimeMinutes: "45-60",
      workoutDaysPerWeek: 4,
    });

    const templates2 = generateWorkoutTemplateDocs({
      userId: "user_abc",
      equipmentAccess: "commercial_gym",
      trainingExperience: "intermediate",
      availableTrainingTimeMinutes: "45-60",
      workoutDaysPerWeek: 4,
    });

    expect(templates1.map((t) => t.id)).toEqual(templates2.map((t) => t.id));
    expect(templates1[0].id).toContain("tpl_onboarding_user_abc_");
  });

  it("correctly composes all splits (2, 3, 4, 5 days/wk) for gym beginner", () => {
    for (const days of [2, 3, 4, 5] as const) {
      const plan = composeStarterWorkout({
        userId: "test_user",
        includeWorkouts: true,
        workoutDaysPerWeek: days,
        availableTrainingTimeMinutes: "30-45",
        trainingExperience: "beginner",
        equipmentAccess: "commercial_gym",
      });
      expect(plan).not.toBeNull();
      expect(plan?.daysPerWeek).toBe(days);
      expect(plan?.templateIds.length).toBeGreaterThanOrEqual(days === 2 ? 2 : 3);

      const docs = generateWorkoutTemplateDocs({
        userId: "test_user",
        equipmentAccess: "commercial_gym",
        trainingExperience: "beginner",
        availableTrainingTimeMinutes: "30-45",
        workoutDaysPerWeek: days,
      });
      // Every template in plan.templateIds must exist in generated docs
      for (const tplId of plan!.templateIds) {
        expect(docs.some((d) => d.id === tplId)).toBe(true);
      }
    }
  });

  it("correctly composes all splits (2, 3, 4, 5 days/wk) for dumbbells", () => {
    for (const days of [2, 3, 4, 5] as const) {
      const plan = composeStarterWorkout({
        userId: "test_user_db",
        includeWorkouts: true,
        workoutDaysPerWeek: days,
        availableTrainingTimeMinutes: "30-45",
        trainingExperience: "intermediate",
        equipmentAccess: "home_dumbbells",
      });
      expect(plan).not.toBeNull();
      expect(plan?.planName).toContain("Dumbbell");

      const docs = generateWorkoutTemplateDocs({
        userId: "test_user_db",
        equipmentAccess: "home_dumbbells",
        trainingExperience: "intermediate",
        availableTrainingTimeMinutes: "30-45",
        workoutDaysPerWeek: days,
      });
      for (const tplId of plan!.templateIds) {
        expect(docs.some((d) => d.id === tplId)).toBe(true);
      }
    }
  });

  it("enforces Workout Completeness Invariant across all combinations", () => {
    const daysList = [2, 3, 4, 5] as const;
    const equips = ["commercial_gym", "home_dumbbells", "bodyweight_only"] as const;
    const exps = ["beginner", "intermediate", "advanced"] as const;
    const times = ["<20", "20-30", "30-45", "45-60", "60+"] as const;

    for (const d of daysList) {
      for (const eq of equips) {
        for (const exp of exps) {
          for (const t of times) {
            const plan = composeStarterWorkout({
              includeWorkouts: true,
              workoutDaysPerWeek: d,
              equipmentAccess: eq,
              trainingExperience: exp,
              availableTrainingTimeMinutes: t,
              healthSensitivityMode: false,
              hasPhysicalInjury: false,
            });
            expect(plan).not.toBeNull();
            expect(plan!.templateIds.length).toBeGreaterThan(0);
          }
        }
      }
    }
  });
});
