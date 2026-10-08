"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface OrbitMarkProps {
  size?: number;
  className?: string;
  animated?: boolean;
}

/**
 * OrbitMark — The distinctive visual identity mark for SATAT Orbit.
 * 
 * Concept: Orbital Intelligence (Continuity + Intelligence + Guidance).
 * Features a focal luminous core encircled by dual interlocking continuous
 * orbital paths with precision guidance nodes.
 * Works seamlessly at 16px, 20px, 24px, 32px, and 48px in monochrome and cobalt.
 */
export function OrbitMark({ size = 20, className, animated = false }: OrbitMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(
        "shrink-0 select-none",
        animated && "animate-[spin_6s_linear_infinite]",
        className
      )}
      aria-hidden="true"
    >
      {/* Central Luminous Core (Intelligence & Focus) */}
      <circle
        cx="12"
        cy="12"
        r="2.6"
        fill="currentColor"
        className={animated ? "animate-pulse" : undefined}
      />

      {/* Orbit Track A: Sweeps clockwise from top-left, arches across top to mid-right */}
      <path
        d="M 6.2 7 A 8.5 8.5 0 0 1 17.8 7 A 8.5 8.5 0 0 1 19 14"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />

      {/* Orbit Track B: Sweeps clockwise from bottom-right, arches across bottom to mid-left */}
      <path
        d="M 17.8 17 A 8.5 8.5 0 0 1 6.2 17 A 8.5 8.5 0 0 1 5 10"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />

      {/* Guidance Satellite Node A */}
      <circle cx="19" cy="11.5" r="1.25" fill="currentColor" />

      {/* Guidance Satellite Node B */}
      <circle cx="5" cy="12.5" r="1.25" fill="currentColor" />
    </svg>
  );
}

export default OrbitMark;

