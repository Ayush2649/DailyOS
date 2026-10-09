"use client";

import React from "react";
import OrbitView from "@/components/orbit/OrbitView";

export default function OrbitPage() {
  return (
    <div className="w-full h-full flex flex-col flex-1 min-h-0 overflow-hidden">
      <OrbitView />
    </div>
  );
}
