import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { fulfillCheckout } from "@/lib/bookings";
import { PageBand } from "@/components/page-band";
import { AutoRefresh } from "@/components/auto-refresh";

export const metadata: Metadata = { title: "Confirming your booking" };

/**
 * Stripe sends the customer here after paying. We confirm with Stripe directly
 * (the webhook does the same; whichever is first wins, the other is a no-op).
 */
export default async function CheckoutReturnPage({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const { session_id: sessionId } = await searchParams;
  const user = await requireUser(sessionId ? `/book/return?session_id=${encodeURIComponent(sessionId)}` : "/bookings");
  if (!sessionId) redirect("/bookings");

  const existing = await prisma.booking.findUnique({ where: { checkoutSessionId: sessionId }, include: { slot: true } });
  if (!existing || existing.userId !== user.id) redirect("/bookings");

  const booking = (await fulfillCheckout(sessionId)) ?? existing;
  if (booking.status === "CONFIRMED") redirect(`/bookings?booked=${encodeURIComponent(booking.reference)}`);

  const title =
    booking.status === "PENDING_PAYMENT"
      ? "Confirming your payment"
      : booking.status === "CANCELLED" && booking.cancelledBy === "PLATFORM"
        ? "Sorry, this slot was taken"
        : "Your checkout has expired";
  const body =
    booking.status === "PENDING_PAYMENT"
      ? "This usually takes a few seconds. This page will update by itself."
      : booking.status === "CANCELLED"
        ? "Your payment went through just after the slot's hold ended and someone else booked it. We've refunded you in full. It can take 5 to 10 days to appear on your statement."
        : "You weren't charged. The slot has been released.";

  return (
    <>
      <PageBand>
        <h1 className="text-4xl text-on-band sm:text-5xl">{title}</h1>
      </PageBand>
      <div className="container-page py-10">
        <div className="card max-w-xl p-6 sm:p-8" role="status">
          <p className="text-ink">{body}</p>
          <p className="mt-2 text-sm text-ink-muted">
            Reference <span className="font-mono text-ink">{booking.reference}</span>
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/bookings" className="btn-primary">
              My bookings
            </Link>
            <Link href={`/slots/${booking.slotId}`} className="btn-secondary">
              Back to the slot
            </Link>
          </div>
        </div>
        {booking.status === "PENDING_PAYMENT" && <AutoRefresh everyMs={2000} maxTimes={15} />}
      </div>
    </>
  );
}
