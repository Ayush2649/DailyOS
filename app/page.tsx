"use client";

import React from "react";
import LandingNav from "@/components/landing/LandingNav";
import Hero from "@/components/landing/Hero";
import ProblemSection from "@/components/landing/ProblemSection";
import ConnectedSystem from "@/components/landing/ConnectedSystem";
import AdaptationSection from "@/components/landing/AdaptationSection";
import OrbitSection from "@/components/landing/OrbitSection";
import ProgressSection from "@/components/landing/ProgressSection";
import FinalCTA from "@/components/landing/FinalCTA";
import Footer from "@/components/landing/Footer";

export default function ProductionLandingPage() {
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--text-primary)] selection:bg-[var(--brand-subtle)] selection:text-[var(--brand)]">
      {/* 1. Header Navigation */}
      <LandingNav />

      {/* 2. Editorial Hero & Living Product Visualization */}
      <Hero />

      {/* 3. The Problem — The Fragmentation Trap */}
      <ProblemSection />

      {/* 4. One Connected System — The Continuous Loop */}
      <ConnectedSystem />

      {/* 5. Dynamic Adaptation — Plan Rebalancing */}
      <AdaptationSection />

      {/* 6. Orbit — Contextual Personal Intelligence */}
      <OrbitSection />

      {/* 7. Visible Progress — Compounding Momentum */}
      <ProgressSection />

      {/* 8. Final Call to Action */}
      <FinalCTA />

      {/* 9. Minimal Premium Footer */}
      <Footer />
    </div>
  );
}
