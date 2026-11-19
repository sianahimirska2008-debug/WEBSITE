import { MockPaymentProvider } from "./mock";
import type { PaymentProvider } from "./types";

export type { PaymentProvider, ChargeRequest, ChargeResult } from "./types";

let provider: PaymentProvider | undefined;

export function getPaymentProvider(): PaymentProvider {
  // Later: if (process.env.STRIPE_SECRET_KEY) return new StripePaymentProvider(...)
  provider ??= new MockPaymentProvider();
  return provider;
}
