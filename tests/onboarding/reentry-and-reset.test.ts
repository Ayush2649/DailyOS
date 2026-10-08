import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────
const {
  mockDocGet,
  mockDocSet,
  mockDocUpdate,
  mockDocDelete,
  mockBatchCommit,
  mockBatchSet,
  mockBatchDelete,
  mockBatchUpdate,
  mockTemplatesWhereGet,
} = vi.hoisted(() => ({
  mockDocGet: vi.fn(),
  mockDocSet: vi.fn(),
  mockDocUpdate: vi.fn(),
  mockDocDelete: vi.fn(),
  mockBatchCommit: vi.fn(),
  mockBatchSet: vi.fn(),
  mockBatchDelete: vi.fn(),
  mockBatchUpdate: vi.fn(),
  mockTemplatesWhereGet: vi.fn(),
}));

vi.mock("@/lib/firebaseAdmin", () => ({
  adminDb: {
    collection: vi.fn().mockImplementation((colName: string) => ({
      doc: vi.fn().mockImplementation((docId: string) => ({
        id: docId,
        get: mockDocGet,
        set: mockDocSet,
        update: mockDocUpdate,
        delete: mockDocDelete,
      })),
      where: vi.fn().mockImplementation(() => ({
        get: mockTemplatesWhereGet,
      })),
    })),
    batch: vi.fn().mockReturnValue({
      set: mockBatchSet,
      delete: mockBatchDelete,
      update: mockBatchUpdate,
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
import { POST as postReset } from "@/app/api/onboarding/reset/route";
import { isOnboardingTemplate, isCustomTemplate, isSystemTemplate } from "@/lib/workouts/classification";
import type { WorkoutTemplate } from "@/types";

describe("Onboarding Re-entry & Developer Reset Specification (§18 & §19)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (process.env as any).NODE_ENV = "test";
    delete process.env.ALLOW_DEV_RESET;
  });

  // =========================================================================
  // 1. Production Re-entry & Status Contract
  // =========================================================================
  describe("Production Re-entry & Status Endpoint", () => {
    it("1. Completed user receives completed=true, persistedBaseline and draft status", async () => {
      (getServerSession as any).mockResolvedValueOnce({
        user: { id: "user_reentry_1", email: "user1@example.com" },
      });

      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          completedAt: 1700000000000,
          lastStepCompleted: "step_9_reveal",
          consentGivenAt: 1699999000000,
          consentVersion: "2026-10-v1",
          baseline: {
            focusGoal: "muscle_gain",
            heightCm: 180,
            weightKg: 78,
            age: 28,
            biologicalSex: "male",
            targetWeightKg: 82,
            paceTier: "steady",
            activityLevel: "moderately_active",
            dietaryPattern: "non_vegetarian",
            foodAvoidances: [],
            includeWorkouts: true,
            workoutDaysPerWeek: 4,
            availableTrainingTimeMinutes: "45-60",
            preferredTrainingWindow: "morning",
            trainingExperience: "intermediate",
            equipmentAccess: "commercial_gym",
          },
          computedTargets: {
            targetCalories: 2650,
            proteinGrams: 156,
          },
          draft: null,
        }),
      });

      const res = await getStatus(new NextRequest("http://localhost:3000/api/onboarding/status"));
      expect(res.status).toBe(200);
      const json = await res.json();

      expect(json.completed).toBe(true);
      expect(json.persistedBaseline).toBeDefined();
      expect(json.persistedBaseline.focusGoal).toBe("muscle_gain");
      expect(json.persistedBaseline.weightKg).toBe(78);
      expect(json.draftBaseline).toBeNull();
      expect(json.consentGivenAt).toBe(1699999000000);
      expect(json.consentVersion).toBe("2026-10-v1");
    });

    it("2. Resumes uncompleted update draft if draft is within 30-day TTL", async () => {
      (getServerSession as any).mockResolvedValueOnce({
        user: { id: "user_reentry_2", email: "user2@example.com" },
      });

      const recentTime = Date.now() - 2 * 24 * 60 * 60 * 1000; // 2 days ago (< 30 days)
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          completedAt: 1700000000000,
          lastStepCompleted: "step_3_pace",
          baseline: {
            focusGoal: "fat_loss",
            weightKg: 85,
          },
          draft: {
            focusGoal: "muscle_gain", // user modified in update mode
            weightKg: 85,
            paceTier: "fast",
          },
          draftUpdatedAt: recentTime,
        }),
      });

      const res = await getStatus(new NextRequest("http://localhost:3000/api/onboarding/status"));
      expect(res.status).toBe(200);
      const json = await res.json();

      expect(json.completed).toBe(true);
      expect(json.draftBaseline).toBeDefined();
      expect(json.draftBaseline.focusGoal).toBe("muscle_gain");
      expect(json.persistedBaseline.focusGoal).toBe("fat_loss");
      expect(json.lastStep).toBe("step_3_pace");
    });

    it("3. Discards draft if older than 30-day TTL and falls back to persistedBaseline", async () => {
      (getServerSession as any).mockResolvedValueOnce({
        user: { id: "user_reentry_3", email: "user3@example.com" },
      });

      const expiredTime = Date.now() - 35 * 24 * 60 * 60 * 1000; // 35 days ago (> 30 days)
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          completedAt: 1700000000000,
          lastStepCompleted: "step_9_reveal",
          baseline: {
            focusGoal: "fat_loss",
            weightKg: 90,
          },
          draft: {
            focusGoal: "habit_routine",
          },
          draftUpdatedAt: expiredTime,
        }),
      });

      const res = await getStatus(new NextRequest("http://localhost:3000/api/onboarding/status"));
      expect(res.status).toBe(200);
      const json = await res.json();

      expect(json.completed).toBe(true);
      expect(json.draftBaseline).toBeNull(); // expired draft suppressed
      expect(json.persistedBaseline.focusGoal).toBe("fat_loss");
    });

    it("4. Progress updates in re-entry mode save to draft without mutating active baseline", async () => {
      (getServerSession as any).mockResolvedValueOnce({
        user: { id: "user_reentry_4", email: "user4@example.com" },
      });

      mockDocSet.mockResolvedValueOnce(undefined);

      const req = new NextRequest("http://localhost:3000/api/onboarding/progress", {
        method: "POST",
        body: JSON.stringify({
          currentStep: "step_2_physical",
          draft: {
            focusGoal: "fat_loss",
            weightKg: 82,
            heightCm: 178,
          },
        }),
      });

      const res = await postProgress(req);
      expect(res.status).toBe(200);

      // Verify write: sets draft, draftUpdatedAt, lastStepCompleted, but NOT active baseline
      expect(mockDocSet).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "user_reentry_4",
          lastStepCompleted: "step_2_physical",
          draft: expect.objectContaining({
            weightKg: 82,
            heightCm: 178,
          }),
        }),
        { merge: true }
      );
      // Ensure active baseline and computed targets are NOT written by progress
      const writtenData = mockDocSet.mock.calls[0][0];
      expect(writtenData.baseline).toBeUndefined();
      expect(writtenData.computedTargets).toBeUndefined();
      expect(writtenData.completedAt).toBeUndefined();
    });
  });

  // =========================================================================
  // 2. Completion Update & Workout Template Clean-Up
  // =========================================================================
  describe("Completion Update & Workout Template Isolation", () => {
    it("5. Updating routine deletes old onboarding templates and adds new ones without touching custom templates", async () => {
      const userId = "user_reentry_tpl";
      (getServerSession as any).mockResolvedValueOnce({
        user: { id: userId, email: "user_tpl@example.com" },
      });

      // Existing templates in Firestore for this user:
      // 1. Previous onboarding templates (Full body 3-day)
      // 2. User-created custom template
      const mockExistingTemplates: WorkoutTemplate[] = [
        {
          id: `tpl_onboarding_${userId}_fb_a`,
          userId,
          name: "Full Body Compound A",
          source: "onboarding",
          isOnboarding: true,
          exercises: [],
          createdAt: 1000,
        },
        {
          id: `tpl_onboarding_${userId}_fb_b`,
          userId,
          name: "Full Body Compound B",
          source: "onboarding",
          isOnboarding: true,
          exercises: [],
          createdAt: 1000,
        },
        {
          id: `tpl_onboarding_${userId}_fb_c`,
          userId,
          name: "Full Body Compound C",
          source: "onboarding",
          isOnboarding: true,
          exercises: [],
          createdAt: 1000,
        },
        {
          id: `tpl_custom_arm_blast`,
          userId,
          name: "My Custom Arm Blast",
          source: "custom",
          exercises: [],
          createdAt: 1500,
        },
      ];

      mockTemplatesWhereGet.mockResolvedValueOnce({
        docs: mockExistingTemplates.map((t) => ({
          id: t.id,
          ref: { id: t.id },
          data: () => t,
        })),
      });

      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          userId,
          createdAt: 1690000000000,
        }),
      });

      mockBatchCommit.mockResolvedValueOnce(undefined);

      // User updates setup: switches to 2-day Dumbbell routine
      const req = new NextRequest("http://localhost:3000/api/onboarding/complete", {
        method: "POST",
        body: JSON.stringify({
          consentGivenAt: 1700000000000,
          consentVersion: "2026-10-v1",
          confirmedAge18Plus: true,
          baseline: {
            focusGoal: "fat_loss",
            heightCm: 175,
            weightKg: 75,
            age: 25,
            biologicalSex: "male",
            activityLevel: "moderately_active",
            paceTier: "steady",
            includeWorkouts: true,
            workoutDaysPerWeek: 2,
            equipmentAccess: "home_dumbbells",
            trainingExperience: "beginner",
            availableTrainingTimeMinutes: "30-45",
            dietaryPattern: "non_vegetarian",
            foodAvoidances: [],
          },
          healthScreening: {
            selectedConditions: ["none"],
          },
        }),
      });

      const res = await postComplete(req);
      expect(res.status).toBe(200);

      // Verify batch deletes: old onboarding templates fb_a, fb_b, fb_c were deleted!
      const deletedRefs = mockBatchDelete.mock.calls.map((c) => c[0].id);
      expect(deletedRefs).toContain(`tpl_onboarding_${userId}_fb_a`);
      expect(deletedRefs).toContain(`tpl_onboarding_${userId}_fb_b`);
      expect(deletedRefs).toContain(`tpl_onboarding_${userId}_fb_c`);

      // CRITICAL: Custom template `tpl_custom_arm_blast` must NEVER be deleted!
      expect(deletedRefs).not.toContain("tpl_custom_arm_blast");

      // Verify new 2-day dumbbell templates were written in batch
      const writtenDocIds = mockBatchSet.mock.calls.map((c) => c[0].id);
      expect(writtenDocIds).toContain(`tpl_onboarding_${userId}_db_a`);
      expect(writtenDocIds).toContain(`tpl_onboarding_${userId}_db_b`);
    });

    it("6. Opting out of workouts removes all onboarding templates and leaves custom templates untouched", async () => {
      const userId = "user_reentry_optout";
      (getServerSession as any).mockResolvedValueOnce({
        user: { id: userId, email: "user_optout@example.com" },
      });

      const mockExistingTemplates: WorkoutTemplate[] = [
        {
          id: `tpl_onboarding_${userId}_fb_a`,
          userId,
          name: "Full Body A",
          source: "onboarding",
          isOnboarding: true,
          exercises: [],
          createdAt: 1000,
        },
        {
          id: `custom_weekend_warrior`,
          userId,
          name: "Weekend Warrior",
          source: "custom",
          exercises: [],
          createdAt: 1000,
        },
      ];

      mockTemplatesWhereGet.mockResolvedValueOnce({
        docs: mockExistingTemplates.map((t) => ({
          id: t.id,
          ref: { id: t.id },
          data: () => t,
        })),
      });

      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ userId, createdAt: 1690000000000 }),
      });

      mockBatchCommit.mockResolvedValueOnce(undefined);

      // User opts out of workouts in update
      const req = new NextRequest("http://localhost:3000/api/onboarding/complete", {
        method: "POST",
        body: JSON.stringify({
          consentGivenAt: 1700000000000,
          consentVersion: "2026-10-v1",
          confirmedAge18Plus: true,
          baseline: {
            focusGoal: "habit_routine",
            includeWorkouts: false,
            dietaryPattern: "vegetarian",
            foodAvoidances: [],
          },
          healthScreening: {
            selectedConditions: ["none"],
          },
        }),
      });

      const res = await postComplete(req);
      expect(res.status).toBe(200);

      const deletedRefs = mockBatchDelete.mock.calls.map((c) => c[0].id);
      expect(deletedRefs).toContain(`tpl_onboarding_${userId}_fb_a`);
      expect(deletedRefs).not.toContain("custom_weekend_warrior");
    });
  });

  // =========================================================================
  // 3. Developer Reset & Server Authorization Guard
  // =========================================================================
  describe("Developer Reset (§9, §10, §11, §12)", () => {
    it("7. Unauthenticated request to reset returns 401 Unauthorized", async () => {
      (getServerSession as any).mockResolvedValueOnce(null);

      const req = new NextRequest("http://localhost:3000/api/onboarding/reset", {
        method: "POST",
      });

      const res = await postReset(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toMatch(/unauthorized/i);
    });

    it("8. Unauthorized user in production environment returns 403 Forbidden", async () => {
      (process.env as any).NODE_ENV = "production";
      (getServerSession as any).mockResolvedValueOnce({
        user: { id: "standard_production_user", email: "user@example.com" },
      });

      const req = new NextRequest("http://localhost:3000/api/onboarding/reset", {
        method: "POST",
      });

      const res = await postReset(req);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toMatch(/forbidden/i);
    });

    it("9. Ignores client-supplied body userId and derives identity strictly from server session", async () => {
      (process.env as any).NODE_ENV = "development";
      const sessionUserId = "dev_session_user";
      (getServerSession as any).mockResolvedValueOnce({
        user: { id: sessionUserId, email: "dev@example.com" },
      });

      mockTemplatesWhereGet.mockResolvedValueOnce({ docs: [] });
      mockDocGet.mockResolvedValueOnce({ exists: true, data: () => ({ userId: sessionUserId }) });
      mockBatchCommit.mockResolvedValueOnce(undefined);

      const req = new NextRequest("http://localhost:3000/api/onboarding/reset", {
        method: "POST",
        body: JSON.stringify({ userId: "victim_user_spoof_attempt" }), // Malicious spoof payload
      });

      const res = await postReset(req);
      expect(res.status).toBe(200);

      // Verify that Firestore queries and writes strictly targeted sessionUserId, NEVER victim_user_spoof_attempt
      expect(mockBatchUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ id: sessionUserId }),
        expect.any(Object)
      );
      expect(mockBatchUpdate).not.toHaveBeenCalledWith(
        expect.objectContaining({ id: "victim_user_spoof_attempt" }),
        expect.any(Object)
      );
    });

    it("10. Authorized developer reset deletes onboarding state and onboarding templates while preserving custom templates and history", async () => {
      (process.env as any).NODE_ENV = "development";
      const devUserId = "dev_authorized_user";
      (getServerSession as any).mockResolvedValueOnce({
        user: { id: devUserId, email: "dev@satat.test" },
      });

      const mockTemplates: WorkoutTemplate[] = [
        {
          id: `tpl_onboarding_${devUserId}_fb_a`,
          userId: devUserId,
          name: "Full Body A",
          source: "onboarding",
          isOnboarding: true,
          exercises: [],
          createdAt: 1000,
        },
        {
          id: "custom_leg_day",
          userId: devUserId,
          name: "My Custom Leg Day",
          source: "custom",
          exercises: [],
          createdAt: 1000,
        },
      ];

      mockTemplatesWhereGet.mockResolvedValueOnce({
        docs: mockTemplates.map((t) => ({
          id: t.id,
          ref: { id: t.id },
          data: () => t,
        })),
      });

      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          userId: devUserId,
          completedAt: 1700000000000,
          baseline: { focusGoal: "fat_loss" },
        }),
      });

      mockBatchCommit.mockResolvedValueOnce(undefined);

      const req = new NextRequest("http://localhost:3000/api/onboarding/reset", {
        method: "POST",
      });

      const res = await postReset(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.reset).toBe(true);

      // Verify onboarding template deleted
      const deletedIds = mockBatchDelete.mock.calls.map((c) => c[0].id);
      expect(deletedIds).toContain(`tpl_onboarding_${devUserId}_fb_a`);
      expect(deletedIds).toContain(devUserId); // macroGoals document

      // Custom template preserved
      expect(deletedIds).not.toContain("custom_leg_day");

      // Verify profile update unsets onboarding completion & derived artifacts
      expect(mockBatchUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ id: devUserId }),
        expect.objectContaining({
          completedAt: "__DELETE_FIELD__",
          lastStepCompleted: "__DELETE_FIELD__",
          baseline: "__DELETE_FIELD__",
          computedTargets: "__DELETE_FIELD__",
          workoutPlanAssignment: "__DELETE_FIELD__",
          draft: "__DELETE_FIELD__",
          draftUpdatedAt: "__DELETE_FIELD__",
        })
      );
    });

    it("11. Developer reset is idempotent when called repeatedly on un-onboarded profile", async () => {
      (process.env as any).NODE_ENV = "development";
      const devUserId = "dev_repeat_user";
      (getServerSession as any).mockResolvedValue({
        user: { id: devUserId, email: "dev@satat.test" },
      });

      mockTemplatesWhereGet.mockResolvedValue({ docs: [] });
      mockDocGet.mockResolvedValue({ exists: false }); // doc doesn't exist yet
      mockBatchCommit.mockResolvedValue(undefined);

      const req1 = new NextRequest("http://localhost:3000/api/onboarding/reset", { method: "POST" });
      const res1 = await postReset(req1);
      expect(res1.status).toBe(200);

      const req2 = new NextRequest("http://localhost:3000/api/onboarding/reset", { method: "POST" });
      const res2 = await postReset(req2);
      expect(res2.status).toBe(200);
    });
  });

  // =========================================================================
  // 4. Workout Template Classification Invariants (§13)
  // =========================================================================
  describe("Workout Template Classification Safety (§13)", () => {
    it("12. Permanent system presets are never classified as onboarding or custom", () => {
      const preset: WorkoutTemplate = {
        id: "preset_push",
        userId: "",
        name: "Push Day",
        source: "system",
        isPreset: true,
        exercises: [],
        createdAt: 0,
      };

      expect(isSystemTemplate(preset)).toBe(true);
      expect(isOnboardingTemplate(preset, null, "user_1")).toBe(false);
      expect(isCustomTemplate(preset, null, "user_1")).toBe(false);
    });

    it("13. Custom user template with routine-like name is preserved and never classified as onboarding", () => {
      const custom: WorkoutTemplate = {
        id: "custom_my_full_body_c",
        userId: "user_1",
        name: "Full Body Compound C", // same name as routine!
        source: "custom",
        exercises: [],
        createdAt: 1000,
      };

      expect(isSystemTemplate(custom)).toBe(false);
      expect(isOnboardingTemplate(custom, { templateIds: ["tpl_onboarding_user_1_fb_c"] }, "user_1")).toBe(false);
      expect(isCustomTemplate(custom, { templateIds: ["tpl_onboarding_user_1_fb_c"] }, "user_1")).toBe(true);
    });
  });

  // =========================================================================
  // 5. Explicit Verification Scenarios (§22 Manual Verification Specs)
  // =========================================================================
  describe("Verification Scenarios (§22 Test A, Test B, Test C)", () => {
    it("Scenario A: Normal Re-entry Flow — edits in draft do not alter active setup until confirmed", async () => {
      const userId = "scenario_a_user";
      (getServerSession as any).mockResolvedValue({
        user: { id: userId, email: "scenario_a@satat.test" },
      });

      // 1. Initial active state in Firestore
      const activeBaseline = {
        focusGoal: "fat_loss",
        heightCm: 180,
        weightKg: 85,
        age: 30,
        biologicalSex: "male",
        targetWeightKg: 78,
        paceTier: "steady",
        activityLevel: "sedentary",
        dietaryPattern: "non_vegetarian",
        foodAvoidances: [],
        includeWorkouts: true,
        workoutDaysPerWeek: 3,
        equipmentAccess: "commercial_gym",
        trainingExperience: "beginner",
        availableTrainingTimeMinutes: "45-60",
      };

      // 2. Status check returns active setup
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          completedAt: 1700000000000,
          lastStepCompleted: "step_9_reveal",
          consentGivenAt: 1699999000000,
          consentVersion: "2026-10-v1",
          baseline: activeBaseline,
          computedTargets: { targetCalories: 2100, proteinGrams: 160 },
          draft: null,
        }),
      });

      const statusRes1 = await getStatus(new NextRequest("http://localhost:3000/api/onboarding/status"));
      const status1 = await statusRes1.json();
      expect(status1.completed).toBe(true);
      expect(status1.persistedBaseline.focusGoal).toBe("fat_loss");
      expect(status1.persistedBaseline.workoutDaysPerWeek).toBe(3);

      // 3. User modifies answer in update flow (changes to muscle_gain, 4 days) -> saved to draft
      mockDocSet.mockResolvedValueOnce(undefined);
      const progressRes = await postProgress(
        new NextRequest("http://localhost:3000/api/onboarding/progress", {
          method: "POST",
          body: JSON.stringify({
            currentStep: "step_5_workout_rhythm",
            draft: {
              ...activeBaseline,
              focusGoal: "muscle_gain",
              workoutDaysPerWeek: 4,
            },
          }),
        })
      );
      expect(progressRes.status).toBe(200);

      // Verify progress wrote to draft, not to active baseline
      const progressWrite = mockDocSet.mock.calls[0][0];
      expect(progressWrite.draft.focusGoal).toBe("muscle_gain");
      expect(progressWrite.baseline).toBeUndefined();

      // 4. User exits before completion: active baseline in database remains untouched
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          completedAt: 1700000000000,
          baseline: activeBaseline, // original active setup still in place!
          draft: { focusGoal: "muscle_gain", workoutDaysPerWeek: 4 },
          draftUpdatedAt: Date.now(),
        }),
      });

      const statusRes2 = await getStatus(new NextRequest("http://localhost:3000/api/onboarding/status"));
      const status2 = await statusRes2.json();
      expect(status2.completed).toBe(true);
      expect(status2.persistedBaseline.focusGoal).toBe("fat_loss"); // untouched!
      expect(status2.draftBaseline.focusGoal).toBe("muscle_gain"); // draft available for resume!

      // 5. User re-enters and confirms update
      mockTemplatesWhereGet.mockResolvedValueOnce({ docs: [] });
      mockDocGet.mockResolvedValueOnce({ exists: true, data: () => ({ userId, createdAt: 1690000000000 }) });
      mockBatchCommit.mockResolvedValueOnce(undefined);

      const completeRes = await postComplete(
        new NextRequest("http://localhost:3000/api/onboarding/complete", {
          method: "POST",
          body: JSON.stringify({
            consentGivenAt: 1699999000000,
            consentVersion: "2026-10-v1",
            confirmedAge18Plus: true,
            baseline: {
              ...activeBaseline,
              focusGoal: "muscle_gain",
              workoutDaysPerWeek: 4,
            },
            healthScreening: { selectedConditions: ["none"] },
          }),
        })
      );
      expect(completeRes.status).toBe(200);
      const completeJson = await completeRes.json();
      expect(completeJson.ok).toBe(true);
      expect(completeJson.systemRhythm.focusGoal).toBe("muscle_gain");
      expect(completeJson.starterRoutine.templateIds.length).toBe(4);
    });

    it("Scenario B: Developer Reset Flow — resets onboarding state while preserving custom templates and history", async () => {
      (process.env as any).NODE_ENV = "development";
      const devUserId = "scenario_b_dev";
      (getServerSession as any).mockResolvedValue({
        user: { id: devUserId, email: "scenario_b@satat.test" },
      });

      // User has:
      // - 1 onboarding template
      // - 1 custom template
      const mockTemplates: WorkoutTemplate[] = [
        {
          id: `tpl_onboarding_${devUserId}_fb_a`,
          userId: devUserId,
          name: "Full Body A",
          source: "onboarding",
          isOnboarding: true,
          exercises: [],
          createdAt: 1000,
        },
        {
          id: "custom_push_pull",
          userId: devUserId,
          name: "My Push Pull Routine",
          source: "custom",
          exercises: [],
          createdAt: 2000,
        },
      ];

      mockTemplatesWhereGet.mockResolvedValueOnce({
        docs: mockTemplates.map((t) => ({ id: t.id, ref: { id: t.id }, data: () => t })),
      });
      mockDocGet.mockResolvedValueOnce({ exists: true, data: () => ({ userId: devUserId, completedAt: 1700000000000 }) });
      mockBatchCommit.mockResolvedValueOnce(undefined);

      // Execute dev reset
      const resetRes = await postReset(new NextRequest("http://localhost:3000/api/onboarding/reset", { method: "POST" }));
      expect(resetRes.status).toBe(200);

      // Verify custom template was NOT deleted
      const deletedIds = mockBatchDelete.mock.calls.map((c) => c[0].id);
      expect(deletedIds).toContain(`tpl_onboarding_${devUserId}_fb_a`);
      expect(deletedIds).not.toContain("custom_push_pull");

      // Verify profile onboarding fields were deleted
      expect(mockBatchUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ id: devUserId }),
        expect.objectContaining({
          completedAt: "__DELETE_FIELD__",
          baseline: "__DELETE_FIELD__",
          computedTargets: "__DELETE_FIELD__",
        })
      );

      // After reset: status returns incomplete
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          userId: devUserId,
          // completedAt is absent after reset!
        }),
      });

      const statusRes = await getStatus(new NextRequest("http://localhost:3000/api/onboarding/status"));
      const statusJson = await statusRes.json();
      expect(statusJson.completed).toBe(false);
      expect(statusJson.draftBaseline).toBeNull();
    });

    it("Scenario C: Security Enforcement — rejects unauthorized attempts server-side", async () => {
      // 1. Unauthenticated request
      (getServerSession as any).mockResolvedValueOnce(null);
      const res1 = await postReset(new NextRequest("http://localhost:3000/api/onboarding/reset", { method: "POST" }));
      expect(res1.status).toBe(401);

      // 2. Production non-exempt user
      (process.env as any).NODE_ENV = "production";
      delete process.env.ALLOW_DEV_RESET;
      (getServerSession as any).mockResolvedValueOnce({
        user: { id: "regular_user_123", email: "reg@example.com" },
      });
      const res2 = await postReset(new NextRequest("http://localhost:3000/api/onboarding/reset", { method: "POST" }));
      expect(res2.status).toBe(403);
    });
  });
});
