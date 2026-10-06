import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────
const { mockDocGet, mockDocSet, mockBatchCommit, mockBatchSet, mockBatchDelete } = vi.hoisted(() => ({
  mockDocGet: vi.fn(),
  mockDocSet: vi.fn(),
  mockBatchCommit: vi.fn(),
  mockBatchSet: vi.fn(),
  mockBatchDelete: vi.fn(),
}));

vi.mock("@/lib/firebaseAdmin", () => ({
  adminDb: {
    collection: vi.fn().mockReturnValue({
      doc: vi.fn().mockImplementation((docId: string) => ({
        id: docId,
        get: mockDocGet,
        set: mockDocSet,
      })),
    }),
    batch: vi.fn().mockReturnValue({
      set: mockBatchSet,
      delete: mockBatchDelete,
      commit: mockBatchCommit,
    }),
  },
  default: {
    firestore: {
      FieldValue: {
        delete: vi.fn().mockReturnValue("__DELETE_FIELD__"),
      },
    },
  },
}));

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

import { getServerSession } from "next-auth";
import { GET as getStatus } from "@/app/api/onboarding/status/route";
import { POST as postProgress } from "@/app/api/onboarding/progress/route";
import { POST as postComplete } from "@/app/api/onboarding/complete/route";
import { resetRateLimit } from "@/lib/onboarding/rateLimit";

function assertNoUndefinedFirestoreValues(obj: unknown, path: string = "") {
  if (obj === undefined) {
    throw new Error(`Cannot use "undefined" as a Firestore value (found in field "${path}")`);
  }
  if (obj === null || typeof obj !== "object") {
    return;
  }
  for (const [key, val] of Object.entries(obj)) {
    const currentPath = path ? `${path}.${key}` : key;
    if (val === undefined) {
      throw new Error(`Cannot use "undefined" as a Firestore value (found in field "${currentPath}")`);
    }
    if (typeof val === "object" && val !== null) {
      assertNoUndefinedFirestoreValues(val, currentPath);
    }
  }
}

