"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  Bell, BellOff, Utensils, Dumbbell, CheckSquare,
  Check, Loader2, Clock, Share, Plus, Send,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getNotificationPrefs, saveNotificationPrefs } from "@/lib/firestore";
import { getUserKey } from "@/lib/auth/userKey";
import { DEFAULT_NOTIFICATION_PREFS } from "@/types";
import type { NotificationPrefs } from "@/types";

// ── Helpers ───────────────────────────────────────────────────────────────────
function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const arr = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) arr[i] = rawData.charCodeAt(i);
  return arr.buffer;
}

// ── iOS / PWA detection ───────────────────────────────────────────────────────
function useIOSPWAStatus() {
  const [status, setStatus] = useState<{
    isIOS: boolean;
    isStandalone: boolean;
    notifSupported: boolean;
  }>({ isIOS: false, isStandalone: false, notifSupported: false });

  useEffect(() => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as any).standalone === true;
    const notifSupported = typeof window !== "undefined" && "Notification" in window;
    setStatus({ isIOS, isStandalone, notifSupported });
  }, []);

  return status;
}

// ── Toggle ────────────────────────────────────────────────────────────────────
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200",
        checked ? "bg-indigo-500" : "bg-gray-600"
      )}
    >
      <span
        className={cn(
          "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg transform transition-transform duration-200",
          checked ? "translate-x-5" : "translate-x-0"
        )}
      />
    </button>
  );
}

// ── Time Picker Row ───────────────────────────────────────────────────────────
function TimeRow({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className={cn(
      "flex items-center justify-between py-3 px-4 rounded-xl transition-opacity",
      disabled ? "opacity-40 pointer-events-none" : "",
    )} style={{ background: "var(--surface-2)" }}>
      <div className="flex items-center gap-2.5">
        <Clock className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--text-3)" }} />
        <span className="text-xs font-semibold" style={{ color: "var(--text-2)" }}>{label}</span>
      </div>
      <input
        type="time"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="text-xs font-mono font-bold rounded-lg px-2 py-1.5 border-0 outline-none focus:ring-1 focus:ring-indigo-500"
        style={{
          background: "var(--surface-3)",
          color: "var(--text-1)",
          colorScheme: "dark",
        }}
      />
    </div>
  );
}

// ── Section Card ──────────────────────────────────────────────────────────────
function SectionCard({
  icon: Icon,
  iconColor,
  iconBg,
  title,
  subtitle,
  enabled,
  onToggle,
  children,
}: {
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  title: string;
  subtitle: string;
  enabled: boolean;
  onToggle: (v: boolean) => void;
  children?: React.ReactNode;
}) {
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: "var(--surface-1)", border: "1px solid var(--border)" }}
    >
      {/* Header row */}
      <div className="flex items-center gap-3 px-4 py-4">
        <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", iconBg)}>
          <Icon className={cn("w-4.5 h-4.5", iconColor)} style={{ width: 18, height: 18 }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold" style={{ color: "var(--text-1)" }}>{title}</p>
          <p className="text-xs mt-0.5 truncate" style={{ color: "var(--text-3)" }}>{subtitle}</p>
        </div>
        <Toggle checked={enabled} onChange={onToggle} />
      </div>

      {/* Time rows */}
      {children && (
        <div className="px-3 pb-3 space-y-1.5">
          {children}
        </div>
      )}
    </div>
  );
}

