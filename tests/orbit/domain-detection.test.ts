// tests/orbit/domain-detection.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { inferContextRequirements } from "@/lib/orbit/contextRequirement";
import { buildOrbitContext } from "@/lib/orbit/contextEngine";
import * as firestore from "@/lib/firestore";
import * as nextAuth from "next-auth";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/firestore", () => ({
  getAllMeals: vi.fn(),
  getAllTasks: vi.fn(),
  getWorkoutSessions: vi.fn(),
  getAllHabits: vi.fn(),
  getBodyWeightEntries: vi.fn(),
}));

const mockUserId = "test-user-123";

beforeEach(() => {
  vi.clearAllMocks();
  (nextAuth.getServerSession as any).mockResolvedValue({
    user: { id: mockUserId, email: "test@example.com", name: "Tester" },
  });
});

// Helper to mimic the merging logic from app/api/aria/route.ts
function mergeRequirements(messages: { role: string; content: string }[], mode: string) {
  const userMessages = messages.filter((m) => m.role === "user");
  const latestUserMessage = userMessages[userMessages.length - 1]?.content || "";
  const latestReq = inferContextRequirements(latestUserMessage);
  const allUserText = userMessages.map((m) => m.content).join(" ");
  const allUserReq = inferContextRequirements(allUserText);
  const mergedDomains = new Set([...latestReq.domains, ...allUserReq.domains]);
  if (mode === "workout") mergedDomains.add("workouts");
  if (mode === "diet") { mergedDomains.add("meals"); mergedDomains.add("nutrition"); }
  if (mode === "tasks") mergedDomains.add("tasks");
  return {
    domains: Array.from(mergedDomains),
    temporalScope: latestReq.temporalScope ?? allUserReq.temporalScope,
  };
}

describe("Orbit domain detection", () => {
  it("detects nutrition domains from a nutrition question", () => {
    const req = inferContextRequirements("How is my nutrition?");
    expect(req.domains).toContain("meals");
    expect(req.domains).toContain("nutrition");
  });

  it("does not treat generic diet as meals without mode", () => {
    const req = inferContextRequirements("How is my diet?");
    // Should not include meals or nutrition, only preferences via fallback
    expect(req.domains).not.toContain("meals");
    expect(req.domains).not.toContain("nutrition");
    // Preference detection may still include preferences via fallback; ensure at least one domain present
    expect(req.domains.length).toBeGreaterThan(0);
  });

  it("detects workouts from cardio term", () => {
    const req = inferContextRequirements("What cardio did I do?");
    expect(req.domains).toContain("workouts");
  });

  it("detects workouts from training term", () => {
    const req = inferContextRequirements("How was my training?");
    expect(req.domains).toContain("workouts");
  });
});

describe("Orbit mode‑based domain injection", () => {
  const genericMessage = [{ role: "user", content: "Tell me something" }];

  it("diet mode adds meals & nutrition domains", () => {
    const req = mergeRequirements(genericMessage, "diet");
    expect(req.domains).toContain("meals");
    expect(req.domains).toContain("nutrition");
  });

  it("workout mode adds workouts domain", () => {
    const req = mergeRequirements(genericMessage, "workout");
    expect(req.domains).toContain("workouts");
  });

  it("tasks mode adds tasks domain", () => {
    const req = mergeRequirements(genericMessage, "tasks");
    expect(req.domains).toContain("tasks");
  });
});

describe("Orbit context retrieval respects mode injection", () => {
  it("diet mode retrieves meals when generic question is asked", async () => {
    const mockMeals = [{
      id: "m1",
      name: "Paneer",
      date: new Date().toLocaleDateString("en-CA"),
      macros: { calories: 300, proteinG: 20, carbsG: 30, fatG: 10 },
    }];
    (firestore.getAllMeals as any).mockResolvedValue(mockMeals);
    const requirements = { domains: ["meals", "nutrition"], temporalScope: undefined };
    const ctx = await buildOrbitContext(requirements);
    expect(ctx?.meals?.today?.length).toBeGreaterThan(0);
    expect(ctx?.meals?.today?.[0].name).toBe("Paneer");
  });
});
