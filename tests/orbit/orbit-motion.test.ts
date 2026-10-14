import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import fs from "fs";
import path from "path";
import { OrbitMark, OrbitIcon, type OrbitState } from "@/components/orbit/OrbitMark";

describe("Orbit AI Celestial Animation System", () => {
  it("renders with default state 'idle' and proper aria attributes", () => {
    const html = renderToStaticMarkup(React.createElement(OrbitMark));
    expect(html).toContain("orbit-mark");
    expect(html).toContain("orbit-mark--idle");
    expect(html).toContain('aria-label="Orbit AI (idle)"');
  });

  it("applies appropriate state classes across all lifecycle states", () => {
    const states: OrbitState[] = ["idle", "thinking", "responding", "success", "error"];
    for (const state of states) {
      const html = renderToStaticMarkup(React.createElement(OrbitMark, { state }));
      expect(html).toContain(`orbit-mark--${state}`);
    }
  });

  it("supports backward-compatible animated prop mapping to thinking state", () => {
    const html = renderToStaticMarkup(React.createElement(OrbitMark, { animated: true }));
    expect(html).toContain("orbit-mark--thinking");
  });

  it("renders discrete element groups for planet, stationary ring, and satellite", () => {
    const html = renderToStaticMarkup(React.createElement(OrbitMark));
    // Stationary elliptical ring
    expect(html).toContain("orbit-ring");
    expect(html).toContain("<ellipse");
    expect(html).toContain('rx="9.4"');
    expect(html).toContain('ry="4.6"');

    // Centered planet core and aura
    expect(html).toContain("orbit-core-group");
    expect(html).toContain("orbit-core");
    expect(html).toContain("orbit-aura");
    expect(html).toContain('r="3.5"');

    // Satellite group traveling along the ring
    expect(html).toContain("orbit-satellite-group");
    expect(html).toContain("orbit-satellite");
    expect(html).toContain("orbit-satellite-aura");
  });

  it("verifies globals.css defines celestial orbit animation keyframes and classes", () => {
    const css = fs.readFileSync(path.resolve(__dirname, "../../app/globals.css"), "utf8");

    // Elliptical satellite travel keyframes
    expect(css).toContain("@keyframes orbit-satellite-travel");

    // Idle planet and aura breathing
    expect(css).toContain("@keyframes orbit-planet-pulse-idle");
    expect(css).toContain("@keyframes orbit-aura-pulse-idle");

    // Thinking state acceleration
    expect(css).toContain("@keyframes orbit-planet-pulse-thinking");
    expect(css).toContain("@keyframes orbit-aura-pulse-thinking");

    // Response completion single bloom pulse
    expect(css).toContain("@keyframes orbit-aura-pulse-success");

    // State class selectors
    expect(css).toContain(".orbit-mark--idle");
    expect(css).toContain(".orbit-mark--thinking");
    expect(css).toContain(".orbit-mark--success");
    expect(css).toContain(".orbit-mark--error");

    // Reduced motion support
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).toContain(".orbit-mark .orbit-core-group");
    expect(css).toContain(".orbit-mark .orbit-satellite-group");
  });
});
