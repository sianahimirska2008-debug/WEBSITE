import type { Metadata } from "next";
import Link from "next/link";
import { parseFilters, searchSlots } from "@/lib/slots";
import { categoryLabel } from "@/lib/categories";
import { formatPrice, percentOff } from "@/lib/money";
import { formatDay, formatTime, londonDateKey } from "@/lib/time";
import { BrowseFilters, type FilterValues } from "@/components/browse-filters";
import { FiltersPanel, SortSelect } from "@/components/filters-panel";
import { SlotCard } from "@/components/slot-card";
import { SlotsMapLoader } from "@/components/slots-map-loader";
import type { MapBusiness } from "@/components/slots-map";

export const metadata: Metadata = {
  title: "Browse discounted slots",
  description: "Spare appointments at salons, beauty studios and barbers near you, at a discount.",
};

type SP = Record<string, string | string[] | undefined>;

function first(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

function nextSevenDays(now = new Date()) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now.getTime() + i * 86_400_000);
    return { value: londonDateKey(d), label: formatDay(d, now) };
  });
}

function withParams(sp: SP, patch: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    const val = first(v);
    if (val) params.set(k, val);
  }
  for (const [k, v] of Object.entries(patch)) {
    if (v) params.set(k, v);
    else params.delete(k);
  }
  const qs = params.toString();
  return qs ? `/slots?${qs}` : "/slots";
}

export default async function BrowsePage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const filters = parseFilters(sp);
  const view = first(sp.view) === "map" ? "map" : "list";
  const slots = await searchSlots(filters);

  const values: FilterValues = {
    q: filters.q,
    area: filters.area,
    category: filters.category,
    date: filters.date,
    time: filters.time,
    maxPrice: first(sp.maxPrice),
    distance: first(sp.distance),
    today: filters.today,
    lat: first(sp.lat),
    lng: first(sp.lng),
    view: view === "map" ? "map" : undefined,
    sort: filters.sort,
  };
  const activeCount = [filters.q, filters.area, filters.category, filters.date, filters.time, filters.maxPrice, filters.maxDistance, filters.today || undefined].filter(
    (v) => v != null && v !== "",
  ).length;

  // Group slots by business for the map.
  const byBusiness = new Map<string, MapBusiness & { minPrice: number }>();
  for (const s of slots) {
    const entry =
      byBusiness.get(s.business.id) ??
      ({ id: s.business.id, name: s.business.name, slug: s.business.slug, area: s.business.area, lat: s.business.lat, lng: s.business.lng, fromPrice: "", minPrice: Infinity, slots: [] } as MapBusiness & { minPrice: number });
    entry.slots.push({
      id: s.id,
      treatmentName: s.treatment.name,
      when: `${formatDay(s.startsAt)} ${formatTime(s.startsAt)}`,
      price: formatPrice(s.price),
      originalPrice: formatPrice(s.originalPrice),
      percentOff: percentOff(s.originalPrice, s.price),
    });
    entry.minPrice = Math.min(entry.minPrice, s.price);
    entry.fromPrice = formatPrice(entry.minPrice);
    byBusiness.set(s.business.id, entry);
  }
  const mapBusinesses = [...byBusiness.values()].map(({ minPrice: _m, ...b }) => b);

  const heading = filters.category ? `${categoryLabel(filters.category)} slots` : filters.today ? "Slots today" : "All open slots";

  return (
    <div className="container-page py-8 sm:py-12">
      <header className="max-w-2xl">
        <p className="eyebrow">Browse</p>
        <h1 className="mt-2 text-4xl text-ink sm:text-5xl">
          {heading.split(" ").slice(0, -1).join(" ")} <em className="italic">{heading.split(" ").slice(-1)}</em>
        </h1>
      </header>

      <div className="mt-8 grid gap-8 lg:grid-cols-[260px_1fr]">
        <aside aria-label="Filters">
          <FiltersPanel activeCount={activeCount}>
            <BrowseFilters values={values} dateOptions={nextSevenDays()} />
          </FiltersPanel>
        </aside>

        <section aria-labelledby="results-heading" className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="results-heading" className="font-sans text-sm text-ink-muted" aria-live="polite">
              <span className="font-medium text-ink">{slots.length}</span> {slots.length === 1 ? "slot" : "slots"} available
            </h2>
            <div className="flex items-center gap-3">
              <SortSelect formId="slot-filters" value={filters.sort ?? "soonest"} />
              <nav aria-label="View" className="inline-flex rounded-full border border-line-strong bg-card p-1">
                <Link
                  href={withParams(sp, { view: undefined })}
                  aria-current={view === "list" ? "page" : undefined}
                  className="rounded-full px-3.5 py-1.5 text-sm text-ink-muted aria-[current=page]:bg-adam aria-[current=page]:text-on-adam"
                >
                  List
                </Link>
                <Link
                  href={withParams(sp, { view: "map" })}
                  aria-current={view === "map" ? "page" : undefined}
                  className="rounded-full px-3.5 py-1.5 text-sm text-ink-muted aria-[current=page]:bg-adam aria-[current=page]:text-on-adam"
                >
                  Map
                </Link>
              </nav>
            </div>
          </div>

          {slots.length === 0 ? (
            <div className="card mt-6 p-10 text-center">
              <h3 className="text-2xl text-ink">No slots match those filters</h3>
              <p className="mt-2 text-sm text-ink-muted">Try another day, a wider area or a higher price.</p>
              <Link href="/slots" className="btn-secondary mt-6">
                Clear filters
              </Link>
            </div>
          ) : view === "map" ? (
            <div className="mt-6">
              <SlotsMapLoader businesses={mapBusinesses} origin={filters.lat != null && filters.lng != null ? { lat: filters.lat, lng: filters.lng } : undefined} />
              <p className="mt-3 text-xs text-ink-muted">
                Showing {mapBusinesses.length} {mapBusinesses.length === 1 ? "business" : "businesses"}. Select a marker to see its slots, or{" "}
                <Link href={withParams(sp, { view: undefined })} className="underline">
                  switch to the list
                </Link>
                .
              </p>
            </div>
          ) : (
            <ul className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {slots.map((slot) => (
                <li key={slot.id}>
                  <SlotCard slot={slot} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
