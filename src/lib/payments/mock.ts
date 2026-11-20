import { randomUUID } from "node:crypto";
import type { CheckoutRequest, CheckoutSession, CheckoutStatus, PaymentProvider, RefundRequest, TransferRequest } from "./types";

/** Test card that always declines, mirroring Stripe's test-card convention. */
export const MOCK_DECLINE_CARD = "4000000000000002";

type MockSession = { req: CheckoutRequest; status: CheckoutStatus };

// Kept on globalThis so dev-server hot reloads don't lose in-flight mock checkouts.
const store = ((globalThis as unknown as { __mockCheckouts?: Map<string, MockSession> }).__mockCheckouts ??= new Map());

/**
 * Stand-in for Stripe when no keys are configured. Behaves like Stripe's flow:
 * a checkout session is created, "paid" via simulatePayment(), then fulfilled.
 */
export class MockPaymentProvider implements PaymentProvider {
  readonly name = "mock" as const;
  readonly requiresConnectedAccount = false;
  readonly calls = { refunds: [] as RefundRequest[], transfers: [] as TransferRequest[], reversals: [] as string[] };
  failNextTransfer = false;

  async createCheckout(req: CheckoutRequest): Promise<CheckoutSession> {
    const sessionId = `mock_cs_${randomUUID()}`;
    store.set(sessionId, { req, status: { status: "open", paid: false, paymentRef: null, chargeId: null, amountTotal: req.amountPence } });
    return { sessionId, clientSecret: null };
  }

  async getCheckout(sessionId: string): Promise<CheckoutStatus> {
    const s = store.get(sessionId);
    if (!s) return { status: "expired", paid: false, paymentRef: null, chargeId: null, amountTotal: null };
    if (s.status.status === "open" && s.req.expiresAt <= new Date()) s.status.status = "expired";
    return { ...s.status };
  }

  async expireCheckout(sessionId: string) {
    const s = store.get(sessionId);
    if (s && s.status.status === "open") s.status.status = "expired";
  }

  /** Mock-only: pay an open session with a test card number. */
  async simulatePayment(sessionId: string, cardNumber: string): Promise<{ ok: true } | { ok: false; error: string }> {
    const s = store.get(sessionId);
    if (!s || s.status.status !== "open" || s.req.expiresAt <= new Date()) return { ok: false, error: "This checkout has expired. Please start again." };
    const card = cardNumber.replace(/\s/g, "");
    if (card === MOCK_DECLINE_CARD) return { ok: false, error: "Your card was declined." };
    if (!/^\d{12,19}$/.test(card)) return { ok: false, error: "Please enter a valid card number." };
    s.status = { status: "complete", paid: true, paymentRef: `mock_pi_${randomUUID()}`, chargeId: `mock_ch_${randomUUID()}`, amountTotal: s.req.amountPence };
    return { ok: true };
  }

  async refund(req: RefundRequest) {
    this.calls.refunds.push(req);
    return { refundId: `mock_re_${randomUUID()}` };
  }

  async transfer(req: TransferRequest) {
    if (this.failNextTransfer) {
      this.failNextTransfer = false;
      throw new Error("Mock transfer failure");
    }
    this.calls.transfers.push(req);
    return { transferId: `mock_tr_${randomUUID()}` };
  }

  async reverseTransfer(req: { transferId: string }) {
    this.calls.reversals.push(req.transferId);
    return { reversalId: `mock_trr_${randomUUID()}` };
  }
}
