import bcrypt from "bcryptjs";
import { z } from "zod";
import type { PrismaClient } from "@prisma/client";
import { prisma as defaultPrisma } from "./db";
import { DomainError } from "./errors";

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(80),
  email: z.string().trim().toLowerCase().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
});

export async function registerUser(
  input: { name: string; email: string; password: string; role: "CUSTOMER" | "BUSINESS" },
  db: PrismaClient = defaultPrisma,
) {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) throw new DomainError("VALIDATION", parsed.error.issues[0]?.message ?? "Check your details");
  const { name, email, password } = parsed.data;
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) throw new DomainError("VALIDATION", "An account with this email already exists. Try logging in.");
  const passwordHash = await bcrypt.hash(password, 10);
  return db.user.create({ data: { name, email, passwordHash, role: input.role } });
}
