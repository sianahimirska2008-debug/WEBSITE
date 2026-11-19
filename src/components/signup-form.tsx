"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import { signIn } from "next-auth/react";
import { registerCustomerAction, type RegisterState } from "@/app/actions/auth";
import { FormError } from "./auth-shell";

export function SignupForm({ callbackUrl }: { callbackUrl?: string }) {
  const router = useRouter();
  // React resets the form after the action runs, so keep the password from submit time.
  const passwordRef = useRef("");
  const [signInError, setSignInError] = useState<string>();
  const [state, action, pending] = useActionState<RegisterState, FormData>(registerCustomerAction, { ok: false });

  // Account created: sign straight in with the password still in the form.
  useEffect(() => {
    if (!state.ok || !state.email) return;
    signIn("credentials", { email: state.email, password: passwordRef.current, redirect: false }).then((res) => {
      passwordRef.current = "";
      if (!res || res.error) {
        setSignInError("Your account was created. Please log in to continue.");
        router.push(`/login${callbackUrl ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ""}`);
        return;
      }
      router.push(callbackUrl ?? "/slots");
      router.refresh();
    });
  }, [state, callbackUrl, router]);

  return (
    <>
      <form
        action={action}
        onSubmit={(e) => {
          passwordRef.current = String(new FormData(e.currentTarget).get("password") ?? "");
        }}
        className="space-y-5"
      >
        <FormError message={state.error ?? signInError} />
        <div>
          <label htmlFor="name" className="label">
            Your name
          </label>
          <input id="name" name="name" autoComplete="name" required className="field" />
        </div>
        <div>
          <label htmlFor="email" className="label">
            Email
          </label>
          <input id="email" name="email" type="email" autoComplete="email" required className="field" />
        </div>
        <div>
          <label htmlFor="password" className="label">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            aria-describedby="password-hint"
            className="field"
          />
          <p id="password-hint" className="mt-1.5 text-xs text-ink-muted">
            At least 8 characters.
          </p>
        </div>
        <button type="submit" disabled={pending || state.ok} className="btn-primary w-full py-3">
          {pending || state.ok ? "Creating your account…" : "Create account"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-ink-muted">
        Already have an account?{" "}
        <Link href={callbackUrl ? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}` : "/login"} className="font-medium text-adam underline-offset-4 hover:underline">
          Log in
        </Link>
      </p>
      <p className="mt-3 text-center text-xs text-ink-muted">
        Run a salon, studio or barbershop?{" "}
        <Link href="/business#join" className="underline underline-offset-4">
          List your business instead
        </Link>
      </p>
    </>
  );
}
