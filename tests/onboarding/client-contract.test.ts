import { describe, it, expect, vi } from "vitest";
import { CONSENT_VERSION } from "@/lib/onboarding/constants";
import { OnboardingCompletePayloadSchema, HealthCondition } from "@/lib/onboarding/validation";
import type { OnboardingFormValues } from "@/components/onboarding/types";

// ── Test Age Validation Boundary Logic (§1) ───────────────────────────────────
function evaluateAgeInput(val: string) {
  let age: number | null = null;
  let error: string | null = null;
  let redirectedToUnder18 = false;

  // onChange simulation (typing)
  if (!val.trim()) {
    age = null;
    error = null;
  } else {
    const num = parseInt(val, 10);
    if (isNaN(num)) {
      age = null;
      error = null;
    } else if (num > 100) {
      age = null;
      error = "Please enter an age between 18 and 100.";
    } else {
      age = num;
      error = null;
    }
  }

  // onContinue / explicit commit boundary simulation
  function commit() {
    if (val.trim()) {
      const num = parseInt(val, 10);
      if (isNaN(num)) {
        error = "Please enter a valid age.";
        return false;
      }
      if (num < 18) {
        redirectedToUnder18 = true;
        return false;
      }
      if (num > 100) {
        error = "Please enter an age between 18 and 100.";
        return false;
      }
      age = num;
      return true;
    }
    age = null;
    return true; // allowed to skip
  }

  return {
    getAge: () => age,
    getError: () => error,
    isRedirected: () => redirectedToUnder18,
    commit,
  };
}

describe("Age Input & Validation Boundary (§1 Audit Fix)", () => {
  it("allows typing intermediate single digit '2' without error or redirect", () => {
    const state = evaluateAgeInput("2");
    expect(state.getAge()).toBe(2);
    expect(state.getError()).toBeNull();
    expect(state.isRedirected()).toBe(false);
  });

  it("accepts completed adult age '22'", () => {
    const state = evaluateAgeInput("22");
    expect(state.getAge()).toBe(22);
    expect(state.getError()).toBeNull();
    const allowed = state.commit();
    expect(allowed).toBe(true);
    expect(state.isRedirected()).toBe(false);
  });

  it("does not redirect when typing '17', but blocks and redirects on commit", () => {
    const state = evaluateAgeInput("17");
    // While typing:
    expect(state.isRedirected()).toBe(false);
    // On explicit continue:
    const allowed = state.commit();
    expect(allowed).toBe(false);
    expect(state.isRedirected()).toBe(true);
  });

  it("accepts boundary age 18 on commit", () => {
    const state = evaluateAgeInput("18");
    const allowed = state.commit();
    expect(allowed).toBe(true);
    expect(state.isRedirected()).toBe(false);
    expect(state.getAge()).toBe(18);
  });

  it("accepts canonical upper bound age 100 on commit", () => {
    const state = evaluateAgeInput("100");
    const allowed = state.commit();
    expect(allowed).toBe(true);
    expect(state.isRedirected()).toBe(false);
    expect(state.getAge()).toBe(100);
  });

  it("rejects out-of-bounds age 101 with error and blocks commit", () => {
    const state = evaluateAgeInput("101");
    expect(state.getError()).toBe("Please enter an age between 18 and 100.");
    const allowed = state.commit();
    expect(allowed).toBe(false);
    expect(state.isRedirected()).toBe(false);
  });

  it("allows clearing the field and backspacing without navigation", () => {
    const state = evaluateAgeInput("");
    expect(state.getAge()).toBeNull();
    expect(state.getError()).toBeNull();
    expect(state.isRedirected()).toBe(false);
    const allowed = state.commit();
    expect(allowed).toBe(true);
    expect(state.isRedirected()).toBe(false);
  });
});

