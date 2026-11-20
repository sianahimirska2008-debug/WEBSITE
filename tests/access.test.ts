import { beforeEach, describe, expect, it } from "vitest";
import { createSlot, listBusinessBookings, removeSlot, updateSlot } from "@/lib/business";
import { fulfillCheckout, startCheckout } from "@/lib/bookings";
import { cancelByBusiness, markOutcome } from "@/lib/payouts";
import type { MockPaymentProvider } from "@/lib/payments/mock";
import { fixture, mockPayments, HOUR } from "./helpers";

let payments: MockPaymentProvider;
beforeEach(() => {
  payments = mockPayments();
});

describe("only the business owner can manage their slots and bookings", () => {
  it("blocks another business owner on every action", async () => {
    const mine = await fixture({ hoursAhead: 3 });
    const theirs = await fixture();
    const co = await startCheckout({ userId: mine.alice.id, userEmail: mine.alice.email, slotId: mine.slot.id }, { payments });
    await payments.simulatePayment(co.sessionId, "4242424242424242");
    const booking = (await fulfillCheckout(co.sessionId, { payments }))!;
    const later = new Date(mine.slot.startsAt.getTime() + HOUR);
    const input = { treatmentId: mine.treatment.id, startsAt: new Date(Date.now() + 72 * HOUR), durationMins: 60, originalPrice: 5000, price: 3000 };

    await expect(markOutcome(theirs.owner.id, booking.id, "COMPLETED", { payments, now: later })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(cancelByBusiness(theirs.owner.id, booking.id, { payments })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(createSlot(theirs.owner.id, mine.business.id, input)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(updateSlot(theirs.owner.id, theirs.slot.id.replace(/.*/, mine.slot.id), input)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(removeSlot(theirs.owner.id, mine.slot.id)).rejects.toMatchObject({ code: "FORBIDDEN" });
    // Customers aren't owners either.
    await expect(markOutcome(mine.alice.id, booking.id, "COMPLETED", { payments, now: later })).rejects.toMatchObject({ code: "FORBIDDEN" });

    const visible = await listBusinessBookings(theirs.owner.id);
    expect(visible.find((b) => b.id === booking.id)).toBeUndefined();
    expect((await listBusinessBookings(mine.owner.id)).map((b) => b.id)).toContain(booking.id);
  });

  it("owner can post a slot, but not a free or more-expensive 'discount'", async () => {
    const { owner, business, treatment } = await fixture();
    const base = { treatmentId: treatment.id, startsAt: new Date(Date.now() + 72 * HOUR), durationMins: 60, originalPrice: 5000 };
    await expect(createSlot(owner.id, business.id, { ...base, price: 3000 })).resolves.toMatchObject({ price: 3000 });
    await expect(createSlot(owner.id, business.id, { ...base, price: 6000 })).rejects.toMatchObject({ code: "VALIDATION" });
    await expect(createSlot(owner.id, business.id, { ...base, startsAt: new Date(Date.now() - HOUR), price: 3000 })).rejects.toMatchObject({ code: "VALIDATION" });
  });
});
