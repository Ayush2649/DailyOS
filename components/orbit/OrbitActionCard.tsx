"use client";

import React from "react";
import Link from "next/link";
import { ArrowUpRight, Dumbbell, Utensils, CheckSquare } from "lucide-react";
import { OrbitMark } from "@/components/orbit/OrbitMark";
import type { OrbitAction, OrbitInsight, OrbitRecommendation } from "@/types/orbit";

interface ActionButtonProps {
  action: OrbitAction;
  onExecute?: (action: OrbitAction) => void;
}

function ActionButton({ action, onExecute }: ActionButtonProps) {
  const content = (
    <>
      <span>{action.label}</span>
      <ArrowUpRight className="w-3.5 h-3.5 opacity-70" />
    </>
  );

  const baseClasses =
    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all select-none active:scale-95";

  if (action.href) {
    return (
      <Link
        href={action.href}
        className={`${baseClasses} ${
          action.primary
            ? "shadow-sm hover:opacity-90"
            : "border hover:bg-white/5"
        }`}
        style={
          action.primary
            ? { backgroundColor: "var(--brand)", color: "var(--brand-text)" }
            : { borderColor: "var(--border)", color: "var(--text-primary)" }
        }
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onExecute?.(action)}
      className={`${baseClasses} ${
        action.primary
          ? "shadow-sm hover:opacity-90"
          : "border hover:bg-white/5"
      }`}
      style={
        action.primary
          ? { backgroundColor: "var(--brand)", color: "var(--brand-text)" }
          : { borderColor: "var(--border)", color: "var(--text-primary)" }
      }
    >
      {content}
    </button>
  );
}

interface OrbitRecommendationCardProps {
  recommendation: OrbitRecommendation;
  onExecuteAction?: (action: OrbitAction) => void;
}

export function OrbitRecommendationCard({
  recommendation,
  onExecuteAction,
}: OrbitRecommendationCardProps) {
  const getCategoryIcon = () => {
    switch (recommendation.category) {
      case "workout":
        return <Dumbbell className="w-3.5 h-3.5 text-brand" />;
      case "nutrition":
        return <Utensils className="w-3.5 h-3.5 text-brand" />;
      case "tasks":
        return <CheckSquare className="w-3.5 h-3.5 text-brand" />;
      default:
        return <OrbitMark size={14} className="text-brand" />;
    }
  };

  return (
    <div
      className="mt-3 p-3.5 rounded-xl border select-none transition-all"
      style={{
        background: "var(--surface-elevated)",
        borderColor: "var(--border)",
      }}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <div
          className="w-5 h-5 rounded-md flex items-center justify-center shrink-0"
          style={{ background: "var(--brand-subtle)" }}
        >
          {getCategoryIcon()}
        </div>
        <span
          className="text-[10px] font-bold uppercase tracking-wider"
          style={{ color: "var(--brand)" }}
        >
          {recommendation.category} Recommendation
        </span>
      </div>

      <div className="space-y-1">
        <h4 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          {recommendation.title}
        </h4>
        {recommendation.subtitle && (
          <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            {recommendation.subtitle}
          </p>
        )}
      </div>

      {recommendation.details && recommendation.details.length > 0 && (
        <ul className="mt-2 space-y-1 text-xs" style={{ color: "var(--text-muted)" }}>
          {recommendation.details.map((d, idx) => (
            <li key={idx} className="flex items-start gap-1.5">
              <span className="w-1 h-1 rounded-full bg-brand mt-1.5 shrink-0" />
              <span>{d}</span>
            </li>
          ))}
        </ul>
      )}

      {recommendation.actions && recommendation.actions.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {recommendation.actions.map((act) => (
            <ActionButton key={act.id} action={act} onExecute={onExecuteAction} />
          ))}
        </div>
      )}
    </div>
  );
}

interface OrbitInsightCardProps {
  insight: OrbitInsight;
  onExecuteAction?: (action: OrbitAction) => void;
}

export function OrbitInsightCard({ insight, onExecuteAction }: OrbitInsightCardProps) {
  return (
    <div
      className="p-3.5 rounded-xl border space-y-2 select-none"
      style={{
        background: "var(--surface-elevated)",
        borderColor: "var(--border)",
      }}
    >
      <div className="flex items-center gap-2">
        <div
          className="w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: "var(--brand)" }}
        ></div>
        <span
          className="text-[10px] font-bold uppercase tracking-wider"
          style={{ color: "var(--brand)" }}
        >
          Orbit Insight : {insight.category}
        </span>
      </div>

      <h4 className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
        {insight.title}
      </h4>

      <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
        {insight.content}
      </p>

      {insight.action && (
        <div className="pt-1">
          <ActionButton action={insight.action} onExecute={onExecuteAction} />
        </div>
      )}
    </div>
  );
}