// ── Test Status API Contract Hydration (§2) ───────────────────────────────────
function hydrateWizardFromStatus(apiResponse: {
  completed: boolean;
  lastStep: string;
  draftBaseline: any;
}) {
  if (apiResponse.completed) {
    return { shouldRedirectToDashboard: true, currentStep: null, formValues: null };
  }

  const restoredStep = apiResponse.lastStep || "step_0_consent";
  const restoredDraft = apiResponse.draftBaseline || null;

  if (restoredDraft) {
    const hasConfirmedAge = Boolean(restoredDraft.confirmedAge18Plus);
    const hasConsentTimestamp =
      typeof restoredDraft.consentGivenAt === "number" && restoredDraft.consentGivenAt > 0;
    const hasConsent = hasConfirmedAge && hasConsentTimestamp;

    const effectiveStep =
      hasConsent && restoredStep !== "step_0_consent"
        ? restoredStep
        : "step_0_consent";

    return {
      shouldRedirectToDashboard: false,
      currentStep: effectiveStep,
      formValues: {
        ...restoredDraft,
        confirmedAge18Plus: hasConsent ? true : false,
        consentGivenAt: hasConsent ? restoredDraft.consentGivenAt : null,
        consentVersion: hasConsent ? (restoredDraft.consentVersion || CONSENT_VERSION) : null,
      },
    };
  }

  return {
    shouldRedirectToDashboard: false,
    currentStep: "step_0_consent",
    formValues: {},
  };
}

describe("Status API Client Contract Alignment (§2 Audit Fix)", () => {
  it("redirects completed user to /dashboard", () => {
    const serverResponse = {
      completed: true,
      lastStep: "step_9_reveal",
      draftBaseline: null,
    };

    const hydrated = hydrateWizardFromStatus(serverResponse);
    expect(hydrated.shouldRedirectToDashboard).toBe(true);
  });

  it("restores canonical step and draft for returning user when consent was previously given", () => {
    const serverResponse = {
      completed: false,
      lastStep: "step_4_activity",
      draftBaseline: {
        consentGivenAt: 1760000000000,
        consentVersion: "2026-10-v1",
        confirmedAge18Plus: true,
        focusGoal: "fat_loss",
        heightCm: 165,
        weightKg: 62,
        age: 29,
        biologicalSex: "female",
      },
    };

    const hydrated = hydrateWizardFromStatus(serverResponse);
    expect(hydrated.shouldRedirectToDashboard).toBe(false);
    expect(hydrated.currentStep).toBe("step_4_activity");
    expect(hydrated.formValues.confirmedAge18Plus).toBe(true);
    expect(hydrated.formValues.consentGivenAt).toBe(1760000000000);
    expect(hydrated.formValues.focusGoal).toBe("fat_loss");
    expect(hydrated.formValues.weightKg).toBe(62);
  });

  it("restarts at step_0_consent if draft lacks explicit Step 0 consent", () => {
    const serverResponse = {
      completed: false,
      lastStep: "step_4_activity",
      draftBaseline: {
        focusGoal: "fat_loss",
        heightCm: 165,
        // Missing confirmedAge18Plus and consentGivenAt
      },
    };

    const hydrated = hydrateWizardFromStatus(serverResponse);
    expect(hydrated.shouldRedirectToDashboard).toBe(false);
    expect(hydrated.currentStep).toBe("step_0_consent");
    expect(hydrated.formValues.confirmedAge18Plus).toBe(false);
    expect(hydrated.formValues.consentGivenAt).toBeNull();
  });

  it("initializes fresh user at step_0_consent with empty draft", () => {
    const serverResponse = {
      completed: false,
      lastStep: "step_0_consent",
      draftBaseline: null,
    };

    const hydrated = hydrateWizardFromStatus(serverResponse);
    expect(hydrated.shouldRedirectToDashboard).toBe(false);
    expect(hydrated.currentStep).toBe("step_0_consent");
    expect(hydrated.formValues).toEqual({});
  });
});

