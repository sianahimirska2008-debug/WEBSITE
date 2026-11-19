import type { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { prisma as defaultPrisma } from "./db";
import { DomainError } from "./errors";
import { isCategory } from "./categories";

/**
 * Every business-side mutation goes through these helpers, which check
 * ownership on the server. UI hiding is a convenience, not the guard.
 */

type Db = PrismaClient;

export async function getOwnedBusiness(userId: string, db: Db = defaultPrisma) {
  const business = await db.business.findFirst({ where: { ownerId: userId } });
  if (!business) throw new DomainError("NOT_FOUND", "You don't have a business profile yet.");
  return business;
}

export async function assertOwnsBusiness(userId: string, businessId: string, db: Db = defaultPrisma) {
  const business = await db.business.findUnique({ where: { id: businessId } });
  if (!business || business.ownerId !== userId) throw new DomainError("FORBIDDEN", "You can't manage this business.");
  return business;
}

async function assertOwnsSlot(userId: string, slotId: string, db: Db) {
  const slot = await db.slot.findUnique({ where: { id: slotId }, include: { business: true } });
  if (!slot || slot.business.ownerId !== userId) throw new DomainError("FORBIDDEN", "You can't manage this slot.");
  return slot;
}

export const slotInputSchema = z
  .object({
    treatmentId: z.string().min(1, "Choose a treatment"),
    startsAt: z.date(),
    durationMins: z.number().int().min(5).max(480),
    originalPrice: z.number().int().min(100, "Original price must be at least £1"),
    price: z.number().int().min(0),
    stylistName: z.string().trim().max(80).optional().nullable(),
  })
  .refine((v) => v.price < v.originalPrice, { message: "Discounted price must be lower than the original price", path: ["price"] });

export type SlotInput = z.infer<typeof slotInputSchema>;

function validate(input: SlotInput, now: Date) {
  const parsed = slotInputSchema.safeParse(input);
  if (!parsed.success) throw new DomainError("VALIDATION", parsed.error.issues[0]?.message ?? "Invalid slot");
  if (parsed.data.startsAt <= now) throw new DomainError("VALIDATION", "Slots must start in the future.");
  return parsed.data;
}

export async function createSlot(userId: string, businessId: string, input: SlotInput, opts: { db?: Db; now?: Date } = {}) {
  const db = opts.db ?? defaultPrisma;
  await assertOwnsBusiness(userId, businessId, db);
  const data = validate(input, opts.now ?? new Date());
  const treatment = await db.treatment.findUnique({ where: { id: data.treatmentId } });
  if (!treatment || treatment.businessId !== businessId) throw new DomainError("VALIDATION", "Unknown treatment.");
  return db.slot.create({ data: { ...data, stylistName: data.stylistName || null, businessId } });
}

export async function updateSlot(userId: string, slotId: string, input: SlotInput, opts: { db?: Db; now?: Date } = {}) {
  const db = opts.db ?? defaultPrisma;
  const slot = await assertOwnsSlot(userId, slotId, db);
  if (slot.status !== "OPEN") throw new DomainError("INVALID_STATE", "Only open slots can be edited.");
  const data = validate(input, opts.now ?? new Date());
  const treatment = await db.treatment.findUnique({ where: { id: data.treatmentId } });
  if (!treatment || treatment.businessId !== slot.businessId) throw new DomainError("VALIDATION", "Unknown treatment.");
  const res = await db.slot.updateMany({
    where: { id: slotId, status: "OPEN" },
    data: { ...data, stylistName: data.stylistName || null },
  });
  if (res.count !== 1) throw new DomainError("INVALID_STATE", "This slot was just booked and can no longer be edited.");
  return db.slot.findUniqueOrThrow({ where: { id: slotId } });
}

/** Remove an open slot. Booked slots can't be removed (the customer has paid). */
export async function removeSlot(userId: string, slotId: string, opts: { db?: Db } = {}) {
  const db = opts.db ?? defaultPrisma;
  await assertOwnsSlot(userId, slotId, db);
  const res = await db.slot.updateMany({ where: { id: slotId, status: "OPEN" }, data: { status: "CANCELLED" } });
  if (res.count !== 1) throw new DomainError("INVALID_STATE", "Booked slots can't be removed.");
}

export async function setBookingOutcome(
  userId: string,
  bookingId: string,
  outcome: "COMPLETED" | "NO_SHOW",
  opts: { db?: Db } = {},
) {
  const db = opts.db ?? defaultPrisma;
  const booking = await db.booking.findUnique({ where: { id: bookingId }, include: { slot: { include: { business: true } } } });
  if (!booking || booking.slot.business.ownerId !== userId) throw new DomainError("FORBIDDEN", "You can't manage this booking.");
  if (booking.status !== "CONFIRMED") throw new DomainError("INVALID_STATE", "This booking has already been closed.");
  return db.booking.update({ where: { id: bookingId }, data: { status: outcome } });
}

/** Bookings for the owner's business only. */
export async function listBusinessBookings(userId: string, opts: { db?: Db } = {}) {
  const db = opts.db ?? defaultPrisma;
  return db.booking.findMany({
    where: { slot: { business: { ownerId: userId } } },
    include: { user: { select: { name: true, email: true } }, slot: { include: { treatment: true } } },
    orderBy: { slot: { startsAt: "asc" } },
  });
}

export const profileSchema = z.object({
  name: z.string().trim().min(2).max(80),
  type: z.enum(["SALON", "BEAUTY", "BARBER"]),
  description: z.string().trim().max(1000),
  address: z.string().trim().min(5).max(200),
  postcode: z.string().trim().max(10),
  area: z.string().trim().max(60),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  phone: z.string().trim().max(30).optional(),
  logoUrl: z.string().trim().url().or(z.literal("")).optional(),
  openingHours: z.record(z.string(), z.string()),
});

export async function updateBusinessProfile(userId: string, businessId: string, input: z.infer<typeof profileSchema>, opts: { db?: Db } = {}) {
  const db = opts.db ?? defaultPrisma;
  await assertOwnsBusiness(userId, businessId, db);
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) throw new DomainError("VALIDATION", parsed.error.issues[0]?.message ?? "Invalid profile");
  const { openingHours, logoUrl, ...rest } = parsed.data;
  return db.business.update({
    where: { id: businessId },
    data: { ...rest, logoUrl: logoUrl || null, openingHours: JSON.stringify(openingHours) },
  });
}

export async function createTreatment(
  userId: string,
  businessId: string,
  input: { name: string; category: string; durationMins: number; standardPrice: number },
  opts: { db?: Db } = {},
) {
  const db = opts.db ?? defaultPrisma;
  await assertOwnsBusiness(userId, businessId, db);
  if (!input.name.trim()) throw new DomainError("VALIDATION", "Treatment needs a name.");
  if (!isCategory(input.category)) throw new DomainError("VALIDATION", "Choose a category.");
  if (!(input.durationMins > 0) || !(input.standardPrice > 0)) throw new DomainError("VALIDATION", "Duration and price are required.");
  return db.treatment.create({ data: { ...input, name: input.name.trim(), businessId } });
}
