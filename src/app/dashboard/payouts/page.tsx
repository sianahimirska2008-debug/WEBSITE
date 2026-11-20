import type { Metadata } from "next";
import { requireBusinessUser } from "@/lib/auth";
import { getOwnedBusiness } from "@/lib/business";
import { getDashboardData, PAYOUT_LABEL } from "@/lib/dashboard";
import { formatPrice } from "@/lib/money";
import { formatDay } from "@/lib/time";
import { commissionBps } from "@/lib/commission";
import { getPaymentProvider } from "@/lib/payments";
import { ConnectStripeButton } from "@/components/connect-stripe-button";
import { StripePayouts } from "@/components/stripe-payouts";
import { StatusPill } from "@/components/status-pill";

export const metadata: Metadata = { title: "Earnings & payouts" };

export default async function DashboardPayouts({ searchParams }: { searchParams: Promise<{ welcome?: string; onboarding?: string }> }) {
  const { welcome, onboarding } = await searchParams;
  const user = await requireBusinessUser("/dashboard/payouts");
  let business = await getOwnedBusiness(user.id);
  const mode = getPaymentProvider().name;

  // Ask Stripe for the latest status (cheap, and keeps payoutsEnabled honest).
  let status: { connected: boolean; payoutsEnabled: boolean; detail: string | null } = {
    connected: Boolean(business.stripeAccountId),
    payoutsEnabled: business.payoutsEnabled,
    detail: null,
  };
  let stripeError = false;
  if (mode === "stripe" && business.stripeAccountId) {
    try {
      const { refreshConnectStatus } = await import("@/lib/stripe/connect");
      status = await refreshConnectStatus(business);
      business = await getOwnedBusiness(user.id);
    } catch (e) {
      console.error("refreshConnectStatus failed", e);
      stripeError = true;
    }
  }

  const d = await getDashboardData(business);
  const pct = commissionBps() / 100;
  const tiles = [
    { label: "Paid out to you", value: d.earnings.paidOut, hint: "Transferred to your Stripe account" },
    { label: "Due after appointments", value: d.earnings.upcoming, hint: "From confirmed upcoming bookings" },
    { label: "On hold", value: d.earnings.onHold, hint: status.payoutsEnabled ? "Disputed or retrying" : "Waiting for Stripe setup" },
    { label: `GETTABLE commission (${pct}%)`, value: d.earnings.commission, hint: "On completed bookings" },
  ];

  return (
    <>
      {welcome && (
        <p role="status" className="card border-adam p-5 text-sm text-ink">
          Welcome to GETTABLE. Connect Stripe below so we can pay you, then post your first slot.
        </p>
      )}

      <section aria-labelledby="stripe-title" className="card p-6 sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-xl">
            <h2 id="stripe-title" className="text-2xl text-ink">
              Stripe <em className="italic text-adam">payouts</em>
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">
              Customers pay GETTABLE when they book. After each completed appointment (or no-show) we transfer {100 - pct}% of the price to your Stripe
              account, and Stripe pays it into your bank on your payout schedule.
            </p>
            {stripeError && <p className="mt-3 text-sm text-danger">We couldn&rsquo;t reach Stripe just now. Status may be out of date.</p>}
            {onboarding === "returned" && !status.payoutsEnabled && !stripeError && (
              <p className="mt-3 text-sm text-ink">Thanks. {status.detail ?? "Stripe is checking your details."}</p>
            )}
          </div>
          <div className="shrink-0">
            {status.payoutsEnabled ? (
              <StatusPill label={mode === "mock" ? "Payouts enabled (demo)" : "Payouts enabled"} tone="good" />
            ) : (
              <StatusPill label={status.connected ? "Setup incomplete" : "Not connected"} tone="wait" />
            )}
          </div>
        </div>
        {!status.payoutsEnabled && (
          <div className="mt-5 border-t border-line pt-5">
            {status.detail && <p className="mb-3 text-sm text-ink">{status.detail}</p>}
            <ConnectStripeButton label={status.connected ? "Continue Stripe setup" : mode === "mock" ? "Enable demo payouts" : "Connect with Stripe"} />
            <p className="mt-3 text-xs text-ink-muted">
              {mode === "mock"
                ? "Stripe keys aren't configured, so this only simulates payouts."
                : "You'll be taken to Stripe to verify your identity and add your bank account. GETTABLE never sees your bank details."}
            </p>
          </div>
        )}
      </section>

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((t) => (
          <li key={t.label} className="card p-5">
            <p className="text-sm text-ink-muted">{t.label}</p>
            <p className="mt-2 font-serif text-4xl text-ink tabular-nums">{formatPrice(t.value)}</p>
            <p className="mt-1 text-xs text-ink-muted">{t.hint}</p>
          </li>
        ))}
      </ul>

      <section aria-labelledby="ledger-title">
        <h2 id="ledger-title" className="text-2xl text-ink">
          Earnings by booking
        </h2>
        {d.earnings.ledger.length === 0 ? (
          <p className="card mt-4 p-6 text-center text-sm text-ink-muted">Completed bookings and their payouts will appear here.</p>
        ) : (
          <div className="card mt-4 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <caption className="sr-only">Earnings and payout status for each completed booking</caption>
              <thead className="border-b border-line text-xs text-ink-muted">
                <tr>
                  <th scope="col" className="px-5 py-3 font-medium">Date</th>
                  <th scope="col" className="px-5 py-3 font-medium">Booking</th>
                  <th scope="col" className="px-5 py-3 text-right font-medium">Customer paid</th>
                  <th scope="col" className="px-5 py-3 text-right font-medium">Commission</th>
                  <th scope="col" className="px-5 py-3 text-right font-medium">Your earnings</th>
                  <th scope="col" className="px-5 py-3 font-medium">Payout</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {d.earnings.ledger.map((b) => {
                  const p = PAYOUT_LABEL[b.payoutStatus];
                  return (
                    <tr key={b.id}>
                      <td className="px-5 py-3 whitespace-nowrap text-ink">{formatDay(b.slot.startsAt)}</td>
                      <td className="px-5 py-3">
                        <span className="text-ink">{b.slot.treatment.name}</span>
                        <span className="block font-mono text-xs text-ink-muted">
                          {b.reference}
                          {b.status === "NO_SHOW" ? " · no-show" : ""}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums">{formatPrice(b.totalPaid)}</td>
                      <td className="px-5 py-3 text-right tabular-nums text-ink-muted">−{formatPrice(b.commission)}</td>
                      <td className="px-5 py-3 text-right font-medium tabular-nums">{formatPrice(b.businessAmount)}</td>
                      <td className="px-5 py-3">
                        <StatusPill label={p.label} tone={p.tone} />
                        {b.payoutError && b.payoutStatus !== "PAID" && <span className="mt-1 block text-xs text-ink-muted">{b.payoutError}</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {mode === "stripe" && business.stripeAccountId && status.connected && (
        <section aria-labelledby="stripe-payouts-title" className="card p-6 sm:p-8">
          <h2 id="stripe-payouts-title" className="text-2xl text-ink">
            Balance and bank payouts
          </h2>
          <p className="mt-1 text-sm text-ink-muted">Live from Stripe: your balance, payout schedule and every payout to your bank.</p>
          <div className="mt-5">
            <StripePayouts />
          </div>
        </section>
      )}
    </>
  );
}
