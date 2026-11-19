import { randomUUID } from "node:crypto";
import type { ChargeRequest, ChargeResult, PaymentProvider } from "./types";

/** Test card that always declines, mirroring Stripe's test-card convention. */
export const MOCK_DECLINE_CARD = "4000000000000002";

export class MockPaymentProvider implements PaymentProvider {
  readonly name = "mock";

  async charge(req: ChargeRequest): Promise<ChargeResult> {
    const card = req.paymentToken.replace(/\s/g, "");
    if (card === MOCK_DECLINE_CARD) return { ok: false, error: "Your card was declined." };
    if (!/^\d{12,19}$/.test(card)) return { ok: false, error: "Please enter a valid card number." };
    return { ok: true, paymentRef: `mock_${randomUUID()}` };
  }

  async refund(): Promise<{ ok: boolean }> {
    return { ok: true };
  }
}
