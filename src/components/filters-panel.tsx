"use client";

import { useState } from "react";

/** On mobile the filters collapse behind a toggle; on desktop they're a sidebar. */
export function FiltersPanel({ activeCount, children }: { activeCount: number; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        type="button"
        className="btn-secondary w-full justify-between lg:hidden"
        aria-expanded={open}
        aria-controls="filters-panel"
        onClick={() => setOpen((o) => !o)}
      >
        <span>
          Filters{activeCount > 0 && <span className="ml-1.5 rounded-full bg-adam px-2 py-0.5 text-xs text-on-adam">{activeCount}</span>}
        </span>
        <svg viewBox="0 0 24 24" className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <div id="filters-panel" className={`${open ? "block" : "hidden"} card mt-3 p-5 lg:mt-0 lg:block lg:border-0 lg:bg-transparent lg:p-0`}>
        {children}
      </div>
    </div>
  );
}

export function SortSelect({ formId, value }: { formId: string; value: string }) {
  return (
    <label className="flex items-center gap-2 text-sm text-ink-muted">
      <span>Sort</span>
      <select
        name="sort"
        form={formId}
        defaultValue={value}
        onChange={() => (document.getElementById(formId) as HTMLFormElement | null)?.requestSubmit()}
        className="rounded-full border border-line-strong bg-card py-2 pl-3.5 pr-8 text-sm text-ink focus:border-adam focus:outline-none"
      >
        <option value="soonest">Soonest</option>
        <option value="price">Lowest price</option>
        <option value="discount">Biggest discount</option>
        <option value="distance">Nearest</option>
      </select>
    </label>
  );
}
