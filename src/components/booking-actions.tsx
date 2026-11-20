"use client";

import { useActionState, useState } from "react";
import { usePathname } from "next/navigation";
import { cancelByBusinessAction, markOutcomeAction, type FormState } from "@/app/actions/dashboard";

/** Actions on one booking. Cancel and no-show ask for confirmation first. */
export function BookingActions({ bookingId, started, priceLabel }: { bookingId: string; started: boolean; priceLabel: string }) {
  const pathname = usePathname();
  const [confirm, setConfirm] = useState<"NO_SHOW" | "CANCEL" | null>(null);
  const [doneState, doneAction, donePending] = useActionState<FormState, FormData>(markOutcomeAction.bind(null, bookingId, "COMPLETED", pathname), {});
  const [noShowState, noShowAction, noShowPending] = useActionState<FormState, FormData>(markOutcomeAction.bind(null, bookingId, "NO_SHOW", pathname), {});
  const [cancelState, cancelAction, cancelPending] = useActionState<FormState, FormData>(cancelByBusinessAction.bind(null, bookingId, pathname), {});
  const state = [doneState, noShowState, cancelState].find((s) => s.error);

  return (
    <div className="flex flex-col gap-2 sm:items-end">
      {state?.error && (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}
      {confirm === "NO_SHOW" ? (
        <form action={noShowAction} className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-ink">Customer didn&rsquo;t turn up? They won&rsquo;t be refunded.</span>
          <button type="submit" disabled={noShowPending} className="btn-primary px-4 py-2">
            {noShowPending ? "Saving…" : "Yes, no-show"}
          </button>
          <button type="button" onClick={() => setConfirm(null)} className="btn-secondary px-4 py-2">
            Back
          </button>
        </form>
      ) : confirm === "CANCEL" ? (
        <form action={cancelAction} className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-ink">Cancel and refund the customer {priceLabel}?</span>
          <button type="submit" disabled={cancelPending} className="btn bg-danger px-4 py-2 text-on-adam hover:bg-danger/90">
            {cancelPending ? "Cancelling…" : "Yes, cancel"}
          </button>
          <button type="button" onClick={() => setConfirm(null)} className="btn-secondary px-4 py-2">
            Keep
          </button>
        </form>
      ) : started ? (
        <div className="flex flex-wrap gap-2">
          <form action={doneAction}>
            <button type="submit" disabled={donePending} className="btn-primary px-4 py-2">
              {donePending ? "Saving…" : "Mark as completed"}
            </button>
          </form>
          <button type="button" onClick={() => setConfirm("NO_SHOW")} className="btn-secondary px-4 py-2">
            No-show
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => setConfirm("CANCEL")} className="btn-secondary px-4 py-2">
          Cancel booking
        </button>
      )}
    </div>
  );
}
