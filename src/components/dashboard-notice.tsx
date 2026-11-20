"use client";

import { useSearchParams } from "next/navigation";

const MESSAGES: Record<string, string> = {
  "completed-paid": "marked as completed. Your earnings have been sent to your Stripe account.",
  "completed-on_hold": "marked as completed. Your earnings are waiting until your Stripe setup is finished.",
  "completed-failed": "marked as completed. The payout didn't go through, so we'll retry automatically.",
  "noshow-paid": "marked as a no-show. The customer isn't refunded, and your earnings have been sent.",
  "noshow-on_hold": "marked as a no-show. Your earnings are waiting until your Stripe setup is finished.",
  "noshow-failed": "marked as a no-show. The payout didn't go through, so we'll retry automatically.",
  cancelled: "cancelled. The customer has been refunded in full.",
};

/** Confirmation after a dashboard action (the row itself may have moved lists). */
export function DashboardNotice() {
  const sp = useSearchParams();
  const msg = MESSAGES[sp.get("notice") ?? ""];
  if (!msg) return null;
  return (
    <p role="status" className="rounded-[var(--radius-card)] border border-adam bg-card p-4 text-sm text-ink">
      Booking <span className="font-mono">{sp.get("ref")}</span> {msg}
    </p>
  );
}
