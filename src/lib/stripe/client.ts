import "server-only";
import Stripe from "stripe";

let client: Stripe | undefined;

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

/** Server-side Stripe client. Pinned to the API version bundled with the SDK. */
export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  client ??= new Stripe(key, {
    appInfo: { name: "Gettable", version: "0.1.0" },
    maxNetworkRetries: 2,
    // Behind an outbound HTTPS proxy, set STRIPE_HTTP_CLIENT=fetch and NODE_USE_ENV_PROXY=1
    // so requests use Node's fetch, which honours HTTPS_PROXY. Default: Stripe's Node client.
    ...(process.env.STRIPE_HTTP_CLIENT === "fetch" ? { httpClient: Stripe.createFetchHttpClient() } : {}),
  });
  return client;
}
