import { MockPaymentProvider } from "./mock";
import type { PaymentProvider } from "./types";

export type { PaymentProvider, CheckoutRequest, CheckoutSession, CheckoutStatus, RefundRequest, TransferRequest } from "./types";

const g = globalThis as unknown as { __paymentProvider?: PaymentProvider };

/** Stripe when STRIPE_SECRET_KEY is set, otherwise the mock (local demo / tests). */
export function getPaymentProvider(): PaymentProvider {
  if (g.__paymentProvider) return g.__paymentProvider;
  if (process.env.STRIPE_SECRET_KEY) {
    // Lazy require keeps the Stripe SDK (and server-only guard) out of mock mode.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { StripePaymentProvider } = require("./stripe") as typeof import("./stripe");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getStripe } = require("../stripe/client") as typeof import("../stripe/client");
    g.__paymentProvider = new StripePaymentProvider(getStripe());
  } else {
    g.__paymentProvider = new MockPaymentProvider();
  }
  return g.__paymentProvider;
}

/** Tests can swap in their own provider. */
export function setPaymentProvider(p: PaymentProvider | undefined) {
  g.__paymentProvider = p;
}
