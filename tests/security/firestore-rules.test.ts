import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  addDoc,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import fs from "fs";
import path from "path";

const PROJECT_ID = "dailyos-afbbf";
let testEnv: RulesTestEnvironment;

const USER_A = "user_alpha_123";
const USER_B = "user_beta_456";

let emulatorAvailable = false;

describe("Firestore Security Rules Verification", { timeout: 30000 }, () => {
  beforeAll(async () => {
    try {
      await fetch("http://127.0.0.1:8088/", { signal: AbortSignal.timeout(1000) });
      emulatorAvailable = true;
    } catch {
      emulatorAvailable = false;
      console.warn(
        "\n⚠️  [firestore-rules] Firestore emulator not running on 127.0.0.1:8088. Skipping rules tests." +
        "\n   To run rules tests against emulator: firebase emulators:exec --only firestore \"vitest run tests/security/firestore-rules.test.ts\"\n"
      );
      return;
    }

    const rulesPath = path.resolve(process.cwd(), "firestore.rules");
    const rules = fs.readFileSync(rulesPath, "utf8");

    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        rules,
        host: "127.0.0.1",
        port: 8088,
      },
    });
  });

  afterAll(async () => {
    if (testEnv) {
      await testEnv.cleanup();
    }
  });

  beforeEach(async (ctx) => {
    if (!emulatorAvailable || !testEnv) {
      ctx.skip();
      return;
    }
    await testEnv.clearFirestore();

    // Seed test data using withSecurityRulesDisabled (Admin context)
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const adminDb = context.firestore();

      // Seed documents owned by User A
      await setDoc(doc(adminDb, "tasks", "task_user_a"), {
        userId: USER_A,
        title: "Task A",
        status: "pending",
        createdAt: 1000,
      });
      await setDoc(doc(adminDb, "projects", "proj_user_a"), {
        userId: USER_A,
        name: "Project A",
        createdAt: 1000,
      });
      await setDoc(doc(adminDb, "projects", `default_${USER_A}`), {
        userId: USER_A,
        name: "General",
        createdAt: 1000,
      });
      await setDoc(doc(adminDb, "workouts", "workout_user_a"), {
        userId: USER_A,
        date: "2026-10-15",
        createdAt: 1000,
      });
      await setDoc(doc(adminDb, "meals", "meal_user_a"), {
        userId: USER_A,
        name: "Oatmeal",
        date: "2026-10-15",
        createdAt: 1000,
      });
      await setDoc(doc(adminDb, "bodyweight", "bw_user_a"), {
        userId: USER_A,
        weightKg: 75.5,
        date: "2026-10-15",
        createdAt: 1000,
      });
      await setDoc(doc(adminDb, "mealTemplates", "mtpl_user_a"), {
        userId: USER_A,
        name: "Daily Shake",
        createdAt: 1000,
      });
      await setDoc(doc(adminDb, "workoutTemplates", "wtpl_user_a"), {
        userId: USER_A,
        name: "Push Day",
        createdAt: 1000,
      });
      await setDoc(doc(adminDb, "macroGoals", USER_A), {
        calories: 2200,
        proteinG: 160,
      });
      await setDoc(doc(adminDb, "notificationPrefs", USER_A), {
        mealReminders: true,
        breakfastTime: "08:30",
      });
      await setDoc(doc(adminDb, "userProfiles", USER_A), {
        completedAt: 1000,
        baseline: { focusGoal: "hypertrophy" },
      });

      // Seed documents owned by User B
      await setDoc(doc(adminDb, "tasks", "task_user_b"), {
        userId: USER_B,
        title: "Task B",
        status: "pending",
        createdAt: 1000,
      });
      await setDoc(doc(adminDb, "projects", "proj_user_b"), {
        userId: USER_B,
        name: "Project B",
        createdAt: 1000,
      });
      await setDoc(doc(adminDb, "macroGoals", USER_B), {
        calories: 2500,
      });
      await setDoc(doc(adminDb, "userProfiles", USER_B), {
        completedAt: 1000,
        baseline: { focusGoal: "fat_loss" },
      });

      // Seed server-only documents
      await setDoc(doc(adminDb, "push_subscriptions", "sub_1"), {
        userId: USER_A,
        endpoint: "https://fcm.googleapis.com/fcm/send/test",
      });
      await setDoc(doc(adminDb, "healthTokens", "secret_token_123"), {
        userId: USER_A,
        createdAt: 1000,
      });
      await setDoc(doc(adminDb, "healthActivity", `${USER_A}_2026-10-15`), {
        userId: USER_A,
        steps: 8500,
      });
    });
  });

  // ── TEST 1: Unauthenticated Access Denied ────────────────────────────────────
  describe("1. Unauthenticated Requests", () => {
    it("denies unauthenticated read on tasks", async () => {
      const unauthDb = testEnv.unauthenticatedContext().firestore();
      await assertFails(getDoc(doc(unauthDb, "tasks", "task_user_a")));
    });

    it("denies unauthenticated write on tasks", async () => {
      const unauthDb = testEnv.unauthenticatedContext().firestore();
      await assertFails(addDoc(collection(unauthDb, "tasks"), { userId: USER_A, title: "Hacked" }));
    });

    it("denies unauthenticated read on userProfiles", async () => {
      const unauthDb = testEnv.unauthenticatedContext().firestore();
      await assertFails(getDoc(doc(unauthDb, "userProfiles", USER_A)));
    });
  });

  // ── TEST 2: User A Can Access User A's Own Records ───────────────────────────
  describe("2. Own Record Access (User A -> User A)", () => {
    it("allows User A to read, create, update, and delete their own tasks", async () => {
      const dbA = testEnv.authenticatedContext(USER_A).firestore();

      // Read
      await assertSucceeds(getDoc(doc(dbA, "tasks", "task_user_a")));

      // Create
      const newDocRef = await assertSucceeds(
        addDoc(collection(dbA, "tasks"), { userId: USER_A, title: "New Task", createdAt: 2000 })
      );

      // Update (preserving userId)
      await assertSucceeds(updateDoc(doc(dbA, "tasks", newDocRef.id), { status: "completed" }));

      // Delete
      await assertSucceeds(deleteDoc(doc(dbA, "tasks", newDocRef.id)));
    });

    it("allows User A to create and access their own projects and default project", async () => {
      const dbA = testEnv.authenticatedContext(USER_A).firestore();

      await assertSucceeds(getDoc(doc(dbA, "projects", "proj_user_a")));
      await assertSucceeds(getDoc(doc(dbA, "projects", `default_${USER_A}`)));

      await assertSucceeds(
        addDoc(collection(dbA, "projects"), { userId: USER_A, name: "New Project", createdAt: 2000 })
      );
    });

    it("allows User A to manage workouts, meals, bodyweight, and templates", async () => {
      const dbA = testEnv.authenticatedContext(USER_A).firestore();

      await assertSucceeds(getDoc(doc(dbA, "workouts", "workout_user_a")));
      await assertSucceeds(getDoc(doc(dbA, "meals", "meal_user_a")));
      await assertSucceeds(getDoc(doc(dbA, "bodyweight", "bw_user_a")));
      await assertSucceeds(getDoc(doc(dbA, "mealTemplates", "mtpl_user_a")));
      await assertSucceeds(getDoc(doc(dbA, "workoutTemplates", "wtpl_user_a")));
    });
  });

  // ── TEST 3: User A Cannot Read User B's Records ──────────────────────────────
  describe("3. Cross-User Read Isolation", () => {
    it("denies User A reading User B's tasks", async () => {
      const dbA = testEnv.authenticatedContext(USER_A).firestore();
      await assertFails(getDoc(doc(dbA, "tasks", "task_user_b")));
    });

    it("denies User A reading User B's projects", async () => {
      const dbA = testEnv.authenticatedContext(USER_A).firestore();
      await assertFails(getDoc(doc(dbA, "projects", "proj_user_b")));
    });

    it("denies User A reading User B's macroGoals", async () => {
      const dbA = testEnv.authenticatedContext(USER_A).firestore();
      await assertFails(getDoc(doc(dbA, "macroGoals", USER_B)));
    });
  });

  // ── TEST 4: User A Cannot Create Records with User B's userId ────────────────
  describe("4. Ownership Spoofing Prevention on Create", () => {
    it("denies User A creating a task with User B's userId", async () => {
      const dbA = testEnv.authenticatedContext(USER_A).firestore();
      await assertFails(
        addDoc(collection(dbA, "tasks"), { userId: USER_B, title: "Spoofed Task" })
      );
    });

    it("denies User A creating a project with User B's default project ID", async () => {
      const dbA = testEnv.authenticatedContext(USER_A).firestore();
      await assertFails(
        setDoc(doc(dbA, "projects", `default_${USER_B}`), {
          userId: USER_A,
          name: "Spoofed Default",
        })
      );
    });
  });

  // ── TEST 5: User A Cannot Update Record to Change Owner ──────────────────────
  describe("5. Ownership Transfer Prevention on Update", () => {
    it("denies User A updating a task's userId to User B", async () => {
      const dbA = testEnv.authenticatedContext(USER_A).firestore();
      await assertFails(
        updateDoc(doc(dbA, "tasks", "task_user_a"), { userId: USER_B })
      );
    });

    it("denies User A updating a project's userId to User B", async () => {
      const dbA = testEnv.authenticatedContext(USER_A).firestore();
      await assertFails(
        updateDoc(doc(dbA, "projects", "proj_user_a"), { userId: USER_B })
      );
    });
  });

  // ── TEST 6: User A Cannot Delete User B's Records ────────────────────────────
  describe("6. Cross-User Delete Isolation", () => {
    it("denies User A deleting User B's tasks", async () => {
      const dbA = testEnv.authenticatedContext(USER_A).firestore();
      await assertFails(deleteDoc(doc(dbA, "tasks", "task_user_b")));
    });

    it("denies User A deleting User B's projects", async () => {
      const dbA = testEnv.authenticatedContext(USER_A).firestore();
      await assertFails(deleteDoc(doc(dbA, "projects", "proj_user_b")));
    });
  });

  // ── TEST 7: Document-ID-Owned Collections ───────────────────────────────────
  describe("7. Document-ID-Owned Collections (userProfiles, macroGoals, notificationPrefs)", () => {
    it("allows User A to read their own userProfile, but denies client write", async () => {
      const dbA = testEnv.authenticatedContext(USER_A).firestore();
      // Read own profile succeeds
      await assertSucceeds(getDoc(doc(dbA, "userProfiles", USER_A)));
      // Read other profile fails
      await assertFails(getDoc(doc(dbA, "userProfiles", USER_B)));
      // Client write to own profile is strictly denied
      await assertFails(
        setDoc(doc(dbA, "userProfiles", USER_A), { baseline: { age: 25 } }, { merge: true })
      );
    });

    it("allows User A to read and write their own macroGoals and notificationPrefs", async () => {
      const dbA = testEnv.authenticatedContext(USER_A).firestore();

      await assertSucceeds(getDoc(doc(dbA, "macroGoals", USER_A)));
      await assertSucceeds(setDoc(doc(dbA, "macroGoals", USER_A), { calories: 2300 }));

      await assertSucceeds(getDoc(doc(dbA, "notificationPrefs", USER_A)));
      await assertSucceeds(
        setDoc(doc(dbA, "notificationPrefs", USER_A), { mealReminders: false })
      );
    });
  });

  // ── TEST 8: Server-Only Collections Deny Client Access ───────────────────────
  describe("8. Server-Only Collections (push_subscriptions, healthTokens, healthActivity)", () => {
    it("denies client read and write on push_subscriptions", async () => {
      const dbA = testEnv.authenticatedContext(USER_A).firestore();
      await assertFails(getDoc(doc(dbA, "push_subscriptions", "sub_1")));
      await assertFails(
        setDoc(doc(dbA, "push_subscriptions", "sub_new"), { userId: USER_A })
      );
    });

    it("denies client read and write on healthTokens", async () => {
      const dbA = testEnv.authenticatedContext(USER_A).firestore();
      await assertFails(getDoc(doc(dbA, "healthTokens", "secret_token_123")));
      await assertFails(
        setDoc(doc(dbA, "healthTokens", "fake_token"), { userId: USER_A })
      );
    });

    it("denies client read and write on healthActivity", async () => {
      const dbA = testEnv.authenticatedContext(USER_A).firestore();
      await assertFails(getDoc(doc(dbA, "healthActivity", `${USER_A}_2026-10-15`)));
      await assertFails(
        setDoc(doc(dbA, "healthActivity", `${USER_A}_new`), { steps: 5000 })
      );
    });
  });

  // ── TEST 9: Legitimate Query Patterns Compatibility ──────────────────────────
  describe("9. Legitimate Query Patterns Compatibility", () => {
    it("allows queries filtered by userId == request.auth.uid", async () => {
      const dbA = testEnv.authenticatedContext(USER_A).firestore();

      const qTasks = query(collection(dbA, "tasks"), where("userId", "==", USER_A));
      const taskSnap = await assertSucceeds(getDocs(qTasks));
      expect(taskSnap.docs.length).toBe(1);

      const qProjects = query(collection(dbA, "projects"), where("userId", "==", USER_A));
      const projSnap = await assertSucceeds(getDocs(qProjects));
      expect(projSnap.docs.length).toBe(2);
    });

    it("denies queries without userId filter or querying for another user", async () => {
      const dbA = testEnv.authenticatedContext(USER_A).firestore();

      // Unconstrained query across all tasks fails
      await assertFails(getDocs(collection(dbA, "tasks")));

      // Querying for User B's tasks fails
      const qUserB = query(collection(dbA, "tasks"), where("userId", "==", USER_B));
      await assertFails(getDocs(qUserB));
    });
  });

  // ── TEST 10: Unspecified Collections Denied (Catch-All) ──────────────────────
  describe("10. Catch-All Deny on Unspecified Collections", () => {
    it("denies access to arbitrary collections", async () => {
      const dbA = testEnv.authenticatedContext(USER_A).firestore();
      await assertFails(getDoc(doc(dbA, "admin_secrets", "key1")));
      await assertFails(addDoc(collection(dbA, "unspecified_collection"), { data: 123 }));
    });
  });
});

