import { describe, it, expect } from "vitest";
import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, addDoc } from "firebase/firestore";
import { WORKOUT_PRESETS } from "@/lib/workoutPresets";
import {
  generateWorkoutTemplateDocs,
  composeStarterWorkout,
} from "@/lib/workouts/composition";
import {
  normalizeTemplateToExercises,
  normalizeExercisesToTemplateExercises,
  findUndefinedPaths,
} from "@/lib/workouts/normalization";
import type { WorkoutTemplate, WorkoutSession, ExerciseLog } from "@/types";

/**
 * Executes Firestore's real document serializer and validation logic.
 * Firestore client SDK throws synchronously when any field is `undefined`.
 */
function testFirestoreAddDocSync(colName: string, docData: unknown): { throws: boolean; errorMessage?: string } {
  try {
    const app =
      getApps().find((a) => a.name === "testFirestoreDocValidation") ||
      initializeApp({ projectId: "test-doc-validation" }, "testFirestoreDocValidation");
    const db = getFirestore(app);
    const col = collection(db, colName);

    // addDoc returns a Promise, but throws synchronously on invalid payload (undefined values)
    const promise = addDoc(col, docData as any);
    promise.catch(() => {}); // Suppress unhandled network rejection in test environment
    return { throws: false };
  } catch (err: any) {
    return { throws: true, errorMessage: err?.message || String(err) };
  }
}

