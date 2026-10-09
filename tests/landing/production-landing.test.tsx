import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ProductionLandingPage from "@/app/page";

// Mock next-auth/react
vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: null, status: "unauthenticated" }),
  signIn: vi.fn(),
}));

describe("Production SATAT Marketing Landing Page (Phase 2)", () => {
  it("renders all 7 narrative sections and required brand copy", () => {
    const html = renderToStaticMarkup(React.createElement(ProductionLandingPage));

    // Nav & Wordmark
    expect(html).toContain("SATAT");

    // Section 1: Hero
    expect(html).toContain("YOUR LIFE. ONE SYSTEM.");
    expect(html).toContain("Progress,");
    expect(html).toContain("made continuous.");
    expect(html).toContain("Start building consistency");
    expect(html).toContain("See how it works");

    // Section 2: Problem
    expect(html).toContain("THE FRAGMENTATION TRAP");
    expect(html).toContain("Your life is connected.");
    expect(html).toContain("Your tools shouldn&#x27;t be separate.");

    // Section 3: Connected System
    expect(html).toContain("THE UNBROKEN THREAD (सतत)");
    expect(html).toContain("Everything works better");
    expect(html).toContain("when it works together.");
    expect(html).toContain("Goals");
    expect(html).toContain("Routines");
    expect(html).toContain("Training");
    expect(html).toContain("Nutrition");
    expect(html).toContain("Recovery");
    expect(html).toContain("Progress");

    // Section 4: Dynamic Adaptation
    expect(html).toContain("DYNAMIC REBALANCING");
    expect(html).toContain("Life changes.");
    expect(html).toContain("Your plan should too.");
    expect(html).toContain("Upper Body A · 45 min");

    // Section 5: Orbit Personal Intelligence
    expect(html).toContain("CONTEXT-AWARE INTELLIGENCE");
    expect(html).toContain("Intelligence that understands");
    expect(html).toContain("your context.");
    expect(html).toContain("You trained harder than usual today.");
    expect(html).toContain("You&#x27;re 38g short on protein.");
    expect(html).toContain("Want me to adjust dinner?");

    // Section 6: Progress
    expect(html).toContain("MOMENTUM VISUALIZATION");
    expect(html).toContain("Consistency becomes visible.");
    expect(html).toContain("Not perfection. Progress.");
    expect(html).toContain("87%");
    expect(html).toContain("24 Unbroken Days");

    // Section 7: Final CTA
    expect(html).toContain("THE INVITATION");
    expect(html).toContain("Start becoming more consistent.");
    expect(html).toContain("Your goals don&#x27;t need another app.");
    expect(html).toContain("They need a system.");

    // Footer
    expect(html).toContain("Progress, made continuous.");
    expect(html).toContain("Continuous Human Improvement");
  });

  it("does NOT contain fake testimonials, fake stats, or developer links in footer", () => {
    const html = renderToStaticMarkup(React.createElement(ProductionLandingPage));

    // Confirm fake testimonials are removed
    expect(html).not.toContain("Priya M.");
    expect(html).not.toContain("Rahul K.");
    expect(html).not.toContain("Ananya S.");

    // Confirm fake stat badges are removed
    expect(html).not.toContain("100% Free forever");
    expect(html).not.toContain("0 ads Ever");

    // Confirm internal developer links are removed from footer
    expect(html).not.toContain("Design System Sandbox");
    expect(html).not.toContain("href=\"/design-system\"");
    expect(html).not.toContain("href=\"/design-preview\"");
    expect(html).not.toContain("href=\"/architecture\"");
  });

  it("verifies mobile 393px responsiveness and hero mockup smartphone proportion", () => {
    const html = renderToStaticMarkup(React.createElement(ProductionLandingPage));

    // Hero mockup smartphone chassis (~19.5:9 proportion and bounded width for mobile)
    expect(html).toContain("w-[310px] sm:w-[340px]");
    expect(html).toContain("aspect-[9/19.2]");

    // Cropped dashboard preview inside smartphone
    expect(html).toContain("Good morning,");
    expect(html).toContain("Ayush");
    expect(html).toContain("87%");
    expect(html).toContain("Upper Body A");
    expect(html).toContain("1,840");
    expect(html).toContain("Protein (142g / 180g)");

    // Routine continuity section eliminating empty space above bottom navigation
    expect(html).toContain("Routine Continuity");
    expect(html).toContain("10m Morning Mobility");
    expect(html).toContain("3L Hydration Target");

    // Consistency momentum streak element
    expect(html).toContain("Consistency Momentum");
    expect(html).toContain("24 Day Streak");

    // Dynamic Island & status bar
    expect(html).toContain("w-[110px] sm:w-[118px]");
    expect(html).toContain("9:41");
    expect(html).toContain("5G");

    // Orbit simplified conversational card (no telemetry metadata)
    expect(html).not.toContain("Session Active");
    expect(html).not.toContain("Realtime Sync");
    expect(html).toContain("Adjust dinner");
    expect(html).toContain("Not now");

    // Footer minimal public navigation
    expect(html).toContain("href=\"#system\"");
    expect(html).toContain("href=\"#adaptation\"");
    expect(html).toContain("href=\"#orbit\"");
    expect(html).toContain("href=\"/signin\"");
  });
});

