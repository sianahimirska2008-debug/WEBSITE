import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { fulfillCheckout, startCheckout } from "@/lib/bookings";
import { cancelByBusiness, markOutcome, refundAfterCompletion, runPaymentJobs } from "@/lib/payouts";
import type { MockPaymentProvider } from "@/lib/payments/mock";
import { fixture, mockPayments, HOUR } from "./helpers";

let payments: MockPaymentProvider;
beforeEach(() => {
  payments = mockPayments();
});

async function confirmedBooking(opts: { hoursAhead?: number; price?: number } = {}) {
  const f = await fixture({ hoursAhead: opts.hoursAhead ?? 2, price: opts.price ?? 4000 });
  const co = await startCheckout({ userId: f.alice.id, userEmail: f.alice.email, slotId: f.slot.id }, { payments });
  await payments.simulatePayment(co.sessionId, "4242424242424242");
  const booking = (await fulfillCheckout(co.sessionId, { payments }))!;
  return { ...f, booking, afterStart: new Date(f.slot.startsAt.getTime() + HOUR) };
}

describe("payouts to the business", () => {
  it("can't be marked completed before the appointment starts", async () => {
    const { owner, booking } = await confirmedBooking();
    await expect(markOutcome(owner.id, booking.id, "COMPLETED", { payments })).rejects.toMatchObject({ code: "INVALID_STATE" });
  });

  it("transfers 85%, tied to the customer's charge, exactly once", async () => {
    const { owner, business, booking, afterStart } = await confirmedBooking({ price: 4000 });
    const done = await markOutcome(owner.id, booking.id, "COMPLETED", { payments, now: afterStart });
    expect(done.status).toBe("COMPLETED");
    expect(done.payoutStatus).toBe("PAID");
    expect(payments.calls.transfers).toHaveLength(1);
    expect(payments.calls.transfers[0]).toMatchObject({
      amountPence: 3400,
      destination: business.stripeAccountId,
      sourceChargeId: booking.chargeId,
      transferGroup: booking.reference,
      idempotencyKey: `payout-${booking.id}`,
    });

    await expect(markOutcome(owner.id, booking.id, "COMPLETED", { payments, now: afterStart })).rejects.toMatchObject({ code: "INVALID_STATE" });
    await runPaymentJobs({ payments, now: afterStart });
    expect(payments.calls.transfers).toHaveLength(1);
  });

  it("pays out for a no-show too (no refund for the customer)", async () => {
    const { owner, booking, afterStart } = await confirmedBooking();
    const b = await markOutcome(owner.id, booking.id, "NO_SHOW", { payments, now: afterStart });
    expect(b.status).toBe("NO_SHOW");
    expect(b.payoutStatus).toBe("PAID");
    expect(payments.calls.refunds).toHaveLength(0);
  });

  it("holds the payout until the business finishes Stripe setup, then pays it", async () => {
    const { owner, business, booking, afterStart } = await confirmedBooking();
    await prisma.business.update({ where: { id: business.id }, data: { payoutsEnabled: false } });
    // Behave like Stripe: a connected account is required.
    Object.defineProperty(payments, "requiresConnectedAccount", { value: true });

    const held = await markOutcome(owner.id, booking.id, "COMPLETED", { payments, now: afterStart });
    expect(held.payoutStatus).toBe("ON_HOLD");
    expect(payments.calls.transfers).toHaveLength(0);

    await prisma.business.update({ where: { id: business.id }, data: { payoutsEnabled: true } });
    await runPaymentJobs({ payments, now: afterStart });
    expect((await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } })).payoutStatus).toBe("PAID");
  });

  it("retries a failed transfer with the same idempotency key", async () => {
    const { owner, booking, afterStart } = await confirmedBooking();
    payments.failNextTransfer = true;
    const failed = await markOutcome(owner.id, booking.id, "COMPLETED", { payments, now: afterStart });
    expect(failed.payoutStatus).toBe("FAILED");
    await runPaymentJobs({ payments, now: afterStart });
    const b = await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } });
    expect(b.payoutStatus).toBe("PAID");
    expect(payments.calls.transfers.at(-1)?.idempotencyKey).toBe(`payout-${booking.id}`);
  });

  it("auto-completes and pays 48 hours after the appointment ends", async () => {
    const { booking, slot } = await confirmedBooking();
    const end = slot.startsAt.getTime() + slot.durationMins * 60_000;
    await runPaymentJobs({ payments, now: new Date(end + 47 * HOUR) });
    expect((await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } })).status).toBe("CONFIRMED");
    await runPaymentJobs({ payments, now: new Date(end + 49 * HOUR) });
    const b = await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } });
    expect(b).toMatchObject({ status: "COMPLETED", autoCompleted: true, payoutStatus: "PAID" });
  });
});

describe("refunds", () => {
  it("business cancellation refunds the customer in full and pays nothing out", async () => {
    const { owner, booking, slot } = await confirmedBooking({ hoursAhead: 5 });
    const b = await cancelByBusiness(owner.id, booking.id, { payments });
    expect(b).toMatchObject({ status: "CANCELLED", cancelledBy: "BUSINESS", refundStatus: "SUCCEEDED", payoutStatus: "NONE", refundedAmount: slot.price });
    expect((await prisma.slot.findUniqueOrThrow({ where: { id: slot.id } })).status).toBe("CANCELLED");
    expect(payments.calls.transfers).toHaveLength(0);
  });

  it("refund after completion reverses the business transfer, then refunds the customer", async () => {
    const { owner, booking, afterStart } = await confirmedBooking();
    const paid = await markOutcome(owner.id, booking.id, "COMPLETED", { payments, now: afterStart });
    const r = await refundAfterCompletion(booking.id, { payments, now: afterStart });
    expect(payments.calls.reversals).toEqual([paid.transferId]);
    expect(r).toMatchObject({ payoutStatus: "REVERSED", refundStatus: "SUCCEEDED", refundedAmount: booking.totalPaid });
  });

  it("an open dispute holds the payout", async () => {
    const { owner, booking, afterStart } = await confirmedBooking();
    const { syncDispute } = await import("@/lib/payouts");
    await syncDispute(booking.chargeId!, "needs_response");
    const b = await markOutcome(owner.id, booking.id, "COMPLETED", { payments, now: afterStart });
    expect(b.payoutStatus).toBe("ON_HOLD");
    await syncDispute(booking.chargeId!, "won");
    await runPaymentJobs({ payments, now: afterStart });
    expect((await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } })).payoutStatus).toBe("PAID");
  });
});
