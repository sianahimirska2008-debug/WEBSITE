import { getStripe, isStripeConfigured } from "@/lib/stripe/client";
import { handleStripeEvent } from "@/lib/stripe/webhooks";

/**
 * Stripe webhook endpoint. The raw body is verified against the signing secret
 * before anything is trusted; unsigned or tampered requests are rejected.
 */
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!isStripeConfigured() || !secret) {
    return Response.json({ error: "Stripe webhooks are not configured" }, { status: 503 });
  }
  const signature = request.headers.get("stripe-signature");
  if (!signature) return Response.json({ error: "Missing signature" }, { status: 400 });

  const payload = await request.text();
  let event;
  try {
    event = getStripe().webhooks.constructEvent(payload, signature, secret);
  } catch {
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    const result = await handleStripeEvent(event);
    return Response.json({ received: true, ...result });
  } catch (err) {
    console.error(`Webhook ${event.type} (${event.id}) failed`, err);
    // 500 makes Stripe retry later; handlers are idempotent.
    return Response.json({ error: "Handler failed" }, { status: 500 });
  }
}
