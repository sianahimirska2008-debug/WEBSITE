import Link from "next/link";
import { formatPrice, percentOff } from "@/lib/money";
import { formatDay, formatTime } from "@/lib/time";
import { ClockIcon, PinIcon, StarIcon } from "./icons";

export type SlotCardData = {
  id: string;
  startsAt: Date;
  durationMins: number;
  originalPrice: number;
  price: number;
  treatment: { name: string };
  business: { name: string; area: string; ratingAvg: number; ratingCount: number };
  distanceMiles?: number;
};

export function SlotCard({ slot, headingLevel = "h3" }: { slot: SlotCardData; headingLevel?: "h2" | "h3" }) {
  const off = percentOff(slot.originalPrice, slot.price);
  const Heading = headingLevel;
  const day = formatDay(slot.startsAt);
  const time = formatTime(slot.startsAt);
  return (
    <article className="card group relative flex h-full flex-col p-5 transition-colors hover:border-line-strong">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm text-ink-muted">{slot.business.name}</p>
          <Heading className="mt-1 font-serif text-[1.45rem] leading-tight text-ink">
            <Link href={`/slots/${slot.id}`} className="after:absolute after:inset-0 after:rounded-[var(--radius-card)] focus-visible:outline-none">
              {slot.treatment.name}
            </Link>
          </Heading>
        </div>
        {off > 0 && (
          <span className="shrink-0 rounded-full bg-adam px-2.5 py-1 text-xs font-medium text-on-adam">{off}% off</span>
        )}
      </div>

      <p className="mt-4 inline-flex items-center gap-1.5 text-sm text-ink">
        <ClockIcon className="h-4 w-4 text-ink-muted" />
        <span>
          {day}, {time}
        </span>
        <span className="text-ink-muted">· {slot.durationMins} min</span>
      </p>

      <div className="mt-auto flex items-end justify-between gap-3 pt-5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
          {slot.distanceMiles != null && (
            <span className="inline-flex items-center gap-1">
              <PinIcon className="h-3.5 w-3.5" />
              {slot.distanceMiles.toFixed(1)} mi · {slot.business.area}
            </span>
          )}
          {slot.business.ratingCount > 0 && (
            <span className="inline-flex items-center gap-1">
              <StarIcon className="h-3.5 w-3.5 text-adam" />
              <span className="text-ink">{slot.business.ratingAvg.toFixed(1)}</span>
              <span>({slot.business.ratingCount})</span>
            </span>
          )}
        </div>
        <p className="text-right leading-none">
          <span className="sr-only">Was </span>
          <s className="block text-xs text-ink-muted">{formatPrice(slot.originalPrice)}</s>
          <span className="sr-only">, now </span>
          <span className="mt-1 block text-xl font-semibold text-ink">{formatPrice(slot.price)}</span>
        </p>
      </div>
    </article>
  );
}
