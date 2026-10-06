import { describe, it, expect } from "vitest";
import { WORKOUT_PRESETS } from "@/lib/workoutPresets";
import {
  composeStarterWorkout,
  generateWorkoutTemplateDocs,
} from "@/lib/workouts/composition";
import {
  isSystemTemplate,
  isOnboardingTemplate,
  isCustomTemplate,
  partitionWorkoutTemplates,
} from "@/lib/workouts/classification";
import type { WorkoutTemplate } from "@/types";

describe("Workout Templates Page Architecture & Deduplication", () => {
  const userId = "user_test_123";

  // ─────────────────────────────────────────────────────────────────────────────
  // CASE 1: 3-day onboarding user displays routine once, 0 in My Templates
  // ─────────────────────────────────────────────────────────────────────────────
  it("Case 1: User with 3-day onboarding gets Full Body Compound A, B, C under Assigned Routine, and 0 items under My Templates", () => {
    // 1. Compose 3-day intermediate gym workout
    const plan = composeStarterWorkout({
      userId,
      includeWorkouts: true,
      workoutDaysPerWeek: 3,
      equipmentAccess: "commercial_gym",
      trainingExperience: "intermediate",
      availableTrainingTimeMinutes: "45-60",
    });

    expect(plan).not.toBeNull();
    expect(plan!.planName).toBe("3-Day Full Body Compound");
    expect(plan!.templateIds.length).toBe(3);

    // 2. Generate the documents as written by onboarding completion
    const generatedDocs = generateWorkoutTemplateDocs({
      userId,
      equipmentAccess: "commercial_gym",
      trainingExperience: "intermediate",
      availableTrainingTimeMinutes: "45-60",
      workoutDaysPerWeek: 3,
    });

    expect(generatedDocs.length).toBe(3);
    expect(generatedDocs.map((t) => t.name)).toEqual([
      "Full Body Compound A",
      "Full Body Compound B",
      "Full Body Compound C",
    ]);

    // Check tags on generated documents
    for (const doc of generatedDocs) {
      expect(doc.source).toBe("onboarding");
      expect(doc.isOnboarding).toBe(true);
      expect(doc.isPreset).toBe(false);
      expect(isOnboardingTemplate(doc, plan, userId)).toBe(true);
      expect(isCustomTemplate(doc, plan, userId)).toBe(false);
      expect(isSystemTemplate(doc)).toBe(false);
    }

    // 3. Partition templates for WorkoutPage
    const { assignedTemplates, starterLibrary, customTemplates } = partitionWorkoutTemplates({
      userTemplates: generatedDocs,
      systemPresets: WORKOUT_PRESETS,
      assignedRoutine: plan,
      userId,
    });

    // Exactly 3 under assigned routine
    expect(assignedTemplates.length).toBe(3);
    expect(assignedTemplates.map((t) => t.name)).toEqual([
      "Full Body Compound A",
      "Full Body Compound B",
      "Full Body Compound C",
    ]);

    // Exactly 0 under My Templates (NO DUPLICATION)
    expect(customTemplates.length).toBe(0);

    // Starter library is unaffected
    expect(starterLibrary.length).toBe(5);

    // Total occurrences of each template name across assignedTemplates and customTemplates is exactly 1
    const renderedNames = [...assignedTemplates.map((t) => t.name), ...customTemplates.map((t) => t.name)];
    expect(renderedNames.filter((n) => n === "Full Body Compound A").length).toBe(1);
    expect(renderedNames.filter((n) => n === "Full Body Compound B").length).toBe(1);
    expect(renderedNames.filter((n) => n === "Full Body Compound C").length).toBe(1);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // CASE 2: Default Starter Library exists independently
  // ─────────────────────────────────────────────────────────────────────────────
  it("Case 2: Push Day, Pull Day, Legs, Upper Body, Full Body are present in starter library independently of onboarding", () => {
    // 5 default presets
    expect(WORKOUT_PRESETS.length).toBe(5);
    const expectedPresetNames = ["Push Day", "Pull Day", "Leg Day", "Upper Body", "Full Body"];
    expect(WORKOUT_PRESETS.map((p) => p.name)).toEqual(expectedPresetNames);

    for (const preset of WORKOUT_PRESETS) {
      expect(preset.isPreset).toBe(true);
      expect(preset.source).toBe("system");
      expect(preset.userId).toBe("");
      expect(isSystemTemplate(preset)).toBe(true);
      expect(isOnboardingTemplate(preset, null)).toBe(false);
      expect(isCustomTemplate(preset, null)).toBe(false);
    }

    // Even with empty user templates and no onboarding assignment
    const { starterLibrary, customTemplates, assignedTemplates } = partitionWorkoutTemplates({
      userTemplates: [],
      systemPresets: WORKOUT_PRESETS,
      assignedRoutine: null,
      userId,
    });

    expect(starterLibrary.length).toBe(5);
    expect(starterLibrary.map((t) => t.name)).toEqual(expectedPresetNames);
    expect(assignedTemplates.length).toBe(0);
    expect(customTemplates.length).toBe(0);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // CASE 3: Loading template and re-evaluating state after mock refresh retains correct state
  // ─────────────────────────────────────────────────────────────────────────────
  it("Case 3: Loading a template and re-evaluating state after mock refresh retains correct assignment and custom templates", () => {
    const plan = composeStarterWorkout({
      userId,
      includeWorkouts: true,
      workoutDaysPerWeek: 3,
      equipmentAccess: "commercial_gym",
      trainingExperience: "intermediate",
      availableTrainingTimeMinutes: "45-60",
    });

    const userDocs = generateWorkoutTemplateDocs({
      userId,
      equipmentAccess: "commercial_gym",
      trainingExperience: "intermediate",
      availableTrainingTimeMinutes: "45-60",
      workoutDaysPerWeek: 3,
    });

    // Simulate loading a template into the active session
    const loadedTemplate = userDocs[0]; // Full Body Compound A
    const activeExercises = loadedTemplate.exercises.map((e) => ({
      name: e.name,
      sets: Array.from({ length: e.defaultSets }, () => ({ reps: e.defaultReps, completed: false })),
    }));
    expect(activeExercises.length).toBeGreaterThan(0);

    // Simulate page refresh: state reloaded from storage/backend
    const refreshedUserDocs = [...userDocs];
    const refreshedRoutine = { ...plan! };

    const { assignedTemplates, customTemplates, starterLibrary } = partitionWorkoutTemplates({
      userTemplates: refreshedUserDocs,
      systemPresets: WORKOUT_PRESETS,
      assignedRoutine: refreshedRoutine,
      userId,
    });

    expect(assignedTemplates.length).toBe(3);
    expect(assignedTemplates[0].name).toBe("Full Body Compound A");
    expect(customTemplates.length).toBe(0);
    expect(starterLibrary.length).toBe(5);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // CASE 4: Calling completion twice creates identical template document IDs without duplicates
  // ─────────────────────────────────────────────────────────────────────────────
  it("Case 4: Calling completion twice creates identical template document IDs without duplicates", () => {
    const params = {
      userId: "user_idempotent",
      equipmentAccess: "commercial_gym" as const,
      trainingExperience: "intermediate" as const,
      availableTrainingTimeMinutes: "45-60" as const,
      workoutDaysPerWeek: 3,
    };

    const firstRun = generateWorkoutTemplateDocs(params);
    const secondRun = generateWorkoutTemplateDocs(params);

    expect(firstRun.length).toBe(3);
    expect(secondRun.length).toBe(3);

    // Identical deterministic IDs
    expect(firstRun.map((t) => t.id)).toEqual(secondRun.map((t) => t.id));

    // Simulate Firestore set with merge: true (id-keyed map)
    const firestoreDb = new Map<string, WorkoutTemplate>();
    for (const doc of firstRun) {
      firestoreDb.set(doc.id, doc);
    }
    for (const doc of secondRun) {
      firestoreDb.set(doc.id, doc);
    }

    // Map size remains exactly 3, not 6
    expect(firestoreDb.size).toBe(3);
    const storedDocs = Array.from(firestoreDb.values());

    const plan = composeStarterWorkout({
      userId: "user_idempotent",
      includeWorkouts: true,
      workoutDaysPerWeek: 3,
      equipmentAccess: "commercial_gym",
      trainingExperience: "intermediate",
    });

    const { assignedTemplates, customTemplates } = partitionWorkoutTemplates({
      userTemplates: storedDocs,
      systemPresets: WORKOUT_PRESETS,
      assignedRoutine: plan,
      userId: "user_idempotent",
    });

    expect(assignedTemplates.length).toBe(3);
    expect(customTemplates.length).toBe(0);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // CASE 5: Genuinely user-created template appears under My Templates
  // ─────────────────────────────────────────────────────────────────────────────
  it("Case 5: Genuinely user-created template appears under My Templates, even with similar name, and doesn't affect assigned routine", () => {
    const plan = composeStarterWorkout({
      userId,
      includeWorkouts: true,
      workoutDaysPerWeek: 3,
      equipmentAccess: "commercial_gym",
      trainingExperience: "intermediate",
    });

    const onboardingDocs = generateWorkoutTemplateDocs({
      userId,
      equipmentAccess: "commercial_gym",
      trainingExperience: "intermediate",
      availableTrainingTimeMinutes: "45-60",
      workoutDaysPerWeek: 3,
    });

    // User creates their own custom template (even with the name "Full Body Compound A" or "My Upper Body")
    const customTemplate1: WorkoutTemplate = {
      id: "firestore_custom_doc_111",
      userId,
      name: "My Custom Arm Blast",
      exercises: [
        { id: "e1", name: "Bicep Curls", defaultSets: 3, defaultReps: 12, defaultWeight: 14, defaultUnit: "kg" },
      ],
      isPreset: false,
      isOnboarding: false,
      source: "custom",
      createdAt: Date.now(),
    };

    // User creates another template deliberately named "Full Body Compound A" to test semantic vs string matching
    const customTemplateSameName: WorkoutTemplate = {
      id: "firestore_custom_doc_222",
      userId,
      name: "Full Body Compound A", // Same name as assigned template!
      exercises: [
        { id: "e2", name: "Lat Pulldown", defaultSets: 4, defaultReps: 10, defaultWeight: 50, defaultUnit: "kg" },
      ],
      isPreset: false,
      isOnboarding: false,
      source: "custom",
      createdAt: Date.now() + 10,
    };

    const allUserTemplates = [...onboardingDocs, customTemplate1, customTemplateSameName];

    const { assignedTemplates, customTemplates, starterLibrary } = partitionWorkoutTemplates({
      userTemplates: allUserTemplates,
      systemPresets: WORKOUT_PRESETS,
      assignedRoutine: plan,
      userId,
    });

    // Assigned templates still contain only the 3 onboarding routine templates
    expect(assignedTemplates.length).toBe(3);
    expect(assignedTemplates.map((t) => t.id)).toEqual(plan!.templateIds);

    // My Templates contains BOTH custom templates (count 2), and NONE of the onboarding routine templates
    expect(customTemplates.length).toBe(2);
    expect(customTemplates.map((t) => t.id)).toEqual([
      "firestore_custom_doc_111",
      "firestore_custom_doc_222",
    ]);

    // Deleting a custom template removes only that template
    const afterDelete = allUserTemplates.filter((t) => t.id !== "firestore_custom_doc_111");
    const partitionedAfterDelete = partitionWorkoutTemplates({
      userTemplates: afterDelete,
      systemPresets: WORKOUT_PRESETS,
      assignedRoutine: plan,
      userId,
    });
    expect(partitionedAfterDelete.assignedTemplates.length).toBe(3);
    expect(partitionedAfterDelete.customTemplates.length).toBe(1);
    expect(partitionedAfterDelete.customTemplates[0].id).toBe("firestore_custom_doc_222");
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // CASE 6: User with includeWorkouts: false sees no assigned routine, but sees all 5 presets
  // ─────────────────────────────────────────────────────────────────────────────
  it("Case 6: User with includeWorkouts: false sees no assigned routine, but still sees all 5 default starter templates", () => {
    const plan = composeStarterWorkout({
      userId,
      includeWorkouts: false,
    });

    expect(plan).toBeNull();

    // No templates generated or stored
    const userTemplates: WorkoutTemplate[] = [];

    const { assignedTemplates, starterLibrary, customTemplates } = partitionWorkoutTemplates({
      userTemplates,
      systemPresets: WORKOUT_PRESETS,
      assignedRoutine: plan,
      userId,
    });

    // No assigned routine
    expect(assignedTemplates.length).toBe(0);

    // All 5 starter library presets present
    expect(starterLibrary.length).toBe(5);
    expect(starterLibrary.map((t) => t.name)).toEqual([
      "Push Day",
      "Pull Day",
      "Leg Day",
      "Upper Body",
      "Full Body",
    ]);

    // My Templates is empty
    expect(customTemplates.length).toBe(0);
  });
});
