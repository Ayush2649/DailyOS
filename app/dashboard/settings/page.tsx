import { getServerSession } from "next-auth";
import Image from "next/image";
import { authOptions } from "@/lib/auth";
import { getUserKey } from "@/lib/auth/userKey";
import { PRELAUNCH_EXEMPT_USER_IDS } from "@/lib/onboarding/constants";
import NotificationSettings from "@/components/settings/NotificationSettings";
import HealthSyncSettings from "@/components/settings/HealthSyncSettings";
import OnboardingSetupSettings from "@/components/settings/OnboardingSetupSettings";
import AppearanceSettings from "@/components/settings/AppearanceSettings";
import { Bell, Watch, Sliders, Palette, User } from "lucide-react";

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  const userId = getUserKey(session);

  const isDev = process.env.NODE_ENV === "development";
  const isExplicitAllowed = process.env.ALLOW_DEV_RESET === "true";
  const isExempt = userId ? PRELAUNCH_EXEMPT_USER_IDS.includes(userId) : false;
  const adminIds = process.env.ADMIN_USER_IDS
    ? process.env.ADMIN_USER_IDS.split(",").map((s) => s.trim())
    : [];
  const isAdmin = userId ? adminIds.includes(userId) : false;

  const isDevAuthorized = isDev || isExplicitAllowed || isExempt || isAdmin;

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-1 animate-fade-in select-none">
      {/* ── Page Header & Profile ── */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="page-title text-2xl font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>
            Settings & Profile
          </h1>
          <p className="page-description text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
            Manage your personal operating system
          </p>
        </div>
      </div>

      {/* ── Profile Summary Row ── */}
      {session?.user && (
        <div
          className="rounded-2xl p-4 flex items-center gap-3.5"
          style={{
            background: "var(--satat-surface, #0D0F11)",
            border: "1px solid var(--satat-border-subtle, rgba(255,255,255,0.05))",
          }}
        >
          {session.user.image ? (
            <Image
              src={session.user.image}
              alt=""
              width={42}
              height={42}
              className="rounded-xl shrink-0"
            />
          ) : (
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-sm font-semibold"
              style={{ background: "rgba(110, 139, 255, 0.12)", color: "var(--satat-brand, #6E8BFF)" }}
            >
              <User className="w-5 h-5" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>
              {session.user.name}
            </p>
            <p className="text-xs truncate mt-0.5" style={{ color: "var(--text-muted)" }}>
              {session.user.email}
            </p>
          </div>
        </div>
      )}

      {/* ── 1. Appearance / Theme ── */}
      <div>
        <div className="flex items-center gap-2 mb-2 px-1">
          <Palette className="w-4 h-4" style={{ color: "var(--satat-brand, #6E8BFF)" }} />
          <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
            Appearance
          </h2>
        </div>
        <AppearanceSettings />
      </div>

      {/* ── 2. Personalization / Your SATAT Setup (§2) ── */}
      <div>
        <div className="flex items-center gap-2 mb-2 px-1">
          <Sliders className="w-4 h-4" style={{ color: "var(--satat-brand, #6E8BFF)" }} />
          <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
            Your Setup & Personalization
          </h2>
        </div>
        <OnboardingSetupSettings isDevAuthorized={isDevAuthorized} />
      </div>

      {/* ── 3. Notifications ── */}
      <div>
        <div className="flex items-center gap-2 mb-2 px-1">
          <Bell className="w-4 h-4" style={{ color: "var(--satat-brand, #6E8BFF)" }} />
          <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
            Notifications & Reminders
          </h2>
        </div>
        <NotificationSettings />
      </div>

      {/* ── 4. Health Sync ── */}
      <div>
        <div className="flex items-center gap-2 mb-2 px-1">
          <Watch className="w-4 h-4" style={{ color: "var(--satat-brand, #6E8BFF)" }} />
          <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
            Connected Devices & Health Sync
          </h2>
        </div>
        <HealthSyncSettings />
      </div>
    </div>
  );
}
