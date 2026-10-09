import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PreviewShell } from "@/components/landing-preview/PreviewShell";
import { ColorSection } from "@/components/landing-preview/ColorSection";
import { TypographySection } from "@/components/landing-preview/TypographySection";
import { ButtonSection } from "@/components/landing-preview/ButtonSection";
import { CardSection } from "@/components/landing-preview/CardSection";
import { HeroPreview } from "@/components/landing-preview/HeroPreview";
import { ProductMockup } from "@/components/landing-preview/ProductMockup";
import { FloatingLifeCards } from "@/components/landing-preview/FloatingLifeCards";
import { OrbitPreview } from "@/components/landing-preview/OrbitPreview";
import { ContinuityLine } from "@/components/landing-preview/ContinuityLine";
import { DarkSectionPreview } from "@/components/landing-preview/DarkSectionPreview";
import { MotionLab } from "@/components/landing-preview/MotionLab";

describe("SATAT Landing Page Design Playground (Phase 1)", () => {
  it("renders PreviewShell with all required sections and controls", () => {
    const html = renderToStaticMarkup(React.createElement(PreviewShell));

    // Brand and header elements
    expect(html).toContain("SATAT");
    expect(html).toContain("Design Playground · Phase 1");

    // Sections present in DOM
    expect(html).toContain('id="section-color"');
    expect(html).toContain('id="section-typography"');
    expect(html).toContain('id="section-buttons"');
    expect(html).toContain('id="cards"');
    expect(html).toContain('id="hero"');
    expect(html).toContain('id="product-mockup"');
    expect(html).toContain('id="life-cards"');
    expect(html).toContain('id="orbit"');
    expect(html).toContain('id="continuity"');
    expect(html).toContain('id="dark-section"');
    expect(html).toContain('id="motion-lab"');
  });

  it("renders HeroPreview with exact required editorial copy and CTA pair", () => {
    const html = renderToStaticMarkup(React.createElement(HeroPreview, { theme: "light" }));

    expect(html).toContain("YOUR LIFE. ONE SYSTEM.");
    expect(html).toContain("Progress,");
    expect(html).toContain("made continuous.");
    expect(html).toContain("Satat connects your goals, routines, training");
    expect(html).toContain("Start building consistency");
    expect(html).toContain("See how it works");
  });

  it("renders ProductMockup with realistic daily metrics", () => {
    const html = renderToStaticMarkup(React.createElement(ProductMockup, { theme: "light" }));

    expect(html).toContain("Good morning, Ayush");
    expect(html).toContain("Upper Body A");
    expect(html).toContain("1,840");
    expect(html).toContain("/ 2,300 kcal");
    expect(html).toContain("87%");
    expect(html).toContain("24-Day Streak");
  });

  it("renders FloatingLifeCards with all 5 connected dimensions", () => {
    const html = renderToStaticMarkup(React.createElement(FloatingLifeCards, { theme: "light" }));

    expect(html).toContain("Lose 3 kg");
    expect(html).toContain("Upper Body A");
    expect(html).toContain("142g protein");
    expect(html).toContain("7h 42m");
    expect(html).toContain("5/6 completed");
  });

  it("renders OrbitPreview with proprietary Orbit presence and actions", () => {
    const html = renderToStaticMarkup(React.createElement(OrbitPreview, { theme: "light" }));

    expect(html).toContain("You trained harder than usual today.");
    expect(html).toContain("You&#x27;re 38g short on protein.");
    expect(html).toContain("Want me to adjust dinner?");
    expect(html).toContain("Adjust dinner");
    expect(html).toContain("Not now");
  });

  it("renders ContinuityLine with all 6 interconnected sequence nodes", () => {
    const html = renderToStaticMarkup(React.createElement(ContinuityLine, { theme: "light" }));

    expect(html).toContain("Goals");
    expect(html).toContain("Routines");
    expect(html).toContain("Training");
    expect(html).toContain("Nutrition");
    expect(html).toContain("Recovery");
    expect(html).toContain("Progress");
  });

  it("renders DarkSectionPreview with unified life operating system nodes", () => {
    const html = renderToStaticMarkup(React.createElement(DarkSectionPreview, { theme: "dark" }));

    expect(html).toContain("One system.");
    expect(html).toContain("Many parts of your life.");
    expect(html).toContain("Central Nexus");
    expect(html).toContain("#101412");
  });

  it("renders MotionLab with 10 specimens and replay controls", () => {
    const html = renderToStaticMarkup(
      React.createElement(MotionLab, {
        theme: "light",
        reducedMotion: false,
        onToggleReducedMotion: () => {},
      })
    );

    expect(html).toContain("01 · Scroll Reveal");
    expect(html).toContain("02 · Staggered Fade");
    expect(html).toContain("03 · Tactile Hover Lift");
    expect(html).toContain("04 · Button Press Physics");
    expect(html).toContain("05 · Metric Count-Up");
    expect(html).toContain("06 · Smooth Progress Fill");
    expect(html).toContain("07 · SVG Path Drawing");
    expect(html).toContain("08 · Floating Oscillation");
    expect(html).toContain("09 · Morphing State");
    expect(html).toContain("10 · Orbit Response Reveal");
  });
});

