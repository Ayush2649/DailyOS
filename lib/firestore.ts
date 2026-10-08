import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  getDocs, getDoc, query, where, setDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import type { Task, Project, WorkoutSession, BodyWeightEntry, MealEntry, MacroGoals, WorkoutTemplate, NotificationPrefs, MealTemplate, UserProfileDocument } from "@/types";

// ── Projects ───────────────────────────────────────────────────────────────────
export async function getProjects(userId: string): Promise<Project[]> {
  const q = query(collection(db, "projects"), where("userId", "==", userId));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as Project))
    .sort((a, b) => a.createdAt - b.createdAt);
}

export async function createProject(userId: string, name: string, color: string): Promise<Project> {
  const data = { name, color, userId, createdAt: Date.now() };
  const ref = await addDoc(collection(db, "projects"), data);
  return { id: ref.id, ...data };
}

export async function ensureStarterProject(userId: string): Promise<Project> {
  const existing = await getProjects(userId);
  if (existing.length > 0) {
    return existing[0];
  }
  // Idempotently create using deterministic doc ID so concurrent calls/refreshes never duplicate
  const defaultDocRef = doc(db, "projects", `default_${userId}`);
  const snap = await getDoc(defaultDocRef);
  if (snap.exists()) {
    return { id: snap.id, ...snap.data() } as Project;
  }
  const data = {
    name: "General",
    color: "#3E7563",
    userId,
    createdAt: Date.now(),
  };
  await setDoc(defaultDocRef, data, { merge: true });
  return { id: defaultDocRef.id, ...data };
}

export async function deleteProject(projectId: string) {
  await deleteDoc(doc(db, "projects", projectId));
}

// ── Tasks ──────────────────────────────────────────────────────────────────────
export async function getAllTasks(userId: string): Promise<Task[]> {
  const q = query(collection(db, "tasks"), where("userId", "==", userId));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as Task))
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function getTasks(userId: string, projectId: string): Promise<Task[]> {
  const q = query(
    collection(db, "tasks"),
    where("userId", "==", userId),
    where("projectId", "==", projectId)
  );
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as Task))
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function createTask(task: Omit<Task, "id">): Promise<Task> {
  const ref = await addDoc(collection(db, "tasks"), task);
  return { id: ref.id, ...task };
}

export async function updateTask(taskId: string, updates: Partial<Task>) {
  await updateDoc(doc(db, "tasks", taskId), updates);
}

export async function deleteTask(taskId: string) {
  await deleteDoc(doc(db, "tasks", taskId));
}

// ── Workouts ───────────────────────────────────────────────────────────────────
export async function getWorkoutSessions(userId: string): Promise<WorkoutSession[]> {
  const q = query(collection(db, "workouts"), where("userId", "==", userId));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as WorkoutSession))
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function saveWorkoutSession(session: Omit<WorkoutSession, "id">): Promise<WorkoutSession> {
  const ref = await addDoc(collection(db, "workouts"), session);
  return { id: ref.id, ...session };
}

export async function updateWorkoutSession(sessionId: string, updates: Partial<WorkoutSession>) {
  await updateDoc(doc(db, "workouts", sessionId), updates);
}

// ── Body Weight ────────────────────────────────────────────────────────────────
export async function getBodyWeightEntries(userId: string): Promise<BodyWeightEntry[]> {
  const q = query(collection(db, "bodyweight"), where("userId", "==", userId));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as BodyWeightEntry))
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function logBodyWeight(entry: Omit<BodyWeightEntry, "id">): Promise<BodyWeightEntry> {
  const ref = await addDoc(collection(db, "bodyweight"), entry);
  return { id: ref.id, ...entry };
}

// ── Meals ──────────────────────────────────────────────────────────────────────
export async function getAllMeals(userId: string): Promise<MealEntry[]> {
  const q = query(collection(db, "meals"), where("userId", "==", userId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as MealEntry));
}

export async function getMeals(userId: string, date: string): Promise<MealEntry[]> {
  const q = query(
    collection(db, "meals"),
    where("userId", "==", userId),
    where("date", "==", date)
  );
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as MealEntry))
    .sort((a, b) => a.createdAt - b.createdAt);
}

export async function addMeal(meal: Omit<MealEntry, "id">): Promise<MealEntry> {
  const ref = await addDoc(collection(db, "meals"), meal);
  return { id: ref.id, ...meal };
}

export async function deleteMeal(mealId: string) {
  await deleteDoc(doc(db, "meals", mealId));
}

// ── Meal Templates (saved meals) ─────────────────────────────────────────────
export async function getMealTemplates(userId: string): Promise<MealTemplate[]> {
  const q = query(collection(db, "mealTemplates"), where("userId", "==", userId));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as MealTemplate))
    .sort((a, b) => (b.lastUsedAt ?? b.createdAt) - (a.lastUsedAt ?? a.createdAt));
}

export async function saveMealTemplate(template: Omit<MealTemplate, "id">): Promise<MealTemplate> {
  const ref = await addDoc(collection(db, "mealTemplates"), template);
  return { id: ref.id, ...template };
}

export async function updateMealTemplate(id: string, updates: Partial<MealTemplate>) {
  await updateDoc(doc(db, "mealTemplates", id), updates);
}

export async function deleteMealTemplate(id: string) {
  await deleteDoc(doc(db, "mealTemplates", id));
}

// ── Macro Goals ────────────────────────────────────────────────────────────────
export async function getMacroGoals(userId: string): Promise<MacroGoals | null> {
  const docRef = doc(db, "macroGoals", userId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return null;
  return snap.data() as MacroGoals;
}

export async function saveMacroGoals(userId: string, goals: MacroGoals) {
  await setDoc(doc(db, "macroGoals", userId), goals);
}

// ── Workout Templates ──────────────────────────────────────────────────────────
export async function getWorkoutTemplates(userId: string): Promise<WorkoutTemplate[]> {
  const q = query(collection(db, "workoutTemplates"), where("userId", "==", userId));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as WorkoutTemplate))
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function saveWorkoutTemplate(template: Omit<WorkoutTemplate, "id">): Promise<WorkoutTemplate> {
  const ref = await addDoc(collection(db, "workoutTemplates"), template);
  return { id: ref.id, ...template };
}

export async function deleteWorkoutTemplate(templateId: string): Promise<void> {
  await deleteDoc(doc(db, "workoutTemplates", templateId));
}

// ── Notification Preferences ───────────────────────────────────────────────────
export async function getNotificationPrefs(userId: string): Promise<NotificationPrefs | null> {
  const snap = await getDoc(doc(db, "notificationPrefs", userId));
  if (!snap.exists()) return null;
  return snap.data() as NotificationPrefs;
}

export async function saveNotificationPrefs(userId: string, prefs: NotificationPrefs) {
  await setDoc(doc(db, "notificationPrefs", userId), prefs);
}

// ── User Profile / Baseline ───────────────────────────────────────────────────
export async function getUserProfile(userId: string): Promise<UserProfileDocument | null> {
  const snap = await getDoc(doc(db, "userProfiles", userId));
  if (!snap.exists()) return null;
  return snap.data() as UserProfileDocument;
}
