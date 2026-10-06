"use client";
import Link from "next/link";
import Image from "next/image";
import { useSession, signIn } from "next-auth/react";
import { useTheme } from "next-themes";
import { useState, useEffect } from "react";
import {
  CheckCircle2, Dumbbell, Utensils, ArrowRight, Zap, BarChart3,
  Brain, Target, Star, ChevronRight, Sparkles, Camera, TrendingUp,
  Activity, Shield, Clock, Users
} from "lucide-react";
import WorkflowCards from "@/components/landing/WorkflowCards";

// ── Dark app preview (hero mockup) ───────────────────────────────────────────
function DarkCard({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: "var(--surface-0)", border: "1px solid var(--border)",
      borderRadius: "10px", padding: "12px", minWidth: 0, overflow: "hidden", ...style,
    }}>
      {children}
    </div>
  );
}

function DarkAppPreview() {
  // Calorie ring
  const consumed = 1840, calorieGoal = 2200;
  const R = 30, CIRC = 2 * Math.PI * R;
  const ringPct = consumed / calorieGoal;

  // Weight sparkline (fake descending data)
  const wts     = [80.2, 79.8, 79.9, 79.5, 79.3, 78.8, 78.5];
  const wLo     = Math.min(...wts) - 0.3;
  const wHi     = Math.max(...wts) + 0.3;
  const SW = 150, SH = 30;
  const sparkPts = wts.map((w, i) => {
    const x = (i / (wts.length - 1)) * SW;
    const y = SH - ((w - wLo) / (wHi - wLo)) * (SH - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  const sparkArea = `0,${SH} ${sparkPts} ${SW},${SH}`;

  // Workout frequency (5/7 days trained, height = duration ratio)
  const wkDays  = [60, 0, 75, 45, 90, 0, 55];
  const wkLabels = ["S","M","T","W","T","F","S"];
  const wkMax   = 90;

  const cardHeader = (bg: string, label: string, link: string, linkColor: string, extra?: React.ReactNode) => (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"10px" }}>
      <div style={{ display:"flex", alignItems:"center", gap:"7px" }}>
        <div style={{ width:"24px", height:"24px", background: bg, borderRadius:"7px" }} />
        <span style={{ fontWeight:600, color:"var(--text-1)", fontSize:"11px" }}>{label}</span>
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:"6px" }}>
        {extra}
        <span style={{ fontSize:"9px", fontWeight:700, color: linkColor }}>{link} ↗</span>
      </div>
    </div>
  );

  return (
    <div style={{ background:"var(--surface-1)", borderRadius:"12px", padding:"12px",
      fontFamily:"var(--font-sans)", fontSize:"12px", color:"var(--text-1)" }}>

      {/* Browser chrome */}
      <div style={{ display:"flex", alignItems:"center", gap:"5px", marginBottom:"14px" }}>
        {["#ff5f57","#febc2e","#28c840"].map(c => (
          <div key={c} style={{ width:"9px", height:"9px", borderRadius:"50%", background:c }} />
        ))}
        <div style={{ flex:1, marginLeft:"6px", background:"var(--surface-2)", borderRadius:"5px",
          height:"20px", display:"flex", alignItems:"center", paddingLeft:"10px",
          border:"1px solid var(--border)" }}>
          <span style={{ color:"var(--text-3)", fontSize:"10px" }}>dailyos.app/dashboard</span>
        </div>
      </div>

      {/* Greeting + streak chips */}
      <div style={{ marginBottom:"14px" }}>
        <div style={{ fontSize:"16px", fontWeight:700, color:"var(--text-1)" }}>
          Good morning, Ayush
        </div>
        <div style={{ fontSize:"10px", color:"var(--text-3)", marginTop:"2px" }}>Monday, 26 May 2026</div>
        <div style={{ display:"flex", gap:"6px", marginTop:"8px", flexWrap:"wrap" }}>
          {[
            { label:"7-day workout streak", bg:"var(--accent-soft)", color:"var(--accent)", border:"var(--accent-glow)" },
            { label:"5-day task streak",    bg:"var(--accent-soft)", color:"var(--accent)", border:"var(--accent-glow)" },
          ].map(chip => (
            <span key={chip.label} style={{ fontSize:"10px", fontWeight:700, padding:"3px 9px",
              borderRadius:"20px", background:chip.bg, color:chip.color,
              border:`1px solid ${chip.border}` }}>
              {chip.label}
            </span>
          ))}
        </div>
      </div>

      {/* Row 1: Nutrition (2/3) + Weight (1/3) */}
      <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:"10px", marginBottom:"10px", minWidth:0 }}>

        {/* Nutrition card */}
        <DarkCard>
          {cardHeader("var(--accent-soft)", "Today's Nutrition", "Open", "var(--accent)")}
          <div style={{ display:"flex", alignItems:"center", gap:"14px" }}>
            {/* Ring */}
            <div style={{ position:"relative", flexShrink:0, width:"72px", height:"72px" }}>
              <svg viewBox="0 0 72 72" style={{ width:"72px", height:"72px", transform:"rotate(-90deg)" }}>
                <circle cx="36" cy="36" r={R} fill="none" strokeWidth="5.5" stroke="var(--surface-3)" />
                <circle cx="36" cy="36" r={R} fill="none" strokeWidth="5.5" stroke="var(--accent)"
                  strokeLinecap="round"
                  strokeDasharray={`${ringPct * CIRC} ${CIRC}`} />
              </svg>
              <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column",
                alignItems:"center", justifyContent:"center", lineHeight:1 }}>
                <span style={{ fontSize:"13px", fontWeight:700, color:"var(--text-1)" }}>{consumed}</span>
                <span style={{ fontSize:"8px", color:"var(--text-3)", marginTop:"2px" }}>/ {calorieGoal}</span>
              </div>
            </div>
            {/* Macro bars */}
            <div style={{ flex:1 }}>
              <div style={{ fontSize:"9px", fontWeight:600, color:"var(--accent)",
                background:"var(--accent-soft)", padding:"3px 7px", borderRadius:"6px",
                display:"inline-block", marginBottom:"7px" }}>
                360 kcal remaining
              </div>
              {[
                { label:"Protein", val:142, goal:180, pct:79,  color:"var(--macro-protein)" },
                { label:"Carbs",   val:210, goal:250, pct:84,  color:"var(--macro-carbs)" },
                { label:"Fat",     val:58,  goal:65,  pct:89,  color:"var(--macro-fat)" },
              ].map(m => (
                <div key={m.label} style={{ marginBottom:"5px" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"2px" }}>
                    <span style={{ fontSize:"9px", fontWeight:500, color:"var(--text-2)" }}>{m.label}</span>
                    <span style={{ fontSize:"9px", color:"var(--text-3)" }}>{m.val}/{m.goal}g</span>
                  </div>
                  <div style={{ height:"4px", background:"var(--surface-3)", borderRadius:"4px" }}>
                    <div style={{ height:"100%", width:`${m.pct}%`, background:m.color, borderRadius:"4px" }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </DarkCard>

        {/* Weight card */}
        <DarkCard>
          {cardHeader("var(--accent-soft)", "Body Weight", "Log", "var(--accent)")}
          <div style={{ fontSize:"26px", fontWeight:700, color:"var(--text-1)", lineHeight:1 }}>
            78.5<span style={{ fontSize:"12px", color:"var(--text-3)", fontWeight:500 }}> kg</span>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:"5px", marginTop:"4px" }}>
            <span style={{ fontSize:"10px", fontWeight:600, color:"var(--status-success)" }}>↓ −0.3 kg</span>
            <span style={{ fontSize:"10px", color:"var(--text-3)" }}>Yesterday</span>
          </div>
          <svg viewBox={`0 0 ${SW} ${SH}`} style={{ width:"100%", height:`${SH}px`, marginTop:"8px" }}>
            <defs>
              <linearGradient id="previewSparkGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="var(--accent)" stopOpacity="0.18" />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity="0"    />
              </linearGradient>
            </defs>
            <polygon points={sparkArea} fill="url(#previewSparkGrad)" />
            <polyline points={sparkPts} fill="none" stroke="var(--accent)"
              strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
          </svg>
        </DarkCard>
      </div>

      {/* Row 2: Tasks + Workout */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px", minWidth:0 }}>

        {/* Tasks card */}
        <DarkCard>
          {cardHeader("var(--accent-soft)", "Today's Tasks", "Open", "var(--accent)")}
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:"5px" }}>
            <div>
              <span style={{ fontSize:"22px", fontWeight:700, color:"var(--text-1)" }}>3</span>
              <span style={{ fontSize:"10px", color:"var(--text-3)", marginLeft:"4px" }}>/ 6 done</span>
            </div>
            <span style={{ fontSize:"10px", fontWeight:600, color:"var(--accent)" }}>50%</span>
          </div>
          <div style={{ height:"4px", background:"var(--surface-3)", borderRadius:"4px", marginBottom:"8px" }}>
            <div style={{ height:"100%", width:"50%", background:"var(--accent)", borderRadius:"4px" }} />
          </div>
          {[
            { title:"Review PRD document", p:"high",   pc:"var(--status-danger)", pb:"color-mix(in srgb, var(--status-danger) 12%, transparent)" },
            { title:"Ship v2 feature",     p:"high",   pc:"var(--status-danger)", pb:"color-mix(in srgb, var(--status-danger) 12%, transparent)" },
            { title:"Update docs",         p:"medium", pc:"var(--status-warning)", pb:"color-mix(in srgb, var(--status-warning) 12%, transparent)" },
          ].map((task, i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:"7px",
              padding:"4px 7px", background:"var(--surface-2)", borderRadius:"6px", marginBottom:"3px" }}>
              <div style={{ width:"9px", height:"9px", borderRadius:"50%",
                border:"1.5px solid var(--border)", flexShrink:0 }} />
              <span style={{ flex:1, fontSize:"9px", color:"var(--text-2)",
                overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                {task.title}
              </span>
              <span style={{ fontSize:"8px", fontWeight:700, padding:"1px 5px",
                borderRadius:"4px", background:task.pb, color:task.pc,
                textTransform:"uppercase", flexShrink:0 }}>{task.p}</span>
            </div>
          ))}
        </DarkCard>

        {/* Workout card */}
        <DarkCard>
          {cardHeader("var(--accent-soft)", "Workout", "View", "var(--accent)",
            <span style={{ fontSize:"9px", fontWeight:700, padding:"2px 6px",
              borderRadius:"6px", background:"var(--accent-soft)", color:"var(--accent)" }}>
              7d
            </span>
          )}
          <div style={{ display:"flex", alignItems:"center", gap:"6px", marginBottom:"7px" }}>
            <span style={{ fontSize:"9px", fontWeight:700, padding:"2px 7px",
              borderRadius:"6px", background:"var(--accent-soft)", color:"var(--accent)" }}>
              Trained today
            </span>
            <span style={{ fontSize:"9px", color:"var(--text-3)" }}>55 min</span>
          </div>
          {["Bench Press · 4 sets","Pull-ups · 3 sets","Squat · 4 sets"].map((ex, i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:"7px",
              padding:"4px 7px", background:"var(--surface-2)", borderRadius:"6px", marginBottom:"3px" }}>
              <div style={{ width:"5px", height:"5px", borderRadius:"50%",
                background:"var(--accent)", flexShrink:0 }} />
              <span style={{ fontSize:"9px", color:"var(--text-2)" }}>{ex}</span>
            </div>
          ))}
          {/* Frequency bars */}
          <div style={{ marginTop:"8px", paddingTop:"8px",
            borderTop:"1px solid var(--border-subtle)" }}>
            <span style={{ fontSize:"8px", fontWeight:500, color:"var(--text-3)",
              textTransform:"uppercase", letterSpacing:"0.05em" }}>Last 7 days</span>
            <svg viewBox="0 0 119 38" style={{ width:"100%", height:"38px", marginTop:"3px" }}>
              {wkDays.map((dur, i) => {
                const bH = dur > 0 ? Math.max(6, (dur / wkMax) * 24) : 3;
                const x  = i * 17;
                return (
                  <g key={i}>
                    <rect x={x} y={24-bH} width={12} height={bH} rx="2.5"
                      fill={dur > 0 ? "var(--accent)" : "var(--surface-3)"} />
                    <text x={x+6} y={36} textAnchor="middle"
                      style={{ fontSize:"7px", fill:"var(--text-3)" }}>{wkLabels[i]}</text>
                  </g>
                );
              })}
            </svg>
          </div>
        </DarkCard>
      </div>
    </div>
  );
}

