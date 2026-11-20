import type { PayoutStatus, PrismaClient } from "@prisma/client";
import { prisma as defaultPrisma } from "./db";
import { DomainError } from "./errors";
import { getPaymentProvider, type PaymentProvider } from "./payments";
import { issueRefund, releaseExpiredHolds } from "./bookings";

/** A booking auto-completes this long after the appointment ends, if the business hasn't marked it. */
export const AUTO_COMPLETE_HOURS = 48;

type Deps = { db?: PrismaClient; payments?: PaymentProvider; now?: Date };
const resolve = (deps: Deps) => ({
  db: deps.db ?? defaultPrisma,
  payments: deps.payments ?? getPaymentProvider(),
  now: deps.now ?? new Date(),
});

const PAYABLE_FROM: PayoutStatus[] = ["NOT_DUE", "ON_HOLD", "FAILED"];
const OPEN_DISPUTE = ["warning_needs_response", "warning_under_review", "needs_response", "under_review"];

async function loadOwnedBooking(db: PrismaClient, ownerId: string, bookingId: string) {
  const booking = await db.booking.findUnique({ where: { id: bookingId }, include: { slot: { include: { business: true } } } });
  // Same error whether it doesn't exist or isn't theirs.
  if (!booking || booking.slot.business.ownerId !== ownerId) throw new DomainError("FORBIDDEN", "You can't manage this booking.");
  return booking;
}

/**
 * Business marks a booking as completed or a no-show. Either way the customer
 * isn't refunded and the business is paid its share (GETTABLE keeps the commission).
 */
export async function markOutcome(ownerId: string, bookingId: string, outcome: "COMPLETED" | "NO_SHOW", deps: Deps = {}) {
  const { db, payments, now } = resolve(deps);
  const booking = await loadOwnedBooking(db, ownerId, bookingId);
  if (booking.status !== "CONFIRMED") throw new DomainError("INVALID_STATE", "This booking has already been closed.");
  if (booking.slot.startsAt > now) throw new DomainError("INVALID_STATE", "You can mark this once the appointment has started.");

  const changed = await db.booking.updateMany({
    where: { id: bookingId, status: "CONFIRMED" },
    data: { status: outcome, completedAt: now },
  });
  if (changed.count !== 1) throw new DomainError("INVALID_STATE", "This booking has already been closed.");
  return payoutBooking(bookingId, { db, payments, now });
}

/**
 * Business cancels a confirmed booking before it starts: the customer gets a
 * full refund, nothing is paid out, and the slot is withdrawn.
 */
export async function cancelByBusiness(ownerId: string, bookingId: string, deps: Deps = {}) {
  const { db, payments, now } = resolve(deps);
  const booking = await loadOwnedBooking(db, ownerId, bookingId);
  if (booking.status !== "CONFIRMED") throw new DomainError("INVALID_STATE", "Only confirmed bookings can be cancelled.");
  if (booking.slot.startsAt <= now) throw new DomainError("INVALID_STATE", "This appointment has already started.");

  await db.$transaction(async (tx) => {
    const changed = await tx.booking.updateMany({
      where: { id: bookingId, status: "CONFIRMED" },
      data: { status: "CANCELLED", cancelledBy: "BUSINESS", cancelledAt: now, refundStatus: "PENDING", payoutStatus: "NONE" },
    });
    if (changed.count !== 1) throw new DomainError("INVALID_STATE", "Only confirmed bookings can be cancelled.");
    await tx.slot.updateMany({ where: { id: booking.slotId, status: "BOOKED" }, data: { status: "CANCELLED" } });
  });
  return issueRefund(bookingId, { db, payments });
}

/**
 * Transfer the business's share for a completed (or no-show) booking.
 * Idempotent: guarded by a status claim and a per-booking Stripe idempotency key.
 */
export async function payoutBooking(bookingId: string, deps: Deps = {}) {
  const { db, payments, now } = resolve(deps);
  const booking = await db.booking.findUniqueOrThrow({ where: { id: bookingId }, include: { slot: { include: { business: true } } } });
  const business = booking.slot.business;

  if (booking.status !== "COMPLETED" && booking.status !== "NO_SHOW") return booking;
  if (booking.refundStatus !== "NONE") return booking;
  const stalledProcessing = booking.payoutStatus === "PROCESSING" && booking.updatedAt.getTime() < now.getTime() - 10 * 60_000;
  if (!PAYABLE_FROM.includes(booking.payoutStatus) && !stalledProcessing) return booking;

  const disputed = booking.disputeStatus != null && OPEN_DISPUTE.includes(booking.disputeStatus);
  const notConnected = payments.requiresConnectedAccount && (!business.stripeAccountId || !business.payoutsEnabled);
  if (disputed || notConnected) {
    return db.booking.update({
      where: { id: bookingId },
      data: { payoutStatus: "ON_HOLD", payoutError: disputed ? "Payment is disputed" : "Business hasn't finished Stripe setup" },
    });
  }

  const claimed = await db.booking.updateMany({
    where: { id: bookingId, payoutStatus: booking.payoutStatus, updatedAt: booking.updatedAt },
    data: { payoutStatus: "PROCESSING", payoutError: null },
  });
  if (claimed.count !== 1) return db.booking.findUniqueOrThrow({ where: { id: bookingId } });

  try {
    const { transferId } = await payments.transfer({
      amountPence: booking.businessAmount,
      destination: business.stripeAccountId,
      sourceChargeId: booking.chargeId,
      transferGroup: booking.reference,
      idempotencyKey: `payout-${booking.id}`,
      metadata: { bookingId: booking.id, reference: booking.reference, businessId: business.id },
    });
    return db.booking.update({ where: { id: bookingId }, data: { payoutStatus: "PAID", transferId, paidOutAt: now } });
  } catch (e) {
    console.error(`Payout failed for ${booking.reference}`, e);
    const message = e instanceof Error ? e.message.slice(0, 300) : "Transfer failed";
    return db.booking.update({ where: { id: bookingId }, data: { payoutStatus: "FAILED", payoutError: message } });
  }
}

