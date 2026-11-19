import { prisma } from "./db";
import { distanceKm, kmToMiles, DEFAULT_LOCATION } from "./geo";
import { londonDateKey, timeOfDay } from "./time";

export type SlotFilters = {
  q?: string;
  area?: string;
  category?: string;
  date?: string; // YYYY-MM-DD (London)
  time?: "morning" | "afternoon" | "evening";
  maxPrice?: number; // pence
  maxDistance?: number; // miles
  today?: boolean;
  lat?: number;
  lng?: number;
  sort?: "soonest" | "price" | "distance" | "discount";
  businessId?: string;
  limit?: number;
};

export type SlotListItem = Awaited<ReturnType<typeof searchSlots>>[number];

/**
 * Open, future slots matching the filters. Text/area/distance filters run in
 * memory: at the scale of "next 7 days of spare slots" that's cheap and keeps
 * the query portable between SQLite and Postgres. Swap for SQL/PostGIS later.
 */
export async function searchSlots(filters: SlotFilters = {}, now = new Date()) {
  const origin = filters.lat != null && filters.lng != null ? { lat: filters.lat, lng: filters.lng } : DEFAULT_LOCATION;

  const slots = await prisma.slot.findMany({
    where: {
      status: "OPEN",
      startsAt: { gt: now },
      ...(filters.businessId ? { businessId: filters.businessId } : {}),
      ...(filters.maxPrice != null ? { price: { lte: filters.maxPrice } } : {}),
      ...(filters.category ? { treatment: { category: filters.category } } : {}),
    },
    include: {
      treatment: true,
      business: {
        select: { id: true, name: true, slug: true, type: true, area: true, postcode: true, address: true, lat: true, lng: true, ratingAvg: true, ratingCount: true, logoUrl: true },
      },
    },
    orderBy: { startsAt: "asc" },
  });

  const q = filters.q?.trim().toLowerCase();
  const area = filters.area?.trim().toLowerCase().replace(/\s+/g, "");
  const todayKey = londonDateKey(now);

  let result = slots
    .map((s) => ({ ...s, distanceMiles: kmToMiles(distanceKm(origin, s.business)) }))
    .filter((s) => {
      if (q) {
        const hay = `${s.treatment.name} ${s.treatment.category} ${s.business.name}`.toLowerCase();
        if (!q.split(/\s+/).every((word) => hay.includes(word))) return false;
      }
      if (area) {
        const a = s.business.area.toLowerCase().replace(/\s+/g, "");
        const pc = s.business.postcode.toLowerCase().replace(/\s+/g, "");
        if (!a.includes(area) && !pc.startsWith(area)) return false;
      }
      if (filters.today && londonDateKey(s.startsAt) !== todayKey) return false;
      if (filters.date && londonDateKey(s.startsAt) !== filters.date) return false;
      if (filters.time && timeOfDay(s.startsAt) !== filters.time) return false;
      if (filters.maxDistance != null && s.distanceMiles > filters.maxDistance) return false;
      return true;
    });

  switch (filters.sort) {
    case "price":
      result.sort((a, b) => a.price - b.price);
      break;
    case "distance":
      result.sort((a, b) => a.distanceMiles - b.distanceMiles);
      break;
    case "discount":
      result.sort((a, b) => b.originalPrice - b.price - (a.originalPrice - a.price));
      break;
  }
  if (filters.limit) result = result.slice(0, filters.limit);
  return result;
}

/** Parse URL search params into filters (shared by the page and API). */
export function parseFilters(sp: Record<string, string | string[] | undefined>): SlotFilters {
  const get = (k: string) => {
    const v = sp[k];
    return (Array.isArray(v) ? v[0] : v)?.trim() || undefined;
  };
  const num = (k: string) => {
    const v = get(k);
    if (v == null) return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  };
  const time = get("time");
  const sort = get("sort");
  const maxPounds = num("maxPrice");
  return {
    q: get("q"),
    area: get("area"),
    category: get("category"),
    date: get("date") && /^\d{4}-\d{2}-\d{2}$/.test(get("date")!) ? get("date") : undefined,
    time: time === "morning" || time === "afternoon" || time === "evening" ? time : undefined,
    maxPrice: maxPounds != null ? Math.round(maxPounds * 100) : undefined,
    maxDistance: num("distance"),
    today: get("today") === "1",
    lat: num("lat"),
    lng: num("lng"),
    sort: sort === "price" || sort === "distance" || sort === "discount" ? sort : "soonest",
  };
}
