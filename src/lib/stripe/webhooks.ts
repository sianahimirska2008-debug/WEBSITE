import type Stripe from "stripe";
import { prisma } from "../db";
import { expireCheckoutSession, fulfillCheckout } from "../bookings";
import { syncDispute, syncRefundFromStripe } from "../payouts";

/**
 * Handle one verified Stripe event. Every handler is idempotent, and processed
 * event ids are recorded so retries and duplicates are skipped.
 */
export async function handleStripeEvent(event: Stripe.Event) {
  const seen = await prisma.stripeEvent.findUnique({ where: { id: event.id } });
  if (seen) return { duplicate: true };

  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const session = event.data.object;
      if (session.payment_status === "paid") await fulfillCheckout(session.id);
      break;
    }
    case "checkout.session.expired":
    case "checkout.session.async_payment_failed":
      await expireCheckoutSession(event.data.object.id);
      break;
    case "charge.refunded": {
      const charge = event.data.object;
      const pi = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
      if (pi) await syncRefundFromStripe(pi, charge.amount_refunded);
      break;
    }
    case "charge.dispute.created":
    case "charge.dispute.updated":
    case "charge.dispute.closed": {
      const dispute = event.data.object;
      const chargeId = typeof dispute.charge === "string" ? dispute.charge : dispute.charge.id;
      await syncDispute(chargeId, dispute.status);
      break;
    }
    default:
      // Not subscribed / not needed; acknowledge so Stripe stops retrying.
      break;
  }

  await prisma.stripeEvent.upsert({ where: { id: event.id }, create: { id: event.id, type: event.type }, update: {} });
  return { duplicate: false };
}
