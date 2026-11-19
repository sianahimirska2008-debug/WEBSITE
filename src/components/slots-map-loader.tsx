"use client";

import dynamic from "next/dynamic";

/** Leaflet touches `window`, so the map is only rendered in the browser. */
export const SlotsMapLoader = dynamic(() => import("./slots-map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[70vh] min-h-[420px] items-center justify-center rounded-[var(--radius-card)] border border-line bg-sage-light text-sm text-ink-muted">
      Loading map…
    </div>
  ),
});
