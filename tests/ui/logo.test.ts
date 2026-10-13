import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Logo } from "@/components/Logo";

describe("SATAT Centralized Logo Component", () => {
  it("renders both light and dark logo sources in auto mode with responsive theme classes", () => {
    const html = renderToStaticMarkup(React.createElement(Logo, { size: 28 }));

    // Renders light mode logo with block dark:hidden
    expect(html).toContain("satat-icon-light-512.png");
    expect(html).toContain("block dark:hidden");

    // Renders dark mode logo with hidden dark:block
    expect(html).toContain("satat-icon-512.png");
    expect(html).toContain("hidden dark:block");

    // Default alt text
    expect(html).toContain('alt="SATAT"');
  });

  it("renders only light logo when variant='light'", () => {
    const html = renderToStaticMarkup(React.createElement(Logo, { size: 32, variant: "light" }));

    expect(html).toContain("satat-icon-light-512.png");
    expect(html).not.toContain("satat-icon-512.png");
  });

  it("renders only dark logo when variant='dark'", () => {
    const html = renderToStaticMarkup(React.createElement(Logo, { size: 32, variant: "dark" }));

    expect(html).toContain("satat-icon-512.png");
    expect(html).not.toContain("satat-icon-light-512.png");
  });

  it("respects custom size and alt attributes", () => {
    const html = renderToStaticMarkup(React.createElement(Logo, { size: 48, alt: "SATAT Brand Mark" }));

    expect(html).toContain('alt="SATAT Brand Mark"');
    expect(html).toContain('width="48"');
    expect(html).toContain('height="48"');
  });
});

