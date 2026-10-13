"use client";
import { useEffect, useRef, useCallback } from "react";
import type { NotificationPrefs } from "@/types";
import { DEFAULT_NOTIFICATION_PREFS } from "@/types";

export type NotificationPermission = "default" | "granted" | "denied";

// ── Helpers ───────────────────────────────────────────────────────────────────
function parseTimeToday(hhmm: string): Date {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

function msUntil(target: Date): number {
  return Math.max(0, target.getTime() - Date.now());
}

function showNotification(title: string, body: string, url = "/dashboard", tag?: string) {
  if (typeof window === "undefined" || typeof Notification === "undefined" || Notification.permission !== "granted") return;
  const n = new Notification(title, {
    body,
    icon: "/satat-icon-192.png",
    badge: "/satat-icon-192.png",
    tag: tag || `satat-${Date.now()}`,
    requireInteraction: false,
    vibrate: [100, 50, 100],
  } as NotificationOptions);
  n.onclick = () => { window.focus(); window.location.href = url; n.close(); };
}

// ── Hook ──────────────────────────────────────────────────────────────────────
interface UseNotificationsOptions {
  userId: string;
  prefs?: NotificationPrefs | null;
  lastWorkoutAt?: number | null;
  pendingTasksCount?: number;
}

export function useNotifications({
  userId,
  prefs,
  lastWorkoutAt,
  pendingTasksCount,
}: UseNotificationsOptions) {
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearAll = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  const schedule = useCallback((delayMs: number, fn: () => void) => {
    if (delayMs <= 0) return;
    timers.current.push(setTimeout(fn, delayMs));
  }, []);

  // ── Register service worker ───────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  // ── Meal reminders ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!userId || typeof Notification === "undefined" || Notification.permission !== "granted") return;
    const p = prefs ?? DEFAULT_NOTIFICATION_PREFS;
    if (!p.mealReminders) return;

    const meals = [
      { time: p.breakfastTime, title: "🍳 Breakfast reminder", body: "Time to log your breakfast and start the day right!", tag: "meal-breakfast" },
      { time: p.lunchTime,     title: "🥗 Lunch reminder",     body: "Don't forget to log your lunch meal!",              tag: "meal-lunch"    },
      { time: p.dinnerTime,    title: "🍽 Dinner reminder",    body: "Log your dinner to hit your daily macro goals.",    tag: "meal-dinner"   },
    ];

    meals.forEach(({ time, title, body, tag }) => {
      const target = parseTimeToday(time);
      const delay  = msUntil(target);
      if (delay > 0) {
        schedule(delay, () => showNotification(title, body, "/dashboard/diet", tag));
      }
    });

    return clearAll;
  }, [userId, prefs, schedule]);

  // ── Workout reminders ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!userId || typeof Notification === "undefined" || Notification.permission !== "granted") return;
    const p = prefs ?? DEFAULT_NOTIFICATION_PREFS;
    if (!p.workoutReminders) return;

    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const workoutLogged = lastWorkoutAt ? lastWorkoutAt >= todayStart.getTime() : false;
    if (workoutLogged) return;

    const target = parseTimeToday(p.workoutTime);
    const delay  = msUntil(target);
    if (delay > 0) {
      schedule(delay, () => {
        const start = new Date(); start.setHours(0, 0, 0, 0);
        const logged = lastWorkoutAt ? lastWorkoutAt >= start.getTime() : false;
        if (!logged) {
          showNotification(
            "💪 Workout reminder",
            "Time to crush your session! Log it to track your progress.",
            "/dashboard/workout",
            "workout-reminder"
          );
        }
      });
    }

    return clearAll;
  }, [userId, prefs, lastWorkoutAt, schedule]);

  // ── Task reminders ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!userId || typeof Notification === "undefined" || Notification.permission !== "granted") return;
    const p = prefs ?? DEFAULT_NOTIFICATION_PREFS;
    if (!p.taskReminders) return;
    if (!pendingTasksCount || pendingTasksCount === 0) return;

    const target = parseTimeToday(p.taskReminderTime);
    const delay  = msUntil(target);
    if (delay > 0) {
      schedule(delay, () => {
        if (pendingTasksCount > 0) {
          showNotification(
            "✅ Tasks pending",
            `You have ${pendingTasksCount} task${pendingTasksCount > 1 ? "s" : ""} pending. Check them off!`,
            "/dashboard/tasks",
            "task-reminder"
          );
        }
      });
    }

    return clearAll;
  }, [userId, prefs, pendingTasksCount, schedule]);

  // ── Subscribe / Unsubscribe ───────────────────────────────────────────────
  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (typeof window === "undefined" || !("Notification" in window)) return "denied";
    const result = await Notification.requestPermission();
    return result as NotificationPermission;
  }, []);

  const subscribePush = useCallback(async (): Promise<boolean> => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return false;
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) return false;

    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub }),
      });
      return true;
    } catch (err) {
      console.warn("Push subscribe failed:", err);
      return false;
    }
  }, []);

  return { requestPermission, subscribePush };
}

// ── Utility ───────────────────────────────────────────────────────────────────
function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const arr = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) arr[i] = rawData.charCodeAt(i);
  return arr.buffer;
}
