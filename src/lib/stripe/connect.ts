import "server-only";
import type { Business } from "@prisma/client";
import { prisma } from "../db";
import { getStripe, isStripeConfigured } from "./client";

/**
 * Connected accounts use the Accounts v2 API with the "recipient" configuration:
 * businesses receive transfers from GETTABLE and get the Stripe Express Dashboard.
 * GETTABLE is responsible for Stripe fees and negative balances, which Stripe
 * requires for recipient-only accounts.
 */

export type ConnectStatus = {
  mode: "stripe" | "mock";
  connected: boolean;
  payoutsEnabled: boolean;
  /** Human-readable reason when payouts aren't enabled yet */
  detail: string | null;
};

export async function ensureConnectedAccount(business: Business, ownerEmail: string): Promise<string> {
  if (business.stripeAccountId) return business.stripeAccountId;
  const stripe = getStripe();
  const account = await stripe.v2.core.accounts.create(
    {
      contact_email: ownerEmail,
      display_name: business.name,
      dashboard: "express",
      identity: { country: "gb" },
      defaults: {
        currency: "gbp",
        responsibilities: { fees_collector: "application", losses_collector: "application" },
      },
      configuration: {
        recipient: { capabilities: { stripe_balance: { stripe_transfers: { requested: true } } } },
      },
      metadata: { businessId: business.id },
      include: ["configuration.recipient", "requirements"],
    },
    { idempotencyKey: `acct-${business.id}` },
  );
  // Only set it if nobody else did in the meantime.
  await prisma.business.updateMany({ where: { id: business.id, stripeAccountId: null }, data: { stripeAccountId: account.id } });
  const fresh = await prisma.business.findUniqueOrThrow({ where: { id: business.id } });
  return fresh.stripeAccountId!;
}

export async function createOnboardingLink(accountId: string, baseUrl: string): Promise<string> {
  const stripe = getStripe();
  const link = await stripe.v2.core.accountLinks.create({
    account: accountId,
    use_case: {
      type: "account_onboarding",
      account_onboarding: {
        // Stripe sends the business back here; these routes re-check the session.
        refresh_url: `${baseUrl}/dashboard/payouts/connect`,
        return_url: `${baseUrl}/dashboard/payouts?onboarding=returned`,
        collection_options: { fields: "eventually_due" },
        configurations: ["recipient"],
      },
    },
  } as Parameters<typeof stripe.v2.core.accountLinks.create>[0]);
  return link.url;
}

/** Ask Stripe whether this business can receive transfers yet, and store the answer. */
export async function refreshConnectStatus(business: Business): Promise<ConnectStatus> {
  if (!isStripeConfigured()) {
    return {
      mode: "mock",
      connected: Boolean(business.stripeAccountId),
      payoutsEnabled: business.payoutsEnabled,
      detail: business.payoutsEnabled ? null : "Not connected yet.",
    };
  }
  if (!business.stripeAccountId) return { mode: "stripe", connected: false, payoutsEnabled: false, detail: "Connect a Stripe account to get paid." };

  const stripe = getStripe();
  const account = await stripe.v2.core.accounts.retrieve(business.stripeAccountId, { include: ["configuration.recipient", "requirements"] });
  const cap = account.configuration?.recipient?.capabilities?.stripe_balance?.stripe_transfers;
  const active = cap?.status === "active";
  const reason = cap?.status_details?.[0]?.code ?? null;

  if (active !== business.payoutsEnabled || !business.stripeStatusCheckedAt) {
    await prisma.business.update({ where: { id: business.id }, data: { payoutsEnabled: active, stripeStatusCheckedAt: new Date() } });
  }
  let detail: string | null = null;
  if (!active) {
    detail =
      reason === "requirements_past_due" || reason === "requirements_pending_verification"
        ? "Stripe needs a few more details before you can be paid."
        : cap?.status === "pending"
          ? "Stripe is verifying your details. This usually takes a few minutes."
          : "Finish setting up your Stripe account to get paid.";
  }
  return { mode: "stripe", connected: true, payoutsEnabled: active, detail };
}

/** Short-lived secret for Stripe's embedded Payouts/Balances components. */
export async function createPayoutsSession(accountId: string): Promise<string> {
  const stripe = getStripe();
  const session = await stripe.accountSessions.create({
    account: accountId,
    components: {
      payouts: { enabled: true, features: { instant_payouts: false, standard_payouts: true, edit_payout_schedule: true, external_account_collection: true } },
      balances: { enabled: true, features: { instant_payouts: false, standard_payouts: true, edit_payout_schedule: false, external_account_collection: true } },
      notification_banner: { enabled: true, features: { external_account_collection: true } },
    },
  });
  return session.client_secret;
}
