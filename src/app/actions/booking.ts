"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { bookSlot, cancelBooking } from "@/lib/bookings";
import { getCurrentUser } from "@/lib/auth";
import { DomainError } from "@/lib/errors";

export type ActionState = { error?: string; code?: string; ok?: boolean; message?: string };

export async function bookSlotAction(slotId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  // Always re-check the session on the server: the page guard isn't enough.
  const user = await getCurrentUser();
  if (!user) return { error: "Please log in to book.", code: "UNAUTHENTICATED" };
  if (user.role !== "CUSTOMER") return { error: "Business accounts can't book slots. Log in with a customer account.", code: "FORBIDDEN" };

  const cardNumber = String(formData.get("cardNumber") ?? "");
  const nameOnCard = String(formData.get("nameOnCard") ?? "").trim();
  const expiry = String(formData.get("expiry") ?? "").trim();
  const cvc = String(formData.get("cvc") ?? "").trim();
  if (!nameOnCard) return { error: "Enter the name on the card." };
  if (!/^(0[1-9]|1[0-2])\s*\/\s*\d{2}$/.test(expiry)) return { error: "Enter the expiry date as MM/YY." };
  if (!/^\d{3,4}$/.test(cvc)) return { error: "Enter the 3 or 4 digit security code." };

  let reference: string;
  try {
    const booking = await bookSlot({ userId: user.id, userEmail: user.email ?? "", slotId, paymentToken: cardNumber });
    reference = booking.reference;
  } catch (e) {
    if (e instanceof DomainError) return { error: e.message, code: e.code };
    throw e;
  }
  revalidatePath("/slots");
  revalidatePath("/bookings");
  redirect(`/bookings?booked=${encodeURIComponent(reference)}`);
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
