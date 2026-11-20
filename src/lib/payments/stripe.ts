import type Stripe from "stripe";
import type { CheckoutRequest, CheckoutSession, CheckoutStatus, PaymentProvider, RefundRequest, TransferRequest } from "./types";

/**
 * Stripe Connect, "separate charges and transfers":
 * the customer pays GETTABLE; when the booking is completed GETTABLE transfers
 * the business's 85% to its connected account, tied to the original charge.
 */
export class StripePaymentProvider implements PaymentProvider {
  readonly name = "stripe" as const;
  readonly requiresConnectedAccount = true;

  constructor(private stripe: Stripe) {}

  async createCheckout(req: CheckoutRequest): Promise<CheckoutSession> {
    const session = await this.stripe.checkout.sessions.create(
      {
        mode: "payment",
        ui_mode: "embedded_page",
        return_url: req.returnUrl,
        customer_email: req.customerEmail || undefined,
        client_reference_id: req.bookingId,
        expires_at: Math.floor(req.expiresAt.getTime() / 1000),
        // Cards (incl. Apple Pay / Google Pay). Settles instantly, so a confirmed
        // booking is always backed by a successful payment.
        allowed_payment_method_types: ["card"],
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: "gbp",
              unit_amount: req.amountPence,
              product_data: { name: req.description },
            },
          },
        ],
        payment_intent_data: {
          transfer_group: req.reference,
          description: `${req.description} (${req.reference})`,
          metadata: req.metadata,
        },
        metadata: req.metadata,
      },
      { idempotencyKey: `checkout-${req.bookingId}` },
    );
    return { sessionId: session.id, clientSecret: session.client_secret };
  }

  async getCheckout(sessionId: string): Promise<CheckoutStatus> {
    const s = await this.stripe.checkout.sessions.retrieve(sessionId, { expand: ["payment_intent"] });
    const pi = typeof s.payment_intent === "object" ? (s.payment_intent as Stripe.PaymentIntent | null) : null;
    const chargeId = pi ? (typeof pi.latest_charge === "string" ? pi.latest_charge : (pi.latest_charge?.id ?? null)) : null;
    return {
      status: (s.status ?? "open") as CheckoutStatus["status"],
      paid: s.payment_status === "paid",
      paymentRef: pi?.id ?? (typeof s.payment_intent === "string" ? s.payment_intent : null),
      chargeId,
      amountTotal: s.amount_total,
    };
  }

  async expireCheckout(sessionId: string) {
    const s = await this.stripe.checkout.sessions.retrieve(sessionId);
    if (s.status === "open") await this.stripe.checkout.sessions.expire(sessionId);
  }

  async refund(req: RefundRequest) {
    const refund = await this.stripe.refunds.create(
      { payment_intent: req.paymentRef, amount: req.amountPence, metadata: req.metadata },
      { idempotencyKey: req.idempotencyKey },
    );
    return { refundId: refund.id };
  }

  async transfer(req: TransferRequest) {
    if (!req.destination) throw new Error("Business has no connected Stripe account");
    const transfer = await this.stripe.transfers.create(
      {
        amount: req.amountPence,
        currency: "gbp",
        destination: req.destination,
        transfer_group: req.transferGroup,
        // Funds move only once the customer's payment is available in GETTABLE's balance.
        ...(req.sourceChargeId ? { source_transaction: req.sourceChargeId } : {}),
        metadata: req.metadata,
      },
      { idempotencyKey: req.idempotencyKey },
    );
    return { transferId: transfer.id };
  }

  async reverseTransfer(req: { transferId: string; amountPence: number; idempotencyKey: string }) {
    const reversal = await this.stripe.transfers.createReversal(req.transferId, { amount: req.amountPence }, { idempotencyKey: req.idempotencyKey });
    return { reversalId: reversal.id };
  }
}
