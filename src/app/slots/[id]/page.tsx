import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatPrice, percentOff } from "@/lib/money";
import { formatDay, formatLongDate, formatTime } from "@/lib/time";
import { BUSINESS_TYPE_LABEL, categoryLabel } from "@/lib/categories";
import { CANCELLATION_WINDOW_HOURS } from "@/lib/bookings";
import { distanceKm, kmToMiles, DEFAULT_LOCATION } from "@/lib/geo";
import { BusinessAvatar } from "@/components/business-avatar";
import { OpeningHours } from "@/components/opening-hours";
import { PageBand } from "@/components/page-band";
import { SlotsMapLoader } from "@/components/slots-map-loader";
import { ArrowRightIcon, CalendarIcon, ClockIcon, PinIcon, StarIcon } from "@/components/icons";

type Props = { params: Promise<{ id: string }> };

async function getSlot(id: string) {
  return prisma.slot.findUnique({ where: { id }, include: { treatment: true, business: true } });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const slot = await getSlot((await params).id);
  if (!slot) return { title: "Slot not found" };
  return {
    title: `${slot.treatment.name} at ${slot.business.name}`,
    description: `${formatPrice(slot.price)} (was ${formatPrice(slot.originalPrice)}) on ${formatLongDate(slot.startsAt)} in ${slot.business.area}.`,
  };
}

