"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { OrbitMark } from "@/components/orbit/OrbitMark";
import { OrbitView } from "@/components/orbit/OrbitView";

/**
 * AriaChatbot — Desktop floating companion overlay for Orbit.
 * Reuses OrbitView for unified conversational intelligence and state.
 * On mobile, Orbit is seamlessly accessed as a primary destination via the bottom navigation.
 */
export default function AriaChatbot() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const desktopRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener("resize", check);

    const handleOrbitTrigger = () => {
      // If on desktop, open the floating companion
      if (window.innerWidth >= 1024) {
        setOpen(true);
      }
    };
    window.addEventListener("satat:open-orbit", handleOrbitTrigger);

    return () => {
      window.removeEventListener("resize", check);
      window.removeEventListener("satat:open-orbit", handleOrbitTrigger);
    };
  }, []);

  // Click-outside closes desktop floating panel
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (desktopRef.current && !desktopRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const t = setTimeout(() => document.addEventListener("mousedown", handler), 100);
    return () => {
      clearTimeout(t);
      document.removeEventListener("mousedown", handler);
    };
  }, [open]);

  // If on Orbit dedicated page or before mount, don't show floating widget
  if (!mounted || pathname?.startsWith("/dashboard/orbit")) return null;

  // On mobile viewports, Orbit is a full-screen primary destination via /dashboard/orbit
  if (isMobile) return null;

  return (
    <div
      ref={desktopRef}
      className="fixed bottom-6 right-6 z-[150] flex flex-col items-end gap-3 pointer-events-none"
    >
      {/* Floating chat panel */}
      <div
        style={{
          transition: "opacity 0.16s ease, transform 0.16s ease",
          opacity: open ? 1 : 0,
          transform: open ? "scale(1) translateY(0)" : "scale(0.98) translateY(4px)",
          pointerEvents: open ? "auto" : "none",
          transformOrigin: "bottom right",
          height: "600px",
          maxHeight: "80vh",
          background: "var(--satat-surface, #0D0F11)",
          border: "1px solid var(--satat-border, rgba(255,255,255,0.08))",
          boxShadow: "0 24px 48px rgba(0,0,0,0.8)",
        }}
        className="w-[420px] rounded-2xl flex flex-col overflow-hidden"
      >
        <OrbitView isOverlay={true} onClose={() => setOpen(false)} />
      </div>

      {/* Floating desktop trigger button */}
      <button
        onClick={() => setOpen((o) => !o)}
        title="Ask Orbit"
        aria-label="Open Orbit AI Companion"
        className={cn(
          "w-11 h-11 rounded-xl flex items-center justify-center pointer-events-auto transition-all active:scale-95 border",
          open
            ? "bg-white/10 text-primary border-white/20"
            : "border-brand/30 bg-surface text-brand shadow-lg hover:border-brand/50"
        )}
        style={{
          background: "var(--satat-surface, #0D0F11)",
          borderColor: open ? "rgba(255,255,255,0.2)" : "rgba(110,139,255,0.3)",
          color: "var(--satat-brand, #6E8BFF)",
          boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
        }}
      >
        {open ? <X className="w-5 h-5 text-white" /> : <OrbitMark size={20} />}
      </button>
    </div>
  );
}