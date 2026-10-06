"use client";
import { useState, useEffect, useCallback } from "react";
import { Bell, BellOff, Check, X, Loader2, Settings } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type State = "unknown" | "loading" | "granted" | "denied" | "unsupported";

export default function NotificationBell({ className }: { className?: string }) {
  const [state, setState] = useState<State>("unknown");
  const [showTooltip, setShowTooltip] = useState(false);
  const [justGranted, setJustGranted] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window) || typeof Notification === "undefined") { setState("unsupported"); return; }
    setState(Notification.permission as State);
  }, []);

  const handleClick = useCallback(async () => {
    if (state === "granted") {
      setShowTooltip((v) => !v);
      return;
    }
    if (state === "denied" || state === "unsupported") {
      setShowTooltip((v) => !v);
      return;
    }

    setState("loading");
    try {
      const result = await Notification.requestPermission();
      setState(result as State);

      if (result === "granted") {
        setJustGranted(true);
        setTimeout(() => setJustGranted(false), 3000);

        // Register service worker + subscribe to push
        if ("serviceWorker" in navigator) {
          const reg = await navigator.serviceWorker.register("/sw.js");
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
                setState("unsupported");
              }
            } catch { /* VAPID subscribe failed — local notifications still work */ }
          }
        }
      }
    } catch {
      setState("denied");
    }
  }, [state]);

  const isGranted = state === "granted";
  const isDenied  = state === "denied";
  const isUnsupported = state === "unsupported";
  const isLoading = state === "loading";

  return (
    <div className="relative">
      <button
        onClick={handleClick}
        aria-label={isGranted ? "Notifications on" : isDenied ? "Notifications blocked" : "Enable notifications"}
        title={isGranted ? "Notifications on" : isDenied ? "Notifications blocked — enable in browser settings" : "Enable notifications"}
        className={cn(
          "w-8 h-8 inline-flex items-center justify-center rounded-lg transition-colors relative hover:bg-gray-100 dark:hover:bg-white/5",
          isGranted ? "text-accent" : "opacity-70 hover:opacity-100",
          className
        )}
        style={{ color: isGranted ? undefined : "var(--text-3)" }}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : isGranted ? (
          <Bell className="w-4 h-4" />
        ) : (
          <BellOff className="w-4 h-4" />
        )}

        {/* Green dot when just granted */}
        {justGranted && (
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
        )}
      </button>

      {/* Tooltip */}
      {showTooltip && (
        <div
          className="absolute right-0 top-full mt-2 w-64 rounded-lg p-4 z-50 animate-scale-in"
          style={{
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
            boxShadow: "var(--shadow-dialog)",
          }}
        >
          <button
            onClick={() => setShowTooltip(false)}
            className="absolute top-3 right-3 btn-ghost p-1"
            aria-label="Close notification details"
          >
            <X className="w-3.5 h-3.5" />
          </button>

          {isGranted ? (
            <>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 bg-indigo-500/10 rounded-lg flex items-center justify-center">
                  <Bell className="w-3.5 h-3.5 text-accent" />
                </div>
                <p className="text-sm font-bold" style={{ color: "var(--text-1)" }}>Notifications active</p>
              </div>
              <div className="space-y-1.5 text-xs mb-3" style={{ color: "var(--text-3)" }}>
                {[
                  "Meal reminders",
                  "Workout reminder",
                  "End-of-day task reminder",
                ].map((line) => (
                  <div key={line} className="flex items-center gap-2">
                    <Check className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                    {line}
                  </div>
                ))}
              </div>
              <Link
                href="/dashboard/settings"
                onClick={() => setShowTooltip(false)}
                className="flex items-center gap-1.5 text-xs font-semibold text-accent hover:opacity-80 transition-opacity"
              >
                <Settings className="w-3 h-3" />
                Customize reminder times
              </Link>
            </>
          ) : isDenied ? (
            <>
              <p className="text-sm font-bold mb-1" style={{ color: "var(--text-1)" }}>Notifications blocked</p>
              <p className="text-xs" style={{ color: "var(--text-3)" }}>
                To enable, go to your browser settings and allow notifications for this site.
              </p>
            </>
          ) : isUnsupported ? (
            <>
              <p className="text-sm font-bold mb-1 text-amber-400">Not supported</p>
              <p className="text-xs" style={{ color: "var(--text-3)" }}>
                Notifications aren't supported in this browser.
              </p>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const arr = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) arr[i] = rawData.charCodeAt(i);
  return arr.buffer;
}
