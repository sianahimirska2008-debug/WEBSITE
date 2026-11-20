"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { DomainError } from "@/lib/errors";
import { parsePounds } from "@/lib/money";
import { londonToUtc } from "@/lib/time";
import { createSlot, createTreatment, getOwnedBusiness, removeSlot, updateBusinessProfile, updateSlot } from "@/lib/business";
import { cancelByBusiness, markOutcome } from "@/lib/payouts";
import { getPaymentProvider } from "@/lib/payments";
import { appUrl } from "@/lib/app-url";

export type FormState = { ok?: boolean; error?: string; message?: string };

/** Every dashboard action starts here: a logged-in business owner and *their* business. */
async function requireOwner() {
  const user = await getCurrentUser();
  if (!user) throw new DomainError("UNAUTHENTICATED", "Please log in again.");
  if (user.role !== "BUSINESS") throw new DomainError("FORBIDDEN", "Only business accounts can do this.");
  const business = await getOwnedBusiness(user.id);
  return { user, business };
}

function fail(e: unknown): FormState {
  if (e instanceof DomainError) return { error: e.message };
  throw e;
}

function refreshDashboard() {
  revalidatePath("/dashboard", "layout");
  revalidatePath("/slots");
}

function readSlotForm(formData: FormData) {
  const date = String(formData.get("date") ?? "");
  const time = String(formData.get("time") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) throw new DomainError("VALIDATION", "Choose a date and start time.");
  const originalPrice = parsePounds(String(formData.get("originalPrice") ?? ""));
  const price = parsePounds(String(formData.get("price") ?? ""));
  if (Number.isNaN(originalPrice) || Number.isNaN(price)) throw new DomainError("VALIDATION", "Enter prices in pounds, e.g. 45 or 45.50.");
  return {
    treatmentId: String(formData.get("treatmentId") ?? ""),
    startsAt: londonToUtc(date, time),
    durationMins: Number(formData.get("durationMins")),
    originalPrice,
    price,
    stylistName: String(formData.get("stylistName") ?? "").trim() || null,
  };
}

export async function createSlotAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const { user, business } = await requireOwner();
    await createSlot(user.id, business.id, readSlotForm(formData));
  } catch (e) {
    return fail(e);
  }
  refreshDashboard();
  return { ok: true, message: "Slot posted. It's live now." };
}

export async function updateSlotAction(slotId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const { user } = await requireOwner();
    await updateSlot(user.id, slotId, readSlotForm(formData));
  } catch (e) {
    return fail(e);
  }
  refreshDashboard();
  return { ok: true, message: "Slot updated." };
}

export async function removeSlotAction(slotId: string, _prev: FormState): Promise<FormState> {
  try {
    const { user } = await requireOwner();
    await removeSlot(user.id, slotId);
  } catch (e) {
    return fail(e);
  }
  refreshDashboard();
  return { ok: true, message: "Slot removed." };
}

export async function createTreatmentAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const { user, business } = await requireOwner();
    const standardPrice = parsePounds(String(formData.get("standardPrice") ?? ""));
    await createTreatment(user.id, business.id, {
      name: String(formData.get("name") ?? ""),
      category: String(formData.get("category") ?? ""),
      durationMins: Number(formData.get("durationMins")),
      standardPrice,
    });
  } catch (e) {
    return fail(e);
  }
  refreshDashboard();
  return { ok: true, message: "Treatment added." };
}

/** Only allow redirects back into the dashboard. */
function backTo(path: string) {
  return path.startsWith("/dashboard") && !path.startsWith("//") ? path : "/dashboard";
}

export async function markOutcomeAction(bookingId: string, outcome: "COMPLETED" | "NO_SHOW", returnTo: string, _prev: FormState): Promise<FormState> {
  let notice: string;
  try {
    const { user } = await requireOwner();
    const b = await markOutcome(user.id, bookingId, outcome);
    notice = `${outcome === "COMPLETED" ? "completed" : "noshow"}-${b.payoutStatus.toLowerCase()}`;
    refreshDashboard();
    redirect(`${backTo(returnTo)}?notice=${notice}&ref=${encodeURIComponent(b.reference)}`);
  } catch (e) {
    if (e instanceof DomainError) return { error: e.message };
    throw e;
  }
}

export async function cancelByBusinessAction(bookingId: string, returnTo: string, _prev: FormState): Promise<FormState> {
  let reference: string;
  try {
    const { user } = await requireOwner();
    reference = (await cancelByBusiness(user.id, bookingId)).reference;
  } catch (e) {
    return fail(e);
  }
  refreshDashboard();
  redirect(`${backTo(returnTo)}?notice=cancelled&ref=${encodeURIComponent(reference)}`);
}

export async function updateProfileAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const { user, business } = await requireOwner();
    const hours: Record<string, string> = {};
    for (const d of ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]) {
      const closed = formData.get(`${d}_closed`) === "on";
      const open = String(formData.get(`${d}_open`) ?? "");
      const close = String(formData.get(`${d}_close`) ?? "");
      hours[d] = closed || !open || !close ? "closed" : `${open}-${close}`;
    }
    await updateBusinessProfile(user.id, business.id, {
      name: String(formData.get("name") ?? ""),
      type: String(formData.get("type") ?? "") as "SALON" | "BEAUTY" | "BARBER",
      description: String(formData.get("description") ?? ""),
      address: String(formData.get("address") ?? ""),
      postcode: String(formData.get("postcode") ?? ""),
      area: String(formData.get("area") ?? ""),
      lat: Number(formData.get("lat")),
      lng: Number(formData.get("lng")),
      phone: String(formData.get("phone") ?? ""),
      logoUrl: String(formData.get("logoUrl") ?? ""),
      openingHours: hours,
    });
  } catch (e) {
    return fail(e);
  }
  refreshDashboard();
  return { ok: true, message: "Profile saved." };
}

/**
 * Start (or continue) Stripe onboarding. With Stripe: create the connected
 * account if needed and send the owner to Stripe's hosted onboarding.
 * Without keys (local demo): mark the business as connected.
 */
export async function connectStripeAction(): Promise<FormState> {
  let url: string;
  try {
    const { user, business } = await requireOwner();
    if (getPaymentProvider().name === "mock") {
      await prisma.business.update({ where: { id: business.id }, data: { stripeAccountId: business.stripeAccountId ?? `acct_demo_${business.id}`, payoutsEnabled: true } });
      refreshDashboard();
      return { ok: true, message: "Demo mode: payouts enabled without Stripe." };
    }
    const { ensureConnectedAccount, createOnboardingLink } = await import("@/lib/stripe/connect");
    const accountId = await ensureConnectedAccount(business, user.email ?? "");
    url = await createOnboardingLink(accountId, appUrl());
  } catch (e) {
    if (e instanceof DomainError) return { error: e.message };
    console.error("Stripe onboarding failed", e);
    return { error: "We couldn't reach Stripe. Please try again in a moment." };
  }
  redirect(url);
}

/** Client secret for Stripe's embedded payouts/balances components (own account only). */
export async function payoutsSessionAction(): Promise<string> {
  const { business } = await requireOwner();
  if (!business.stripeAccountId || getPaymentProvider().name !== "stripe") throw new Error("Stripe account not connected");
  const { createPayoutsSession } = await import("@/lib/stripe/connect");
  return createPayoutsSession(business.stripeAccountId);
}
