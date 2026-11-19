import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & { id: string; role: "CUSTOMER" | "BUSINESS" };
  }
  interface User {
    role: "CUSTOMER" | "BUSINESS";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: "CUSTOMER" | "BUSINESS";
  }
}
