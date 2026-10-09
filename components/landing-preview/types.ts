/**
 * components/landing-preview/types.ts
 *
 * Types for the SATAT Landing Page Design Playground.
 */

export type PreviewTheme = "light" | "dark";

export interface ColorSwatch {
  name: string;
  role: string;
  hex: string;
  category: "foundation" | "brand" | "accent" | "text" | "border" | "semantic";
  description: string;
}

export interface TypeSpec {
  name: string;
  tag: string;
  size: string;
  weight: string;
  lineHeight: string;
  tracking: string;
  sampleText: string;
  usage: string;
}

export type ButtonVariant = "primary" | "secondary" | "tertiary" | "ghost" | "dark";
export type ButtonState = "default" | "hover" | "active" | "focus" | "disabled";

export type CardVariant = "standard" | "elevated" | "subtle" | "glass" | "dark" | "product";

