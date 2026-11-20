import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import Stripe from "stripe";
import { prisma } from "@/lib/db";
import { startCheckout } from "@/lib/bookings";
import type { MockPaymentProvider } from "@/lib/payments/mock";
import { fixture, mockPayments } from "./helpers";

const SECRET = "whsec_test_secret";
const stripe = new Stripe("sk_test_dummy");
let payments: MockPaymentProvider;

beforeAll(() => {
  process.env.STRIPE_SECRET_KEY = "sk_test_dummy"; // signature check is offline
  process.env.STRIPE_WEBHOOK_SECRET = SECRET;
});
afterAll(() => {
  process.env.STRIPE_SECRET_KEY = "";
  delete process.env.STRIPE_WEBHOOK_SECRET;
});
beforeEach(() => {
  payments = mockPayments();
});

async function post(body: string, signature: string | null) {
  const { POST } = await import("@/app/api/stripe/webhook/route");
  const headers = new Headers({ "content-type": "application/json" });
  if (signature) headers.set("stripe-signature", signature);
  return POST(new Request("http://localhost/api/stripe/webhook", { method: "POST", body, headers }));
}

function event(id: string, type: string, object: object) {
  return JSON.stringify({ id, object: "event", type, api_version: "2026-10-28.endive", created: Math.floor(Date.now() / 1000), data: { object } });
}

describe("Stripe webhook endpoint", () => {
  it("rejects missing or forged signatures", async () => {
    const body = event("evt_forged", "checkout.session.expired", { id: "cs_x", object: "checkout.session" });
    expect((await post(body, null)).status).toBe(400);
    const forged = stripe.webhooks.generateTestHeaderString({ payload: body, secret: "whsec_wrong" });
    expect((await post(body, forged)).status).toBe(400);
  });

  it("handles a signed event once and skips duplicates", async () => {
    const { alice, slot } = await fixture();
    const co = await startCheckout({ userId: alice.id, userEmail: alice.email, slotId: slot.id }, { payments });
    const body = event(`evt_${co.sessionId}`, "checkout.session.expired", { id: co.sessionId, object: "checkout.session" });
    const sig = stripe.webhooks.generateTestHeaderString({ payload: body, secret: SECRET });

    const res = await post(body, sig);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ received: true, duplicate: false });
    expect((await prisma.slot.findUniqueOrThrow({ where: { id: slot.id } })).status).toBe("OPEN");
    expect((await prisma.booking.findUniqueOrThrow({ where: { checkoutSessionId: co.sessionId } })).status).toBe("EXPIRED");

    const again = await post(body, stripe.webhooks.generateTestHeaderString({ payload: body, secret: SECRET }));
    expect(await again.json()).toMatchObject({ duplicate: true });
  });
});
