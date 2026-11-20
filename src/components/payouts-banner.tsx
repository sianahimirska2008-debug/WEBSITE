"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Reminder to finish Stripe setup; hidden on the payouts page, which has the full card. */
export function PayoutsBanner({ demo }: { demo: boolean }) {
  if (usePathname().startsWith("/dashboard/payouts")) return null;
  return (
    <div role="status" className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-adam bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-medium text-ink">Connect Stripe to get paid</p>
        <p className="mt-0.5 text-sm text-ink-muted">
          {demo ? "Demo mode: payouts are simulated until Stripe keys are added." : "You can post slots and receive payouts once Stripe has verified your details."}
        </p>
      </div>
      <Link href="/dashboard/payouts" className="btn-primary shrink-0">
        Set up payouts
      </Link>
    </div>
  );
}
