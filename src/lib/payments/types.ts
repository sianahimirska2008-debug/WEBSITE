/**
 * Payment abstraction. The app only talks to this interface, so swapping the
 * mock for Stripe means adding a StripePaymentProvider and changing getPaymentProvider().
 */
export interface ChargeRequest {
  amountPence: number;
  currency: "GBP";
  description: string;
  customerEmail: string;
  /** Opaque token from the client-side payment form (mock: card number). */
  paymentToken: string;
  idempotencyKey: string;
}

export type ChargeResult =
  | { ok: true; paymentRef: string }
  | { ok: false; error: string };

export interface PaymentProvider {
  readonly name: string;
  charge(req: ChargeRequest): Promise<ChargeResult>;
  refund(paymentRef: string, amountPence: number): Promise<{ ok: boolean; error?: string }>;
}
