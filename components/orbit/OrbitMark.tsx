"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface OrbitIconProps {
  size?: number;
  className?: string;
  animated?: boolean;
}

/**
 * OrbitMark / OrbitIcon — The proprietary visual identity mark for SATAT Orbit.
 * 
 * Concept: "Intelligent Continuous Motion"
 * 
 * A single, unbroken continuous form marrying a sharp 40° ascending linear vector
 * with an expansive orbital sweep and an inner forward-pointing guidance terminal.
 * 
 * Core Design Principles:
 * - Single continuous path (unbroken flow: सतत)
 * - Asymmetrical, directional momentum (forward personal trajectory & growth)
 * - Fluid orbital arc (cyclical consistency, companion relationship, guidance)
 * - Strictly non-circular (no concentric rings, no central dot/bullseye, no spinner)
 * - Zero generic AI tropes (no sparkles, robots, knots, brains, or brand clones)
 * - Pure vector geometry, scales razor-sharp from 14px to 96px+ in dark and light modes
 */
export function OrbitIcon({ size = 20, className, animated = false }: OrbitIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(
        "shrink-0 select-none",
        animated && "animate-[spin_4s_linear_infinite]",
        className
      )}
      aria-hidden="true"
    >
      <path
        d="M 4 19.5 L 14.2 4.5 C 17.2 3.1 20.5 5.3 20.2 9.3 C 19.5 14.8 15 19.5 9.8 19.5 C 6.2 19.5 4.8 16.8 6.5 13.8 C 8.2 10.8 12 9.8 16 10.5"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Canonical export and backwards compatibility aliases
export const OrbitMark = OrbitIcon;
export default OrbitIcon;
