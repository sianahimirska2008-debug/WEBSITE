"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import { signIn } from "next-auth/react";
import { registerBusinessAction, type RegisterBusinessState } from "@/app/actions/auth";
import { FormError } from "./auth-shell";

export function BusinessSignupForm() {
  const router = useRouter();
  const passwordRef = useRef("");
  const [signInError, setSignInError] = useState<string>();
  const [state, action, pending] = useActionState<RegisterBusinessState, FormData>(registerBusinessAction, { ok: false });

  useEffect(() => {
    if (!state.ok || !state.email) return;
    signIn("credentials", { email: state.email, password: passwordRef.current, redirect: false }).then((res) => {
      passwordRef.current = "";
      if (!res || res.error) {
        setSignInError("Your account was created. Please log in to continue.");
        router.push("/login?callbackUrl=%2Fdashboard%2Fpayouts");
        return;
      }
      router.push("/dashboard/payouts?welcome=1");
      router.refresh();
    });
  }, [state, router]);

  return (
    <form
      action={action}
      onSubmit={(e) => {
        passwordRef.current = String(new FormData(e.currentTarget).get("password") ?? "");
      }}
      className="space-y-5"
    >
      <FormError message={state.error ?? signInError} />
      <fieldset className="space-y-4">
        <legend className="font-serif text-xl text-ink">Your business</legend>
        <div>
          <label htmlFor="businessName" className="label">
            Business name
          </label>
          <input id="businessName" name="businessName" required className="field" autoComplete="organization" />
        </div>
        <div>
          <label htmlFor="type" className="label">
            Type of business
          </label>
          <select id="type" name="type" required className="field" defaultValue="">
            <option value="" disabled>
              Choose one
            </option>
            <option value="SALON">Hair salon</option>
            <option value="BEAUTY">Beauty studio</option>
            <option value="BARBER">Barber</option>
          </select>
        </div>
        <div>
          <label htmlFor="address" className="label">
            Street address
          </label>
          <input id="address" name="address" required className="field" autoComplete="street-address" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="postcode" className="label">
              Postcode
            </label>
            <input id="postcode" name="postcode" required className="field" autoComplete="postal-code" />
          </div>
          <div>
            <label htmlFor="area" className="label">
              Area
            </label>
            <input id="area" name="area" required placeholder="e.g. Hackney" className="field" />
          </div>
        </div>
      </fieldset>
      <fieldset className="space-y-4 border-t border-line pt-5">
        <legend className="font-serif text-xl text-ink">Your login</legend>
        <div>
          <label htmlFor="name" className="label">
            Your name
          </label>
          <input id="name" name="name" required className="field" autoComplete="name" />
        </div>
        <div>
          <label htmlFor="email" className="label">
            Email
          </label>
          <input id="email" name="email" type="email" required className="field" autoComplete="email" />
        </div>
        <div>
          <label htmlFor="password" className="label">
            Password
          </label>
          <input id="password" name="password" type="password" minLength={8} required className="field" autoComplete="new-password" aria-describedby="bpw-hint" />
          <p id="bpw-hint" className="mt-1.5 text-xs text-ink-muted">
            At least 8 characters.
          </p>
        </div>
      </fieldset>
      <button type="submit" disabled={pending || state.ok} className="btn-primary w-full py-3">
        {pending || state.ok ? "Creating your account…" : "Create business account"}
      </button>
      <p className="text-center text-xs text-ink-muted">
        Next, you&rsquo;ll connect a Stripe account so we can pay you. Already listed?{" "}
        <Link href="/login?callbackUrl=%2Fdashboard" className="underline underline-offset-4">
          Log in
        </Link>
      </p>
    </form>
  );
}
