import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { cancelBooking, fulfillCheckout, releaseExpiredHolds, startCheckout, HOLD_MINUTES } from "@/lib/bookings";
import { splitPayment } from "@/lib/commission";
import type { MockPaymentProvider } from "@/lib/payments/mock";
import { fixture, mockPayments, HOUR } from "./helpers";

let payments: MockPaymentProvider;
beforeEach(() => {
  payments = mockPayments();
});

async function payAndConfirm(userId: string, email: string, slotId: string) {
  const co = await startCheckout({ userId, userEmail: email, slotId }, { payments });
  await payments.simulatePayment(co.sessionId, "4242424242424242");
  return fulfillCheckout(co.sessionId, { payments });
}

describe("booking a slot", () => {
  it("holds the slot during checkout so nobody else can book it", async () => {
    const { alice, bob, slot } = await fixture();
    await startCheckout({ userId: alice.id, userEmail: alice.email, slotId: slot.id }, { payments });

    expect((await prisma.slot.findUniqueOrThrow({ where: { id: slot.id } })).status).toBe("HELD");
    await expect(startCheckout({ userId: bob.id, userEmail: bob.email, slotId: slot.id }, { payments })).rejects.toMatchObject({ code: "SLOT_UNAVAILABLE" });
  });

  it("never double-books when many customers try at once", async () => {
    const { slot } = await fixture();
    const users = await Promise.all(Array.from({ length: 6 }, (_, i) => prisma.user.create({ data: { name: `U${i}`, email: `race-${slot.id}-${i}@t.dev`, passwordHash: "x" } })));
    const results = await Promise.allSettled(users.map((u) => startCheckout({ userId: u.id, userEmail: u.email, slotId: slot.id }, { payments })));
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(await prisma.booking.count({ where: { slotId: slot.id, status: "PENDING_PAYMENT" } })).toBe(1);
  });

  it("confirms only after payment, records the 15% split, and only once", async () => {
    const { alice, slot } = await fixture({ price: 3550 });
    const co = await startCheckout({ userId: alice.id, userEmail: alice.email, slotId: slot.id }, { payments });

    const unpaid = await fulfillCheckout(co.sessionId, { payments });
    expect(unpaid?.status).toBe("PENDING_PAYMENT");

    await payments.simulatePayment(co.sessionId, "4242424242424242");
    const first = await fulfillCheckout(co.sessionId, { payments });
    const second = await fulfillCheckout(co.sessionId, { payments }); // webhook + return page both run
    expect(first?.status).toBe("CONFIRMED");
    expect(second?.status).toBe("CONFIRMED");
    expect(first?.commission).toBe(533); // 15% of £35.50 = £5.325 → 533p
    expect(first?.businessAmount).toBe(3550 - 533);
    expect(first?.chargeId).toMatch(/^mock_ch_/);
    expect((await prisma.slot.findUniqueOrThrow({ where: { id: slot.id } })).status).toBe("BOOKED");
    expect(await prisma.booking.count({ where: { slotId: slot.id, status: "CONFIRMED" } })).toBe(1);
  });

  it("rejects a declined card without booking", async () => {
    const { alice, slot } = await fixture();
    const co = await startCheckout({ userId: alice.id, userEmail: alice.email, slotId: slot.id }, { payments });
    expect(await payments.simulatePayment(co.sessionId, "4000000000000002")).toEqual({ ok: false, error: "Your card was declined." });
    expect((await fulfillCheckout(co.sessionId, { payments }))?.status).toBe("PENDING_PAYMENT");
  });

  it("releases abandoned holds, and refunds a payment that lands after the slot went to someone else", async () => {
    const { alice, bob, slot } = await fixture();
    const co = await startCheckout({ userId: alice.id, userEmail: alice.email, slotId: slot.id }, { payments });
    await payments.simulatePayment(co.sessionId, "4242424242424242"); // paid, but confirmation delayed

    const later = new Date(Date.now() + (HOLD_MINUTES + 1) * 60_000);
    await releaseExpiredHolds({ now: later });
    expect((await prisma.slot.findUniqueOrThrow({ where: { id: slot.id } })).status).toBe("OPEN");

    const bobs = await payAndConfirm(bob.id, bob.email, slot.id);
    expect(bobs?.status).toBe("CONFIRMED");

    const alices = await fulfillCheckout(co.sessionId, { payments });
    expect(alices?.status).toBe("CANCELLED");
    expect(alices?.refundStatus).toBe("SUCCEEDED");
    expect(payments.calls.refunds.at(-1)?.amountPence).toBe(slot.price);
    expect(await prisma.booking.count({ where: { slotId: slot.id, status: "CONFIRMED" } })).toBe(1);
  });

  it("can't book a slot in the past", async () => {
    const { alice, slot } = await fixture({ hoursAhead: -1 });
    await expect(startCheckout({ userId: alice.id, userEmail: alice.email, slotId: slot.id }, { payments })).rejects.toMatchObject({ code: "SLOT_IN_PAST" });
  });

  it("splits commission so the parts always add up", () => {
    for (const p of [1, 99, 1000, 3333, 3550, 9999, 12345]) {
      const s = splitPayment(p, 1500);
      expect(s.commission + s.businessAmount).toBe(p);
      expect(Math.abs(s.commission - p * 0.15)).toBeLessThanOrEqual(0.5);
    }
  });
});

describe("cancellation window", () => {
  it("lets a customer cancel 24h+ ahead: full refund, slot reopens, no payout", async () => {
    const { alice, slot } = await fixture({ hoursAhead: 30 });
    const booking = await payAndConfirm(alice.id, alice.email, slot.id);
    const cancelled = await cancelBooking({ userId: alice.id, bookingId: booking!.id }, { payments });
    expect(cancelled.status).toBe("CANCELLED");
    expect(cancelled.refundStatus).toBe("SUCCEEDED");
    expect(cancelled.refundedAmount).toBe(slot.price);
    expect(cancelled.payoutStatus).toBe("NONE");
    expect(payments.calls.refunds.at(-1)).toMatchObject({ amountPence: slot.price, idempotencyKey: `refund-${booking!.id}` });
    expect((await prisma.slot.findUniqueOrThrow({ where: { id: slot.id } })).status).toBe("OPEN");
  });

  it("refuses cancellation inside 24h (no refund)", async () => {
    const { alice, slot } = await fixture({ hoursAhead: 30 });
    const booking = await payAndConfirm(alice.id, alice.email, slot.id);
    await expect(cancelBooking({ userId: alice.id, bookingId: booking!.id }, { payments, now: new Date(Date.now() + 7 * HOUR) })).rejects.toMatchObject({
      code: "CANCELLATION_WINDOW_CLOSED",
    });
    expect(payments.calls.refunds).toHaveLength(0);
  });

  it("doesn't let one customer cancel another's booking", async () => {
    const { alice, bob, slot } = await fixture({ hoursAhead: 30 });
    const booking = await payAndConfirm(alice.id, alice.email, slot.id);
    await expect(cancelBooking({ userId: bob.id, bookingId: booking!.id }, { payments })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
