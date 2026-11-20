"use server";

import { registerUser } from "@/lib/users";
import { DomainError } from "@/lib/errors";

export type RegisterState = { ok: boolean; error?: string; email?: string };

/** Creates a customer account. The client then signs in with the same credentials. */
export async function registerCustomerAction(_prev: RegisterState, formData: FormData): Promise<RegisterState> {
  try {
    const user = await registerUser({
      name: String(formData.get("name") ?? ""),
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      role: "CUSTOMER",
    });
    return { ok: true, email: user.email };
  } catch (e) {
    if (e instanceof DomainError) return { ok: false, error: e.message };
    throw e;
  }
}

export type RegisterBusinessState = RegisterState;

/** Creates a business owner account and their business profile together. */
export async function registerBusinessAction(_prev: RegisterBusinessState, formData: FormData): Promise<RegisterBusinessState> {
  const { prisma } = await import("@/lib/db");
  const { DEFAULT_LOCATION } = await import("@/lib/geo");
  const type = String(formData.get("type") ?? "");
  const businessName = String(formData.get("businessName") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const postcode = String(formData.get("postcode") ?? "").trim().toUpperCase();
  const area = String(formData.get("area") ?? "").trim();
  if (!["SALON", "BEAUTY", "BARBER"].includes(type)) return { ok: false, error: "Choose what kind of business you run." };
  if (businessName.length < 2) return { ok: false, error: "Enter your business name." };
  if (address.length < 5 || postcode.length < 5) return { ok: false, error: "Enter your street address and postcode." };
  if (!area) return { ok: false, error: "Enter your area, e.g. Hackney." };

  try {
    const user = await registerUser({
      name: String(formData.get("name") ?? ""),
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      role: "BUSINESS",
    });
    const base = businessName.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "business";
    let slug = base;
    for (let i = 2; await prisma.business.findUnique({ where: { slug } }); i++) slug = `${base}-${i}`;
    await prisma.business.create({
      data: {
        ownerId: user.id,
        name: businessName,
        slug,
        type: type as "SALON" | "BEAUTY" | "BARBER",
        address,
        postcode,
        area,
        // Owners set their exact map pin in Profile.
        lat: DEFAULT_LOCATION.lat,
        lng: DEFAULT_LOCATION.lng,
        openingHours: JSON.stringify({ mon: "09:00-18:00", tue: "09:00-18:00", wed: "09:00-18:00", thu: "09:00-18:00", fri: "09:00-18:00", sat: "10:00-16:00", sun: "closed" }),
      },
    });
    return { ok: true, email: user.email };
  } catch (e) {
    if (e instanceof DomainError) return { ok: false, error: e.message };
    throw e;
  }
}
