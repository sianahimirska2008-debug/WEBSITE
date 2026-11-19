"use client";

import { useActionState, useState } from "react";
import { cancelBookingAction, type ActionState } from "@/app/actions/booking";

export function CancelBooking({ bookingId, refundLabel }: { bookingId: string; refundLabel: string }) {
  const [confirming, setConfirming] = useState(false);
  const [state, action, pending] = useActionState<ActionState, FormData>(cancelBookingAction.bind(null, bookingId), {});

  if (!confirming) {
    return (
      <button type="button" onClick={() => setConfirming(true)} className="btn-secondary px-4 py-2">
        Cancel booking
      </button>
    );
  }
  return (
    <form action={action} className="flex flex-col gap-2 sm:items-end">
      <p className="text-sm text-ink">Cancel and get {refundLabel} back?</p>
      {state.error && (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={pending} className="btn bg-danger px-4 py-2 text-on-adam hover:bg-danger/90">
          {pending ? "Cancelling…" : "Yes, cancel"}
        </button>
        <button type="button" onClick={() => setConfirming(false)} className="btn-secondary px-4 py-2" autoFocus>
          Keep booking
        </button>
      </div>
    </form>
  );
}
