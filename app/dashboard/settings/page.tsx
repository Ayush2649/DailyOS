import NotificationSettings from "@/components/settings/NotificationSettings";
import HealthSyncSettings from "@/components/settings/HealthSyncSettings";
import { Bell, Watch } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="page-title">
          Settings
        </h1>
        <p className="page-description mt-1">
          Manage your preferences and reminders
        </p>
      </div>

      {/* Notifications section */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Bell className="w-4 h-4" style={{ color: "var(--text-3)" }} />
          <h2 className="section-title">
            Notifications
          </h2>
        </div>
        <NotificationSettings />
      </div>

      {/* Health Sync section */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Watch className="w-4 h-4" style={{ color: "var(--text-3)" }} />
          <h2 className="section-title">
            Health Sync
          </h2>
        </div>
        <HealthSyncSettings />
      </div>
    </div>
  );
}
