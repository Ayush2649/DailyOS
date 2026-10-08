"use client";
import { useState, useEffect } from "react";
import { CheckSquare, Dumbbell, Utensils, Sparkles, ArrowRight, X, Brain, Camera, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const TOUR_KEYS = ["satat_tour_v1", "dailyos_tour_v1"];

export default function ProductTour() {
  const [visible, setVisible]   = useState(false);
  const [step, setStep]         = useState(0);
  const [dir, setDir]           = useState<1 | -1>(1); // animation direction
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    const isSeen = TOUR_KEYS.some(k => {
      try { return Boolean(localStorage.getItem(k)); } catch { return false; }
    });
    if (!isSeen) {
      const t = setTimeout(() => setVisible(true), 700);
      return () => clearTimeout(t);
    }
  }, []);

  const dismiss = () => {
    TOUR_KEYS.forEach(k => {
      try { localStorage.setItem(k, "1"); } catch { /* ignore */ }
    });
    setVisible(false);
  };

  const goTo = (next: number, direction: 1 | -1 = 1) => {
    if (animating) return;
    setDir(direction);
    setAnimating(true);
    setTimeout(() => { setStep(next); setAnimating(false); }, 220);
  };

  const next = () => step < 4 ? goTo(step + 1, 1) : dismiss();
  const back = () => step > 0 && goTo(step - 1, -1);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/55" onClick={dismiss} />

      <div
        className="relative w-full overflow-hidden border"
        style={{
          background: "var(--surface-0)",
          borderColor: "var(--border)",
          boxShadow: "var(--shadow-dialog)",
          maxWidth: step === 0 ? 400 : step === 4 ? 460 : 420,
          borderRadius: "var(--radius-panel)",
          transition: "max-width 0.16s ease",
        }}
      >
        {/* ── Step content ── */}
        <div
          style={{
            transition: animating
              ? "opacity 0.18s ease, transform 0.18s ease"
              : "opacity 0.22s ease, transform 0.22s cubic-bezier(0.34,1.2,0.64,1)",
            opacity: animating ? 0 : 1,
            transform: animating
              ? `translateX(${dir * 40}px) scale(0.97)`
              : "translateX(0) scale(1)",
          }}
        >
          {step === 0 && <Step0 onNext={next} onDismiss={dismiss} />}
          {step === 1 && <Step1 onNext={next} onBack={back} onDismiss={dismiss} />}
          {step === 2 && <Step2 onNext={next} onBack={back} onDismiss={dismiss} />}
          {step === 3 && <Step3 onNext={next} onBack={back} onDismiss={dismiss} />}
          {step === 4 && <Step4 onNext={next} onBack={back} onDismiss={dismiss} />}
        </div>

        {/* Progress dots — always visible */}
        <div
          className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-6 py-4"
          style={{ pointerEvents: "none" }}
        >
          <div className="flex gap-1.5" style={{ pointerEvents: "auto" }}>
            {[0,1,2,3,4].map(i => (
              <div key={i}
                className="rounded-full transition-all duration-300"
                style={{
                  width: i === step ? 20 : 6,
                  height: 6,
                  backgroundColor: i === step ? "var(--accent)" : "var(--border)",
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Shared footer nav ─────────────────────────────────────────────── */
function Nav({ onBack, onNext, isLast }: { onBack?: () => void; onNext: () => void; isLast?: boolean }) {
  return (
    <div className={cn("flex items-center justify-between px-6 pb-6 pt-2")}>
      <div className="w-24" /> {/* spacer for dots */}
      <div className="flex items-center gap-2 ml-auto">
        {onBack && (
          <button onClick={onBack} className="btn-ghost text-sm">Back</button>
        )}
        <button onClick={onNext}
          className="btn-primary inline-flex items-center gap-1.5 text-sm">
          {isLast ? "Get started" : "Next"}
          {!isLast && <ArrowRight className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
}

/* ── STEP 0: Welcome — full gradient hero ──────────────────────────── */
function Step0({ onNext, onDismiss }: { onNext: () => void; onDismiss: () => void }) {
  return (
    <div className="overflow-hidden" style={{ background: "var(--surface-0)" }}>
      <button onClick={onDismiss} className="absolute top-4 right-4 btn-ghost z-10" aria-label="Close introduction">
        <X className="w-4 h-4" />
      </button>

      {/* Hero area */}
      <div className="pt-10 pb-5 px-6 text-center border-b" style={{ borderColor: "var(--border)" }}>
        <div className="w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4" style={{ background: "var(--accent-soft)" }}>
          <Sparkles className="w-6 h-6" style={{ color: "var(--accent)" }} />
        </div>

        <h1 className="text-xl font-semibold mb-2 leading-tight" style={{ color: "var(--text-1)" }}>
          Welcome to SATAT
        </h1>
        <p className="text-sm leading-relaxed max-w-[300px] mx-auto" style={{ color: "var(--text-2)" }}>
          Plan tasks, record workouts, and keep track of meals in one place.
        </p>
      </div>

      <div className="flex gap-2 px-6 py-4 justify-center flex-wrap">
        {[
          { icon: CheckSquare, label: "Tasks" },
          { icon: Dumbbell, label: "Workout" },
          { icon: Utensils, label: "Diet" },
        ].map(({ icon: Icon, label }) => (
          <div key={label} className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5" style={{ background: "var(--surface-2)" }}>
            <Icon className="w-3.5 h-3.5" style={{ color: "var(--accent)" }} />
            <span className="text-xs font-medium" style={{ color: "var(--text-2)" }}>{label}</span>
          </div>
        ))}
      </div>

      <Nav onNext={onNext} />
    </div>
  );
}

/* ── STEP 1: Tasks — visual LEFT, text RIGHT ───────────────────────── */
function Step1({ onNext, onBack, onDismiss }: { onNext: () => void; onBack: () => void; onDismiss: () => void }) {
  const tasks = [
    { text: "Review PRD document", done: true },
    { text: "Team standup call", done: true },
    { text: "Ship v2 feature", done: false },
    { text: "Update docs", done: false },
  ];
  return (
    <div className="overflow-hidden" style={{ background: "var(--surface-0)" }}>
      <button onClick={onDismiss} className="absolute top-4 right-4 p-1.5 rounded-xl text-gray-300 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all z-10">
        <X className="w-4 h-4" />
      </button>

      {/* Top violet strip */}
      <div className="px-6 pt-5 pb-4 border-b" style={{ background: "var(--surface-2)", borderColor: "var(--border)" }}>
        <span className="text-xs font-semibold" style={{ color: "var(--accent)" }}>Tasks</span>
        <h2 className="text-lg font-semibold mt-2 leading-tight" style={{ color: "var(--text-1)" }}>Keep today&apos;s work visible</h2>
      </div>

      {/* Side-by-side layout */}
      <div className="flex gap-0">
        {/* Task list — takes most of the width */}
        <div className="flex-1 p-5 space-y-2">
          {tasks.map((t, i) => (
            <div key={i}
              className="flex items-center gap-2.5 p-2.5 rounded-xl border transition-all"
              style={{
                borderColor: t.done ? "var(--accent-glow)" : "var(--border)",
                background: t.done ? "var(--accent-soft)" : "var(--surface-0)",
              }}
              // Note: ProductTour uses inline styles for its demo cards (intentionally not dark-mode themed as they are mock UI)
              >
              <div className="w-4 h-4 rounded-full flex-shrink-0 border-2 flex items-center justify-center"
                style={t.done ? { background: "var(--accent)", borderColor: "var(--accent)" } : { borderColor: "var(--border)" }}>
                {t.done && <svg className="w-2.5 h-2.5" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5 3.5-4" stroke="white" strokeWidth="1.5" strokeLinecap="round"/></svg>}
              </div>
              <span className={cn("text-xs font-semibold", t.done ? "line-through text-gray-300" : "text-gray-800")}>{t.text}</span>
            </div>
          ))}
          {/* Progress bar */}
          <div className="mt-3 pt-2 border-t" style={{ borderColor: "var(--border)" }}>
            <div className="flex justify-between text-[10px] font-bold text-gray-400 mb-1.5">
              <span>Progress</span><span style={{ color: "var(--accent)" }}>2/4 done</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--surface-3)" }}>
              <div className="h-full rounded-full" style={{ width: "50%", background: "var(--accent)" }} />
            </div>
          </div>
        </div>

        {/* Right: short description */}
        <div className="w-[130px] flex-shrink-0 p-4 flex flex-col justify-center gap-3" style={{ background: "var(--surface-2)" }}>
          <div className="text-xs leading-relaxed font-medium" style={{ color: "var(--text-2)" }}>
            <p className="font-semibold mb-1" style={{ color: "var(--text-1)" }}>Projects</p>
            Group tasks by Work, Personal, or Health.
          </div>
          <div className="text-xs leading-relaxed font-medium" style={{ color: "var(--text-2)" }}>
            <p className="font-semibold mb-1" style={{ color: "var(--text-1)" }}>Daily / Weekly</p>
            Switch between day and week views.
          </div>
        </div>
      </div>

      <Nav onBack={onBack} onNext={onNext} />
    </div>
  );
}

/* ── STEP 2: Workout — dark card, exercises at top ─────────────────── */
function Step2({ onNext, onBack, onDismiss }: { onNext: () => void; onBack: () => void; onDismiss: () => void }) {
  const exs = [
    { name: "Bench Press", sets: "4×8", weight: "80kg", pct: 80 },
    { name: "Pull-ups",    sets: "3×10", weight: "BW",   pct: 65 },
    { name: "Squat",       sets: "4×6", weight: "100kg", pct: 90 },
  ];
  return (
    <div className="overflow-hidden" style={{ background: "var(--surface-0)" }}>
      <button onClick={onDismiss} className="absolute top-4 right-4 p-1.5 rounded-xl text-white/30 hover:text-white hover:bg-white/10 transition-all z-10">
        <X className="w-4 h-4" />
      </button>

      {/* Header */}
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "var(--accent-soft)" }}>
            <Dumbbell className="w-5 h-5" style={{ color: "var(--accent)" }} />
          </div>
          <div>
            <span className="text-xs font-semibold" style={{ color: "var(--accent)" }}>Workout</span>
            <h2 className="text-lg font-semibold leading-tight" style={{ color: "var(--text-1)" }}>Every session, recorded.</h2>
          </div>
        </div>

        {/* Exercise cards — stacked with depth effect */}
        <div className="space-y-2">
          {exs.map((ex, i) => (
            <div key={i} className="rounded-lg p-3 border flex items-center gap-3"
              style={{ background: "var(--surface-2)", borderColor: "var(--border)", transform: `translateX(${i * 4}px)`, opacity: 1 - i * 0.08 }}>
              <div className="flex-1">
                <p className="text-sm font-semibold" style={{ color: "var(--text-1)" }}>{ex.name}</p>
                <div className="mt-1.5 h-1 rounded-full overflow-hidden w-full" style={{ background: "var(--surface-3)" }}>
                  <div className="h-full rounded-full" style={{ width: `${ex.pct}%`, background: "var(--accent)" }} />
                </div>
              </div>
              <span className="text-xs font-semibold px-2 py-1 rounded-md" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>{ex.sets}</span>
              <span className="text-xs font-medium px-2 py-1 rounded-md" style={{ background: "var(--surface-3)", color: "var(--text-2)" }}>{ex.weight}</span>
            </div>
          ))}
        </div>
      </div>

      {/* AI summary teaser */}
      <div className="mx-6 mb-5 border rounded-lg p-3 flex items-center gap-2.5" style={{ background: "var(--surface-2)", borderColor: "var(--border)" }}>
        <Sparkles className="w-4 h-4 flex-shrink-0" style={{ color: "var(--accent)" }} />
        <p className="text-xs font-medium" style={{ color: "var(--text-2)" }}>Review training volume, calories, and session notes after your workout.</p>
      </div>

      <Nav onBack={onBack} onNext={onNext} />
    </div>
  );
}

/* ── STEP 3: Diet — rings front & center ──────────────────────────── */
function Step3({ onNext, onBack, onDismiss }: { onNext: () => void; onBack: () => void; onDismiss: () => void }) {
  const macros = [
    { label: "Calories", value: 1640, goal: 2000, color: "var(--status-warning)", pct: 82 },
    { label: "Protein",  value: 118,  goal: 150,  color: "var(--macro-protein)", pct: 79 },
    { label: "Carbs",    value: 165,  goal: 200,  color: "var(--macro-carbs)", pct: 55 },
    { label: "Fat",      value: 52,   goal: 65,   color: "var(--macro-fat)", pct: 80 },
  ];

  function Ring({ color, pct, size = 64, stroke = 7 }: { color: string; pct: number; size?: number; stroke?: number }) {
    const r = (size - stroke) / 2;
    const circ = 2 * Math.PI * r;
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--surface-3)" strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ * (1 - pct / 100)} />
      </svg>
    );
  }

  return (
    <div className="overflow-hidden" style={{ background: "var(--surface-0)" }}>
      <button onClick={onDismiss} className="absolute top-4 right-4 p-1.5 rounded-xl text-gray-300 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all z-10">
        <X className="w-4 h-4" />
      </button>

      {/* Emerald top + big calorie ring */}
      <div className="pt-5 pb-6 px-6 text-center border-b" style={{ background: "var(--surface-2)", borderColor: "var(--border)" }}>
        <span className="text-xs font-semibold inline-block mb-3" style={{ color: "var(--accent)" }}>Diet</span>

        {/* Big center ring */}
        <div className="relative inline-flex items-center justify-center mb-2">
          <Ring color="var(--accent)" pct={82} size={96} stroke={7} />
          <div className="absolute text-center">
            <p className="text-xl font-semibold leading-none" style={{ color: "var(--text-1)" }}>360</p>
            <p className="text-[10px] font-medium" style={{ color: "var(--text-3)" }}>kcal left</p>
          </div>
        </div>
        <p className="text-xs font-medium" style={{ color: "var(--text-2)" }}>1,640 of 2,000 kcal consumed</p>
      </div>

      {/* Macro mini rings row */}
      <div className="flex justify-around px-5 py-4 border-b" style={{ borderColor: "var(--border)" }}>
        {macros.slice(1).map((m) => (
          <div key={m.label} className="flex flex-col items-center gap-1">
            <div className="relative">
              <Ring color={m.color} pct={m.pct} size={52} stroke={5} />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[9px] font-black" style={{ color: m.color }}>{m.pct}%</span>
              </div>
            </div>
            <p className="text-[10px] font-semibold" style={{ color: "var(--text-1)" }}>{m.value}g</p>
            <p className="text-[9px]" style={{ color: "var(--text-3)" }}>{m.label}</p>
          </div>
        ))}
      </div>

      <div className="px-6 py-4">
        <p className="text-xs leading-relaxed" style={{ color: "var(--text-2)" }}>
          Log meals manually or scan a photo to estimate the macros.
        </p>
      </div>

      <Nav onBack={onBack} onNext={onNext} />
    </div>
  );
}

/* ── STEP 4: AI / Aria — dramatic dark, fanned cards ──────────────── */
function Step4({ onNext, onBack, onDismiss }: { onNext: () => void; onBack: () => void; onDismiss: () => void }) {
  const cards = [
    { icon: Dumbbell, title: "Workout summary", desc: "Review session volume, calories, and progress.", },
    { icon: Camera,   title: "Meal estimates", desc: "Estimate calories, protein, carbs, and fat from a photo.", },
    { icon: Brain,    title: "Orbit assistant", desc: "Ask about your tasks, workouts, or nutrition.", },
  ];

  return (
    <div className="overflow-hidden" style={{ background: "var(--surface-0)" }}>
      <button onClick={onDismiss} className="absolute top-4 right-4 btn-ghost z-10" aria-label="Close introduction">
        <X className="w-4 h-4" />
      </button>

      <div className="px-6 pt-7 pb-2">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-4 h-4" style={{ color: "var(--accent)" }} />
          <span className="text-xs font-semibold" style={{ color: "var(--accent)" }}>Insights and tools</span>
        </div>
        <h2 className="text-xl font-semibold leading-tight mb-1" style={{ color: "var(--text-1)" }}>Support for daily routines</h2>
        <p className="text-sm mb-4" style={{ color: "var(--text-3)" }}>Use summaries and estimates where they help.</p>

        <div className="space-y-2">
          {cards.map((c, i) => {
            const Icon = c.icon;
            return (
              <div key={i}
                className="rounded-lg border p-3 flex items-start gap-3"
                style={{
                  background: "var(--surface-2)",
                  borderColor: "var(--border)",
                }}
              >
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "var(--accent-soft)" }}>
                  <Icon className="w-4 h-4" style={{ color: "var(--accent)" }} />
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: "var(--text-1)" }}>{c.title}</p>
                  <p className="text-xs leading-relaxed mt-0.5" style={{ color: "var(--text-3)" }}>{c.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Nav onBack={onBack} onNext={onNext} isLast />
    </div>
  );
}