describe("Onboarding API Routes (§11 & §12)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetRateLimit();
    mockBatchCommit.mockResolvedValue(undefined);
    mockBatchSet.mockImplementation((_ref: any, data: any) => {
      assertNoUndefinedFirestoreValues(data);
    });
    mockDocSet.mockImplementation((data: any) => {
      assertNoUndefinedFirestoreValues(data);
    });
  });

  describe("GET /api/onboarding/status", () => {
    it("returns 401 when unauthenticated", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce(null);
      const req = new NextRequest("http://localhost/api/onboarding/status");
      const res = await getStatus(req);
      expect(res.status).toBe(401);
    });

    it("returns completed: false with empty state when profile doc does not exist", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: "user_123" },
      });
      mockDocGet.mockResolvedValueOnce({ exists: false });

      const req = new NextRequest("http://localhost/api/onboarding/status");
      const res = await getStatus(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.completed).toBe(false);
      expect(data.lastStep).toBe("step_0_consent");
      expect(data.draftBaseline).toBeNull();
    });

    it("returns draft progress when draft exists", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: "user_123" },
      });
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          completedAt: null,
          lastStepCompleted: "step_2_physical",
          draft: { focusGoal: "fat_loss", heightCm: 170, weightKg: 70 },
        }),
      });

      const req = new NextRequest("http://localhost/api/onboarding/status");
      const res = await getStatus(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.completed).toBe(false);
      expect(data.lastStep).toBe("step_2_physical");
      expect(data.draftBaseline.focusGoal).toBe("fat_loss");
    });

    it("returns completed: true when completedAt is set", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: "user_123" },
      });
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          completedAt: 1700000000000,
          lastStepCompleted: "step_9_reveal",
        }),
      });

      const req = new NextRequest("http://localhost/api/onboarding/status");
      const res = await getStatus(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.completed).toBe(true);
    });
  });

  describe("POST /api/onboarding/progress", () => {
    it("returns 401 when unauthenticated", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce(null);
      const req = new NextRequest("http://localhost/api/onboarding/progress", {
        method: "POST",
        body: JSON.stringify({ currentStep: "step_1_focus", draft: {} }),
      });
      const res = await postProgress(req);
      expect(res.status).toBe(401);
    });

    it("strictly rejects payload containing health screening answers (privacy mandate)", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: "user_123" },
      });
      const req = new NextRequest("http://localhost/api/onboarding/progress", {
        method: "POST",
        body: JSON.stringify({
          currentStep: "step_1_focus",
          draft: { focusGoal: "fat_loss" },
          healthConditions: ["diabetes"], // Forbidden in draft
        }),
      });
      const res = await postProgress(req);
      expect(res.status).toBe(400);
    });

    it("saves draft progress successfully", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: "user_123" },
      });
      mockDocSet.mockResolvedValueOnce(undefined);

      const req = new NextRequest("http://localhost/api/onboarding/progress", {
        method: "POST",
        body: JSON.stringify({
          currentStep: "step_2_physical",
          draft: { focusGoal: "fat_loss", heightCm: 165, weightKg: 60 },
        }),
      });
      const res = await postProgress(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(data.lastStep).toBe("step_2_physical");
      expect(mockDocSet).toHaveBeenCalledTimes(1);
    });

    it("persists consent fields (consentGivenAt, consentVersion, confirmedAge18Plus) in draft progress", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: "user_123" },
      });
      mockDocSet.mockResolvedValueOnce(undefined);

      const timestamp = 1760000000000;
      const req = new NextRequest("http://localhost/api/onboarding/progress", {
        method: "POST",
        body: JSON.stringify({
          currentStep: "step_1_focus",
          draft: {
            consentGivenAt: timestamp,
            consentVersion: "2026-10-v1",
            confirmedAge18Plus: true,
            focusGoal: "fat_loss",
          },
        }),
      });
      const res = await postProgress(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(data.lastStep).toBe("step_1_focus");
      expect(mockDocSet).toHaveBeenCalledWith(
        expect.objectContaining({
          draft: expect.objectContaining({
            consentGivenAt: timestamp,
            consentVersion: "2026-10-v1",
            confirmedAge18Plus: true,
            focusGoal: "fat_loss",
          }),
        }),
        { merge: true }
      );
    });
  });

  describe("POST /api/onboarding/complete", () => {
    const validPayload = {
      consentGivenAt: Date.now(),
      consentVersion: "2026-10-v1",
      confirmedAge18Plus: true,
      baseline: {
        focusGoal: "fat_loss",
        heightCm: 162,
        weightKg: 65,
        age: 28,
        biologicalSex: "female",
        activityLevel: "sedentary",
        paceTier: "steady",
        includeWorkouts: true,
        workoutDaysPerWeek: 3,
        availableTrainingTimeMinutes: "30-45",
        equipmentAccess: "commercial_gym",
        trainingExperience: "beginner",
        dietaryPattern: "anything",
        foodAvoidances: [],
      },
      healthScreening: {
        selectedConditions: ["none"],
      },
    };

    it("returns 401 when unauthenticated", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce(null);
      const req = new NextRequest("http://localhost/api/onboarding/complete", {
        method: "POST",
        body: JSON.stringify(validPayload),
      });
      const res = await postComplete(req);
      expect(res.status).toBe(401);
    });

    it("returns 422 adult eligibility block if age < 18", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: "user_123" },
      });
      const underagePayload = {
        ...validPayload,
        baseline: {
          ...validPayload.baseline,
          age: 16,
        },
      };

      const req = new NextRequest("http://localhost/api/onboarding/complete", {
        method: "POST",
        body: JSON.stringify(underagePayload),
      });
      const res = await postComplete(req);
      expect(res.status).toBe(422);
      const data = await res.json();
      expect(data.error).toBe("adult_onboarding_eligibility_block");
    });

    it("returns 400 if health screening has no explicit selection", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: "user_123" },
      });
      const emptyHealthPayload = {
        ...validPayload,
        healthScreening: {
          selectedConditions: [],
        },
      };

      const req = new NextRequest("http://localhost/api/onboarding/complete", {
        method: "POST",
        body: JSON.stringify(emptyHealthPayload),
      });
      const res = await postComplete(req);
      expect(res.status).toBe(400);
    });

    it("strictly rejects string consentGivenAt (requires positive number timestamp)", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: "user_123" },
      });
      const stringConsentPayload = {
        ...validPayload,
        consentGivenAt: new Date().toISOString(), // Bug regression: string instead of number
      };

      const req = new NextRequest("http://localhost/api/onboarding/complete", {
        method: "POST",
        body: JSON.stringify(stringConsentPayload),
      });
      const res = await postComplete(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Validation failed");
      expect(data.details.consentGivenAt._errors).toContain("Expected number, received string");
    });

    it("strictly rejects missing consentVersion", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: "user_123" },
      });
      const { consentVersion, ...missingVersionPayload } = validPayload;

      const req = new NextRequest("http://localhost/api/onboarding/complete", {
        method: "POST",
        body: JSON.stringify(missingVersionPayload),
      });
      const res = await postComplete(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Validation failed");
      expect(data.details.consentVersion._errors).toContain("Required");
    });

    it("strictly rejects confirmedAge18Plus: false", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: "user_123" },
      });
      const unconfirmedAgePayload = {
        ...validPayload,
        confirmedAge18Plus: false,
      };

      const req = new NextRequest("http://localhost/api/onboarding/complete", {
        method: "POST",
        body: JSON.stringify(unconfirmedAgePayload),
      });
      const res = await postComplete(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Validation failed");
      expect(data.details.confirmedAge18Plus._errors).toContain("Must confirm age 18 or older to proceed.");
    });

    it("completes onboarding with atomic batch writes and discards raw health answers", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: "user_123" },
      });

      const req = new NextRequest("http://localhost/api/onboarding/complete", {
        method: "POST",
        body: JSON.stringify(validPayload),
      });
      const res = await postComplete(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(data.systemRhythm.focusGoal).toBe("fat_loss");
      expect(data.systemRhythm.targetCalories).toBe(1307); // P1 Persona match
      expect(data.starterRoutine).toBeDefined();

      // Verify atomic batch commit
      expect(mockBatchCommit).toHaveBeenCalledTimes(1);

      // Verify raw health screening is NOT saved in userProfiles
      const profileSetCall = mockBatchSet.mock.calls.find((call) =>
        call[0]?.id === "user_123"
      );
      expect(profileSetCall).toBeDefined();
      const savedProfile = profileSetCall![1];
      expect(savedProfile.safety.healthSensitivityMode).toBe(false);
      expect(savedProfile.healthConditions).toBeUndefined();
      expect(savedProfile.healthScreening).toBeUndefined();
    });

    it("is idempotent: duplicate completion calls execute with deterministic IDs", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "user_123" },
      });

      const req1 = new NextRequest("http://localhost/api/onboarding/complete", {
        method: "POST",
        body: JSON.stringify(validPayload),
      });
      const res1 = await postComplete(req1);
      expect(res1.status).toBe(200);

      const req2 = new NextRequest("http://localhost/api/onboarding/complete", {
        method: "POST",
        body: JSON.stringify(validPayload),
      });
      const res2 = await postComplete(req2);
      expect(res2.status).toBe(200);

      // Both calls should commit cleanly without throwing
      expect(mockBatchCommit).toHaveBeenCalledTimes(2);
    });

    it("regression test: persists muscle_gain completion without weeklyRateKg and with zero undefined fields", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: "user_muscle_123" },
      });

      const muscleGainPayload = {
        ...validPayload,
        baseline: {
          ...validPayload.baseline,
          focusGoal: "muscle_gain" as const,
          heightCm: 178,
          weightKg: 75,
          age: 24,
          biologicalSex: "male" as const,
          activityLevel: "moderately_active" as const,
          paceTier: "steady" as const,
        },
      };

      const req = new NextRequest("http://localhost/api/onboarding/complete", {
        method: "POST",
        body: JSON.stringify(muscleGainPayload),
      });
      const res = await postComplete(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(data.systemRhythm.focusGoal).toBe("muscle_gain");
      expect(data.systemRhythm.targetCalories).toBe(2959);

      // Find userProfile write
      const profileSetCall = mockBatchSet.mock.calls.find((call) =>
        call[0]?.id === "user_muscle_123"
      );
      expect(profileSetCall).toBeDefined();
      const savedProfile = profileSetCall![1];
      const ct = savedProfile.computedTargets;

      // Verify canonical schema conformance
      expect(ct.nutritionStatus).toBe("calculated");
      expect(ct.targetCalories).toBe(2959);
      expect(ct.proteinGrams).toBe(135);
      expect(ct.fatGrams).toBe(82);
      expect(ct.carbGrams).toBe(420);
      expect(ct.deficitCapped).toBe(false);
      expect(ct.calorieFloorApplied).toBe(false);

      // Must NOT contain weeklyRateKg or paceApplied
      expect("weeklyRateKg" in ct).toBe(false);
      expect("paceApplied" in ct).toBe(false);
      expect(ct.weeklyRateKg).toBeUndefined();
    });

    it("handles Case B: biological sex omitted / prefer_not_to_say (deferred_omitted_data with bmrRange)", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: "user_sex_omitted" },
      });

      const sexOmittedPayload = {
        ...validPayload,
        baseline: {
          ...validPayload.baseline,
          biologicalSex: "prefer_not_to_say" as const,
          heightCm: 170,
          weightKg: 70,
          age: 30,
        },
      };

      const req = new NextRequest("http://localhost/api/onboarding/complete", {
        method: "POST",
        body: JSON.stringify(sexOmittedPayload),
      });
      const res = await postComplete(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(data.systemRhythm.nutritionStatus).toBe("deferred_omitted_data");
      expect(data.systemRhythm.targetCalories).toBeNull();

      const profileSetCall = mockBatchSet.mock.calls.find((call) =>
        call[0]?.id === "user_sex_omitted"
      );
      expect(profileSetCall).toBeDefined();
      const ct = profileSetCall![1].computedTargets;

      expect(ct.nutritionStatus).toBe("deferred_omitted_data");
      expect(ct.targetCalories).toBeNull();
      expect(ct.bmrEstimate).toBeNull();
      expect(ct.bmrRange).toEqual([1451.5, 1617.5]);
      expect(ct.tdeeEstimate).toBeNull();
      expect(ct.proteinGrams).toBeNull();
      expect(ct.fatGrams).toBeNull();
      expect(ct.carbGrams).toBeNull();
      expect("weeklyRateKg" in ct).toBe(false);

      // macroGoals must NOT be set when targets are deferred
      const macroSetCall = mockBatchSet.mock.calls.find((call) =>
        call[0]?.id === "user_sex_omitted" && call[1]?.calories !== undefined
      );
      expect(macroSetCall).toBeUndefined();
    });

    it("handles Case C: omitted physiological baseline (deferred_omitted_data without ranges or targetCalories)", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: "user_no_phys" },
      });

      const noPhysPayload = {
        ...validPayload,
        baseline: {
          ...validPayload.baseline,
          heightCm: null,
          weightKg: null,
          age: null,
          biologicalSex: null,
        },
      };

      const req = new NextRequest("http://localhost/api/onboarding/complete", {
        method: "POST",
        body: JSON.stringify(noPhysPayload),
      });
      const res = await postComplete(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(data.systemRhythm.nutritionStatus).toBe("deferred_omitted_data");
      expect(data.systemRhythm.targetCalories).toBeNull();

      const profileSetCall = mockBatchSet.mock.calls.find((call) =>
        call[0]?.id === "user_no_phys"
      );
      expect(profileSetCall).toBeDefined();
      const ct = profileSetCall![1].computedTargets;

      expect(ct.nutritionStatus).toBe("deferred_omitted_data");
      expect(ct.targetCalories).toBeNull();
      expect(ct.bmrEstimate).toBeNull();
      expect(ct.tdeeEstimate).toBeNull();
      expect("bmrRange" in ct).toBe(false);
      expect("tdeeRange" in ct).toBe(false);
      expect("weeklyRateKg" in ct).toBe(false);
    });

    it("handles Case D: health-sensitive mode (withheld_health_sensitive, workout withheld, no undefined fields)", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: "user_health_sensitive" },
      });

      const healthSensitivePayload = {
        ...validPayload,
        healthScreening: {
          selectedConditions: ["diabetes" as const],
        },
      };

      const req = new NextRequest("http://localhost/api/onboarding/complete", {
        method: "POST",
        body: JSON.stringify(healthSensitivePayload),
      });
      const res = await postComplete(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(data.systemRhythm.nutritionStatus).toBe("withheld_health_sensitive");
      expect(data.systemRhythm.targetCalories).toBeNull();
      expect(data.systemRhythm.healthSensitivityMode).toBe(true);

      const profileSetCall = mockBatchSet.mock.calls.find((call) =>
        call[0]?.id === "user_health_sensitive"
      );
      expect(profileSetCall).toBeDefined();
      const profile = profileSetCall![1];
      expect(profile.safety.healthSensitivityMode).toBe(true);
      expect(typeof profile.safety.advisoryAcknowledgedAt).toBe("number");
      expect(profile.workoutPlanAssignment).toBeNull(); // Withheld in health mode

      const ct = profile.computedTargets;
      expect(ct.nutritionStatus).toBe("withheld_health_sensitive");
      expect(ct.targetCalories).toBeNull();
      expect("weeklyRateKg" in ct).toBe(false);
    });

    it("handles Case E: infeasible nutrition constraints (infeasible_constraints, targetCalories null, no undefined fields)", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: "user_infeasible" },
      });

      // 150kg female, sedentary, fast deficit -> min protein floor (240g = 960 kcal) exceeds 35% calorie cap
      const infeasiblePayload = {
        ...validPayload,
        baseline: {
          ...validPayload.baseline,
          focusGoal: "fat_loss" as const,
          heightCm: 150,
          weightKg: 150,
          age: 60,
          biologicalSex: "female" as const,
          activityLevel: "sedentary" as const,
          paceTier: "fast" as const,
        },
      };

      const req = new NextRequest("http://localhost/api/onboarding/complete", {
        method: "POST",
        body: JSON.stringify(infeasiblePayload),
      });
      const res = await postComplete(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(data.systemRhythm.nutritionStatus).toBe("infeasible_constraints");
      expect(data.systemRhythm.targetCalories).toBeNull();

      const profileSetCall = mockBatchSet.mock.calls.find((call) =>
        call[0]?.id === "user_infeasible"
      );
      expect(profileSetCall).toBeDefined();
      const ct = profileSetCall![1].computedTargets;

      expect(ct.nutritionStatus).toBe("infeasible_constraints");
      expect(ct.targetCalories).toBeNull();
      expect("weeklyRateKg" in ct).toBe(false);
      expect("paceApplied" in ct).toBe(false);
    });

    it("handles workout opt-in: persists workout templates with deterministic IDs matching workoutPlanAssignment", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: "user_workout_optin" },
      });

      const workoutPayload = {
        ...validPayload,
        baseline: {
          ...validPayload.baseline,
          includeWorkouts: true,
          workoutDaysPerWeek: 3 as const,
          availableTrainingTimeMinutes: "30-45" as const,
          trainingExperience: "beginner" as const,
          equipmentAccess: "commercial_gym" as const,
          preferredTrainingWindow: "morning" as const,
        },
      };

      const req = new NextRequest("http://localhost/api/onboarding/complete", {
        method: "POST",
        body: JSON.stringify(workoutPayload),
      });
      const res = await postComplete(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(data.starterRoutine).toBeDefined();
      expect(data.starterRoutine.name).toContain("Full Body Machine & DB");
      expect(data.starterRoutine.templateIds.length).toBe(3);

      const profileSetCall = mockBatchSet.mock.calls.find((call) =>
        call[0]?.id === "user_workout_optin"
      );
      expect(profileSetCall).toBeDefined();
      const profile = profileSetCall![1];
      expect(profile.workoutPlanAssignment).not.toBeNull();
      expect(profile.workoutPlanAssignment.planName).toBe(data.starterRoutine.name);
      expect(profile.workoutPlanAssignment.daysPerWeek).toBe(3);

      // Verify template docs were written to batch
      const templateSetCalls = mockBatchSet.mock.calls.filter((call) =>
        call[0]?.id?.startsWith("tpl_onboarding_user_workout_optin_")
      );
      expect(templateSetCalls.length).toBe(3);
      for (const tplId of profile.workoutPlanAssignment.templateIds) {
        expect(templateSetCalls.some((c) => c[0].id === tplId)).toBe(true);
      }
    });
  });
});
