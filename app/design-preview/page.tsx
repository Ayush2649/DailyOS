import type { Metadata } from "next";
import { PreviewShell } from "@/components/landing-preview/PreviewShell";

export const metadata: Metadata = {
  title: "SATAT — Design Playground (Phase 1)",
  description: "Exploration sandbox for SATAT's new landing-page visual language, typography, colors, cards, and motion.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function DesignPreviewPage() {
  return <PreviewShell />;
}

