import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { LoginForm } from "@/components/login-form";
import { getCurrentUser } from "@/lib/auth";
import { safeCallbackUrl } from "@/lib/safe-redirect";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string }> }) {
  const { callbackUrl } = await searchParams;
  const safe = callbackUrl ? safeCallbackUrl(callbackUrl) : undefined;
  const user = await getCurrentUser();
  if (user) redirect(safe ?? (user.role === "BUSINESS" ? "/dashboard" : "/bookings"));
  return (
    <AuthShell eyebrow="Welcome back" title="Log in to" accent="Gettable">
      <LoginForm callbackUrl={safe} />
    </AuthShell>
  );
}
