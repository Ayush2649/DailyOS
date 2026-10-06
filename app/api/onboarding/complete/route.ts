import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import admin, { adminDb } from "@/lib/firebaseAdmin";
import { authOptions } from "@/lib/auth";
import { getUserKey } from "@/lib/auth/userKey";
import { OnboardingCompletePayloadSchema } from "@/lib/onboarding/validation";
import {
  QUESTIONNAIRE_VERSION,
  FORMULA_VERSION,
  NUTRITION_POLICY_VERSION,
  POLICY_LIMITS,
} from "@/lib/onboarding/constants";
import {
  calculateNutritionTargets,
  toCanonicalComputedTargets,
} from "@/lib/nutrition/calculations";
import {
  composeStarterWorkout,
  generateWorkoutTemplateDocs,
} from "@/lib/workouts/composition";
import { checkRateLimit } from "@/lib/onboarding/rateLimit";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = getUserKey(session);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit: 5 requests / min
  const rateLimit = checkRateLimit(`complete_${userId}`, 5);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please slow down." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } }
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Check underage eligibility block explicitly
  if (
    body?.baseline?.age !== undefined &&
    body?.baseline?.age !== null &&
    body.baseline.age < POLICY_LIMITS.MIN_ADULT_AGE
  ) {
    return NextResponse.json(
      {
        error: "adult_onboarding_eligibility_block",
        message:
          "Satat is designed and calibrated for adult metabolic baselines. During adolescence, growth requires guidance from a pediatrician or registered sports dietitian.",
      },
      { status: 422 }
    );
  }

  // Validate complete payload
  const parseResult = OnboardingCompletePayloadSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parseResult.error.format() },
      { status: 400 }
    );
  }

  const payload = parseResult.data;
  const { baseline, healthScreening, consentGivenAt, consentVersion } = payload;

  // In-memory Health Evaluation (RAW ANSWERS DISCARDED IMMEDIATELY)
  const conditions = healthScreening.selectedConditions;
  const isNone = conditions.includes("none");
  const healthSensitivityMode = !isNone;
  const hasPhysicalInjury = conditions.includes("physical_injury");
  const withholdNutritionDueToHealth = conditions.some((c) =>
    ["pregnant_breastfeeding", "diabetes", "cardiovascular", "disordered_eating"].includes(c)
  );

  // Pure Deterministic Calculations
  const targets = calculateNutritionTargets({
    focusGoal: baseline.focusGoal,
    heightCm: baseline.heightCm ?? null,
    weightKg: baseline.weightKg ?? null,
    age: baseline.age ?? null,
    biologicalSex: baseline.biologicalSex ?? null,
    activityLevel: baseline.activityLevel ?? null,
    paceTier: baseline.paceTier ?? null,
    healthSensitivityMode,
    withholdNutritionDueToHealth,
  });

  // Starter Workout Composition
  const workoutPlan = composeStarterWorkout({
    userId,
    includeWorkouts: baseline.includeWorkouts,
    workoutDaysPerWeek: baseline.workoutDaysPerWeek ?? null,
    availableTrainingTimeMinutes: baseline.availableTrainingTimeMinutes ?? null,
    trainingExperience: baseline.trainingExperience ?? null,
    equipmentAccess: baseline.equipmentAccess ?? null,
    healthSensitivityMode,
    hasPhysicalInjury,
  });

  const now = Date.now();
  const batch = adminDb.batch();

  // 1. Atomic Profile Document Write
  const profileRef = adminDb.collection("userProfiles").doc(userId);
  batch.set(
    profileRef,
    {
      userId,
      questionnaireVersion: QUESTIONNAIRE_VERSION,
      formulaVersion: FORMULA_VERSION,
      nutritionPolicyVersion: NUTRITION_POLICY_VERSION,
      consentVersion,
      consentGivenAt,
      completedAt: now,
      lastStepCompleted: "step_9_reveal",
      baseline: {
        focusGoal: baseline.focusGoal,
        heightCm: baseline.heightCm ?? null,
        weightKg: baseline.weightKg ?? null,
        age: baseline.age ?? null,
        biologicalSex: baseline.biologicalSex ?? null,
        targetWeightKg: baseline.targetWeightKg ?? null,
        paceTier: baseline.paceTier ?? null,
        activityLevel: baseline.activityLevel ?? null,
        dietaryPattern: baseline.dietaryPattern ?? null,
        foodAvoidances: baseline.foodAvoidances ?? [],
        includeWorkouts: baseline.includeWorkouts,
        workoutDaysPerWeek: baseline.workoutDaysPerWeek ?? null,
        availableTrainingTimeMinutes: baseline.availableTrainingTimeMinutes ?? null,
        preferredTrainingWindow: baseline.preferredTrainingWindow ?? null,
        trainingExperience: baseline.trainingExperience ?? null,
        equipmentAccess: baseline.equipmentAccess ?? null,
      },
      safety: {
        healthSensitivityMode,
        advisoryAcknowledgedAt: healthSensitivityMode ? now : null,
      },
      computedTargets: toCanonicalComputedTargets(targets),
      workoutPlanAssignment: workoutPlan,
      draft: admin.firestore.FieldValue.delete(),
      createdAt: now,
      updatedAt: now,
    },
    { merge: true }
  );

  // 2. Macro Goals Store Write (Only if targetCalories calculated)
  if (targets.targetCalories !== null && targets.nutritionStatus === "calculated") {
    const macroRef = adminDb.collection("macroGoals").doc(userId);
    batch.set(
      macroRef,
      {
        calories: targets.targetCalories,
        proteinG: targets.proteinGrams ?? 0,
        carbsG: targets.carbGrams ?? 0,
        fatG: targets.fatGrams ?? 0,
      },
      { merge: true }
    );
  }

  // 3. Initial Bodyweight Log (Deterministic ID for idempotence)
  if (baseline.weightKg !== null && baseline.weightKg !== undefined) {
    const todayDate = new Date().toISOString().split("T")[0];
    const bwRef = adminDb.collection("bodyweight").doc(`initial_${userId}_${todayDate}`);
    batch.set(
      bwRef,
      {
        userId,
        date: todayDate,
        weightKg: baseline.weightKg,
        createdAt: now,
      },
      { merge: true }
    );
  }

  // 4. Starter Workout Template Assignment (Deterministic template IDs)
  if (
    workoutPlan &&
    baseline.includeWorkouts &&
    baseline.equipmentAccess
  ) {
    const templateDocs = generateWorkoutTemplateDocs({
      userId,
      equipmentAccess: baseline.equipmentAccess,
      trainingExperience: baseline.trainingExperience ?? "beginner",
      availableTrainingTimeMinutes: baseline.availableTrainingTimeMinutes ?? null,
      workoutDaysPerWeek: workoutPlan.daysPerWeek,
    });

    for (const tpl of templateDocs) {
      const tplRef = adminDb.collection("workoutTemplates").doc(tpl.id);
      batch.set(tplRef, tpl, { merge: true });
    }
  }

  // 5. Preferred Reminder Time (if provided)
  if (baseline.preferredTrainingWindow && baseline.preferredTrainingWindow !== "flexible") {
    const reminderTime =
      baseline.preferredTrainingWindow === "morning"
        ? "07:00"
        : baseline.preferredTrainingWindow === "afternoon"
        ? "12:30"
        : "18:00";

    const notifRef = adminDb.collection("notificationPrefs").doc(userId);
    batch.set(
      notifRef,
      {
        workoutReminders: true,
        workoutTime: reminderTime,
      },
      { merge: true }
    );
  }

  try {
    await batch.commit();

    return NextResponse.json({
      ok: true,
      systemRhythm: {
        focusGoal: baseline.focusGoal,
        nutritionStatus: targets.nutritionStatus,
        targetCalories: targets.targetCalories,
        proteinGrams: targets.proteinGrams,
        carbGrams: targets.carbGrams,
        fatGrams: targets.fatGrams,
        healthSensitivityMode,
      },
      starterRoutine: workoutPlan
        ? {
            name: workoutPlan.planName,
            templateIds: workoutPlan.templateIds,
          }
        : null,
    });
  } catch (error: any) {
    console.error("[onboarding/complete] Error during atomic commit:", error?.message);
    return NextResponse.json({ error: "Failed to complete onboarding" }, { status: 500 });
  }
}

