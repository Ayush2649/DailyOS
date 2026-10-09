"use client";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";
import { useEffect } from "react";

// List of available theme identifiers kept for backwards compatibility
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
 * SATAT is Light-First and Light-Only.
 * ThemeProvider enforces SATAT Light across the application, neutralizes
 * any legacy theme classes or dark mode states, and guarantees consistent rendering.
 */
type ThemeProviderProps = ComponentProps<typeof NextThemesProvider>;

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  useEffect(() => {
    // Clean up any legacy custom theme classes
    const html = document.documentElement;
    Array.from(html.classList).forEach((cls) => {
      if (cls.startsWith("theme-")) html.classList.remove(cls);
    });
  }, []);

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      disableTransitionOnChange
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}