// ── Animated counter ─────────────────────────────────────────────────────────
function Counter({ to, suffix = "" }: { to: number; suffix?: string }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = Math.ceil(to / 40);
    const t = setInterval(() => {
      start += step;
      if (start >= to) { setVal(to); clearInterval(t); }
      else setVal(start);
    }, 30);
    return () => clearInterval(t);
  }, [to]);
  return <span>{val.toLocaleString()}{suffix}</span>;
}

const features = [
  { icon: CheckCircle2, title: "Smart Task Management", desc: "Daily & weekly to-dos organized by project. One tap to complete. Zero friction." },
  { icon: Dumbbell, title: "Workout Logger", desc: "Log every set, rep, and weight. kg, lbs, or bodyweight. Built for real athletes." },
  { icon: Camera, title: "AI Meal Scanner", desc: "Snap a photo of your food. Our best AI model estimates all macros instantly." },
  { icon: Brain, title: "AI Workout Analysis", desc: "Get a personalized coach report after every session — intensity, wins, improvements." },
  { icon: BarChart3, title: "Nutrition Tracking", desc: "Set macro goals. Log meals. Watch your daily calories, protein, carbs and fat." },
  { icon: TrendingUp, title: "Progress Over Time", desc: "Body weight trends, workout history, and nutrition patterns all in one place." },
];