// ── Test Reveal Screen Status Key Resolution (§4) ──────────────────────────────
describe("Reveal Screen Status Key Resolution (§4 Audit Fix)", () => {
  function getRevealDisplayMode(
    rhythm: { nutritionStatus?: string; targetCalories?: number | null; healthSensitivityMode?: boolean } | null,
    formValues: { biologicalSex: string | null }
  ) {
    if (rhythm?.nutritionStatus === "calculated" && rhythm.targetCalories) {
      return "calculated_target";
    }
    if (
      rhythm?.nutritionStatus === "deferred_omitted_data" &&
      (!formValues.biologicalSex || formValues.biologicalSex === "prefer_not_to_say")
    ) {
      return "uncertainty_range";
    }
    if (rhythm?.healthSensitivityMode) {
      return "health_sensitive_intuitive";
    }
    return "intuitive_tracking";
  }

  it("renders uncertainty range when biologicalSex was omitted and status is deferred_omitted_data", () => {
    const rhythm = {
      nutritionStatus: "deferred_omitted_data",
      targetCalories: null,
      healthSensitivityMode: false,
    };
    const formValues = { biologicalSex: "prefer_not_to_say" };

    expect(getRevealDisplayMode(rhythm, formValues)).toBe("uncertainty_range");
  });

  it("renders calculated baseline when targets are calculated", () => {
    const rhythm = {
      nutritionStatus: "calculated",
      targetCalories: 2150,
      healthSensitivityMode: false,
    };
    const formValues = { biologicalSex: "male" };

    expect(getRevealDisplayMode(rhythm, formValues)).toBe("calculated_target");
  });

  it("renders health sensitive intuitive when health sensitivity mode is active", () => {
    const rhythm = {
      nutritionStatus: "withheld_health_sensitive",
      targetCalories: null,
      healthSensitivityMode: true,
    };
    const formValues = { biologicalSex: "female" };

    expect(getRevealDisplayMode(rhythm, formValues)).toBe("health_sensitive_intuitive");
  });
});

