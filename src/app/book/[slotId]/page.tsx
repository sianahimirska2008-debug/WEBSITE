import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { formatPrice, percentOff } from "@/lib/money";
import { formatLongDate } from "@/lib/time";
import { CANCELLATION_WINDOW_HOURS } from "@/lib/bookings";
import { PageBand } from "@/components/page-band";
import { CheckoutPanel } from "@/components/checkout-panel";
import { BusinessAvatar } from "@/components/business-avatar";

export const metadata: Metadata = { title: "Checkout" };

export default async function CheckoutPage({ params }: { params: Promise<{ slotId: string }> }) {
  const { slotId } = await params;
  const user = await requireUser(`/book/${slotId}`);
  const slot = await prisma.slot.findUnique({ where: { id: slotId }, include: { treatment: true, business: true } });
  if (!slot) notFound();

  // HELD slots may be this customer's own unfinished checkout; startCheckout decides.
  const bookable = (slot.status === "OPEN" || slot.status === "HELD") && slot.startsAt > new Date();
  const off = percentOff(slot.originalPrice, slot.price);

  return (
    <>
      <PageBand>
        <nav aria-label="Breadcrumb" className="text-sm text-on-band-muted">
          <Link href={`/slots/${slot.id}`} className="hover:text-on-band">
            ← Back to slot
          </Link>
        </nav>
        <h1 className="mt-4 text-4xl text-on-band sm:text-5xl">
          Confirm and <em className="italic text-adam">book</em>
        </h1>
      </PageBand>

      <div className="container-page grid gap-8 py-8 sm:py-10 lg:grid-cols-[1fr_380px] lg:items-start">
        <section aria-labelledby="pay-title" className="card p-6 sm:p-8">
          <h2 id="pay-title" className="text-2xl text-ink">
            Payment
          </h2>
          <div className="mt-5">
            {user.role !== "CUSTOMER" ? (
              <p className="rounded-[var(--radius-field)] bg-sage p-4 text-sm text-ink" role="status">
                You&rsquo;re logged in with a business account. Log out and use a customer account to book slots.
              </p>
            ) : !bookable ? (
              <div className="rounded-[var(--radius-field)] bg-sage p-4 text-sm text-ink" role="status">
                {slot.status === "BOOKED" ? "Sorry, this slot has just been booked." : "This slot is no longer available."}{" "}
                <Link href="/slots" className="font-medium underline underline-offset-4">
                  Find another slot
                </Link>
              </div>
            ) : (
              <CheckoutPanel slotId={slot.id} priceLabel={formatPrice(slot.price)} defaultName={user.name ?? ""} />
            )}
          </div>
        </section>

        <aside aria-labelledby="summary-title" className="order-first rounded-[var(--radius-card)] border border-line-on-band bg-band p-6 text-on-band lg:order-none lg:sticky lg:top-24">
          <h2 id="summary-title" className="text-2xl">
            Your appointment
          </h2>
          <div className="mt-5 flex items-center gap-3">
            <BusinessAvatar name={slot.business.name} logoUrl={slot.business.logoUrl} size="h-12 w-12 text-xl" />
            <div>
              <p className="font-medium">{slot.business.name}</p>
              <p className="text-sm text-on-band-muted">{slot.business.area}</p>
            </div>
          </div>
          <dl className="mt-5 space-y-3 border-t border-line-on-band pt-5 text-sm">
            <Row term="Treatment" value={slot.treatment.name} />
            <Row term="When" value={formatLongDate(slot.startsAt)} />
            <Row term="Duration" value={`${slot.durationMins} min`} />
            {slot.stylistName && <Row term="With" value={slot.stylistName} />}
            <Row term="Address" value={`${slot.business.address}, ${slot.business.postcode}`} />
          </dl>
          <dl className="mt-5 space-y-2 border-t border-line-on-band pt-5 text-sm">
            <Row term="Standard price" value={<s>{formatPrice(slot.originalPrice)}</s>} />
            {off > 0 && <Row term={`Gettable discount (${off}%)`} value={`−${formatPrice(slot.originalPrice - slot.price)}`} />}
            <div className="flex items-baseline justify-between gap-4 pt-2">
              <dt className="font-medium">Total to pay</dt>
              <dd className="font-serif text-3xl">{formatPrice(slot.price)}</dd>
            </div>
          </dl>
          <p className="mt-5 text-xs leading-relaxed text-on-band-muted">
            Free cancellation up to {CANCELLATION_WINDOW_HOURS} hours before your appointment. No booking fee.
          </p>
        </aside>
      </div>
    </>
  );
}

function Row({ term, value }: { term: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-on-band-muted">{term}</dt>
      <dd className="text-right">{value}</dd>
    </div>
  );
}