export default async function SlotDetailPage({ params }: Props) {
  const { id } = await params;
  const slot = await getSlot(id);
  if (!slot) notFound();

  const now = new Date();
  const bookable = slot.status === "OPEN" && slot.startsAt > now;
  const off = percentOff(slot.originalPrice, slot.price);
  const b = slot.business;
  const miles = kmToMiles(distanceKm(DEFAULT_LOCATION, b));
  const endsAt = new Date(slot.startsAt.getTime() + slot.durationMins * 60_000);

  const moreSlots = await prisma.slot.findMany({
    where: { businessId: b.id, status: "OPEN", startsAt: { gt: now }, id: { not: slot.id } },
    include: { treatment: true },
    orderBy: { startsAt: "asc" },
    take: 4,
  });

  return (
    <>
    <PageBand>
      <nav aria-label="Breadcrumb" className="text-sm text-on-band-muted">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link href="/slots" className="hover:text-on-band">
              Browse slots
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link href={`/slots?category=${slot.treatment.category}`} className="hover:text-on-band">
              {categoryLabel(slot.treatment.category)}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="text-on-band">
            {slot.treatment.name}
          </li>
        </ol>
      </nav>

      <div className="lg:max-w-[calc(100%-412px)]">
          <p className="mt-6 text-sm text-on-band-muted">
        <Link href={`/b/${b.slug}`} className="underline-offset-4 hover:text-on-band hover:underline">
          {b.name}
        </Link>{" "}
        · {BUSINESS_TYPE_LABEL[b.type]}
      </p>
      <h1 className="mt-2 text-4xl leading-tight text-on-band sm:text-6xl">{slot.treatment.name}</h1>
      <p className="mt-3 text-lg text-on-band">
        {formatDay(slot.startsAt)}, <span className="font-medium">{formatTime(slot.startsAt)}</span>
        <span className="text-on-band-muted"> – {formatTime(endsAt)}</span>
      </p>

      </div>
    </PageBand>
    <div className="container-page pb-12 pt-8">
      <div className="grid gap-8 lg:grid-cols-[1fr_380px] lg:items-start">
        <div className="min-w-0">
          {/* Mobile price + book */}
          <div className="rounded-[var(--radius-card)] border border-line-on-band bg-band p-5 text-on-band lg:hidden">
            <BookingPanel slotId={slot.id} price={slot.price} originalPrice={slot.originalPrice} off={off} bookable={bookable} status={slot.status} />
          </div>

          <section aria-labelledby="details-title" className="card mt-6 p-6 sm:p-8 lg:mt-0">
            <h2 id="details-title" className="text-2xl text-ink">
              Appointment details
            </h2>
            <dl className="mt-5 grid gap-5 sm:grid-cols-2">
              <Detail icon={<CalendarIcon />} term="Date and time" value={formatLongDate(slot.startsAt)} />
              <Detail icon={<ClockIcon />} term="Duration" value={`${slot.durationMins} minutes`} />
              <Detail icon={<span className="font-serif text-base leading-none">Aa</span>} term="Treatment" value={`${slot.treatment.name} (${categoryLabel(slot.treatment.category)})`} />
              {slot.stylistName && <Detail icon={<span className="font-serif text-base leading-none">@</span>} term="With" value={slot.stylistName} />}
              <Detail icon={<PinIcon />} term="Address" value={`${b.address}, ${b.postcode}`} />
            </dl>
          </section>

          <section aria-labelledby="policy-title" className="card mt-4 p-6 sm:p-8">
            <h2 id="policy-title" className="text-2xl text-ink">
              Cancellation policy
            </h2>
            <ul className="mt-4 space-y-2 text-sm leading-relaxed text-ink-muted">
              <li>Free cancellation up to {CANCELLATION_WINDOW_HOURS} hours before your appointment, with a full refund. The slot reopens for someone else.</li>
              <li>Within {CANCELLATION_WINDOW_HOURS} hours of the appointment, bookings can't be cancelled or refunded.</li>
              <li>If you don&rsquo;t turn up, the business may mark the booking as a no-show.</li>
            </ul>
          </section>

          <section aria-labelledby="business-title" className="card mt-4 p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <BusinessAvatar name={b.name} logoUrl={b.logoUrl} />
              <div className="min-w-0">
                <h2 id="business-title" className="text-2xl text-ink">
                  {b.name}
                </h2>
                <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-muted">
                  <span>{BUSINESS_TYPE_LABEL[b.type]}</span>
                  {b.ratingCount > 0 && (
                    <span className="inline-flex items-center gap-1">
                      <StarIcon className="h-3.5 w-3.5 text-adam" />
                      <span className="text-ink">{b.ratingAvg.toFixed(1)}</span> ({b.ratingCount} reviews)
                    </span>
                  )}
                  <span>
                    {b.area} · {miles.toFixed(1)} mi from central London
                  </span>
                </p>
              </div>
            </div>
            {b.description && <p className="mt-5 text-sm leading-relaxed text-ink">{b.description}</p>}
            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <SlotsMapLoader
                businesses={[{ id: b.id, name: b.name, slug: b.slug, area: b.area, lat: b.lat, lng: b.lng, fromPrice: formatPrice(slot.price), slots: [] }]}
                singleSlotId={slot.id}
                className="h-56"
              />
              <div>
                <h3 className="font-sans text-sm font-medium text-ink">Opening hours</h3>
                <div className="mt-3">
                  <OpeningHours json={b.openingHours} />
                </div>
              </div>
            </div>
            <Link href={`/b/${b.slug}`} className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-ink hover:text-adam">
              View {b.name} <ArrowRightIcon />
            </Link>
          </section>

          {moreSlots.length > 0 && (
            <section aria-labelledby="more-title" className="mt-10">
              <h2 id="more-title" className="text-2xl text-ink">
                More slots at <em className="italic text-adam">{b.name}</em>
              </h2>
              <ul className="mt-4 divide-y divide-line rounded-[var(--radius-card)] border border-line bg-card">
                {moreSlots.map((s) => (
                  <li key={s.id}>
                    <Link href={`/slots/${s.id}`} className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-sage-light/60">
                      <span>
                        <span className="block text-sm font-medium text-ink">{s.treatment.name}</span>
                        <span className="block text-xs text-ink-muted">
                          {formatDay(s.startsAt)}, {formatTime(s.startsAt)} · {s.durationMins} min
                        </span>
                      </span>
                      <span className="text-right">
                        <s className="block text-xs text-ink-muted">{formatPrice(s.originalPrice)}</s>
                        <span className="text-sm font-semibold text-ink">{formatPrice(s.price)}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {/* Desktop sticky booking panel */}
        <aside className="sticky top-24 hidden rounded-[var(--radius-card)] border border-line-on-band bg-band p-6 text-on-band lg:block" aria-label="Book this slot">
          <BookingPanel slotId={slot.id} price={slot.price} originalPrice={slot.originalPrice} off={off} bookable={bookable} status={slot.status} />
        </aside>
      </div>
    </div>
    </>
  );
}

function Detail({ icon, term, value }: { icon: React.ReactNode; term: string; value: string }) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-adam text-on-adam" aria-hidden="true">
        {icon}
      </span>
      <div>
        <dt className="text-xs text-ink-muted">{term}</dt>
        <dd className="mt-0.5 text-sm text-ink">{value}</dd>
      </div>
    </div>
  );
}

function BookingPanel({
  slotId,
  price,
  originalPrice,
  off,
  bookable,
  status,
}: {
  slotId: string;
  price: number;
  originalPrice: number;
  off: number;
  bookable: boolean;
  status: string;
}) {
  return (
    <div>
      <div className="flex items-end justify-between gap-3">
        <p className="leading-none">
          <span className="sr-only">Was </span>
          <s className="text-sm text-on-band-muted">{formatPrice(originalPrice)}</s>
          <span className="sr-only">, now </span>
          <span className="mt-1.5 block font-serif text-5xl text-on-band">{formatPrice(price)}</span>
        </p>
        {off > 0 && <span className="rounded-full bg-adam px-3 py-1 text-sm font-medium text-on-adam">{off}% off</span>}
      </div>
      {off > 0 && <p className="mt-3 text-sm text-on-band-muted">You save {formatPrice(originalPrice - price)} on the standard price.</p>}
      {bookable ? (
        <Link href={`/book/${slotId}`} className="btn-primary mt-6 w-full py-3.5 text-base">
          Book
        </Link>
      ) : (
        <div className="mt-6 rounded-[var(--radius-field)] bg-white/50 p-4 text-sm text-on-band" role="status">
          {status === "BOOKED"
            ? "This slot has just been booked."
            : status === "HELD"
              ? "Someone is booking this slot right now. If they don't finish, it reopens within 35 minutes."
              : "This slot is no longer available."}{" "}
          <Link href="/slots" className="font-medium underline">
            Find another slot
          </Link>
        </div>
      )}
      <p className="mt-4 text-xs leading-relaxed text-on-band-muted">Pay now to secure the slot. Free cancellation up to {CANCELLATION_WINDOW_HOURS} hours before.</p>
    </div>
  );
}