/**
 * Admin-only: refund a booking after the business was paid (e.g. a complaint).
 * Reverses the business's transfer, then refunds the customer in full.
 */
export async function refundAfterCompletion(bookingId: string, deps: Deps = {}) {
  const { db, payments, now } = resolve(deps);
  const booking = await db.booking.findUniqueOrThrow({ where: { id: bookingId } });
  if (booking.status !== "COMPLETED" && booking.status !== "NO_SHOW") throw new DomainError("INVALID_STATE", "Only completed bookings use this refund.");
  if (booking.refundStatus === "SUCCEEDED") return booking;

  if (booking.payoutStatus === "PAID" && booking.transferId) {
    await payments.reverseTransfer({ transferId: booking.transferId, amountPence: booking.businessAmount, idempotencyKey: `reverse-${booking.id}` });
    await db.booking.update({ where: { id: bookingId }, data: { payoutStatus: "REVERSED" } });
  } else if (booking.payoutStatus !== "REVERSED") {
    // Not paid yet: make sure it never is.
    await db.booking.update({ where: { id: bookingId }, data: { payoutStatus: "NONE" } });
  }
  await db.booking.update({ where: { id: bookingId }, data: { refundStatus: "PENDING", cancelledBy: "PLATFORM", cancelledAt: now } });
  return issueRefund(bookingId, { db, payments });
}

/**
 * Scheduled job (every ~15 minutes): release lapsed holds, auto-complete old
 * bookings, pay out what's due (including retries) and retry failed refunds.
 */
export async function runPaymentJobs(deps: Deps = {}) {
  const { db, payments, now } = resolve(deps);
  const released = await releaseExpiredHolds({ db, now });

  const cutoff = new Date(now.getTime() - AUTO_COMPLETE_HOURS * 3_600_000);
  const overdue = await db.booking.findMany({ where: { status: "CONFIRMED", slot: { startsAt: { lte: cutoff } } }, include: { slot: true } });
  let autoCompleted = 0;
  for (const b of overdue) {
    const endsAt = b.slot.startsAt.getTime() + b.slot.durationMins * 60_000;
    if (endsAt + AUTO_COMPLETE_HOURS * 3_600_000 > now.getTime()) continue;
    const r = await db.booking.updateMany({ where: { id: b.id, status: "CONFIRMED" }, data: { status: "COMPLETED", completedAt: now, autoCompleted: true } });
    autoCompleted += r.count;
  }

  const due = await db.booking.findMany({
    where: { status: { in: ["COMPLETED", "NO_SHOW"] }, refundStatus: "NONE", payoutStatus: { in: [...PAYABLE_FROM, "PROCESSING"] } },
    select: { id: true },
  });
  let paid = 0;
  for (const { id } of due) {
    const b = await payoutBooking(id, { db, payments, now });
    if (b.payoutStatus === "PAID") paid++;
  }

  const refunds = await db.booking.findMany({
    where: { OR: [{ refundStatus: "FAILED" }, { refundStatus: "PENDING", updatedAt: { lt: new Date(now.getTime() - 5 * 60_000) } }] },
    select: { id: true },
  });
  for (const { id } of refunds) await issueRefund(id, { db, payments });

  return { released, autoCompleted, payoutsAttempted: due.length, paid, refundsRetried: refunds.length };
}

/** Keep our records in step with refunds made directly in the Stripe Dashboard. */
export async function syncRefundFromStripe(paymentRef: string, amountRefunded: number, deps: Deps = {}) {
  const { db } = resolve(deps);
  const booking = await db.booking.findFirst({ where: { paymentRef } });
  if (!booking || amountRefunded <= booking.refundedAmount) return;
  await db.booking.update({
    where: { id: booking.id },
    data: {
      refundedAmount: amountRefunded,
      refundStatus: amountRefunded >= booking.totalPaid ? "SUCCEEDED" : booking.refundStatus,
      // A refund made outside our flows: never pay this booking out automatically.
      ...(booking.payoutStatus !== "PAID" && booking.payoutStatus !== "REVERSED"
        ? { payoutStatus: "NONE" as const, payoutError: "Refunded in the Stripe Dashboard. Review manually." }
        : {}),
    },
  });
}

/** Record dispute (chargeback) state. Open disputes hold the payout. */
export async function syncDispute(chargeId: string, status: string, deps: Deps = {}) {
  const { db } = resolve(deps);
  const booking = await db.booking.findFirst({ where: { chargeId } });
  if (!booking) return;
  const open = OPEN_DISPUTE.includes(status);
  await db.booking.update({
    where: { id: booking.id },
    data: {
      disputeStatus: status,
      ...(open && booking.payoutStatus !== "PAID" && booking.payoutStatus !== "REVERSED" ? { payoutStatus: "ON_HOLD" as const, payoutError: "Payment is disputed" } : {}),
      // Lost dispute: the money went back to the customer, so nothing is owed.
      ...(status === "lost" && booking.payoutStatus !== "PAID" ? { payoutStatus: "NONE" as const } : {}),
    },
  });
}
