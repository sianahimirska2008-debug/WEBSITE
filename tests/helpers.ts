import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db";
import { MockPaymentProvider } from "@/lib/payments/mock";
import { setPaymentProvider } from "@/lib/payments";

export const HOUR = 3_600_000;

/** A business with an owner, one treatment, two customers and a slot `hoursAhead` from now. */
export async function fixture({ hoursAhead = 48, price = 4000 } = {}) {
  const id = randomUUID().slice(0, 8);
  const owner = await prisma.user.create({ data: { name: "Owner", email: `owner-${id}@t.dev`, passwordHash: "x", role: "BUSINESS" } });
  const business = await prisma.business.create({
    data: { ownerId: owner.id, name: `Biz ${id}`, slug: `biz-${id}`, type: "SALON", address: "1 Test St", lat: 51.5, lng: -0.1, payoutsEnabled: true, stripeAccountId: `acct_test_${id}` },
  });
  const treatment = await prisma.treatment.create({ data: { businessId: business.id, name: "Cut", category: "haircut", durationMins: 60, standardPrice: 5000 } });
  const alice = await prisma.user.create({ data: { name: "Alice", email: `alice-${id}@t.dev`, passwordHash: "x" } });
  const bob = await prisma.user.create({ data: { name: "Bob", email: `bob-${id}@t.dev`, passwordHash: "x" } });
  const slot = await prisma.slot.create({
    data: { businessId: business.id, treatmentId: treatment.id, startsAt: new Date(Date.now() + hoursAhead * HOUR), durationMins: 60, originalPrice: 5000, price },
  });
  return { owner, business, treatment, alice, bob, slot };
}

/** A fresh mock payment provider, installed as the app-wide provider. */
export function mockPayments() {
  const p = new MockPaymentProvider();
  setPaymentProvider(p);
  return p;
}