// ── iOS Add-to-Home-Screen guide ──────────────────────────────────────────────
function IOSInstallGuide() {
  return (
    <div
      className="rounded-2xl px-4 py-4 space-y-3"
      style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)" }}
    >
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-indigo-500/12">
          <Bell style={{ width: 18, height: 18 }} className="text-indigo-400" />
        </div>
        <div>
          <p className="text-sm font-bold" style={{ color: "var(--text-1)" }}>
            Install DailyOS to enable notifications
          </p>
          <p className="text-xs mt-0.5 leading-relaxed" style={{ color: "var(--text-3)" }}>
            iPhone requires the app to be added to your Home Screen before notifications can be enabled.
          </p>
        </div>
      </div>

      {/* Step-by-step */}
      <div className="space-y-2 pl-1">
        {[
          { icon: Share, label: "Tap the Share button in Safari's toolbar" },
          { icon: Plus,  label: 'Tap "Add to Home Screen"' },
          { icon: Bell,  label: "Open DailyOS from your Home Screen, then come back here" },
        ].map(({ icon: Icon, label }, i) => (
          <div key={i} className="flex items-center gap-3">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[10px] font-black"
              style={{ background: "rgba(99,102,241,0.15)", color: "#818cf8" }}
            >
              {i + 1}
            </div>
            <div className="flex items-center gap-2">
              <Icon style={{ width: 14, height: 14 }} className="text-indigo-400 shrink-0" />
              <span className="text-xs" style={{ color: "var(--text-2)" }}>{label}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function NotificationSettings() {
  const { data: session, status: sessionStatus } = useSession();
  const userId = getUserKey(session) ?? "";
  const { isIOS, isStandalone, notifSupported } = useIOSPWAStatus();

  const [mounted, setMounted] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const [unsupportedMsg, setUnsupportedMsg] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_NOTIFICATION_PREFS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [sendingTest, setSendingTest] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window === "undefined") return;
    if (!("Notification" in window) || typeof Notification === "undefined") { setPermission("unsupported"); return; }
    setPermission(Notification.permission);
  }, []);

  useEffect(() => {
    if (sessionStatus === "loading") return;
    if (!userId) {
      setLoading(false);
      return;
    }
    getNotificationPrefs(userId).then(p => {
      if (p) setPrefs(p);
    }).finally(() => setLoading(false));
  }, [userId, sessionStatus]);

  const requestPermission = async () => {
    if (!("Notification" in window) || typeof Notification === "undefined") return;
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result === "granted" && "serviceWorker" in navigator) {
        const reg = await navigator.serviceWorker.register("/sw.js");
        // Create push subscription so server can send notifications when app is closed
        const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (vapidKey) {
          try {
            const sub = await reg.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: urlBase64ToUint8Array(vapidKey),
            });
            const res = await fetch("/api/push/subscribe", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ subscription: sub }),
            });
            if (res.status === 422) {
              setUnsupportedMsg("Notifications aren't supported in this browser");
            } else if (!res.ok) {
              const data = await res.json().catch(() => ({}));
              if (data?.error && String(data.error).includes("Notifications aren't supported")) {
                setUnsupportedMsg("Notifications aren't supported in this browser");
              }
            } else {
              setUnsupportedMsg(null);
            }
          } catch {
            setUnsupportedMsg("Notifications aren't supported in this browser");
          }
        }
      }
    } catch {
      // iOS in browser (non-standalone) throws — handled by IOSInstallGuide
    }
  };

  const update = async (patch: Partial<NotificationPrefs>) => {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const next = { ...prefs, ...patch, timezone };
    setPrefs(next);
    setSaving(true);
    setSaved(false);
    try {
      await saveNotificationPrefs(userId, next);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const isGranted = mounted && permission === "granted";
  const isDenied  = mounted && permission === "denied";
  const needsIOSInstall = mounted && isIOS && !isStandalone;

  const sendTestNotification = async () => {
    setSendingTest(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "test" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const code = data?.errorStatus || data?.statusCode || res.status;
        setTestResult(`push service rejected it (code ${code})`);
        return;
      }
      if (typeof data?.sent === "number" && data.sent > 0) {
        setTestResult(`${data.sent} sent`);
      } else if (data?.errorStatus) {
        setTestResult(`push service rejected it (code ${data.errorStatus})`);
      } else {
        setTestResult("this device has no subscription");
      }
    } catch {
      setTestResult("this device has no subscription");
    } finally {
      setSendingTest(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--text-3)" }} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── iOS: must install as PWA first ── */}
      {needsIOSInstall && <IOSInstallGuide />}

      {/* ── Browser unsupported notification banner ── */}
      {unsupportedMsg && (
        <div
          className="rounded-2xl px-4 py-3 flex items-center gap-3 text-xs"
          style={{
            background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.2)",
            color: "#f87171",
          }}
        >
          <BellOff className="w-4 h-4 shrink-0 text-red-400" />
          <span className="font-semibold">{unsupportedMsg}</span>
        </div>
      )}

      {/* ── Non-iOS or installed PWA: permission banner ── */}
      {!needsIOSInstall && !isGranted && (
        <div
          className="rounded-2xl px-4 py-4 flex items-start gap-3"
          style={{
            background: isDenied ? "rgba(239,68,68,0.07)" : "rgba(99,102,241,0.08)",
            border: `1px solid ${isDenied ? "rgba(239,68,68,0.18)" : "rgba(99,102,241,0.2)"}`,
          }}
        >
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: isDenied ? "rgba(239,68,68,0.12)" : "rgba(99,102,241,0.12)" }}>
            {isDenied
              ? <BellOff style={{ width: 18, height: 18 }} className="text-red-400" />
              : <Bell    style={{ width: 18, height: 18 }} className="text-indigo-400" />}
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold" style={{ color: "var(--text-1)" }}>
              {isDenied ? "Notifications blocked" : "Enable notifications"}
            </p>
            <p className="text-xs mt-0.5 leading-relaxed" style={{ color: "var(--text-3)" }}>
              {isDenied
                ? "Go to Settings → Safari → DailyOS and allow notifications."
                : "Allow DailyOS to remind you to log meals, workouts, and tasks."}
            </p>
            {!isDenied && (
              <button
                onClick={requestPermission}
                className="mt-3 px-4 py-2 rounded-xl text-xs font-bold text-white transition-all active:scale-95"
                style={{ background: "rgba(99,102,241,0.9)" }}
              >
                Allow notifications
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Reminder settings (always shown so user can pre-configure) ── */}
      <SectionCard
        icon={Utensils}
        iconColor="text-emerald-400"
        iconBg="bg-emerald-500/10"
        title="Meal Reminders"
        subtitle="Reminders to log breakfast, lunch & dinner"
        enabled={prefs.mealReminders}
        onToggle={v => update({ mealReminders: v })}
      >
        <TimeRow label="Breakfast" value={prefs.breakfastTime} onChange={v => update({ breakfastTime: v })} disabled={!prefs.mealReminders} />
        <TimeRow label="Lunch"     value={prefs.lunchTime}     onChange={v => update({ lunchTime: v })}     disabled={!prefs.mealReminders} />
        <TimeRow label="Dinner"    value={prefs.dinnerTime}    onChange={v => update({ dinnerTime: v })}    disabled={!prefs.mealReminders} />
      </SectionCard>

      <SectionCard
        icon={Dumbbell}
        iconColor="text-blue-400"
        iconBg="bg-blue-500/10"
        title="Workout Reminder"
        subtitle="Daily nudge to log your training session"
        enabled={prefs.workoutReminders}
        onToggle={v => update({ workoutReminders: v })}
      >
        <TimeRow label="Remind me at" value={prefs.workoutTime} onChange={v => update({ workoutTime: v })} disabled={!prefs.workoutReminders} />
      </SectionCard>

      <SectionCard
        icon={CheckSquare}
        iconColor="text-violet-400"
        iconBg="bg-violet-500/10"
        title="Task Reminder"
        subtitle="End-of-day nudge for pending tasks"
        enabled={prefs.taskReminders}
        onToggle={v => update({ taskReminders: v })}
      >
        <TimeRow label="Remind me at" value={prefs.taskReminderTime} onChange={v => update({ taskReminderTime: v })} disabled={!prefs.taskReminders} />
      </SectionCard>

      {(saving || saved) && (
        <div className="flex items-center justify-center gap-1.5 py-2">
          {saving
            ? <><Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: "var(--text-3)" }} /><span className="text-xs" style={{ color: "var(--text-3)" }}>Saving…</span></>
            : <><Check className="w-3.5 h-3.5 text-emerald-400" /><span className="text-xs text-emerald-400">Saved</span></>}
        </div>
      )}

      {/* ── Test notification ── */}
      {isGranted && (
        <div
          className="rounded-2xl px-4 py-4 flex items-center justify-between"
          style={{ background: "var(--surface-1)", border: "1px solid var(--border)" }}
        >
          <div>
            <p className="text-sm font-bold" style={{ color: "var(--text-1)" }}>Test notifications</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-3)" }}>
              Fire one right now to confirm they're working
            </p>
            {testResult && (
              <p
                className={cn(
                  "text-xs mt-1.5 font-semibold",
                  testResult.includes("sent") ? "text-emerald-400" : "text-amber-400"
                )}
              >
                {testResult}
              </p>
            )}
          </div>
          <button
            onClick={sendTestNotification}
            disabled={sendingTest}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 disabled:opacity-50"
            style={{ background: "rgba(99,102,241,0.12)", color: "#818cf8" }}
          >
            {sendingTest ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send style={{ width: 13, height: 13 }} />}
            {sendingTest ? "Sending…" : "Send test"}
          </button>
        </div>
      )}

      {/* ── Permission status debug row ── */}
      <div className="flex items-center gap-2 px-1">
        <div className={`w-2 h-2 rounded-full ${isGranted ? "bg-emerald-400" : isDenied ? "bg-red-400" : "bg-amber-400"}`} />
        <span className="text-xs" style={{ color: "var(--text-3)" }}>
          Browser permission: <span className="font-semibold">{mounted ? permission : "default"}</span>
          {isGranted && " — reminders will fire when this tab is open"}
          {isDenied && " — blocked in browser settings"}
          {!isGranted && !isDenied && " — click \"Allow notifications\" above"}
        </span>
      </div>
    </div>
  );
}
