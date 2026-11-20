import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { searchSlots } from "@/lib/slots";
import { formatPrice } from "@/lib/money";
import { BUSINESS_TYPE_LABEL, categoryLabel } from "@/lib/categories";
import { BusinessAvatar } from "@/components/business-avatar";
import { OpeningHours } from "@/components/opening-hours";
import { SlotCard } from "@/components/slot-card";
import { PageBand } from "@/components/page-band";
import { SlotsMapLoader } from "@/components/slots-map-loader";
import { PinIcon, StarIcon } from "@/components/icons";

type Props = { params: Promise<{ slug: string }> };

const getBusiness = (slug: string) =>
  prisma.business.findUnique({ where: { slug }, include: { treatments: { orderBy: { standardPrice: "asc" } } } });

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const b = await getBusiness((await params).slug);
  if (!b) return { title: "Business not found" };
  return { title: `${b.name}, ${b.area}`, description: b.description };
}

export default async function BusinessPage({ params }: Props) {
  const b = await getBusiness((await params).slug);
  if (!b) notFound();
  const slots = await searchSlots({ businessId: b.id });

  return (
    <>
    <PageBand>
      <header className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <BusinessAvatar name={b.name} logoUrl={b.logoUrl} size="h-20 w-20 text-3xl" />
        <div>
          <p className="eyebrow text-on-band-muted">{BUSINESS_TYPE_LABEL[b.type]}</p>
          <h1 className="mt-1 text-4xl text-on-band sm:text-6xl">{b.name}</h1>
          <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-on-band-muted">
            <span className="inline-flex items-center gap-1">
              <PinIcon className="h-4 w-4" /> {b.address}, {b.postcode}
            </span>
            {b.ratingCount > 0 && (
              <span className="inline-flex items-center gap-1">
                <StarIcon className="h-3.5 w-3.5 text-adam" />
                <span className="text-on-band">{b.ratingAvg.toFixed(1)}</span> ({b.ratingCount} reviews)
              </span>
            )}
          </p>
        </div>
      </header>
    </PageBand>
    <div className="container-page flow-root pb-12">

      {/* Photo placeholders until businesses can upload images */}
      <ul data-reveal-stagger="scale" className="relative -mt-8 grid grid-cols-3 gap-3" aria-label="Photos">
        {["Treatment room", "Reception", "Recent work"].map((label, i) => (
          <li
            key={label}
            className={`flex items-end rounded-[var(--radius-card)] p-4 ${i === 0 ? "col-span-3 h-48 sm:col-span-1 sm:h-56" : "h-32 sm:h-56"} ${i === 1 ? "bg-sage-deep" : "bg-sage"} border border-line`}
            role="img"
            aria-label={`Photo placeholder: ${label}`}
          >
            <span className="text-xs text-ink-muted">{label}</span>
          </li>
        ))}
      </ul>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_340px]">
        <section aria-labelledby="open-slots" className="min-w-0">
          <h2 id="open-slots" className="text-3xl text-ink">
            Open <em className="italic text-adam">slots</em>
          </h2>
          {slots.length === 0 ? (
            <p className="card mt-5 p-8 text-center text-sm text-ink-muted">No open slots right now. Check back soon.</p>
          ) : (
            <ul data-reveal-stagger="scale" className="mt-5 grid gap-4 sm:grid-cols-2">
              {slots.map((s) => (
                <li key={s.id}>
                  <SlotCard slot={s} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <aside data-reveal-stagger className="space-y-4">
          <section aria-labelledby="about-title" className="card p-6">
            <h2 id="about-title" className="text-2xl text-ink">
              About
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-ink">{b.description || "No description yet."}</p>
            {b.phone && (
              <p className="mt-4 text-sm">
                <a href={`tel:${b.phone.replace(/\s/g, "")}`} className="font-medium text-adam hover:underline">
                  {b.phone}
                </a>
              </p>
            )}
          </section>
          <section aria-labelledby="hours-title" className="card p-6">
            <h2 id="hours-title" className="text-2xl text-ink">
              Opening hours
            </h2>
            <div className="mt-4">
              <OpeningHours json={b.openingHours} />
            </div>
          </section>
          <section aria-labelledby="menu-title" className="card p-6">
            <h2 id="menu-title" className="text-2xl text-ink">
              Standard menu
            </h2>
            <ul className="mt-4 divide-y divide-line text-sm">
              {b.treatments.map((t) => (
                <li key={t.id} className="flex justify-between gap-3 py-2.5">
                  <span>
                    <span className="text-ink">{t.name}</span>
                    <span className="block text-xs text-ink-muted">
                      {categoryLabel(t.category)} · {t.durationMins} min
                    </span>
                  </span>
                  <span className="text-ink tabular-nums">{formatPrice(t.standardPrice)}</span>
                </li>
              ))}
            </ul>
          </section>
          <SlotsMapLoader
            businesses={[{ id: b.id, name: b.name, slug: b.slug, area: b.area, lat: b.lat, lng: b.lng, fromPrice: "", slots: [] }]}
            singleSlotId="business"
            className="h-56"
          />
          <Link href="/slots" className="btn-secondary w-full">
            Browse all slots
          </Link>
        </aside>
      </div>
    </div>
    </>
  );
}
