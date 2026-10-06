"use client";

import React from "react";
import { signOut } from "next-auth/react";
import { ShieldAlert, LogOut, ExternalLink, HeartHandshake } from "lucide-react";
import { BRAND_NAME } from "@/lib/onboarding/constants";

export default function Under18TerminalPage() {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 sm:p-6"
      style={{ background: "var(--surface-1)" }}
    >
      <div
        className="max-w-lg w-full rounded-2xl p-6 sm:p-8 flex flex-col space-y-6 shadow-sm"
        style={{
          background: "var(--surface-0)",
          border: "1px solid var(--border)",
        }}
      >
        <div className="flex items-center space-x-3">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(255, 94, 77, 0.12)", color: "var(--accent)" }}
          >
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display" style={{ color: "var(--text-1)" }}>
              {BRAND_NAME} Adult Baseline Policy
            </h1>
            <p className="text-xs" style={{ color: "var(--text-3)" }}>
              Safety & Eligibility Notice
            </p>
          </div>
        </div>

        <div className="space-y-3 text-sm leading-relaxed" style={{ color: "var(--text-2)" }}>
          <p>
            {BRAND_NAME} is currently designed and clinically calibrated for adult metabolic baselines.
            During adolescence, healthy growth, hormone balance, and bone development require
            personalized guidance from a pediatrician or registered sports dietitian rather than
            automated adult models.
          </p>
          <p>
            To protect your health, adult onboarding and automated caloric programming cannot be
            provided for individuals under 18 years of age.
          </p>
        </div>

        <div
          className="rounded-xl p-4 space-y-2"
          style={{ background: "var(--surface-1)", border: "1px solid var(--border-subtle)" }}
        >
          <div className="flex items-center space-x-2 text-xs font-semibold" style={{ color: "var(--text-1)" }}>
            <HeartHandshake className="w-4 h-4 text-emerald-500" />
            <span>Recommended Next Steps</span>
          </div>
          <ul className="text-xs space-y-1.5 list-disc list-inside" style={{ color: "var(--text-2)" }}>
            <li>Speak with your primary healthcare provider or pediatrician.</li>
            <li>Consult a certified sports nutritionist specialized in adolescent development.</li>
            <li>Focus on joyful movement, balanced meals, and restful sleep without caloric restriction.</li>
          </ul>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-xl text-sm font-medium transition-all"
            style={{
              background: "var(--surface-2)",
              color: "var(--text-1)",
              border: "1px solid var(--border)",
            }}
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
          <a
            href="https://www.eatright.org/food/nutrition/dietary-guidelines-and-myplate"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-xl text-sm font-medium transition-all text-center"
            style={{
              background: "var(--surface-2)",
              color: "var(--text-2)",
              border: "1px solid var(--border)",
            }}
          >
            <ExternalLink className="w-4 h-4" />
            <span>Nutrition Guidelines</span>
          </a>
        </div>
      </div>
    </div>
  );
}

