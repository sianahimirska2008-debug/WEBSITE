"use client";

import { useActionState } from "react";
import { connectStripeAction, type FormState } from "@/app/actions/dashboard";
import { FormError } from "./auth-shell";

export function ConnectStripeButton({ label }: { label: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(async () => connectStripeAction(), {});
  return (
    <form action={action} className="space-y-3">
      <FormError message={state.error} />
      {state.ok && <p role="status" className="text-sm text-ink">{state.message}</p>}
      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? "Opening Stripe…" : label}
      </button>
    </form>
  );
}
