"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Moon, Sun, Laptop } from "lucide-react";

export default function AppearanceSettings() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        className="rounded-2xl p-4 flex gap-2 animate-pulse"
        style={{
          background: "var(--satat-surface, #0D0F11)",
          border: "1px solid var(--satat-border-subtle, rgba(255,255,255,0.05))",
        }}
      >
        <div className="h-10 flex-1 bg-white/5 rounded-xl" />
        <div className="h-10 flex-1 bg-white/5 rounded-xl" />
        <div className="h-10 flex-1 bg-white/5 rounded-xl" />
      </div>
    );
  }

  const options = [
    { id: "dark", label: "Dark (Signature)", icon: Moon },
    { id: "light", label: "Light", icon: Sun },
    { id: "system", label: "System", icon: Laptop },
  ];

  return (
    <div
      className="rounded-2xl p-4 sm:p-5"
      style={{
        background: "var(--satat-surface, #0D0F11)",
        border: "1px solid var(--satat-border-subtle, rgba(255,255,255,0.05))",
      }}
    >
      <div className="mb-3">
        <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          Interface Theme
        </h3>
        <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
          SATAT is dark-first by design. Light and System modes are fully supported.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {options.map(({ id, label, icon: Icon }) => {
          const isSelected = theme === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setTheme(id)}
              className="flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-xl text-xs font-semibold transition-all"
              style={{
                background: isSelected ? "var(--brand-subtle)" : "var(--satat-surface-elevated, #121519)",
                border: isSelected ? "1px solid var(--brand)" : "1px solid var(--satat-border-subtle, rgba(255,255,255,0.05))",
                color: isSelected ? "var(--brand)" : "var(--text-secondary)",
              }}
            >
              <Icon className="w-4 h-4" />
              <span>{label.split(" ")[0]}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
