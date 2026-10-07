"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { X, Send, Dumbbell, Utensils, CheckSquare, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { MarkdownText } from "@/components/ui/MarkdownText";
import { getDietContext, getWorkoutContext, getTaskContext } from "@/lib/orbitContext";

type Mode = "workout" | "diet" | "tasks" | null;
type Message = { role: "user" | "assistant"; content: string };

const MODE_CONFIG = {
  workout: { label: "Workout", icon: Dumbbell,   color: "bg-accent-soft text-accent border-[var(--accent-glow)]",       dot: "bg-accent", gradient: "bg-accent" },
  diet:    { label: "Diet",    icon: Utensils,    color: "bg-accent-soft text-accent border-[var(--accent-glow)]",       dot: "bg-accent", gradient: "bg-accent" },
  tasks:   { label: "Tasks",   icon: CheckSquare, color: "bg-accent-soft text-accent border-[var(--accent-glow)]",       dot: "bg-accent", gradient: "bg-accent" },
};

const SUGGESTIONS = [
  { mode: "workout" as Mode, slash: "/workout", text: "How should I structure my push day?" },
  { mode: "diet"    as Mode, slash: "/diet",    text: "High protein Indian meal ideas?" },
  { mode: "tasks"   as Mode, slash: "/tasks",   text: "How do I stop procrastinating?" },
];

