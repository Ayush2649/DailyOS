"use client";
import { useRef, useState, useEffect } from "react";
import { cn } from "@/lib/utils";

export interface WorkflowItem {
  step: string;
  icon: React.ElementType;
  iconClass: string;
  title: string;
  desc: string;
}

export default function WorkflowCards({ items }: { items: WorkflowItem[] }) {
  const [inView, setInView] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Reveal with a staggered entrance once the section scrolls into view
  // (gives touch devices motion, since they never fire hover).
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    // Already in viewport on mount? Reveal right away.
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      setInView(true);
      return;
    }
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          obs.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" },
    );
    obs.observe(el);
    // Safety net: never leave the cards stuck invisible if the observer misfires.
    const fallback = setTimeout(() => setInView(true), 2000);
    return () => { obs.disconnect(); clearTimeout(fallback); };
  }, []);

  return (
    <div ref={wrapRef} className="grid grid-cols-1 sm:grid-cols-3 gap-6">
      {items.map((item, i) => (
        <SpotlightTiltCard key={item.step} item={item} index={i} inView={inView} />
      ))}
    </div>
  );
}

function SpotlightTiltCard({ item, index, inView }: { item: WorkflowItem; index: number; inView: boolean }) {
  const innerRef = useRef<HTMLDivElement>(null);
  const [glow, setGlow] = useState({ x: 0, y: 0, active: false });
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });
  const Icon = item.icon;

  const handleMove = (e: React.MouseEvent) => {
    const el = innerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    setGlow({ x, y, active: true });
    // Lean toward the cursor (max ~9°)
    setTilt({ rx: -((y / r.height) - 0.5) * 1.5, ry: ((x / r.width) - 0.5) * 1.5 });
  };

  const handleLeave = () => {
    setGlow((g) => ({ ...g, active: false }));
    setTilt({ rx: 0, ry: 0 });
  };

  return (
    // Outer: perspective + scroll-reveal entrance (no rotation here, so it never fights the tilt)
    <div
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      className="group"
      style={{
        perspective: "none",
        opacity: inView ? 1 : 0,
        transition: "opacity 0.15s ease",
        transitionDelay: inView ? `${index * 40}ms` : "0ms",
      }}
    >
      {/* Inner: the tilting card */}
      <div
        ref={innerRef}
        className="relative rounded-2xl p-6 text-center will-change-transform"
        style={{
          background: "var(--surface-0)",
          border: "1px solid var(--border)",
          transform: `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`,
          transition: "transform 0.15s ease, border-color 0.15s ease",
          borderColor: glow.active ? "var(--accent-glow)" : "var(--border)",
          boxShadow: "none",
        }}
      >
        {/* Warm coral spotlight that follows the cursor */}
        <div
          className="pointer-events-none absolute inset-0 rounded-2xl transition-opacity duration-300"
          style={{
            opacity: glow.active ? 1 : 0,
            background: "var(--accent-soft)",
          }}
        />

        {/* Content — lifted in 3D for depth */}
        <div className="relative" style={{ transform: "translateZ(40px)" }}>
          <div className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center mx-auto mb-4",
            item.iconClass,
          )}>
            <Icon className="w-5 h-5" />
          </div>
          <span className="text-xs font-black tracking-widest" style={{ color: "var(--text-3)" }}>{item.step}</span>
          <h3 className="font-display font-bold text-lg mt-1 mb-2" style={{ color: "var(--text-1)" }}>{item.title}</h3>
          <p className="text-sm leading-relaxed" style={{ color: "var(--text-2)" }}>{item.desc}</p>
        </div>
      </div>
    </div>
  );
}
