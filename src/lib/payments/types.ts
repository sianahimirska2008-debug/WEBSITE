/**
 * Payment abstraction. Booking/payout logic only talks to this interface.
 * - StripePaymentProvider: real Stripe (Checkout + Connect separate charges and transfers)
 * - MockPaymentProvider: no keys needed; used for local demo and tests
 */

export interface CheckoutRequest {
  bookingId: string;
  reference: string;
  amountPence: number;
  description: string;
  customerEmail: string;
  /** Where Stripe sends the customer after paying. Must contain {CHECKOUT_SESSION_ID}. */
  returnUrl: string;
  expiresAt: Date;
  metadata: Record<string, string>;
}

export interface CheckoutSession {
  sessionId: string;
  /** For Stripe embedded Checkout; null for the mock provider */
  clientSecret: string | null;
}

export interface CheckoutStatus {
  status: "open" | "complete" | "expired";
  paid: boolean;
  paymentRef: string | null;
  chargeId: string | null;
  amountTotal: number | null;
}

export interface RefundRequest {
  paymentRef: string;
  amountPence: number;
  idempotencyKey: string;
  metadata: Record<string, string>;
}

export interface TransferRequest {
  amountPence: number;
  /** Connected account id (acct_...) */
  destination: string | null;
  /** The customer's charge; Stripe waits for it to settle before moving funds */
  sourceChargeId: string | null;
  transferGroup: string;
  idempotencyKey: string;
  metadata: Record<string, string>;
}

export interface PaymentProvider {
  readonly name: "stripe" | "mock";
  /** Whether a business needs an active connected account before it can be paid */
  readonly requiresConnectedAccount: boolean;
  createCheckout(req: CheckoutRequest): Promise<CheckoutSession>;
  getCheckout(sessionId: string): Promise<CheckoutStatus>;
  expireCheckout(sessionId: string): Promise<void>;
  refund(req: RefundRequest): Promise<{ refundId: string }>;
  transfer(req: TransferRequest): Promise<{ transferId: string }>;
  reverseTransfer(req: { transferId: string; amountPence: number; idempotencyKey: string }): Promise<{ reversalId: string }>;
}