/* ── Orbit icon ────────────────────────────────────────────────────── */
function OrbitIcon({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M20 3H4C2.9 3 2 3.9 2 5V15C2 16.1 2.9 17 4 17H8.5L12 21L15.5 17H20C21.1 17 22 16.1 22 15V5C22 3.9 21.1 3 20 3Z"
        fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="4.5,10 7,10 9,7 11,13 13,8.5 15,10 19.5,10"
        fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function AriaChatbot() {
  const [open, setOpen]           = useState(false);
  const [input, setInput]         = useState("");
  const [mode, setMode]           = useState<Mode>(null);
  const [messages, setMessages]   = useState<Message[]>([]);
  const [loading, setLoading]     = useState(false);
  const [showSlash, setShowSlash] = useState(false);
  const [mounted, setMounted]     = useState(false);
  const [isMobile, setIsMobile]   = useState(false);

  const desktopRef = useRef<HTMLDivElement>(null);
  const bottomRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setMounted(true);
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);

    const handleOrbitTrigger = () => setOpen(true);
    window.addEventListener("satat:open-orbit", handleOrbitTrigger);

    return () => {
      window.removeEventListener("resize", check);
      window.removeEventListener("satat:open-orbit", handleOrbitTrigger);
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 300);
  }, [open]);

  // Click-outside closes desktop panel only
  useEffect(() => {
    if (!open || isMobile) return;
    const handler = (e: MouseEvent) => {
      if (desktopRef.current && !desktopRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const t = setTimeout(() => document.addEventListener("mousedown", handler), 100);
    return () => { clearTimeout(t); document.removeEventListener("mousedown", handler); };
  }, [open, isMobile]);

  useEffect(() => {
    setShowSlash(input === "/");
    if (input.startsWith("/workout"))    setMode("workout");
    else if (input.startsWith("/diet"))  setMode("diet");
    else if (input.startsWith("/tasks")) setMode("tasks");
  }, [input]);

  const activeMode = mode ? MODE_CONFIG[mode] : null;

  const send = useCallback(async (text?: string) => {
    const content = (text ?? input).replace(/^\/(workout|diet|tasks)\s*/, "").trim();
    if (!content || loading) return;

    const userMsg: Message = { role: "user", content };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setLoading(true);

    try {
      const dietContext    = getDietContext();
      const workoutContext = getWorkoutContext();
      const taskContext    = getTaskContext();
      const res = await fetch("/api/aria", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next, mode, dietContext, workoutContext, taskContext }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, {
        role: "assistant",
        content: data.reply ?? "Sorry, something went wrong.",
      }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Sorry, something went wrong." }]);
    } finally {
      setLoading(false);
    }
  }, [input, messages, mode, loading]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const handleSlashSuggestion = (s: typeof SUGGESTIONS[0]) => {
    setMode(s.mode); setInput(""); setShowSlash(false); send(s.text);
  };

  const reset = () => { setMessages([]); setMode(null); setInput(""); };

  if (!mounted) return null;

  /* ── Shared chat panel content ──────────────────────────────────── */
  const chatContent = (
    <>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "var(--accent)", color: "var(--on-accent)" }}>
          <OrbitIcon size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-black text-sm leading-none" style={{ color: "var(--text-1)" }}>Orbit</p>
          <p className="text-xs mt-1" style={{ color: "var(--text-3)" }}>AI Coach</p>
        </div>
        {activeMode && (
          <span className={cn("text-xs font-bold px-2.5 py-1 rounded-full border flex items-center gap-1.5 flex-shrink-0", activeMode.color)}>
            <span className={cn("w-1.5 h-1.5 rounded-full", activeMode.dot)} />
            {activeMode.label}
          </span>
        )}
        <div className="flex items-center gap-0.5">
          <button onClick={reset} title="Clear"
            className="p-1.5 rounded-lg transition-all hover:bg-white/5"
            style={{ color: "var(--text-3)" }}>
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setOpen(false)}
            className="p-1.5 rounded-lg transition-all hover:bg-white/5"
            style={{ color: "var(--text-3)" }}>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="overflow-y-auto px-4 py-3 space-y-3 scrollbar-none flex-1">
        {messages.length === 0 && (
          <div className="flex flex-col items-center text-center py-4">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3" style={{ background: "var(--accent)", color: "var(--on-accent)" }}>
              <OrbitIcon size={22} />
            </div>
            <p className="font-black text-sm" style={{ color: "var(--text-1)" }}>Ask me anything</p>
            <p className="text-xs mt-1 leading-relaxed max-w-[220px]" style={{ color: "var(--text-3)" }}>
              Workout, nutrition, or productivity — I&apos;ve got you.
            </p>
            <div className="mt-4 w-full space-y-1.5">
              <p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: "var(--text-3)" }}>Quick start</p>
              {SUGGESTIONS.map((s) => {
                const Cfg = MODE_CONFIG[s.mode!];
                const Icon = Cfg.icon;
                return (
                  <button key={s.slash} onClick={() => handleSlashSuggestion(s)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-all text-left"
                    style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                    <div className={cn("w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0", Cfg.gradient)} style={{ color: "var(--on-accent)" }}>
                      <Icon className="w-3 h-3" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className={cn("text-[10px] font-black uppercase tracking-wide mr-1.5", Cfg.color.split(" ")[1])}>{s.slash}</span>
                      <span className="text-xs" style={{ color: "var(--text-2)" }}>{s.text}</span>
                    </div>
                  </button>
                );
              })}
              <p className="text-[10px] text-center pt-1 font-medium" style={{ color: "var(--text-3)" }}>
                Type <span className="font-black" style={{ color: "var(--text-2)" }}>/</span> to switch modes
              </p>
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={cn("flex gap-2", m.role === "user" ? "justify-end" : "justify-start")}>
            {m.role === "assistant" && (
              <div className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 mt-1" style={{ background: "var(--accent)", color: "var(--on-accent)" }}>
                <OrbitIcon size={10} />
              </div>
            )}
            <div className={cn(
              "max-w-[82%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed",
              m.role === "user"
                ? "bg-accent text-[var(--on-accent)] rounded-br-sm"
                : "rounded-bl-sm"
            )}
            style={m.role === "assistant" ? {
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              color: "var(--text-1)",
            } : undefined}>
              {m.role === "assistant" ? <MarkdownText text={m.content} /> : m.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-2">
            <div className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 mt-1" style={{ background: "var(--accent)", color: "var(--on-accent)" }}>
              <OrbitIcon size={10} />
            </div>
            <div className="rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1.5 items-center"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
              {[0, 1, 2].map(i => (
                <span key={i} className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse"
                  style={{ animationDelay: `${i * 140}ms` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Slash dropdown */}
      {showSlash && (
        <div className="px-3 pb-1 flex-shrink-0">
          <div className="rounded-lg overflow-hidden" style={{ background: "var(--surface-2)", border: "1px solid var(--border)", boxShadow: "var(--shadow-dialog)" }}>
            {(["workout", "diet", "tasks"] as const).map((m) => {
              const Cfg = MODE_CONFIG[m];
              const Icon = Cfg.icon;
              return (
                <button key={m}
                  onClick={() => { setMode(m); setInput(`/${m} `); inputRef.current?.focus(); setShowSlash(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3 transition-colors text-left hover:bg-white/5"
                  style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  <div className={cn("w-6 h-6 rounded-md flex items-center justify-center", Cfg.gradient)} style={{ color: "var(--on-accent)" }}>
                    <Icon className="w-3 h-3" />
                  </div>
                  <span className="text-sm font-black" style={{ color: "var(--text-1)" }}>/{m}</span>
                  <span className="text-xs" style={{ color: "var(--text-3)" }}>{Cfg.label} mode</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="px-3 py-3 flex-shrink-0">
        <div className="flex items-center gap-2 rounded-2xl px-3.5 py-2.5 transition-all focus-within:ring-2 focus-within:ring-indigo-500/20"
          style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask me anything… or type /"
            className="flex-1 bg-transparent text-sm resize-none outline-none leading-snug scrollbar-none"
            style={{ color: "var(--text-1)", fieldSizing: "content", maxHeight: "80px" } as any}
          />
          <button onClick={() => send()} disabled={!input.trim() || loading}
            className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center flex-shrink-0 disabled:opacity-30 transition-colors">
            <Send className="w-3.5 h-3.5" style={{ color: "var(--on-accent)" }} />
          </button>
        </div>
      </div>
    </>
  );

  /* ── Trigger button (shared icon logic) ────────────────────────── */
  const triggerIcon = (
    <div style={{
      transition: "transform 0.25s cubic-bezier(0.34,1.4,0.64,1), opacity 0.15s ease",
      transform: open ? "rotate(45deg) scale(0.85)" : "rotate(0deg) scale(1)",
    }}>
      {open ? <X className="w-5 h-5 text-white" /> : <OrbitIcon size={22} />}
    </div>
  );

  /* ══════════════════════════════════════════════════════════════════
     MOBILE: full-screen bottom sheet anchored between header & nav.
     Keyboard opening/closing cannot affect these fixed-pixel anchors.
  ════════════════════════════════════════════════════════════════════ */
  if (isMobile) {
    return (
      <>
        {/* Panel: compact bottom sheet above nav bar */}
        {/* Backdrop for mobile sheet */}
        {open && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[149]"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
        )}

        <div
          className="fixed left-0 right-0 z-[150] flex flex-col"
          style={{
            bottom: "calc(58px + env(safe-area-inset-bottom, 0px))",
            maxHeight: "72vh",
            background: "var(--satat-surface, #0D0F11)",
            borderTop: "1px solid var(--satat-border, rgba(255,255,255,0.08))",
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            boxShadow: "0 -16px 36px rgba(0,0,0,0.8)",
            transform: open ? "translateY(0)" : "translateY(115%)",
            transition: "transform 0.22s cubic-bezier(0.16, 1, 0.3, 1)",
            pointerEvents: open ? "auto" : "none",
          }}
        >
          {/* Drag handle pill */}
          <div className="flex justify-center pt-2 pb-0 flex-shrink-0">
            <div className="w-10 h-1 rounded-full" style={{ background: "var(--satat-border-strong)" }} />
          </div>
          {chatContent}
        </div>
      </>
    );
  }

  /* ══════════════════════════════════════════════════════════════════
     DESKTOP: floating panel in bottom-right corner.
  ════════════════════════════════════════════════════════════════════ */
  return (
    <div ref={desktopRef}
      className="fixed bottom-6 right-6 z-[150] flex flex-col items-end gap-3 pointer-events-none">

      {/* Floating chat panel */}
      <div
        style={{
          transition: "opacity 0.16s ease, transform 0.16s ease",
          opacity: open ? 1 : 0,
          transform: open ? "scale(1) translateY(0)" : "scale(0.98) translateY(4px)",
          pointerEvents: open ? "auto" : "none",
          transformOrigin: "bottom right",
          maxHeight: "72vh",
          background: "var(--satat-surface, #0D0F11)",
          border: "1px solid var(--satat-border, rgba(255,255,255,0.08))",
          boxShadow: "0 24px 48px rgba(0,0,0,0.8)",
        }}
        className="w-[380px] rounded-2xl flex flex-col overflow-hidden"
      >
        {chatContent}
      </div>

      {/* Desktop trigger button */}
      <button
        onClick={() => setOpen(o => !o)}
        title="Ask Orbit"
        className={cn(
          "w-11 h-11 rounded-xl flex items-center justify-center pointer-events-auto transition-transform active:scale-95",
        )}
        style={{
          background: "var(--satat-surface, #0D0F11)",
          border: "1px solid var(--satat-border, rgba(255,255,255,0.08))",
          color: "var(--satat-brand, #6E8BFF)",
          boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
        }}
      >
        {triggerIcon}
      </button>
    </div>
  );
}