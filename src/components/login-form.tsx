"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { getSession, signIn } from "next-auth/react";
import { FormError } from "./auth-shell";

const DEMO = [
  { label: "Demo customer", email: "customer@gettable.dev" },
  { label: "Demo business", email: "business@gettable.dev" },
];

export function LoginForm({ callbackUrl }: { callbackUrl?: string }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(undefined);
    setPending(true);
    const data = new FormData(e.currentTarget);
    const res = await signIn("credentials", {
      email: String(data.get("email")),
      password: String(data.get("password")),
      redirect: false,
    });
    if (!res || res.error) {
      setPending(false);
      setError("That email and password don't match. Check them and try again.");
      return;
    }
    const session = await getSession();
    const fallback = session?.user.role === "BUSINESS" ? "/dashboard" : "/bookings";
    router.push(callbackUrl ?? fallback);
    router.refresh();
  }

  function fillDemo(email: string) {
    const f = formRef.current;
    if (!f) return;
    (f.elements.namedItem("email") as HTMLInputElement).value = email;
    (f.elements.namedItem("password") as HTMLInputElement).value = "password123";
    (f.elements.namedItem("password") as HTMLInputElement).focus();
  }

  return (
    <>
      <form ref={formRef} onSubmit={onSubmit} className="space-y-5" noValidate>
        <FormError message={error} />
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
          <input id="password" name="password" type="password" autoComplete="current-password" required className="field" />
        </div>
        <button type="submit" disabled={pending} className="btn-primary w-full py-3">
          {pending ? "Logging in…" : "Log in"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-ink-muted">
        New to Gettable?{" "}
        <Link href={callbackUrl ? `/signup?callbackUrl=${encodeURIComponent(callbackUrl)}` : "/signup"} className="font-medium text-adam underline-offset-4 hover:underline">
          Create an account
        </Link>
      </p>
      <div className="mt-6 border-t border-line pt-5">
        <p className="text-xs text-ink-muted">Trying the demo? Fill in a demo account (password: password123).</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {DEMO.map((d) => (
            <button key={d.email} type="button" onClick={() => fillDemo(d.email)} className="btn-secondary px-4 py-2 text-xs">
              {d.label}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
