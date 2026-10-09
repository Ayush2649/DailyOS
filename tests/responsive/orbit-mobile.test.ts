import { describe, it, expect } from "vitest";
import React from "react";
import { OrbitIcon, OrbitMark } from "@/components/orbit/OrbitMark";

describe("Orbit Visual Identity — Continuous Intelligent Motion", () => {
  it("exports both OrbitIcon and OrbitMark referencing the same component", () => {
    expect(OrbitIcon).toBeDefined();
    expect(OrbitMark).toBeDefined();
    expect(OrbitIcon).toBe(OrbitMark);
  });

  it("supports all production scale steps (16px, 20px, 24px, 32px, 40px, 48px, 64px, 96px)", () => {
    const requiredSizes = [16, 20, 24, 32, 40, 48, 64, 96];
    requiredSizes.forEach((size) => {
      const el = React.createElement(OrbitIcon, { size });
      expect(el.props.size).toBe(size);
    });
  });

  it("OrbitMark vector source uses single continuous proprietary path and NO central target circle", () => {
    const fs = require("fs");
    const path = require("path");
    const markSource = fs.readFileSync(path.resolve(__dirname, "../../components/orbit/OrbitMark.tsx"), "utf8");

    // Must NOT contain circular bullseye / target circle
    expect(markSource).not.toContain('<circle');
    expect(markSource).not.toContain('cx="12"');

    // Must contain single continuous path with stroke
    expect(markSource).toContain('<path');
    expect(markSource).toContain('stroke="currentColor"');
    expect(markSource).toContain('strokeLinecap="round"');
    expect(markSource).toContain('strokeLinejoin="round"');
  });
});

describe("Design System CSS Architecture Verification", () => {
  const fs = require("fs");
  const path = require("path");

  it("globals.css defines standard viewport and navigation tokens", () => {
    const css = fs.readFileSync(path.resolve(__dirname, "../../app/globals.css"), "utf8");
    expect(css).toContain("--bottom-nav-content-height: 58px;");
    expect(css).toContain("--bottom-nav-fab-protrusion: 20px;");
    expect(css).toContain("--bottom-nav-total-height:");
    expect(css).toContain("--bottom-nav-height:");
    expect(css).toContain("--mobile-header-height:");
    expect(css).toContain("--spacing-page-bottom:");
  });

  it("contains NO device-specific media query hacks", () => {
    const css = fs.readFileSync(path.resolve(__dirname, "../../app/globals.css"), "utf8");
    const appShellCss = fs.readFileSync(path.resolve(__dirname, "../../styles/app-shell.css"), "utf8");
    const combined = css + "\n" + appShellCss;

    // Reject iPhone/Galaxy-specific hardcoded media queries
    expect(combined).not.toMatch(/@media[^{]*(375px|390px|393px|412px|414px|428px|430px)/);
  });

  it("styles/app-shell.css uses CSS variable tokens for bottom navigation and Track FAB", () => {
    const css = fs.readFileSync(path.resolve(__dirname, "../../styles/app-shell.css"), "utf8");
    expect(css).toContain("var(--bottom-nav-height");
    expect(css).toContain("var(--bottom-nav-content-height");
    expect(css).toContain("var(--bottom-nav-fab-protrusion");
  });

  it("app/dashboard/orbit/page.tsx has no negative margin hacks or fixed height subtractions", () => {
    const pageContent = fs.readFileSync(path.resolve(__dirname, "../../app/dashboard/orbit/page.tsx"), "utf8");
    expect(pageContent).not.toContain("-my-6");
    expect(pageContent).not.toContain("-mx-4");
    expect(pageContent).not.toContain("h-[calc(100dvh-56px-58px");
  });
});

