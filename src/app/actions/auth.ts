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
