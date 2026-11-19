"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { bookSlotAction, type ActionState } from "@/app/actions/booking";
import { FormError } from "./auth-shell";

function formatCard(v: string) {
  return v
    .replace(/\D/g, "")
    .slice(0, 19)
    .replace(/(.{4})/g, "$1 ")
    .trim();
}

export function CheckoutForm({ slotId, priceLabel, defaultName }: { slotId: string; priceLabel: string; defaultName: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(bookSlotAction.bind(null, slotId), {});
  const [card, setCard] = useState("4242 4242 4242 4242");
  const [expiry, setExpiry] = useState("12/30");
  const slotGone = state.code === "SLOT_UNAVAILABLE" || state.code === "SLOT_IN_PAST";

  return (
    <form action={action} className="space-y-5">
      <FormError message={state.error} />
      {slotGone && (
        <p className="text-sm">
          <Link href="/slots" className="font-medium text-adam underline underline-offset-4">
            Find another slot
          </Link>
        </p>
      )}

      <div className="rounded-[var(--radius-field)] border border-line-on-band bg-band px-4 py-3 text-sm text-on-band">
        <p className="font-medium">Test payment</p>
        <p className="mt-1 text-on-band-muted">
          No money is taken. Use <span className="whitespace-nowrap font-mono text-on-band">4242 4242 4242 4242</span> to pay, or{" "}
          <span className="whitespace-nowrap font-mono text-on-band">4000 0000 0000 0002</span> to see a declined card.
        </p>
      </div>

      <div>
        <label htmlFor="nameOnCard" className="label">
          Name on card
        </label>
        <input id="nameOnCard" name="nameOnCard" autoComplete="cc-name" defaultValue={defaultName} required className="field" />
      </div>
      <div>
        <label htmlFor="cardNumber" className="label">
          Card number
        </label>
        <input
          id="cardNumber"
          name="cardNumber"
          inputMode="numeric"
          autoComplete="cc-number"
          value={card}
          onChange={(e) => setCard(formatCard(e.target.value))}
          required
          className="field font-mono tracking-wide"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="expiry" className="label">
            Expiry (MM/YY)
          </label>
          <input
            id="expiry"
            name="expiry"
            inputMode="numeric"
            autoComplete="cc-exp"
            placeholder="MM/YY"
            value={expiry}
            onChange={(e) => {
              const d = e.target.value.replace(/\D/g, "").slice(0, 4);
              setExpiry(d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d);
            }}
            required
            className="field font-mono"
          />
        </div>
        <div>
          <label htmlFor="cvc" className="label">
            Security code
          </label>
          <input id="cvc" name="cvc" inputMode="numeric" autoComplete="cc-csc" defaultValue="123" maxLength={4} required className="field font-mono" />
        </div>
      </div>

      <button type="submit" disabled={pending} className="btn-primary w-full py-3.5 text-base">
        {pending ? "Booking…" : `Pay ${priceLabel} and book`}
      </button>
      <p className="text-center text-xs text-ink-muted">You can cancel for a full refund up to 24 hours before.</p>
    </form>
  );
}