const stats = [
  { value: 100, suffix: "%", label: "Free forever" },
  { value: 3, suffix: " apps", label: "Replaced by one" },
  { value: 0, suffix: " ads", label: "Ever, period" },
];

const testimonials = [
  { name: "Priya M.", role: "Product Manager", avatar: "P", color: "bg-violet-500", text: "DailyOS replaced my task app, gym tracker, and MyFitnessPal. It's the only app I open every morning." },
  { name: "Rahul K.", role: "Software Engineer", avatar: "R", color: "bg-blue-500", text: "The AI workout summary actually coaches me. It told me my pull-day volume was low before I even noticed." },
  { name: "Ananya S.", role: "Fitness Coach", avatar: "A", color: "bg-emerald-500", text: "I snap a photo of my meal and get macros in 3 seconds. My clients are obsessed with this feature." },
];

export default function LandingPage() {
  const { data: session } = useSession();
  const { resolvedTheme } = useTheme();
  const [scrolled, setScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const logoSrc = mounted && resolvedTheme === "dark"
    ? "/BrandLogo_Header_DarkMode.png"
    : "/BrandLogo_Header.png";

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: "var(--surface-1)", color: "var(--text-1)" }}>

      {/* ── Nav ── */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "backdrop-blur-xl shadow-sm border-b" : ""}`}
        style={{
          background: scrolled ? "color-mix(in srgb, var(--surface-0) 92%, transparent)" : "transparent",
          borderColor: scrolled ? "var(--border)" : "transparent",
        }}
      >
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Image src={logoSrc} alt="DailyOS" width={32} height={32} className="rounded-xl" />
            <span className="font-display font-extrabold text-[var(--text-1)] dark:text-white text-xl tracking-tight">DailyOS</span>
          </div>
          <div className="flex items-center gap-3">
            {session ? (
              <Link href="/dashboard" className="btn-primary text-sm flex items-center gap-1.5">
                Dashboard <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <>
                <button onClick={() => signIn("google", { callbackUrl: "/dashboard" })} className="text-[var(--text-3)] hover:text-[var(--text-1)] font-medium text-sm transition-colors hidden sm:block">
                  Sign in
                </button>
                <button onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
                  className="btn-primary text-sm">
                  Get started free
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative pt-24 pb-12 px-5 overflow-hidden">
        <div className="max-w-5xl mx-auto text-center">
          <div className="text-xs font-semibold mb-3 animate-rise" style={{ color: "var(--text-3)" }}>
            TASKS · TRAINING · NUTRITION
          </div>

          <h1 className="font-display text-[34px] leading-tight sm:text-[42px] font-semibold text-[var(--text-1)] mb-4 animate-rise" style={{ animationDelay: "40ms" }}>
            DailyOS
          </h1>

          <p className="text-base text-[var(--text-2)] max-w-xl mx-auto mb-7 leading-relaxed animate-rise" style={{ animationDelay: "100ms" }}>
            Plan your day, record your training, and track nutrition in one workspace.
          </p>

          <div className="flex flex-col sm:flex-row gap-2 justify-center animate-rise" style={{ animationDelay: "160ms" }}>
            <button
              onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
              className="btn-primary group inline-flex items-center justify-center gap-2 text-sm"
            >
              <svg className="w-4 h-4 bg-white rounded-full p-0.5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>
            <a href="#features" className="btn-secondary inline-flex items-center justify-center gap-2 text-sm">
              See features <ChevronRight className="w-4 h-4" />
            </a>
          </div>
          <p className="mt-3 text-xs text-[var(--text-3)] animate-rise" style={{ animationDelay: "220ms" }}>Free to use · No credit card</p>
        </div>

        {/* ── App Preview ── */}
        <div className="max-w-4xl mx-auto mt-10 animate-slide-up" style={{ animationDelay: "200ms" }}>
          <div className="relative rounded-xl overflow-hidden"
            style={{ border: "1px solid var(--border)" }}>
            <DarkAppPreview />
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="py-10 px-5 border-y" style={{ background: "var(--surface-0)", borderColor: "var(--border)" }}>
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-3 gap-3 sm:gap-5">
            {stats.map((s) => (
              <div
                key={s.label}
                className="border-r last:border-r-0 px-3 py-4 text-center"
                style={{ borderColor: "var(--border)" }}
              >
                <p className="font-display text-2xl sm:text-3xl font-semibold leading-none mb-1.5" style={{ color: "var(--text-1)" }}>
                  <Counter to={s.value} suffix={s.suffix} />
                </p>
                <p className="text-[11px] sm:text-sm font-medium" style={{ color: "var(--text-2)" }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-16 px-5" style={{ background: "var(--surface-0)" }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "var(--accent)" }}>Features</p>
            <h2 className="font-display text-3xl sm:text-[34px] font-semibold text-[var(--text-1)] mb-3">
              Everything for today
            </h2>
            <p className="text-base text-[var(--text-2)] max-w-xl mx-auto">
              A focused place for the tasks, training, and meals you want to keep track of.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 stagger">
            {features.map((f, i) => (
              <div key={f.title} className="card-hover animate-slide-up group" style={{animationDelay:`${i*60}ms`}}>
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 transition-transform duration-200 group-hover:scale-105" style={{ background: "var(--accent-soft)" }}>
                  <f.icon className="w-5 h-5" style={{ color: "var(--accent)" }} />
                </div>
                <h3 className="font-bold text-[var(--text-1)] dark:text-white mb-2 text-base">{f.title}</h3>
                <p className="text-sm text-[var(--text-2)] dark:text-[var(--text-2)] leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="py-24 px-5" style={{ background: "var(--surface-1)" }}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "var(--accent)" }}>Workflow</p>
            <h2 className="font-display text-3xl sm:text-[34px] font-semibold text-[var(--text-1)]">A simple daily workflow</h2>
          </div>
          <WorkflowCards
            items={[
              { step: "01", icon: CheckCircle2, iconClass: "text-accent bg-accent-soft", title: "Plan your day", desc: "Add tasks under projects. Switch between daily and weekly views. Tap to complete." },
              { step: "02", icon: Dumbbell, iconClass: "text-[var(--status-info)] bg-surface-tertiary", title: "Log your workout", desc: "Add exercises, sets, reps, weights. Save it. Hit AI Summary for a coach report." },
              { step: "03", icon: Utensils, iconClass: "text-[var(--status-success)] bg-surface-tertiary", title: "Track your nutrition", desc: "Snap a meal photo or log manually. Watch your macros fill up throughout the day." },
            ]}
          />
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="py-16 px-5" style={{ background: "var(--surface-0)" }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <div className="flex items-center justify-center gap-1 mb-4">
              {[1,2,3,4,5].map(i => <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />)}
            </div>
            <h2 className="font-display text-3xl sm:text-[34px] font-semibold text-[var(--text-1)]">From DailyOS users</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {testimonials.map((t) => (
              <div key={t.name} className="card-hover">
                <p className="text-sm text-[var(--text-3)] dark:text-[var(--text-2)] leading-relaxed mb-5">&quot;{t.text}&quot;</p>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full ${t.color} flex items-center justify-center text-white font-bold text-sm`}>{t.avatar}</div>
                  <div>
                    <p className="text-sm font-bold text-[var(--text-1)] dark:text-white">{t.name}</p>
                    <p className="text-xs text-[var(--text-2)]">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-16 px-5 relative overflow-hidden border-t" style={{ background: "var(--surface-2)", borderColor: "var(--border)" }}>
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-display text-3xl sm:text-[34px] font-semibold mb-4" style={{ color: "var(--text-1)" }}>
            Make today easier to manage
          </h2>
          <p className="text-base mb-7 leading-relaxed" style={{ color: "var(--text-2)" }}>
            Keep tasks, training, and nutrition in one place.
          </p>
          <button
            onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
            className="btn-primary group inline-flex items-center gap-2 text-sm"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Get started — it's free
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </button>
          <p className="mt-4 text-sm" style={{ color: "var(--text-3)" }}>Add to iPhone home screen · Works offline</p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="py-8 px-5 text-center text-sm" style={{ background: "var(--surface-1)", color: "var(--text-3)", borderTop: "1px solid var(--border-subtle)" }}>
        <div className="flex items-center justify-center gap-2 mb-2">
          <Image src={logoSrc} alt="DailyOS" width={24} height={24} className="rounded-md" />
          <span className="font-bold" style={{ color: "var(--text-1)" }}>DailyOS</span>
        </div>
        <p>© {new Date().getFullYear()} DailyOS · Built for people who do the work.</p>
      </footer>
    </div>
  );
}
