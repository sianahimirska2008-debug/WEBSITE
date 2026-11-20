"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { cancelBooking, fulfillCheckout, startCheckout } from "@/lib/bookings";
import { getCurrentUser } from "@/lib/auth";
import { DomainError } from "@/lib/errors";
import { getPaymentProvider } from "@/lib/payments";
import type { MockPaymentProvider } from "@/lib/payments/mock";
import { prisma } from "@/lib/db";

export type ActionState = { error?: string; code?: string; ok?: boolean; message?: string };

export type StartCheckoutResult =
  | { ok: true; mode: "stripe" | "mock"; sessionId: string; clientSecret: string | null; holdMinutes: number }
  | { ok: false; error: string; code?: string };

/** Hold the slot and open a checkout. Always re-checks the session on the server. */
export async function startCheckoutAction(slotId: string): Promise<StartCheckoutResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Please log in to book.", code: "UNAUTHENTICATED" };
  if (user.role !== "CUSTOMER") return { ok: false, error: "Business accounts can't book slots. Log in with a customer account.", code: "FORBIDDEN" };
  try {
    const res = await startCheckout({ userId: user.id, userEmail: user.email ?? "", slotId });
    revalidatePath("/slots");
    return { ok: true, mode: getPaymentProvider().name, sessionId: res.sessionId, clientSecret: res.clientSecret, holdMinutes: res.holdMinutes };
  } catch (e) {
    if (e instanceof DomainError) return { ok: false, error: e.message, code: e.code };
    throw e;
  }
}

/** Test mode only (no Stripe keys): pay a mock checkout with a test card number. */
export async function payMockCheckoutAction(sessionId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  // Compare by name, not instanceof: Next.js can load the class in more than one bundle.
  const provider = getPaymentProvider();
  if (provider.name !== "mock") return { error: "Test payments are disabled." };
  const mock = provider as MockPaymentProvider;
  const user = await getCurrentUser();
  if (!user) return { error: "Please log in again." };
  const booking = await prisma.booking.findUnique({ where: { checkoutSessionId: sessionId } });
  if (!booking || booking.userId !== user.id) return { error: "Checkout not found." };

  const nameOnCard = String(formData.get("nameOnCard") ?? "").trim();
  const expiry = String(formData.get("expiry") ?? "").trim();
  const cvc = String(formData.get("cvc") ?? "").trim();
  if (!nameOnCard) return { error: "Enter the name on the card." };
  if (!/^(0[1-9]|1[0-2])\s*\/\s*\d{2}$/.test(expiry)) return { error: "Enter the expiry date as MM/YY." };
  if (!/^\d{3,4}$/.test(cvc)) return { error: "Enter the 3 or 4 digit security code." };

  const paid = await mock.simulatePayment(sessionId, String(formData.get("cardNumber") ?? ""));
  if (!paid.ok) return { error: paid.error, code: "PAYMENT_FAILED" };
  await fulfillCheckout(sessionId);
  redirect(`/book/return?session_id=${encodeURIComponent(sessionId)}`);
}

export async function cancelBookingAction(bookingId: string, _prev: ActionState): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Please log in again." };
  let reference: string;
  try {
    const booking = await cancelBooking({ userId: user.id, bookingId });
    reference = booking.reference;
  } catch (e) {
    if (e instanceof DomainError) return { error: e.message, code: e.code };
    throw e;
  }
  revalidatePath("/slots");
  redirect(`/bookings?cancelled=${encodeURIComponent(reference)}`);
}
