import type { Metadata } from "next";
import Link from "next/link";
import { PageBand } from "@/components/page-band";
import { BusinessSignupForm } from "@/components/business-signup-form";
import { CheckIcon } from "@/components/icons";
import { getCurrentUser } from "@/lib/auth";
import { commissionBps } from "@/lib/commission";

export const metadata: Metadata = {
  title: "For businesses",
  description: "Fill empty chairs with discounted last-minute appointments. Free to join; pay a commission only on completed bookings.",
};

export default async function ForBusinessesPage({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
  const { notice } = await searchParams;
  const user = await getCurrentUser();
  const pct = commissionBps() / 100;

  const steps = [
    { title: "Create your account", body: "Tell us about your salon, studio or barbershop. It takes two minutes." },
    { title: "Connect Stripe", body: "Stripe verifies your details and pays your earnings straight into your bank account." },
    { title: "Post your spare slots", body: "Pick a treatment, a time and a discounted price. It's live straight away." },
    { title: "Get paid after each appointment", body: `Mark the booking completed and ${100 - pct}% of the price is transferred to you.` },
  ];

  return (
    <>
      <PageBand>
        <div className="max-w-2xl">
          <p className="eyebrow text-on-band-muted">For businesses</p>
          <h1 className="mt-2 text-4xl text-on-band sm:text-6xl">
            Empty chairs, <em className="italic text-adam">filled</em>.
          </h1>
          <p className="mt-4 text-on-band-muted">
            Post your spare appointments at a discount and reach customers nearby who are ready to book today. Free to join, no monthly fee.
          </p>
        </div>
      </PageBand>

      <div className="container-page grid gap-10 py-10 lg:grid-cols-[1fr_440px] lg:items-start">
        <div className="space-y-10">
          {notice === "business-only" && (
            <p role="status" className="card p-5 text-sm text-ink">
              The dashboard is for business accounts. Create one below, or log in with your business email.
            </p>
          )}
          <section aria-labelledby="pricing-title" className="card p-6 sm:p-8">
            <h2 id="pricing-title" className="text-3xl text-ink">
              Simple <em className="italic text-adam">pricing</em>
            </h2>
            <p className="mt-4 font-serif text-6xl text-ink">{pct}%</p>
            <p className="mt-1 text-sm text-ink-muted">commission on completed bookings only. Nothing else.</p>
            <ul className="mt-6 space-y-3 text-sm text-ink">
              {[
                "No sign-up fee, no monthly fee, no card fees for you",
                `You keep ${100 - pct}% of every completed booking and no-show`,
                "Customer cancels more than 24 hours ahead: they're refunded and you pay nothing",
                "Paid out to your bank by Stripe, with every payout visible in your dashboard",
              ].map((t) => (
                <li key={t} className="flex gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-adam text-on-adam" aria-hidden="true">
                    <CheckIcon className="h-3 w-3" />
                  </span>
                  {t}
                </li>
              ))}
            </ul>
            <p className="mt-6 rounded-[var(--radius-field)] bg-band px-4 py-3 text-sm text-on-band">
              Example: a £40 slot earns you <strong>£{(40 * (100 - pct)) / 100}</strong>. GETTABLE keeps £{(40 * pct) / 100}.
            </p>
          </section>

          <section aria-labelledby="how-title">
            <h2 id="how-title" className="text-3xl text-ink">
              How it <em className="italic text-adam">works</em>
            </h2>
            <ol className="mt-6 grid gap-4 sm:grid-cols-2">
              {steps.map((s, i) => (
                <li key={s.title} className="card p-6">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-adam font-serif text-lg text-on-adam" aria-hidden="true">
                    {i + 1}
                  </span>
                  <h3 className="mt-4 text-xl text-ink">
                    <span className="sr-only">Step {i + 1}: </span>
                    {s.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{s.body}</p>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <section id="join" aria-labelledby="join-title" className="card scroll-mt-24 p-6 sm:p-8">
          <h2 id="join-title" className="text-3xl text-ink">
            List your <em className="italic text-adam">business</em>
          </h2>
          <div className="mt-6">
            {user?.role === "BUSINESS" ? (
              <div className="space-y-4">
                <p className="text-sm text-ink">You&rsquo;re logged in as a business.</p>
                <Link href="/dashboard" className="btn-primary w-full">
                  Go to your dashboard
                </Link>
              </div>
            ) : user ? (
              <p className="text-sm text-ink">
                You&rsquo;re logged in with a customer account. Log out first to create a business account.
              </p>
            ) : (
              <BusinessSignupForm />
            )}
          </div>
        </section>
      </div>
    </>
  );
}
