import { getCurrentUser } from "@/lib/auth";
import { getOwnedBusiness } from "@/lib/business";
import { appUrl } from "@/lib/app-url";
import { isStripeConfigured } from "@/lib/stripe/client";

/**
 * Stripe's onboarding "refresh_url": account links are single-use, so make a
 * fresh one for the logged-in owner and send them back to Stripe.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "BUSINESS") return Response.redirect(`${appUrl()}/login?callbackUrl=%2Fdashboard%2Fpayouts`, 303);
  if (!isStripeConfigured()) return Response.redirect(`${appUrl()}/dashboard/payouts`, 303);
  try {
    const business = await getOwnedBusiness(user.id);
    const { ensureConnectedAccount, createOnboardingLink } = await import("@/lib/stripe/connect");
    const accountId = await ensureConnectedAccount(business, user.email ?? "");
    return Response.redirect(await createOnboardingLink(accountId, appUrl()), 303);
  } catch (e) {
    console.error("Onboarding refresh failed", e);
    return Response.redirect(`${appUrl()}/dashboard/payouts?onboarding=error`, 303);
  }
}
