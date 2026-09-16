import NotificationSettings from "@/components/settings/NotificationSettings";
import HealthSyncSettings from "@/components/settings/HealthSyncSettings";
import { Bell, Watch } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-black tracking-tight" style={{ color: "var(--text-1)" }}>
          Settings
        </h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--text-3)" }}>
          Manage your preferences and reminders
        </p>
      </div>

      {/* Notifications section */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Bell className="w-4 h-4" style={{ color: "var(--text-3)" }} />
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--text-3)" }}>
            Notifications
          </p>
        </div>
        <NotificationSettings />
      </div>

      {/* Health Sync section */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Watch className="w-4 h-4" style={{ color: "var(--text-3)" }} />
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--text-3)" }}>
            Health Sync
          </p>
        </div>
        <HealthSyncSettings />
      </div>
    </div>
  );
}
