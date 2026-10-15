"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { onSnapshot, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useFirebaseAuth } from "@/components/FirebaseAuthProvider";
import { useNotifications } from "@/hooks/useNotifications";
import { getWorkoutSessions, getAllTasks } from "@/lib/firestore";
import { DEFAULT_NOTIFICATION_PREFS } from "@/types";
import type { NotificationPrefs } from "@/types";
import { todayString } from "@/lib/utils";

export default function NotificationScheduler() {
  const { data: session } = useSession();
  const { isReady, firebaseUser } = useFirebaseAuth();
  const userId = (session?.user as any)?.id ?? session?.user?.email ?? "";

  const [prefs, setPrefs]               = useState<NotificationPrefs>(DEFAULT_NOTIFICATION_PREFS);
  const [lastWorkoutAt, setLastWorkout] = useState<number | null>(null);
  const [pendingTasks, setPendingTasks] = useState(0);

  // Live-sync prefs from Firestore — re-schedules timers immediately when Settings are saved
  useEffect(() => {
    if (!userId || !isReady || !firebaseUser) return;
    const unsub = onSnapshot(doc(db, "notificationPrefs", userId), snap => {
      if (snap.exists()) setPrefs(snap.data() as NotificationPrefs);
      else setPrefs(DEFAULT_NOTIFICATION_PREFS);
    });
    return unsub;
  }, [userId, isReady, firebaseUser]);

  // Load workout + task data once on mount
  useEffect(() => {
    if (!userId || !isReady || !firebaseUser) return;
    const today = todayString();
    Promise.all([
      getWorkoutSessions(userId),
      getAllTasks(userId),
    ]).then(([sessions, tasks]) => {
      const latest = sessions[0];
      if (latest) setLastWorkout(latest.createdAt);

      const pending = tasks.filter(
        t => t.status === "pending" && (!t.dueDate || t.dueDate <= today)
      );
      setPendingTasks(pending.length);
    });
  }, [userId, isReady, firebaseUser]);

  useNotifications({ userId, prefs, lastWorkoutAt, pendingTasksCount: pendingTasks });

  return null;
}
