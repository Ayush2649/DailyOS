"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import {
  ArrowUp, RotateCcw, Dumbbell, Utensils, CheckSquare,
  TrendingUp, X, Sparkles, AlertCircle, RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";
import { OrbitIcon, OrbitMark } from "@/components/orbit/OrbitMark";
import NotificationBell from "@/components/ui/NotificationBell";
import { MarkdownText } from "@/components/ui/MarkdownText";
import { OrbitRecommendationCard, OrbitInsightCard } from "@/components/orbit/OrbitActionCard";
import { getDietContext, getWorkoutContext, getTaskContext } from "@/lib/orbitContext";
import type { OrbitMessage, OrbitFocusMode, OrbitAction } from "@/types/orbit";

interface OrbitViewProps {
  isOverlay?: boolean;
  onClose?: () => void;
  className?: string;
}

const STORAGE_KEY = "satat_orbit_session_msgs";

const FOCUS_MODES: Array<{ id: OrbitFocusMode; label: string; icon: any }> = [
  { id: "all", label: "All", icon: Sparkles },
  { id: "workout", label: "Workout", icon: Dumbbell },
  { id: "diet", label: "Diet", icon: Utensils },
  { id: "tasks", label: "Tasks", icon: CheckSquare },
];

export function OrbitView({ isOverlay = false, onClose, className }: OrbitViewProps) {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<OrbitMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [focusMode, setFocusMode] = useState<OrbitFocusMode>("all");
  const [error, setError] = useState<string | null>(null);
  const [keyboardOffset, setKeyboardOffset] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Handle mobile virtual keyboard dynamic resizing
  useEffect(() => {
    if (typeof window === "undefined" || !window.visualViewport) return;
    const vv = window.visualViewport;
    const handleViewportChange = () => {
      const offset = window.innerHeight - vv.height;
      setKeyboardOffset(offset > 60 ? offset : 0);
    };
    vv.addEventListener("resize", handleViewportChange);
    vv.addEventListener("scroll", handleViewportChange);
    return () => {
      vv.removeEventListener("resize", handleViewportChange);
      vv.removeEventListener("scroll", handleViewportChange);
    };
  }, []);

  // User first name
  const firstName = session?.user?.name?.split(" ")[0] || "there";

  // Greeting based on current hour
  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 5) return `Working late, ${firstName}`;
    if (h < 12) return `Good morning, ${firstName}`;
    if (h < 17) return `Good afternoon, ${firstName}`;
    if (h < 21) return `Good evening, ${firstName}`;
    return `Good night, ${firstName}`;
  }, [firstName]);

  // Load in-session history
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
        }
      }
    } catch {
      // sessionStorage unavailable
    }
  }, []);

  // Save history
  const persistMessages = (msgs: OrbitMessage[]) => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(msgs));
    } catch {
      // ignore
    }
  };

  // Scroll to bottom
  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({
      behavior: smooth ? "smooth" : "auto",
      block: "end",
    });
  }, []);

  useEffect(() => {
    scrollToBottom(true);
  }, [messages, loading, scrollToBottom]);

  // Read actual context from orbitContext store
  const liveDiet = getDietContext();
  const liveWorkout = getWorkoutContext();
  const liveTasks = getTaskContext();

  const realMetrics = useMemo(() => {
    const items: Array<{ label: string; value: string }> = [];

    if (liveTasks && liveTasks.totalPending > 0) {
      items.push({
        label: "Tasks",
        value: `${liveTasks.totalPending} pending`,
      });
    }

    if (liveDiet && liveDiet.totals && liveDiet.totals.calories > 0) {
      items.push({
        label: "Nutrition",
        value: `${liveDiet.totals.calories} kcal logged`,
      });
    }

    if (liveWorkout && liveWorkout.recentSessions?.length > 0) {
      const todaySession = liveWorkout.recentSessions.find(
        (s) => s.date === new Date().toISOString().split("T")[0]
      );
      if (todaySession) {
        items.push({
          label: "Training",
          value: `${todaySession.durationMinutes || 45}m completed`,
        });
      }
    }

    return items;
  }, [liveDiet, liveWorkout, liveTasks]);

  // Send message
  const handleSend = useCallback(
    async (textToSend?: string) => {
      const text = (textToSend ?? input).trim();
      if (!text || loading) return;

      setError(null);
      const userMsg: OrbitMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: text,
        timestamp: Date.now(),
        type: "text",
      };

      const nextMessages = [...messages, userMsg];
      setMessages(nextMessages);
      persistMessages(nextMessages);
      setInput("");
      setLoading(true);

      // Reset textarea height
      if (inputRef.current) {
        inputRef.current.style.height = "auto";
      }

      try {
        const dietContext = getDietContext();
        const workoutContext = getWorkoutContext();
        const taskContext = getTaskContext();

        const payloadMessages = nextMessages.map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const res = await fetch("/api/aria", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: payloadMessages,
            mode: focusMode === "all" ? null : focusMode,
            dietContext,
            workoutContext,
            taskContext,
          }),
        });

        if (!res.ok) {
          throw new Error(`Orbit response error (${res.status})`);
        }

        const data = await res.json();
        const assistantMsg: OrbitMessage = {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: data.reply || "I encountered an issue processing your request.",
          timestamp: Date.now(),
          type: "markdown",
        };

        const updated = [...nextMessages, assistantMsg];
        setMessages(updated);
        persistMessages(updated);
      } catch (err: any) {
        setError("Orbit couldn't connect right now. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [input, loading, messages, focusMode]
  );

  // Clear conversation
  const handleReset = () => {
    setMessages([]);
    setError(null);
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  // Keyboard Enter handler
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  // Suggestion actions
  const SUGGESTIONS = [
    {
      category: "workout" as const,
      icon: Dumbbell,
      label: "Workout",
      query: "Help me structure today's workout based on my recent sessions.",
      sub: "Exercise plan & sets",
    },
    {
      category: "nutrition" as const,
      icon: Utensils,
      label: "Nutrition",
      query: "Review my nutrition today and suggest a high-protein dinner idea.",
      sub: "Macro targets & meals",
    },
    {
      category: "tasks" as const,
      icon: CheckSquare,
      label: "Productivity",
      query: "Help me prioritize my pending tasks and plan deep work.",
      sub: "Task focus & timing",
    },
    {
      category: "momentum" as const,
      icon: TrendingUp,
      label: "Momentum",
      query: "Give me an honest assessment of my weekly consistency and momentum.",
      sub: "Weekly adherence check",
    },
  ];

  return (
    <div
      className={cn(
        "orbit-view-root flex flex-col h-full w-full max-w-3xl mx-auto select-none bg-surface overflow-hidden",
        className
      )}
    >
      {/* ── 1. ORBIT HEADER (Identity & Actions) ── */}
      <header
        className={cn(
          "flex items-center justify-between px-4 sm:px-6 border-b shrink-0 z-10 transition-all",
          !isOverlay ? "h-[calc(3.5rem+env(safe-area-inset-top,0px))] pt-[env(safe-area-inset-top,0px)] lg:h-[64px] lg:pt-0" : "h-[60px]"
        )}
        style={{
          borderColor: "var(--border, rgba(255,255,255,0.08))",
          background: "var(--surface, #0D0F11)",
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border"
            style={{
              background: "rgba(110, 139, 255, 0.12)",
              borderColor: "rgba(110, 139, 255, 0.25)",
              color: "var(--satat-brand, #6E8BFF)",
            }}
          >
            <OrbitIcon size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1
                className="text-base font-bold tracking-tight leading-none"
                style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
              >
                Orbit
              </h1>
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: "var(--mint, #5BC7B2)" }}
                title="Active"
              />
            </div>
            <p className="text-[11px] font-medium leading-none mt-1" style={{ color: "var(--text-secondary)" }}>
              Personal AI Companion
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {messages.length > 0 && (
            <button
              type="button"
              onClick={handleReset}
              className="p-1.5 sm:p-2 rounded-lg text-muted hover:text-primary hover:bg-white/5 transition-all text-xs flex items-center gap-1.5"
              title="Reset conversation"
              aria-label="Reset conversation"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-xs">Clear</span>
            </button>
          )}

          {!isOverlay && <NotificationBell />}

          {isOverlay && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-muted hover:text-primary hover:bg-white/5 transition-all"
              aria-label="Close Orbit"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* ── 2. USEFUL CURRENT CONTEXT (Context Selector & Active State) ── */}
      <div
        className="w-full shrink-0 border-b z-10"
        style={{
          borderColor: "var(--border, rgba(255,255,255,0.08))",
          background: "var(--surface, #0D0F11)",
        }}
      >
        <div className="px-4 sm:px-6 py-2 flex items-center justify-between gap-3 overflow-x-auto scrollbar-none">
          {/* Mode filter pills */}
          <div className="flex items-center gap-1.5 shrink-0 min-w-max">
            <span className="text-[10px] uppercase font-bold text-muted mr-1 tracking-wider shrink-0">
              Context:
            </span>
            {FOCUS_MODES.map((m) => {
              const Icon = m.icon;
              const isSelected = focusMode === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setFocusMode(m.id)}
                  className={cn(
                    "px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all select-none border shrink-0",
                    isSelected
                      ? "border-brand bg-brand/10 text-brand"
                      : "border-border-subtle bg-surface-elevated text-muted hover:text-primary"
                  )}
                  style={
                    isSelected
                      ? {
                          borderColor: "rgba(110, 139, 255, 0.3)",
                          backgroundColor: "rgba(110, 139, 255, 0.12)",
                          color: "var(--satat-brand, #6E8BFF)",
                        }
                      : {
                          borderColor: "var(--border-subtle, rgba(255, 255, 255, 0.05))",
                          backgroundColor: "var(--surface-elevated, #14171A)",
                          color: "var(--text-muted, #7F8682)",
                        }
                  }
                >
                  <Icon className="w-3 h-3" />
                  <span>{m.label}</span>
                </button>
              );
            })}
          </div>

          {/* Quick context summary (if real metrics logged) */}
          {realMetrics.length > 0 && (
            <div className="hidden sm:flex items-center gap-2 shrink-0">
              {realMetrics.map((m, idx) => (
                <span
                  key={idx}
                  className="text-[11px] font-medium px-2 py-0.5 rounded-md border"
                  style={{
                    background: "rgba(255,255,255,0.02)",
                    borderColor: "var(--border-subtle, rgba(255,255,255,0.05))",
                    color: "var(--text-muted)",
                  }}
                >
                  <strong className="text-primary font-semibold">{m.label}:</strong> {m.value}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── 3. CONVERSATION VIEWPORT / MESSAGES SCROLL AREA ── */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-4 space-y-4 scrollbar-none">
        {/* EMPTY STATE */}
        {messages.length === 0 && (
          <div className="flex flex-col items-center text-center py-6 sm:py-8 max-w-lg mx-auto animate-fade-in">
            {/* Ambient OrbitIcon */}
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 border shadow-sm transition-transform hover:scale-105"
              style={{
                background: "rgba(110, 139, 255, 0.10)",
                borderColor: "rgba(110, 139, 255, 0.25)",
                color: "var(--satat-brand, #6E8BFF)",
              }}
            >
              <OrbitIcon size={32} />
            </div>

            <h2
              className="text-xl sm:text-2xl font-bold tracking-tight"
              style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
            >
              {greeting}
            </h2>

            <p
              className="text-xs sm:text-sm mt-2 leading-relaxed max-w-md"
              style={{ color: "var(--text-secondary)" }}
            >
              I&apos;m Orbit — your personal AI companion in SATAT. I understand your workouts,
              meals, tasks, and daily momentum.
            </p>

            {/* REAL USER CONTEXT PILLS (Never fabricated) */}
            {realMetrics.length > 0 ? (
              <div
                className="mt-4 p-3 rounded-xl border w-full text-left"
                style={{
                  background: "var(--surface-elevated, #14171A)",
                  borderColor: "var(--border, rgba(255,255,255,0.08))",
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: "var(--satat-brand, #6E8BFF)" }}
                  />
                  <span
                    className="text-[10px] font-bold uppercase tracking-wider"
                    style={{ color: "var(--satat-brand, #6E8BFF)" }}
                  >
                    Today&apos;s Active Context
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {realMetrics.map((m, idx) => (
                    <div
                      key={idx}
                      className="px-2.5 py-1 rounded-md text-xs font-medium border flex items-center gap-1.5"
                      style={{
                        background: "rgba(255,255,255,0.03)",
                        borderColor: "var(--border-subtle, rgba(255,255,255,0.05))",
                        color: "var(--text-primary)",
                      }}
                    >
                      <span className="text-muted text-[10px] uppercase font-semibold">{m.label}:</span>
                      <span>{m.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs mt-3 text-muted">
                Tell me what you&apos;re working on today and I&apos;ll help you organize the next step.
              </p>
            )}

            {/* QUICK CAPABILITY CARDS */}
            <div className="mt-6 w-full space-y-2 text-left">
              <span
                className="text-[10px] font-bold uppercase tracking-wider block px-1"
                style={{ color: "var(--text-muted)" }}
              >
                Start with a focus area
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {SUGGESTIONS.map((s, idx) => {
                  const Icon = s.icon;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSend(s.query)}
                      className="p-3 rounded-xl border text-left transition-all hover:bg-white/[0.04] active:scale-[0.98] group flex items-start gap-3"
                      style={{
                        background: "var(--surface-elevated, #14171A)",
                        borderColor: "var(--border, rgba(255,255,255,0.08))",
                      }}
                    >
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 border"
                        style={{
                          background: "rgba(110, 139, 255, 0.10)",
                          borderColor: "rgba(110, 139, 255, 0.20)",
                          color: "var(--satat-brand, #6E8BFF)",
                        }}
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span
                          className="text-xs font-semibold block group-hover:text-brand transition-colors"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {s.query}
                        </span>
                        <span className="text-[11px] block mt-0.5" style={{ color: "var(--text-muted)" }}>
                          {s.sub}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* MESSAGE HISTORY */}
        {messages.map((m) => (
          <div
            key={m.id}
            className={cn("flex flex-col", m.role === "user" ? "items-end" : "items-start")}
          >
            {/* Assistant Header Badge */}
            {m.role === "assistant" && (
              <div className="flex items-center gap-2 mb-1.5 px-0.5">
                <div
                  className="w-5 h-5 rounded-md flex items-center justify-center shrink-0"
                  style={{
                    background: "rgba(110, 139, 255, 0.12)",
                    color: "var(--satat-brand, #6E8BFF)",
                  }}
                >
                  <OrbitIcon size={13} />
                </div>
                <span className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>
                  Orbit
                </span>
                <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                  AI Companion
                </span>
              </div>
            )}

            {/* Message Body */}
            <div
              className={cn(
                "rounded-2xl transition-all leading-relaxed",
                m.role === "user"
                  ? "max-w-[85%] px-4 py-2.5 rounded-br-sm text-sm"
                  : "w-full px-4 py-3 rounded-bl-sm text-sm"
              )}
              style={
                m.role === "user"
                  ? {
                      background: "var(--surface-elevated, #14171A)",
                      border: "1px solid var(--border-subtle, rgba(255,255,255,0.08))",
                      color: "var(--text-primary, #F2F3F0)",
                    }
                  : {
                      background: "rgba(255, 255, 255, 0.02)",
                      border: "1px solid var(--border, rgba(255,255,255,0.06))",
                      color: "var(--text-primary, #F2F3F0)",
                    }
              }
            >
              {m.role === "assistant" ? (
                <MarkdownText text={m.content} />
              ) : (
                <p className="whitespace-pre-wrap">{m.content}</p>
              )}

              {/* Future-Ready Recommendation Card Attachment */}
              {m.recommendation && (
                <OrbitRecommendationCard
                  recommendation={m.recommendation}
                  onExecuteAction={(act) => {
                    if (act.href) window.location.href = act.href;
                  }}
                />
              )}

              {/* Future-Ready Insight Card Attachment */}
              {m.insight && (
                <div className="mt-2.5">
                  <OrbitInsightCard insight={m.insight} />
                </div>
              )}
            </div>
          </div>
        ))}

        {/* THINKING STATE */}
        {loading && (
          <div className="flex flex-col items-start animate-fade-in">
            <div className="flex items-center gap-2 mb-1.5 px-0.5">
              <div
                className="w-5 h-5 rounded-md flex items-center justify-center shrink-0"
                style={{
                  background: "rgba(110, 139, 255, 0.12)",
                  color: "var(--satat-brand, #6E8BFF)",
                }}
              >
                <OrbitIcon size={13} animated={true} />
              </div>
              <span className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>
                Orbit
              </span>
              <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                thinking...
              </span>
            </div>

            <div
              className="rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-2 border"
              style={{
                background: "rgba(255, 255, 255, 0.02)",
                borderColor: "var(--border, rgba(255, 255, 255, 0.06))",
              }}
            >
              <div className="flex items-center gap-1.5">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="w-1.5 h-1.5 rounded-full animate-pulse"
                    style={{
                      backgroundColor: "var(--satat-brand, #6E8BFF)",
                      animationDelay: `${i * 180}ms`,
                    }}
                  />
                ))}
              </div>
              <span className="text-xs text-muted pl-1">Analyzing context...</span>
            </div>
          </div>
        )}

        {/* ERROR STATE */}
        {error && (
          <div
            className="p-3 rounded-xl border flex items-center justify-between gap-3 text-xs"
            style={{
              background: "rgba(243, 165, 131, 0.08)",
              borderColor: "rgba(243, 165, 131, 0.25)",
              color: "var(--peach, #F3A583)",
            }}
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={() => handleSend()}
              className="px-2.5 py-1 rounded-md font-semibold text-xs border hover:bg-white/5 flex items-center gap-1"
              style={{ borderColor: "rgba(243, 165, 131, 0.3)" }}
            >
              <RefreshCw className="w-3 h-3" />
              <span>Retry</span>
            </button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── 4. COMPOSER DOCK (Docked Above Bottom Navigation) ── */}
      <div
        className={cn(
          "px-3 sm:px-4 pt-2.5 sm:pt-3 border-t shrink-0 z-20 transition-all duration-150",
          !isOverlay
            ? "pb-[calc(var(--bottom-nav-content-height)+env(safe-area-inset-bottom,0px)+var(--bottom-nav-fab-protrusion,20px)+8px)] lg:pb-4"
            : "pb-3 sm:pb-4"
        )}
        style={{
          borderColor: "var(--border, rgba(255,255,255,0.08))",
          background: "var(--surface, #0D0F11)",
          transform: keyboardOffset > 0 ? `translateY(-${keyboardOffset}px)` : undefined,
        }}
      >
        {/* Input Card Container */}
        <div
          className="flex items-end gap-2 rounded-2xl px-3.5 py-2.5 transition-all border focus-within:border-brand/40 focus-within:ring-1 focus-within:ring-brand/30"
          style={{
            background: "var(--surface-elevated, #14171A)",
            borderColor: "var(--border, rgba(255,255,255,0.08))",
          }}
        >
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Tell Orbit what you need..."
            className="flex-1 bg-transparent text-sm resize-none outline-none leading-relaxed scrollbar-none min-h-[24px] max-h-[120px]"
            style={{ color: "var(--text-primary, #F2F3F0)" }}
            aria-label="Ask Orbit"
          />

          <button
            type="button"
            onClick={() => handleSend()}
            disabled={!input.trim() || loading}
            aria-label="Send message"
            className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all select-none active:scale-90",
              input.trim() && !loading
                ? "bg-brand text-black shadow-sm"
                : "bg-white/5 text-muted opacity-40 cursor-not-allowed"
            )}
            style={
              input.trim() && !loading
                ? {
                    backgroundColor: "var(--satat-brand, #6E8BFF)",
                    color: "#000000",
                  }
                : undefined
            }
          >
            <ArrowUp className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default OrbitView;

