"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { CATEGORIES } from "@/lib/categories";
import { PinIcon } from "./icons";

export type FilterValues = {
  q?: string;
  area?: string;
  category?: string;
  date?: string;
  time?: string;
  maxPrice?: string;
  distance?: string;
  today?: boolean;
  lat?: string;
  lng?: string;
  view?: string;
  sort?: string;
};

type Props = {
  values: FilterValues;
  dateOptions: { value: string; label: string }[];
  formId?: string;
};

const TIMES = [
  { value: "", label: "Any time" },
  { value: "morning", label: "Morning" },
  { value: "afternoon", label: "Afternoon" },
  { value: "evening", label: "Evening" },
];

const DISTANCES = [
  { value: "", label: "Any distance" },
  { value: "1", label: "Within 1 mile" },
  { value: "2", label: "Within 2 miles" },
  { value: "3", label: "Within 3 miles" },
  { value: "5", label: "Within 5 miles" },
];

/**
 * A plain GET form, so filtering works without JavaScript. With JS, selects,
 * radios and checkboxes submit immediately; text fields submit on Enter/Apply.
 */
export function BrowseFilters({ values, dateOptions, formId = "slot-filters" }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const [locStatus, setLocStatus] = useState<string>(values.lat ? "Using your location" : "");
  const autoSubmit = () => formRef.current?.requestSubmit();

  const useMyLocation = () => {
    if (!("geolocation" in navigator)) {
      setLocStatus("Location isn't available in this browser.");
      return;
    }
    setLocStatus("Finding you…");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const f = formRef.current;
        if (!f) return;
        (f.elements.namedItem("lat") as HTMLInputElement).value = pos.coords.latitude.toFixed(5);
        (f.elements.namedItem("lng") as HTMLInputElement).value = pos.coords.longitude.toFixed(5);
        setLocStatus("Using your location");
        f.requestSubmit();
      },
      () => setLocStatus("We couldn't get your location. Distances are from central London."),
      { timeout: 10_000 },
    );
  };

  const clearHref = values.view === "map" ? "/slots?view=map" : "/slots";

  return (
    <form
      ref={formRef}
      id={formId}
      action="/slots"
      method="get"
      aria-label="Filter slots"
      className="space-y-6"
      onSubmit={(e) => {
        // Keep URLs tidy: drop empty fields (and the default sort) before the GET.
        const form = e.currentTarget;
        const toggled: (HTMLInputElement | HTMLSelectElement)[] = [];
        for (const el of Array.from(form.elements) as (HTMLInputElement | HTMLSelectElement)[]) {
          if (!el.name || el.disabled) continue;
          const isUnchecked = el instanceof HTMLInputElement && (el.type === "checkbox" || el.type === "radio") && !el.checked;
          if (!isUnchecked && (el.value === "" || (el.name === "sort" && el.value === "soonest"))) {
            el.disabled = true;
            toggled.push(el);
          }
        }
        setTimeout(() => toggled.forEach((el) => (el.disabled = false)), 0);
      }}
      onChange={(e) => {
        const t = e.target as unknown as HTMLInputElement;
        if (t.tagName === "SELECT" || t.type === "checkbox" || t.type === "radio") autoSubmit();
      }}
    >
      <input type="hidden" name="view" value={values.view ?? ""} />
      <input type="hidden" name="lat" defaultValue={values.lat ?? ""} />
      <input type="hidden" name="lng" defaultValue={values.lng ?? ""} />

      <div>
        <label htmlFor="f-q" className="label">
          Search
        </label>
        <input id="f-q" name="q" defaultValue={values.q} placeholder="Treatment or business" className="field" />
      </div>

      <div>
        <label htmlFor="f-area" className="label">
          Area or postcode
        </label>
        <input id="f-area" name="area" defaultValue={values.area} placeholder="e.g. Soho or E8" className="field" />
      </div>

      <div>
        <label htmlFor="f-category" className="label">
          Treatment
        </label>
        <select id="f-category" name="category" defaultValue={values.category ?? ""} className="field">
          <option value="">All treatments</option>
          {CATEGORIES.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="f-date" className="label">
          Date
        </label>
        <select id="f-date" name="date" defaultValue={values.date ?? ""} className="field">
          <option value="">Next 7 days</option>
          {dateOptions.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </select>
        <label className="mt-3 flex cursor-pointer items-center gap-2.5 text-sm text-ink">
          <input
            type="checkbox"
            name="today"
            value="1"
            defaultChecked={values.today}
            className="h-4 w-4 rounded border-line-strong accent-adam"
          />
          Today only
        </label>
      </div>

      <fieldset>
        <legend className="label">Time of day</legend>
        <div className="grid grid-cols-2 gap-2">
          {TIMES.map((t) => (
            <label key={t.value} className="relative cursor-pointer">
              <input
                type="radio"
                name="time"
                value={t.value}
                defaultChecked={(values.time ?? "") === t.value}
                className="peer sr-only"
              />
              <span className="block rounded-full border border-line-strong bg-card px-3 py-2 text-center text-sm text-ink transition-colors peer-checked:border-adam peer-checked:bg-adam peer-checked:text-on-adam peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-adam">
                {t.label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor="f-price" className="label">
          Max price
        </label>
        <div className="relative">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-ink-muted" aria-hidden="true">
            £
          </span>
          <input
            id="f-price"
            name="maxPrice"
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            defaultValue={values.maxPrice}
            placeholder="Any"
            className="field pl-7"
          />
        </div>
      </div>

      <div>
        <label htmlFor="f-distance" className="label">
          Distance
        </label>
        <select id="f-distance" name="distance" defaultValue={values.distance ?? ""} className="field">
          {DISTANCES.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </select>
        <button type="button" onClick={useMyLocation} className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-adam hover:underline">
          <PinIcon className="h-4 w-4" />
          Use my location
        </button>
        <p className="mt-1 text-xs text-ink-muted" role="status" aria-live="polite">
          {locStatus || "Distances are from central London."}
        </p>
      </div>

      <div className="flex items-center gap-3 border-t border-line pt-5">
        <button type="submit" className="btn-primary flex-1">
          Apply filters
        </button>
        <Link href={clearHref} className="btn-ghost">
          Clear all
        </Link>
      </div>
    </form>
  );
}