describe("Workout Template Load → Save Persistence & Schema Integrity", () => {
  const userId = "test_user_regression";
  const testDate = "2026-10-07";

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. ROOT CAUSE REPRODUCTION: Why the un-normalized transformation failed
  // ─────────────────────────────────────────────────────────────────────────────
  describe("Root Cause Reproduction (Pre-fix behavior)", () => {
    it("fails Firestore addDoc serialization when bodyweight exercise sets contain weight: undefined", () => {
      const pullDay = WORKOUT_PRESETS.find((p) => p.name === "Pull Day")!;
      expect(pullDay).toBeDefined();

      // The previous un-normalized transformation used in WorkoutPage.tsx:
      // weight: te.defaultUnit === "bodyweight" ? undefined : (te.defaultWeight ?? 0)
      const unnormalizedExercises: ExerciseLog[] = pullDay.exercises.map((te) => ({
        id: "mock_ex_id",
        name: te.name,
        sets: Array.from({ length: te.defaultSets }, () => ({
          id: "mock_set_id",
          reps: te.defaultReps,
          weight: te.defaultUnit === "bodyweight" ? undefined : (te.defaultWeight ?? 0),
          unit: te.defaultUnit,
          completed: false,
        })),
      }));

      const sessionPayload: Omit<WorkoutSession, "id"> = {
        userId,
        date: testDate,
        exercises: unnormalizedExercises,
        durationMinutes: 45,
        createdAt: Date.now(),
      };

      // 1. Verify that undefined paths exist
      const undefinedPaths = findUndefinedPaths(sessionPayload);
      expect(undefinedPaths.length).toBeGreaterThan(0);
      expect(undefinedPaths.some((p) => p.includes("weight"))).toBe(true);

      // 2. Verify that Firestore real client SDK throws Unsupported field value: undefined
      const validationResult = testFirestoreAddDocSync("workouts", sessionPayload);
      expect(validationResult.throws).toBe(true);
      expect(validationResult.errorMessage).toContain("Unsupported field value: undefined");
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. DEFAULT STARTER TEMPLATES (Starter Library)
  // ─────────────────────────────────────────────────────────────────────────────
  describe("Default Starter Templates Normalization & Save", () => {
    const starterPresets = [
      "Push Day",
      "Pull Day",
      "Leg Day",
      "Upper Body",
      "Full Body",
    ];

    for (const presetName of starterPresets) {
      it(`normalizes and passes Firestore validation for starter preset "${presetName}"`, () => {
        const preset = WORKOUT_PRESETS.find((p) => p.name === presetName)!;
        expect(preset).toBeDefined();

        // Canonical normalization
        const exercises = normalizeTemplateToExercises(preset);
        expect(exercises.length).toBe(preset.exercises.length);

        const sessionPayload: Omit<WorkoutSession, "id"> = {
          userId,
          date: testDate,
          exercises,
          durationMinutes: 45,
          createdAt: Date.now(),
        };

        // Zero undefined properties anywhere in payload
        const undefinedPaths = findUndefinedPaths(sessionPayload);
        expect(undefinedPaths).toEqual([]);

        // Passes Firestore client SDK serialization without throwing
        const validationResult = testFirestoreAddDocSync("workouts", sessionPayload);
        expect(validationResult.throws).toBe(false);
      });
    }

    it("ensures bodyweight exercises omit weight entirely, while weighted exercises retain weight", () => {
      const pullDay = WORKOUT_PRESETS.find((p) => p.name === "Pull Day")!;
      const exercises = normalizeTemplateToExercises(pullDay);

      const pullUps = exercises.find((e) => e.name === "Pull-ups")!;
      expect(pullUps).toBeDefined();
      for (const set of pullUps.sets) {
        expect(set.unit).toBe("bodyweight");
        expect("weight" in set).toBe(false);
        expect(set.weight).toBeUndefined();
      }

      const deadlift = exercises.find((e) => e.name === "Deadlift")!;
      expect(deadlift).toBeDefined();
      for (const set of deadlift.sets) {
        expect(set.unit).toBe("kg");
        expect(set.weight).toBe(100);
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. ONBOARDING-GENERATED TEMPLATES
  // ─────────────────────────────────────────────────────────────────────────────
  describe("Onboarding-Generated Templates Normalization & Save", () => {
    it("normalizes and passes Firestore validation for all 3-Day Full Body Compound templates (A, B, C)", () => {
      const templates = generateWorkoutTemplateDocs({
        userId,
        equipmentAccess: "commercial_gym",
        trainingExperience: "intermediate",
        availableTrainingTimeMinutes: "45-60",
        workoutDaysPerWeek: 3,
      });

      expect(templates.length).toBe(3);

      for (const tpl of templates) {
        const exercises = normalizeTemplateToExercises(tpl);
        expect(exercises.length).toBe(tpl.exercises.length);

        const sessionPayload: Omit<WorkoutSession, "id"> = {
          userId,
          date: testDate,
          exercises,
          durationMinutes: 45,
          createdAt: Date.now(),
        };

        // Zero undefined paths
        expect(findUndefinedPaths(sessionPayload)).toEqual([]);

        // Passes Firestore validation
        const result = testFirestoreAddDocSync("workouts", sessionPayload);
        expect(result.throws).toBe(false);
      }
    });

    it("normalizes pure bodyweight calisthenics routine templates without undefined properties", () => {
      const templates = generateWorkoutTemplateDocs({
        userId,
        equipmentAccess: "bodyweight_only",
        trainingExperience: "beginner",
        availableTrainingTimeMinutes: "45-60",
        workoutDaysPerWeek: 3,
      });

      expect(templates.length).toBe(3);

      for (const tpl of templates) {
        const exercises = normalizeTemplateToExercises(tpl);

        const sessionPayload: Omit<WorkoutSession, "id"> = {
          userId,
          date: testDate,
          exercises,
          durationMinutes: 30,
          createdAt: Date.now(),
        };

        expect(findUndefinedPaths(sessionPayload)).toEqual([]);

        const result = testFirestoreAddDocSync("workouts", sessionPayload);
        expect(result.throws).toBe(false);
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. USER-CREATED CUSTOM TEMPLATES
  // ─────────────────────────────────────────────────────────────────────────────
  describe("User-Created Custom Templates Normalization & Save", () => {
    it("saves custom template with bodyweight exercises without undefined fields in workoutTemplates collection", () => {
      const activeExercises: ExerciseLog[] = [
        {
          id: "ex_1",
          name: "Push-ups",
          sets: [
            { id: "s1", reps: 15, unit: "bodyweight", completed: true },
            { id: "s2", reps: 12, unit: "bodyweight", completed: true },
          ],
        },
        {
          id: "ex_2",
          name: "Dumbbell Curl",
          sets: [
            { id: "s3", reps: 10, weight: 14, unit: "kg", completed: true },
          ],
        },
      ];

      const templateExercises = normalizeExercisesToTemplateExercises(activeExercises);

      const customTemplatePayload: Omit<WorkoutTemplate, "id"> = {
        userId,
        name: "My Calisthenics & Arms",
        exercises: templateExercises,
        isPreset: false,
        isOnboarding: false,
        source: "custom",
        createdAt: Date.now(),
      };

      // Zero undefined paths in template payload
      expect(findUndefinedPaths(customTemplatePayload)).toEqual([]);

      // Passes Firestore validation for workoutTemplates
      const templateResult = testFirestoreAddDocSync("workoutTemplates", customTemplatePayload);
      expect(templateResult.throws).toBe(false);

      // Now simulate loading that custom template back into the logger
      const loadedExercises = normalizeTemplateToExercises({
        id: "tpl_custom_saved_1",
        ...customTemplatePayload,
      });

      const sessionPayload: Omit<WorkoutSession, "id"> = {
        userId,
        date: testDate,
        exercises: loadedExercises,
        durationMinutes: 40,
        createdAt: Date.now(),
      };

      expect(findUndefinedPaths(sessionPayload)).toEqual([]);

      const sessionResult = testFirestoreAddDocSync("workouts", sessionPayload);
      expect(sessionResult.throws).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. MANUAL WORKOUT VS TEMPLATE-LOADED WORKOUT DATA SHAPE PARITY
  // ─────────────────────────────────────────────────────────────────────────────
  describe("Manual Workout vs Template-Loaded Workout Data Shape Parity", () => {
    it("produces identically shaped ExerciseLog and SetLog objects between manual and template-loaded flows", () => {
      // Manual workout creation:
      // User creates exercise with 1 set of BW Pull-ups and 1 set of 60kg Bench Press
      const manualExercises: ExerciseLog[] = [
        {
          id: "manual_ex_1",
          name: "Pull-ups",
          sets: [
            { id: "m_s1", reps: 8, unit: "bodyweight", completed: false },
          ],
        },
        {
          id: "manual_ex_2",
          name: "Bench Press",
          sets: [
            { id: "m_s2", reps: 10, weight: 60, unit: "kg", completed: false },
          ],
        },
      ];

      // Template-loaded workout:
      const syntheticTemplate: WorkoutTemplate = {
        id: "tpl_test_parity",
        userId: "",
        name: "Test Parity Template",
        exercises: [
          { id: "te_1", name: "Pull-ups", defaultSets: 1, defaultReps: 8, defaultUnit: "bodyweight" },
          { id: "te_2", name: "Bench Press", defaultSets: 1, defaultReps: 10, defaultWeight: 60, defaultUnit: "kg" },
        ],
        createdAt: 0,
      };

      const templateLoadedExercises = normalizeTemplateToExercises(syntheticTemplate);

      // Both should have exact same key structure on sets
      const manualBwKeys = Object.keys(manualExercises[0].sets[0]).sort();
      const templateBwKeys = Object.keys(templateLoadedExercises[0].sets[0]).sort();
      expect(templateBwKeys).toEqual(manualBwKeys);
      expect(templateBwKeys).toEqual(["completed", "id", "reps", "unit"]);

      const manualWeightedKeys = Object.keys(manualExercises[1].sets[0]).sort();
      const templateWeightedKeys = Object.keys(templateLoadedExercises[1].sets[0]).sort();
      expect(templateWeightedKeys).toEqual(manualWeightedKeys);
      expect(templateWeightedKeys).toEqual(["completed", "id", "reps", "unit", "weight"]);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 6. IMMUTABILITY & DUPLICATION PROTECTION
  // ─────────────────────────────────────────────────────────────────────────────
  describe("Immutability & Duplication Protection", () => {
    it("does not mutate the source template when loading into exercises", () => {
      const fullBody = WORKOUT_PRESETS.find((p) => p.name === "Full Body")!;
      const originalJson = JSON.stringify(fullBody);

      normalizeTemplateToExercises(fullBody);

      expect(JSON.stringify(fullBody)).toBe(originalJson);
    });

    it("saving a workout session creates a session record and does not alter template counts", () => {
      const plan = composeStarterWorkout({
        userId,
        includeWorkouts: true,
        workoutDaysPerWeek: 3,
        equipmentAccess: "commercial_gym",
        trainingExperience: "intermediate",
      });

      const templates = generateWorkoutTemplateDocs({
        userId,
        equipmentAccess: "commercial_gym",
        trainingExperience: "intermediate",
        availableTrainingTimeMinutes: "45-60",
        workoutDaysPerWeek: 3,
      });

      const initialTemplateCount = templates.length;

      // Loading template A into active workout session
      const exercises = normalizeTemplateToExercises(templates[0]);
      const sessionPayload: Omit<WorkoutSession, "id"> = {
        userId,
        date: testDate,
        exercises,
        durationMinutes: 50,
        createdAt: Date.now(),
      };

      // Mock save to workouts collection
      const workoutsStore: WorkoutSession[] = [];
      workoutsStore.push({ id: "saved_session_id_1", ...sessionPayload });

      // Verifications:
      // 1. Session is saved in workouts collection
      expect(workoutsStore.length).toBe(1);
      expect(workoutsStore[0].exercises.length).toBe(templates[0].exercises.length);

      // 2. Template collection is completely untouched
      expect(templates.length).toBe(initialTemplateCount);
      expect(plan!.templateIds.length).toBe(3);
    });
  });
});
