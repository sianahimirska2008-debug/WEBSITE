import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { SignupForm } from "@/components/signup-form";
import { getCurrentUser } from "@/lib/auth";
import { safeCallbackUrl } from "@/lib/safe-redirect";

export const metadata: Metadata = { title: "Create an account" };

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string }> }) {
  const { callbackUrl } = await searchParams;
  const safe = callbackUrl ? safeCallbackUrl(callbackUrl) : undefined;
  if (await getCurrentUser()) redirect(safe ?? "/");
  return (
    <AuthShell eyebrow="Join free" title="Book spare slots" accent="for less">
      <SignupForm callbackUrl={safe} />
    </AuthShell>
  );
}
