import Link from "next/link";
import { requireBusinessUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageBand } from "@/components/page-band";
import { DashboardNav } from "@/components/dashboard-nav";
import { DashboardNotice } from "@/components/dashboard-notice";
import { PayoutsBanner } from "@/components/payouts-banner";
import { Suspense } from "react";
import { getPaymentProvider } from "@/lib/payments";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireBusinessUser("/dashboard");
  const business = await prisma.business.findFirst({ where: { ownerId: user.id } });

  if (!business) {
    return (
      <div className="container-page py-16">
        <div className="card max-w-xl p-8">
          <h1 className="text-3xl text-ink">No business profile yet</h1>
          <p className="mt-2 text-ink-muted">This account doesn&rsquo;t have a business attached. Create one to start posting slots.</p>
          <Link href="/business#join" className="btn-primary mt-6">
            Set up a business
          </Link>
        </div>
      </div>
    );
  }

  const needsStripe = !business.payoutsEnabled;
  const demo = getPaymentProvider().name === "mock";

  return (
    <>
      <PageBand className="pb-0">
        <p className="eyebrow text-on-band-muted">Business dashboard</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <h1 className="text-4xl text-on-band sm:text-5xl">{business.name}</h1>
          <Link href={`/b/${business.slug}`} className="text-sm font-medium text-on-band underline-offset-4 hover:underline">
            View public page
          </Link>
        </div>
        <div className="mt-6 -mb-6 sm:-mb-8">
          <DashboardNav />
        </div>
      </PageBand>
      <div className="container-page space-y-6 py-8 sm:py-10">
        <Suspense fallback={null}>
          <DashboardNotice />
        </Suspense>
        {needsStripe && <PayoutsBanner demo={demo} />}
        {children}
      </div>
    </>
  );
}