// ── Test Consent & Completion Contract (§5 Client-Server Contract Bug Fix) ──────
describe("Consent & Completion Contract (§5 Fix)", () => {
  it("schema accepts numeric Unix timestamp milliseconds for consentGivenAt", () => {
    const result = OnboardingCompletePayloadSchema.shape.consentGivenAt.safeParse(Date.now());
    expect(result.success).toBe(true);
  });

  it("schema strictly rejects ISO string for consentGivenAt", () => {
    const result = OnboardingCompletePayloadSchema.shape.consentGivenAt.safeParse(new Date().toISOString());
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toContain("Expected number, received string");
    }
  });

  it("schema requires consentVersion string and accepts CONSENT_VERSION constant", () => {
    const pass = OnboardingCompletePayloadSchema.shape.consentVersion.safeParse(CONSENT_VERSION);
    expect(pass.success).toBe(true);
    expect(CONSENT_VERSION).toBe("2026-10-v1");

    const fail = OnboardingCompletePayloadSchema.shape.consentVersion.safeParse(undefined);
    expect(fail.success).toBe(false);
  });

  it("schema accepts confirmedAge18Plus: true and strictly rejects false", () => {
    const pass = OnboardingCompletePayloadSchema.shape.confirmedAge18Plus.safeParse(true);
    expect(pass.success).toBe(true);

    const fail = OnboardingCompletePayloadSchema.shape.confirmedAge18Plus.safeParse(false);
    expect(fail.success).toBe(false);
    if (!fail.success) {
      expect(fail.error.errors[0].message).toContain("Must confirm age 18 or older to proceed.");
    }
  });

  it("Step 0 consent propagates through wizard state to completion payload", () => {
    // Simulating Step 0 commit
    const formValues: OnboardingFormValues = {
      consentGivenAt: 1760000000000,
      consentVersion: CONSENT_VERSION,
      confirmedAge18Plus: true,
      focusGoal: "fat_loss",
      heightCm: 170,
      weightKg: 70,
      age: 25,
      biologicalSex: "male",
      targetWeightKg: 65,
      paceTier: "steady",
      activityLevel: "sedentary",
      includeWorkouts: true,
      workoutDaysPerWeek: 3,
      availableTrainingTimeMinutes: "30-45",
      preferredTrainingWindow: "morning",
      equipmentAccess: "commercial_gym",
      trainingExperience: "beginner",
      dietaryPattern: "anything",
      foodAvoidances: [],
    };

    const healthConditions: HealthCondition[] = ["none"];

    // Payload construction matching useOnboardingWizard
    const completePayload = {
      consentGivenAt: formValues.consentGivenAt!,
      consentVersion: formValues.consentVersion!,
      confirmedAge18Plus: formValues.confirmedAge18Plus,
      baseline: {
        focusGoal: formValues.focusGoal!,
        heightCm: formValues.heightCm,
        weightKg: formValues.weightKg,
        age: formValues.age,
        biologicalSex: formValues.biologicalSex,
        targetWeightKg: formValues.targetWeightKg,
        paceTier: formValues.paceTier,
        activityLevel: formValues.activityLevel,
        dietaryPattern: formValues.dietaryPattern,
        foodAvoidances: formValues.foodAvoidances,
        includeWorkouts: formValues.includeWorkouts ?? false,
        workoutDaysPerWeek: formValues.workoutDaysPerWeek,
        availableTrainingTimeMinutes: formValues.availableTrainingTimeMinutes,
        preferredTrainingWindow: formValues.preferredTrainingWindow,
        trainingExperience: formValues.trainingExperience,
        equipmentAccess: formValues.equipmentAccess,
      },
      healthScreening: {
        selectedConditions: healthConditions,
      },
    };

    const parseResult = OnboardingCompletePayloadSchema.safeParse(completePayload);
    expect(parseResult.success).toBe(true);
  });

  it("entering age 22 on Step 2 does NOT manufacture consent if confirmedAge18Plus is false", () => {
    const unconsentedFormValues: OnboardingFormValues = {
      consentGivenAt: null,
      consentVersion: null,
      confirmedAge18Plus: false,
      focusGoal: "fat_loss",
      heightCm: 180,
      weightKg: 75,
      age: 22, // Adult age entered on Step 2
      biologicalSex: "male",
      targetWeightKg: null,
      paceTier: null,
      activityLevel: "sedentary",
      includeWorkouts: false,
      workoutDaysPerWeek: null,
      availableTrainingTimeMinutes: null,
      preferredTrainingWindow: null,
      trainingExperience: null,
      equipmentAccess: null,
      dietaryPattern: "anything",
      foodAvoidances: [],
    };

    // Even with adult age entered, Step 0 legal confirmation remains false
    expect(unconsentedFormValues.confirmedAge18Plus).toBe(false);

    // If unconsented payload is submitted, server schema rejects with 400
    const invalidPayload = {
      consentGivenAt: Date.now(),
      consentVersion: CONSENT_VERSION,
      confirmedAge18Plus: unconsentedFormValues.confirmedAge18Plus,
      baseline: {
        focusGoal: unconsentedFormValues.focusGoal!,
        heightCm: unconsentedFormValues.heightCm,
        weightKg: unconsentedFormValues.weightKg,
        age: unconsentedFormValues.age,
        biologicalSex: unconsentedFormValues.biologicalSex,
        targetWeightKg: unconsentedFormValues.targetWeightKg,
        paceTier: unconsentedFormValues.paceTier,
        activityLevel: unconsentedFormValues.activityLevel,
        dietaryPattern: unconsentedFormValues.dietaryPattern,
        foodAvoidances: unconsentedFormValues.foodAvoidances,
        includeWorkouts: false,
        workoutDaysPerWeek: null,
        availableTrainingTimeMinutes: null,
        preferredTrainingWindow: null,
        trainingExperience: null,
        equipmentAccess: null,
      },
      healthScreening: {
        selectedConditions: ["none" as HealthCondition],
      },
    };

    const parseResult = OnboardingCompletePayloadSchema.safeParse(invalidPayload);
    expect(parseResult.success).toBe(false);
    if (!parseResult.success) {
      expect(parseResult.error.format().confirmedAge18Plus?._errors).toContain(
        "Must confirm age 18 or older to proceed."
      );
    }
  });

  it("full flow simulation from Step 0 through Step 8 constructs valid complete payload", () => {
    // Step 0: User confirms age 18+ and agrees to terms
    const step0Time = Date.now();
    let stateValues: OnboardingFormValues = {
      consentGivenAt: step0Time,
      consentVersion: CONSENT_VERSION,
      confirmedAge18Plus: true,
      focusGoal: null,
      heightCm: null,
      weightKg: null,
      age: null,
      biologicalSex: null,
      targetWeightKg: null,
      paceTier: null,
      activityLevel: null,
      includeWorkouts: null,
      workoutDaysPerWeek: null,
      availableTrainingTimeMinutes: null,
      preferredTrainingWindow: null,
      equipmentAccess: null,
      trainingExperience: null,
      dietaryPattern: null,
      foodAvoidances: [],
    };

    // Step 1: User selects focus goal
    stateValues = { ...stateValues, focusGoal: "fat_loss" };

    // Step 2: User enters physical stats
    stateValues = {
      ...stateValues,
      heightCm: 165,
      weightKg: 65,
      age: 26,
      biologicalSex: "female",
    };

    // Step 3: User sets pace
    stateValues = { ...stateValues, paceTier: "steady", targetWeightKg: 60 };

    // Step 4: User sets activity level
    stateValues = { ...stateValues, activityLevel: "sedentary" };

    // Step 5: User sets workout rhythm
    stateValues = {
      ...stateValues,
      includeWorkouts: true,
      workoutDaysPerWeek: 3,
      availableTrainingTimeMinutes: "30-45",
      preferredTrainingWindow: "morning",
    };

    // Step 6: User sets workout environment
    stateValues = {
      ...stateValues,
      equipmentAccess: "commercial_gym",
      trainingExperience: "beginner",
    };

    // Step 7: User sets dietary pattern
    stateValues = {
      ...stateValues,
      dietaryPattern: "anything",
      foodAvoidances: [],
    };

    // Step 8: User completes in-memory health screening
    const healthScreeningAnswers: HealthCondition[] = ["none"];

    // Final payload construction
    const payload = {
      consentGivenAt: stateValues.consentGivenAt!,
      consentVersion: stateValues.consentVersion!,
      confirmedAge18Plus: stateValues.confirmedAge18Plus,
      baseline: {
        focusGoal: stateValues.focusGoal!,
        heightCm: stateValues.heightCm,
        weightKg: stateValues.weightKg,
        age: stateValues.age,
        biologicalSex: stateValues.biologicalSex,
        targetWeightKg: stateValues.targetWeightKg,
        paceTier: stateValues.paceTier,
        activityLevel: stateValues.activityLevel,
        dietaryPattern: stateValues.dietaryPattern,
        foodAvoidances: stateValues.foodAvoidances,
        includeWorkouts: stateValues.includeWorkouts ?? false,
        workoutDaysPerWeek: stateValues.workoutDaysPerWeek,
        availableTrainingTimeMinutes: stateValues.availableTrainingTimeMinutes,
        preferredTrainingWindow: stateValues.preferredTrainingWindow,
        trainingExperience: stateValues.trainingExperience,
        equipmentAccess: stateValues.equipmentAccess,
      },
      healthScreening: {
        selectedConditions: healthScreeningAnswers,
      },
    };

    const validation = OnboardingCompletePayloadSchema.safeParse(payload);
    expect(validation.success).toBe(true);
    if (validation.success) {
      expect(validation.data.consentGivenAt).toBe(step0Time);
      expect(validation.data.consentVersion).toBe("2026-10-v1");
      expect(validation.data.confirmedAge18Plus).toBe(true);
      expect(validation.data.baseline.age).toBe(26);
    }
  });
});


