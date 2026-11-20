import type { PrismaClient } from "@prisma/client";
import { prisma as defaultPrisma } from "./db";
import { DomainError } from "./errors";
import { generateReference } from "./reference";
import { getPaymentProvider, type PaymentProvider } from "./payments";
import { splitPayment } from "./commission";
import { appUrl } from "./app-url";

export const CANCELLATION_WINDOW_HOURS = 24;
/** Stripe Checkout sessions must live at least 30 minutes. */
export const CHECKOUT_MINUTES = 30;
/** The slot hold outlives the checkout session, so a payment can never land after the hold lapses. */
export const HOLD_MINUTES = 35;

type Deps = { db?: PrismaClient; payments?: PaymentProvider; now?: Date };

const resolve = (deps: Deps) => ({
  db: deps.db ?? defaultPrisma,
  payments: deps.payments ?? getPaymentProvider(),
  now: deps.now ?? new Date(),
});

/** Free up slots whose payment hold has lapsed (abandoned checkouts). */
export async function releaseExpiredHolds(deps: Deps = {}) {
  const { db, now } = resolve(deps);
  const stale = await db.slot.findMany({ where: { status: "HELD", heldUntil: { lte: now } }, select: { id: true } });
  for (const { id } of stale) {
    await db.$transaction(async (tx) => {
      const released = await tx.slot.updateMany({ where: { id, status: "HELD", heldUntil: { lte: now } }, data: { status: "OPEN", heldUntil: null } });
      if (released.count === 1) {
        await tx.booking.updateMany({ where: { slotId: id, status: "PENDING_PAYMENT" }, data: { status: "EXPIRED", payoutStatus: "NONE" } });
      }
    });
  }
  return stale.length;
}

/**
 * Step 1 of booking: hold the slot for this customer and open a checkout.
 * The hold is a conditional update (OPEN → HELD) in the same transaction as the
 * pending booking, so two customers can never hold or pay for the same slot.
 */
export async function startCheckout(input: { userId: string; userEmail: string; slotId: string }, deps: Deps = {}) {
  const { db, payments, now } = resolve(deps);
  await releaseExpiredHolds({ db, now });

  const slot = await db.slot.findUnique({ where: { id: input.slotId }, include: { treatment: true, business: true } });
  if (!slot) throw new DomainError("NOT_FOUND", "This slot doesn't exist.");
  if (slot.startsAt <= now) throw new DomainError("SLOT_IN_PAST", "This slot has already started.");

  // Same customer starting again (e.g. went back and pressed Book twice): drop their old attempt.
  if (slot.status === "HELD") {
    const mine = await db.booking.findFirst({ where: { slotId: slot.id, userId: input.userId, status: "PENDING_PAYMENT" } });
    if (mine) await abandonCheckout(mine.id, { db, payments, now });
  }

  const { commission, businessAmount } = splitPayment(slot.price);
  const reference = generateReference();
  const booking = await db.$transaction(async (tx) => {
    const held = await tx.slot.updateMany({
      where: { id: slot.id, status: "OPEN", startsAt: { gt: now } },
      data: { status: "HELD", heldUntil: new Date(now.getTime() + HOLD_MINUTES * 60_000) },
    });
    if (held.count !== 1) throw new DomainError("SLOT_UNAVAILABLE", "Sorry, this slot has just been taken.");
    return tx.booking.create({
      data: {
        userId: input.userId,
        slotId: slot.id,
        status: "PENDING_PAYMENT",
        totalPaid: slot.price,
        commission,
        businessAmount,
        reference,
      },
    });
  });

  try {
    const session = await payments.createCheckout({
      bookingId: booking.id,
      reference,
      amountPence: slot.price,
      description: `${slot.treatment.name} at ${slot.business.name}`,
      customerEmail: input.userEmail,
      returnUrl: `${appUrl()}/book/return?session_id={CHECKOUT_SESSION_ID}`,
      expiresAt: new Date(now.getTime() + CHECKOUT_MINUTES * 60_000),
      metadata: { bookingId: booking.id, reference, slotId: slot.id, businessId: slot.businessId },
    });
    await db.booking.update({ where: { id: booking.id }, data: { checkoutSessionId: session.sessionId } });
    return { bookingId: booking.id, reference, sessionId: session.sessionId, clientSecret: session.clientSecret, holdMinutes: CHECKOUT_MINUTES };
  } catch (err) {
    await abandonCheckout(booking.id, { db, payments, now });
    if (err instanceof DomainError) throw err;
    console.error("createCheckout failed", err);
    throw new DomainError("PAYMENT_FAILED", "We couldn't start the payment. Please try again.");
  }
}

/** Cancel a pending checkout and release its slot. */
async function abandonCheckout(bookingId: string, deps: Required<Deps>) {
  const { db, payments } = deps;
  const booking = await db.booking.findUnique({ where: { id: bookingId } });
  if (!booking || booking.status !== "PENDING_PAYMENT") return;
  if (booking.checkoutSessionId) {
    try {
      await payments.expireCheckout(booking.checkoutSessionId);
    } catch (e) {
      console.warn("expireCheckout failed", e);
    }
  }
  await db.$transaction(async (tx) => {
    const changed = await tx.booking.updateMany({ where: { id: bookingId, status: "PENDING_PAYMENT" }, data: { status: "EXPIRED", payoutStatus: "NONE" } });
    if (changed.count === 1) await tx.slot.updateMany({ where: { id: booking.slotId, status: "HELD" }, data: { status: "OPEN", heldUntil: null } });
  });
}

/**
 * Step 2 of booking: confirm once the payment has succeeded. Safe to call any
 * number of times; it's run by both the Stripe webhook and the return page.
 * Always asks the payment provider, never trusts the browser.
 */
