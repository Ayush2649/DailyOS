"use client";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";
import { useEffect } from "react";

// List of available theme identifiers matching CSS classes
export const THEMES = [
  "vital-sage",
  "arctic-blue",
  "neuro-violet",
  "vital-coral",
  "aqua-wellness",
  "midnight-amber",
  "forest-minimal",
  "obsidian-lime",
  "soft-health",
  "carbon-electric",
];

/**
 * ThemeProvider wraps the app with next-themes and also manages custom UI themes.
 * It reads the selected theme from localStorage (default first theme) and applies the
 * corresponding CSS class to the <html> element. The class names are defined in
 * `styles/themes.css` as `.theme-<name>`.
 */
type ThemeProviderProps = ComponentProps<typeof NextThemesProvider>;

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  // Apply the custom theme class on initial render and when it changes
  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("app-theme") : null;
    const defaultTheme = THEMES[0];
    const theme = stored && THEMES.includes(stored) ? stored : defaultTheme;
    const html = document.documentElement;
    // Remove any existing theme- classes
    Array.from(html.classList).forEach((cls) => {
      if (cls.startsWith("theme-")) html.classList.remove(cls);
    });
    html.classList.add(`theme-${theme}`);
  }, []);

  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
