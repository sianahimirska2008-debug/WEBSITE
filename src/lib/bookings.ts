import type { PrismaClient } from "@prisma/client";
import { prisma as defaultPrisma } from "./db";
import { DomainError } from "./errors";
import { generateReference } from "./reference";
import { getPaymentProvider, type PaymentProvider } from "./payments";

export const CANCELLATION_WINDOW_HOURS = 24;

type Deps = { db?: PrismaClient; payments?: PaymentProvider; now?: Date };

/**
 * Book a slot. The slot is claimed with a conditional update
 * (status OPEN and in the future → BOOKED) inside a transaction together with
 * the booking insert, so two concurrent requests can never both succeed.
 */
export async function bookSlot(
  input: { userId: string; userEmail: string; slotId: string; paymentToken: string },
  deps: Deps = {},
) {
  const db = deps.db ?? defaultPrisma;
  const payments = deps.payments ?? getPaymentProvider();
  const now = deps.now ?? new Date();

  const slot = await db.slot.findUnique({
    where: { id: input.slotId },
    include: { treatment: true, business: true },
  });
  if (!slot) throw new DomainError("NOT_FOUND", "This slot doesn't exist.");
  if (slot.startsAt <= now) throw new DomainError("SLOT_IN_PAST", "This slot has already started.");
  if (slot.status !== "OPEN") throw new DomainError("SLOT_UNAVAILABLE", "Sorry, this slot has just been taken.");

  const reference = generateReference();
  const charge = await payments.charge({
    amountPence: slot.price,
    currency: "GBP",
    description: `${slot.treatment.name} at ${slot.business.name}`,
    customerEmail: input.userEmail,
    paymentToken: input.paymentToken,
    idempotencyKey: `${input.userId}:${slot.id}:${reference}`,
  });
  if (!charge.ok) throw new DomainError("PAYMENT_FAILED", charge.error);

  try {
    return await db.$transaction(async (tx) => {
      const claimed = await tx.slot.updateMany({
        where: { id: slot.id, status: "OPEN", startsAt: { gt: now } },
        data: { status: "BOOKED" },
      });
      if (claimed.count !== 1) {
        throw new DomainError("SLOT_UNAVAILABLE", "Sorry, this slot has just been taken.");
      }
      return tx.booking.create({
        data: {
          userId: input.userId,
          slotId: slot.id,
          totalPaid: slot.price,
          reference,
          paymentRef: charge.paymentRef,
          status: "CONFIRMED",
        },
      });
    });
  } catch (err) {
    // Someone else got there first (or the DB failed): give the money back.
    await payments.refund(charge.paymentRef, slot.price);
    throw err;
  }
}

export function canCancel(startsAt: Date, now = new Date()): boolean {
  return startsAt.getTime() - now.getTime() >= CANCELLATION_WINDOW_HOURS * 3_600_000;
}

/** Customer cancels their own booking. Allowed up to 24h before; the slot reopens. */
export async function cancelBooking(input: { userId: string; bookingId: string }, deps: Deps = {}) {
  const db = deps.db ?? defaultPrisma;
  const payments = deps.payments ?? getPaymentProvider();
  const now = deps.now ?? new Date();

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

  const updated = await db.$transaction(async (tx) => {
    const changed = await tx.booking.updateMany({
      where: { id: booking.id, status: "CONFIRMED" },
      data: { status: "CANCELLED" },
    });
    if (changed.count !== 1) throw new DomainError("INVALID_STATE", "This booking can't be cancelled.");
    await tx.slot.updateMany({ where: { id: booking.slotId, status: "BOOKED" }, data: { status: "OPEN" } });
    return tx.booking.findUniqueOrThrow({ where: { id: booking.id } });
  });

  if (booking.paymentRef) await payments.refund(booking.paymentRef, booking.totalPaid);
  return updated;
}
