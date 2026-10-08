"use client";

import React from "react";
import OrbitView from "@/components/orbit/OrbitView";

export default function OrbitPage() {
  return (
    <div className="h-[calc(100dvh-56px-58px-env(safe-area-inset-bottom,0px))] lg:h-[calc(100dvh-4rem)] flex flex-col -my-6 -mx-4 lg:-my-8 lg:-mx-10 overflow-hidden">
      <OrbitView />
    </div>
  );
}

