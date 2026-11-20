"use client";

import Link from "next/link";
import { useActionState, useMemo, useState, useTransition } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";
import { payMockCheckoutAction, startCheckoutAction, type ActionState, type StartCheckoutResult } from "@/app/actions/booking";
import { FormError } from "./auth-shell";

const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

export function CheckoutPanel({ slotId, priceLabel, defaultName }: { slotId: string; priceLabel: string; defaultName: string }) {
  const [result, setResult] = useState<StartCheckoutResult | null>(null);
  const [pending, startTransition] = useTransition();
  const stripePromise = useMemo(() => (publishableKey ? loadStripe(publishableKey) : null), []);

  const begin = () =>
    startTransition(async () => {
      setResult(await startCheckoutAction(slotId));
    });

  if (!result || !result.ok) {
    const gone = result && !result.ok && (result.code === "SLOT_UNAVAILABLE" || result.code === "SLOT_IN_PAST");
    return (
      <div className="space-y-5">
        <FormError message={result && !result.ok ? result.error : undefined} />
        {gone ? (
          <Link href="/slots" className="btn-primary w-full py-3.5 text-base">
            Find another slot
          </Link>
        ) : (
          <>
            <button type="button" onClick={begin} disabled={pending} className="btn-primary w-full py-3.5 text-base">
              {pending ? "Reserving your slot…" : `Continue to secure payment · ${priceLabel}`}
            </button>
            <p className="flex items-center justify-center gap-2 text-center text-xs text-ink-muted">
              <LockIcon />
              Payments are processed securely by Stripe. We never see your card details.
            </p>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p role="status" className="rounded-[var(--radius-field)] border border-line-on-band bg-band px-4 py-3 text-sm text-on-band">
        We&rsquo;re holding this slot for you for {result.holdMinutes} minutes while you pay.
      </p>
      {result.mode === "stripe" && result.clientSecret && stripePromise ? (
        <div id="stripe-checkout" className="min-h-[420px] overflow-hidden rounded-[var(--radius-field)]">
          <EmbeddedCheckoutProvider stripe={stripePromise} options={{ clientSecret: result.clientSecret }}>
            <EmbeddedCheckout />
          </EmbeddedCheckoutProvider>
        </div>
      ) : result.mode === "stripe" ? (
        <FormError message="Payments aren't configured correctly (missing publishable key). Please contact support." />
      ) : (
        <MockCardForm sessionId={result.sessionId} priceLabel={priceLabel} defaultName={defaultName} />
      )}
    </div>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="5" y="10.5" width="14" height="9.5" rx="2" />
      <path d="M8 10.5V8a4 4 0 018 0v2.5" />
    </svg>
  );
}

function formatCard(v: string) {
  return v
    .replace(/\D/g, "")
    .slice(0, 19)
    .replace(/(.{4})/g, "$1 ")
    .trim();
}

/** Only shown when no Stripe keys are configured (local demo). */
function MockCardForm({ sessionId, priceLabel, defaultName }: { sessionId: string; priceLabel: string; defaultName: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(payMockCheckoutAction.bind(null, sessionId), {});
  const [card, setCard] = useState("4242 4242 4242 4242");
  const [expiry, setExpiry] = useState("12/30");
  return (
    <form action={action} className="space-y-5">
      <FormError message={state.error} />
      <div className="rounded-[var(--radius-field)] border border-dashed border-line-strong px-4 py-3 text-sm text-ink">
        <p className="font-medium">Demo payment (Stripe keys not configured)</p>
        <p className="mt-1 text-ink-muted">
          No money is taken. Use <span className="whitespace-nowrap font-mono text-ink">4242 4242 4242 4242</span> to pay, or{" "}
          <span className="whitespace-nowrap font-mono text-ink">4000 0000 0000 0002</span> to see a declined card.
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
        <input id="cardNumber" name="cardNumber" inputMode="numeric" autoComplete="cc-number" value={card} onChange={(e) => setCard(formatCard(e.target.value))} required className="field font-mono tracking-wide" />
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
    </form>
  );
}
