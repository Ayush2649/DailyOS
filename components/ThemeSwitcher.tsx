"use client";
import { THEMES } from "@/components/ThemeProvider";
import { useState, useEffect } from "react";
import { Palette } from "lucide-react";

/**
 * ThemeSwitcher renders a button that cycles through the available UI themes.
 * It updates `localStorage` and the <html> element's class list, causing the
 * CSS variables defined in `styles/themes.css` to take effect instantly.
 */
export default function ThemeSwitcher() {
  const [current, setCurrent] = useState<string>(THEMES[0]);

  // Initialise from localStorage on mount
  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("app-theme") : null;
    if (stored && THEMES.includes(stored)) {
      setCurrent(stored);
    } else {
      localStorage.setItem("app-theme", THEMES[0]);
    }
  }, []);

  const cycleThemes = () => {
    const idx = THEMES.indexOf(current);
    const next = THEMES[(idx + 1) % THEMES.length];
    setCurrent(next);
    if (typeof window !== "undefined") {
      localStorage.setItem("app-theme", next);
      const html = document.documentElement;
      // Remove any existing theme- classes
      html.classList.forEach((cls) => {
        if (cls.startsWith("theme-")) html.classList.remove(cls);
      });
      html.classList.add(`theme-${next}`);
    }
  };

  return (
    <button
      onClick={cycleThemes}
      type="button"
      title={`Theme: ${current.replace(/-/g, " ")}. Click to change.`}
      aria-label={`Change theme. Current theme: ${current.replace(/-/g, " ")}`}
      className="w-8 h-8 inline-flex items-center justify-center rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-white/5"
      style={{ color: "var(--text-3)" }}
    >
      <Palette className="w-4 h-4" aria-hidden="true" />
    </button>
  );
}
