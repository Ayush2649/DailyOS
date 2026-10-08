"use client";

import React from "react";
import Link from "next/link";
import { ArrowUpRight, Dumbbell, Utensils, CheckSquare, Sparkles } from "lucide-react";
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
            ? "bg-brand text-black hover:opacity-90 shadow-sm"
            : "border text-primary hover:bg-white/5"
        }`}
        style={
          action.primary
            ? { backgroundColor: "var(--satat-brand, #6E8BFF)", color: "#000000" }
            : { borderColor: "var(--border, rgba(255,255,255,0.08))", color: "var(--text-primary)" }
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
          ? "bg-brand text-black hover:opacity-90 shadow-sm"
          : "border text-primary hover:bg-white/5"
      }`}
      style={
        action.primary
          ? { backgroundColor: "var(--satat-brand, #6E8BFF)", color: "#000000" }
          : { borderColor: "var(--border, rgba(255,255,255,0.08))", color: "var(--text-primary)" }
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
        return <Sparkles className="w-3.5 h-3.5 text-brand" />;
    }
  };

  return (
    <div
      className="mt-3 p-3.5 rounded-xl border select-none transition-all"
      style={{
        background: "var(--surface-elevated, #14171A)",
        borderColor: "var(--border, rgba(255, 255, 255, 0.08))",
      }}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <div
          className="w-5 h-5 rounded-md flex items-center justify-center shrink-0"
          style={{ background: "rgba(110, 139, 255, 0.12)" }}
        >
          {getCategoryIcon()}
        </div>
        <span
          className="text-[10px] font-bold uppercase tracking-wider"
          style={{ color: "var(--satat-brand, #6E8BFF)" }}
        >
          {recommendation.category} Recommendation
        </span>
      </div>

      <div className="space-y-1">
        <h4 className="text-sm font-semibold" style={{ color: "var(--text-primary, #F2F3F0)" }}>
          {recommendation.title}
        </h4>
        {recommendation.subtitle && (
          <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary, #AEB3B0)" }}>
            {recommendation.subtitle}
          </p>
        )}
      </div>

      {recommendation.details && recommendation.details.length > 0 && (
        <ul className="mt-2 space-y-1 text-xs" style={{ color: "var(--text-muted, #7F8682)" }}>
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
        background: "var(--surface-elevated, #14171A)",
        borderColor: "var(--border, rgba(255, 255, 255, 0.08))",
      }}
    >
      <div className="flex items-center gap-2">
        <div
          className="w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: "var(--satat-brand, #6E8BFF)" }}
        />
        <span
          className="text-[10px] font-bold uppercase tracking-wider"
          style={{ color: "var(--satat-brand, #6E8BFF)" }}
        >
          Orbit Insight · {insight.category}
        </span>
      </div>

      <h4 className="text-xs font-semibold" style={{ color: "var(--text-primary, #F2F3F0)" }}>
        {insight.title}
      </h4>

      <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary, #AEB3B0)" }}>
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

