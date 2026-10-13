"use client";

import React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

export interface LogoProps {
  /**
   * Width and height in pixels when rendering a square container.
   * If width or height are explicitly provided, they override size.
   * Defaults to 28.
   */
  size?: number;
  width?: number;
  height?: number;
  className?: string;
  imageClassName?: string;
  alt?: string;
  priority?: boolean;
  /**
   * Theme variant:
   * - "auto" (default): CSS-driven theme responsiveness (white logo on dark background, black logo on light background)
   * - "light": forces light mode logo (black mark on light background)
   * - "dark": forces dark mode logo (white mark on dark background)
   */
  variant?: "auto" | "light" | "dark";
}

/**
 * Standard SATAT Logo Component
 * 
 * Renders the official SATAT origami-style folded ribbon mark with:
 * - White ribbon mark on dark backgrounds
 * - Black ribbon mark on light backgrounds
 * - Full aspect ratio preservation with zero distortion or cropping
 * - Zero hydration mismatch via CSS display classes matching the application theme
 */
export function Logo({
  size = 28,
  width,
  height,
  className,
  imageClassName,
  alt = "SATAT",
  priority = false,
  variant = "auto",
}: LogoProps) {
  const w = width ?? size;
  const h = height ?? size;

  // Paths to official SATAT brand mark assets
  const lightSrc = "/satat-icon-light-512.png";
  const darkSrc = "/satat-icon-512.png";

  if (variant === "light") {
    return (
      <span className={cn("inline-flex items-center justify-center shrink-0 overflow-hidden", className)}>
        <Image
          src={lightSrc}
          alt={alt}
          width={w}
          height={h}
          priority={priority}
          className={cn("object-contain rounded-md select-none", imageClassName)}
        />
      </span>
    );
  }

  if (variant === "dark") {
    return (
      <span className={cn("inline-flex items-center justify-center shrink-0 overflow-hidden", className)}>
        <Image
          src={darkSrc}
          alt={alt}
          width={w}
          height={h}
          priority={priority}
          className={cn("object-contain rounded-md select-none", imageClassName)}
        />
      </span>
    );
  }

  // "auto": Zero-hydration-mismatch CSS class-based switching responding to Tailwind's .dark class (next-themes)
  return (
    <span className={cn("inline-flex items-center justify-center shrink-0 overflow-hidden relative", className)}>
      <Image
        src={lightSrc}
        alt={alt}
        width={w}
        height={h}
        priority={priority}
        className={cn("object-contain rounded-md select-none block dark:hidden", imageClassName)}
      />
      <Image
        src={darkSrc}
        alt={alt}
        width={w}
        height={h}
        priority={priority}
        className={cn("object-contain rounded-md select-none hidden dark:block", imageClassName)}
      />
    </span>
  );
}

export default Logo;

