import type { Metadata } from "next";
import { requireBusinessUser } from "@/lib/auth";
import { getOwnedBusiness } from "@/lib/business";
import { prisma } from "@/lib/db";
import { formatPrice, percentOff } from "@/lib/money";
import { formatDay, formatTime, londonDateKey } from "@/lib/time";
import { getPaymentProvider } from "@/lib/payments";
import { SlotForm } from "@/components/slot-form";
import { commissionBps, splitPayment } from "@/lib/commission";
import { SlotRowActions } from "@/components/slot-row";
import { TreatmentForm } from "@/components/treatment-form";
import { StatusPill } from "@/components/status-pill";

export const metadata: Metadata = { title: "Slots" };

const hhmm = (d: Date) => new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Europe/London" }).format(d);

export default async function DashboardSlots() {
  const user = await requireBusinessUser("/dashboard/slots");
  const business = await getOwnedBusiness(user.id);
  const now = new Date();
  const [treatments, slots] = await Promise.all([
    prisma.treatment.findMany({ where: { businessId: business.id }, orderBy: { name: "asc" } }),
    prisma.slot.findMany({ where: { businessId: business.id, startsAt: { gt: now }, status: { not: "CANCELLED" } }, include: { treatment: true }, orderBy: { startsAt: "asc" } }),
  ]);
  const canPost = business.payoutsEnabled || !getPaymentProvider().requiresConnectedAccount;
  const minDate = londonDateKey(now);
  const tList = treatments.map((t) => ({ id: t.id, name: t.name, durationMins: t.durationMins, standardPrice: t.standardPrice }));

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_400px] lg:items-start">
      <section aria-labelledby="upcoming-slots" className="min-w-0">
        <h2 id="upcoming-slots" className="text-2xl text-ink">
          Upcoming slots <span className="font-sans text-base text-ink-muted">({slots.length})</span>
        </h2>
        {slots.length === 0 ? (
          <p className="card mt-4 p-8 text-center text-sm text-ink-muted">No upcoming slots. Post one to start filling empty chairs.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {slots.map((s) => {
              const tone = s.status === "BOOKED" ? "good" : s.status === "HELD" ? "wait" : "muted";
              const label = s.status === "BOOKED" ? "Booked" : s.status === "HELD" ? "Being booked" : "Open";
              return (
                <li key={s.id} className="card flex flex-col gap-3 p-5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2">
                      <span className="font-serif text-xl text-ink">{s.treatment.name}</span>
                      <StatusPill label={label} tone={tone} />
                    </p>
                    <p className="mt-0.5 text-sm text-ink">
                      {formatDay(s.startsAt, now)}, {formatTime(s.startsAt)} · {s.durationMins} min{s.stylistName ? ` · ${s.stylistName}` : ""}
                    </p>
                    <p className="mt-1 text-xs text-ink-muted">
                      <s>{formatPrice(s.originalPrice)}</s> <span className="font-medium text-ink">{formatPrice(s.price)}</span> ({percentOff(s.originalPrice, s.price)}% off) · you get{" "}
                      {formatPrice(splitPayment(s.price).businessAmount)}
                    </p>
                  </div>
                  {s.status === "OPEN" && (
                    <div className="sm:basis-full">
                      <SlotRowActions
                        slotId={s.id}
                        treatments={tList}
                        minDate={minDate}
                        bps={commissionBps()}
                        initial={{ treatmentId: s.treatmentId, date: londonDateKey(s.startsAt), time: hhmm(s.startsAt), durationMins: s.durationMins, originalPrice: s.originalPrice, price: s.price, stylistName: s.stylistName ?? "" }}
                      />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <div className="space-y-6">
        <section aria-labelledby="post-title" className="card p-6">
          <h2 id="post-title" className="text-2xl text-ink">
            Post a <em className="italic text-adam">slot</em>
          </h2>
          <div className="mt-4">
            {canPost ? (
              <SlotForm treatments={tList} minDate={minDate} bps={commissionBps()} />
            ) : (
              <p className="text-sm text-ink-muted">Connect Stripe first so we can pay you for bookings. It takes about five minutes.</p>
            )}
          </div>
        </section>
        <section aria-labelledby="treat-title" className="card p-6">
          <h2 id="treat-title" className="text-2xl text-ink">
            Treatments
          </h2>
          {treatments.length > 0 && (
            <ul className="mt-3 divide-y divide-line text-sm">
              {treatments.map((t) => (
                <li key={t.id} className="flex justify-between gap-3 py-2">
                  <span className="text-ink">{t.name}</span>
                  <span className="text-ink-muted tabular-nums">
                    {t.durationMins} min · {formatPrice(t.standardPrice)}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 border-t border-line pt-4">
            <TreatmentForm />
          </div>
        </section>
      </div>
    </div>
  );
}