export async function fulfillCheckout(sessionId: string, deps: Deps = {}) {
  const { db, payments } = resolve(deps);
  const booking = await db.booking.findUnique({ where: { checkoutSessionId: sessionId } });
  if (!booking) return null;
  if (booking.status !== "PENDING_PAYMENT" && booking.status !== "EXPIRED") return booking;

  const cs = await payments.getCheckout(sessionId);
  if (!cs.paid) return booking;
  if (cs.amountTotal != null && cs.amountTotal !== booking.totalPaid) {
    console.error(`Amount mismatch for ${booking.reference}: paid ${cs.amountTotal}, expected ${booking.totalPaid}`);
  }

  const confirmed = await db.$transaction(async (tx) => {
    const ok = await tx.booking.updateMany({
      where: { id: booking.id, status: "PENDING_PAYMENT" },
      data: { status: "CONFIRMED", paymentRef: cs.paymentRef, chargeId: cs.chargeId },
    });
    if (ok.count !== 1) return false;
    await tx.slot.updateMany({ where: { id: booking.slotId, status: "HELD" }, data: { status: "BOOKED", heldUntil: null } });
    return true;
  });

  if (!confirmed) {
    // Paid, but the hold had already been released. Refund in full; never double-book.
    const fresh = await db.booking.findUniqueOrThrow({ where: { id: booking.id } });
    if (fresh.status === "EXPIRED" && fresh.refundStatus === "NONE" && cs.paymentRef) {
      await db.booking.update({
        where: { id: booking.id },
        data: { status: "CANCELLED", cancelledBy: "PLATFORM", cancelledAt: new Date(), paymentRef: cs.paymentRef, chargeId: cs.chargeId, refundStatus: "PENDING", payoutStatus: "NONE" },
      });
      await issueRefund(booking.id, { db, payments });
    }
  }
  return db.booking.findUniqueOrThrow({ where: { id: booking.id } });
}

/** Stripe told us a checkout session expired without payment. */
export async function expireCheckoutSession(sessionId: string, deps: Deps = {}) {
  const { db } = resolve(deps);
  const booking = await db.booking.findUnique({ where: { checkoutSessionId: sessionId } });
  if (!booking) return;
  await db.$transaction(async (tx) => {
    const changed = await tx.booking.updateMany({ where: { id: booking.id, status: "PENDING_PAYMENT" }, data: { status: "EXPIRED", payoutStatus: "NONE" } });
    if (changed.count === 1) await tx.slot.updateMany({ where: { id: booking.slotId, status: "HELD" }, data: { status: "OPEN", heldUntil: null } });
  });
}

export function canCancel(startsAt: Date, now = new Date()): boolean {
  return startsAt.getTime() - now.getTime() >= CANCELLATION_WINDOW_HOURS * 3_600_000;
}

/** Refund whatever is still unrefunded on a booking. Idempotent per booking. */
export async function issueRefund(bookingId: string, deps: Deps = {}) {
  const { db, payments } = resolve(deps);
  const booking = await db.booking.findUniqueOrThrow({ where: { id: bookingId } });
  if (booking.refundStatus === "SUCCEEDED" || booking.refundStatus === "NONE") return booking;
  const amount = booking.totalPaid - booking.refundedAmount;
  if (!booking.paymentRef || amount <= 0) {
    return db.booking.update({ where: { id: bookingId }, data: { refundStatus: "SUCCEEDED" } });
  }
  try {
    const { refundId } = await payments.refund({
      paymentRef: booking.paymentRef,
      amountPence: amount,
      idempotencyKey: `refund-${booking.id}`,
      metadata: { bookingId: booking.id, reference: booking.reference },
    });
    return db.booking.update({ where: { id: bookingId }, data: { refundStatus: "SUCCEEDED", refundId, refundedAmount: booking.totalPaid } });
  } catch (e) {
    console.error(`Refund failed for ${booking.reference}`, e);
    // The payouts job retries FAILED refunds.
    return db.booking.update({ where: { id: bookingId }, data: { refundStatus: "FAILED" } });
  }
}

/** Customer cancels their own booking. Allowed up to 24h before; full refund; the slot reopens. */
export async function cancelBooking(input: { userId: string; bookingId: string }, deps: Deps = {}) {
  const { db, payments, now } = resolve(deps);

  const booking = await db.booking.findUnique({ where: { id: input.bookingId }, include: { slot: true } });
  // Don't reveal whether someone else's booking exists.
  if (!booking || booking.userId !== input.userId) throw new DomainError("NOT_FOUND", "Booking not found.");
  if (booking.status !== "CONFIRMED") throw new DomainError("INVALID_STATE", "This booking can't be cancelled.");
  if (!canCancel(booking.slot.startsAt, now)) {
    throw new DomainError(
      "CANCELLATION_WINDOW_CLOSED",
      `Bookings can only be cancelled up to ${CANCELLATION_WINDOW_HOURS} hours before the appointment.`,
    );
  }

  await db.$transaction(async (tx) => {
    const changed = await tx.booking.updateMany({
      where: { id: booking.id, status: "CONFIRMED" },
      data: { status: "CANCELLED", cancelledBy: "CUSTOMER", cancelledAt: now, refundStatus: "PENDING", payoutStatus: "NONE" },
    });
    if (changed.count !== 1) throw new DomainError("INVALID_STATE", "This booking can't be cancelled.");
    await tx.slot.updateMany({ where: { id: booking.slotId, status: "BOOKED" }, data: { status: "OPEN" } });
  });

  return issueRefund(booking.id, { db, payments });
}
