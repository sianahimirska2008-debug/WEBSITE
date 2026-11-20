import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { formatPrice } from "@/lib/money";
import { formatDay, formatLongDate, formatTime } from "@/lib/time";
import { canCancel, CANCELLATION_WINDOW_HOURS } from "@/lib/bookings";
import { PageBand } from "@/components/page-band";
import { BusinessAvatar } from "@/components/business-avatar";
import { CancelBooking } from "@/components/cancel-booking";
import { CheckIcon } from "@/components/icons";

export const metadata: Metadata = { title: "My bookings" };

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  CONFIRMED: { label: "Confirmed", className: "bg-adam text-on-adam" },
  COMPLETED: { label: "Completed", className: "bg-sage-deep text-ink" },
  CANCELLED: { label: "Cancelled", className: "border border-line-strong text-ink-muted" },
  NO_SHOW: { label: "No-show", className: "bg-danger/10 text-danger" },
};

export default async function BookingsPage({ searchParams }: { searchParams: Promise<{ booked?: string; cancelled?: string }> }) {
  const user = await requireUser("/bookings");
  const { booked, cancelled } = await searchParams;
  const now = new Date();

  const bookings = await prisma.booking.findMany({
    where: { userId: user.id, status: { notIn: ["PENDING_PAYMENT", "EXPIRED"] } },
    include: { slot: { include: { treatment: true, business: true } } },
    orderBy: { slot: { startsAt: "asc" } },
  });
  const upcoming = bookings.filter((b) => b.status === "CONFIRMED" && b.slot.startsAt > now);
  const past = bookings.filter((b) => !upcoming.includes(b)).reverse();
  const justBooked = booked ? bookings.find((b) => b.reference === booked) : undefined;

  return (
    <>
      <PageBand>
        <p className="eyebrow text-on-band-muted">Your account</p>
        <h1 className="mt-2 text-4xl text-on-band sm:text-6xl">
          My <em className="italic text-adam">bookings</em>
        </h1>
      </PageBand>

      <div className="container-page space-y-10 py-8 sm:py-10">
        {justBooked && (
          <div role="status" className="card flex flex-col gap-4 border-adam p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-adam text-on-adam" aria-hidden="true">
                <CheckIcon className="h-5 w-5" />
              </span>
              <div>
                <p className="font-serif text-2xl text-ink">You&rsquo;re booked in</p>
                <p className="mt-1 text-sm text-ink-muted">
                  {justBooked.slot.treatment.name} at {justBooked.slot.business.name}, {formatLongDate(justBooked.slot.startsAt)}. Show this reference when you arrive.
                </p>
              </div>
            </div>
            <p className="shrink-0 rounded-full bg-band px-4 py-2 font-mono text-lg tracking-wider text-ink">{justBooked.reference}</p>
          </div>
        )}
        {cancelled && (
          <p role="status" className="card border-adam p-5 text-sm text-ink">
            Booking <span className="font-mono">{cancelled}</span> cancelled. Your refund is on its way, and the slot is open for someone else.
          </p>
        )}

        {user.role === "BUSINESS" && (
          <p className="card p-5 text-sm text-ink">
            You&rsquo;re logged in as a business. Bookings for your slots are in your{" "}
            <Link href="/dashboard" className="font-medium text-adam underline underline-offset-4">
              dashboard
            </Link>
            .
          </p>
        )}

        <section aria-labelledby="upcoming-title">
          <h2 id="upcoming-title" className="text-3xl text-ink">
            Upcoming
          </h2>
          {upcoming.length === 0 ? (
            <div className="card mt-4 p-8 text-center">
              <p className="text-ink-muted">No upcoming bookings.</p>
              <Link href="/slots" className="btn-primary mt-5">
                Find a slot
              </Link>
            </div>
          ) : (
            <ul className="mt-4 space-y-3">
              {upcoming.map((b) => (
                <BookingRow key={b.id} booking={b} now={now} highlight={b.reference === booked} />
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs text-ink-muted">You can cancel for a full refund up to {CANCELLATION_WINDOW_HOURS} hours before an appointment.</p>
        </section>

        <section aria-labelledby="past-title">
          <h2 id="past-title" className="text-3xl text-ink">
            Past and cancelled
          </h2>
          {past.length === 0 ? (
            <p className="card mt-4 p-8 text-center text-ink-muted">Nothing here yet.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {past.map((b) => (
                <BookingRow key={b.id} booking={b} now={now} />
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}

type BookingWithSlot = Awaited<ReturnType<typeof prisma.booking.findMany<{ include: { slot: { include: { treatment: true; business: true } } } }>>>[number];

function BookingRow({ booking: b, now, highlight = false }: { booking: BookingWithSlot; now: Date; highlight?: boolean }) {
  const isUpcoming = b.status === "CONFIRMED" && b.slot.startsAt > now;
  const status = isUpcoming ? STATUS_LABEL.CONFIRMED : b.status === "CONFIRMED" ? { label: "Attended", className: "bg-sage-deep text-ink" } : STATUS_LABEL[b.status];
  const cancellable = isUpcoming && canCancel(b.slot.startsAt, now);
  return (
    <li className={`card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between ${highlight ? "border-adam" : ""} ${isUpcoming ? "" : "opacity-90"}`}>
      <div className="flex min-w-0 items-start gap-4">
        <BusinessAvatar name={b.slot.business.name} logoUrl={b.slot.business.logoUrl} size="h-12 w-12 text-xl" />
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2">
            <span className="font-serif text-xl text-ink">{b.slot.treatment.name}</span>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${status.className}`}>{status.label}</span>
          </p>
          <p className="mt-0.5 text-sm text-ink">
            <Link href={`/b/${b.slot.business.slug}`} className="hover:text-adam hover:underline">
              {b.slot.business.name}
            </Link>{" "}
            · {formatDay(b.slot.startsAt, now)}, {formatTime(b.slot.startsAt)}
          </p>
          <p className="mt-1 text-xs text-ink-muted">
            Ref <span className="font-mono text-ink">{b.reference}</span> · Paid {formatPrice(b.totalPaid)} · {b.slot.business.address}, {b.slot.business.postcode}
          </p>
          {b.status === "CANCELLED" && (
            <p className="mt-1 text-xs text-ink">
              {b.refundStatus === "SUCCEEDED"
                ? `Refunded ${formatPrice(b.refundedAmount)}${b.cancelledBy === "BUSINESS" ? " (cancelled by the business)" : ""}. Refunds take 5 to 10 days to reach your account.`
                : b.refundStatus === "PENDING" || b.refundStatus === "FAILED"
                  ? "Refund in progress."
                  : null}
            </p>
          )}
        </div>
      </div>
      {isUpcoming && (
        <div className="shrink-0 sm:text-right">
          {cancellable ? (
            <CancelBooking bookingId={b.id} refundLabel={formatPrice(b.totalPaid)} />
          ) : (
            <p className="max-w-[16rem] text-xs text-ink-muted">Less than {CANCELLATION_WINDOW_HOURS} hours to go, so this booking can no longer be cancelled.</p>
          )}
        </div>
      )}
    </li>
  );
}
