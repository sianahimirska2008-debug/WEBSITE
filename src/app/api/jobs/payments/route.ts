import { timingSafeEqual } from "node:crypto";
import { runPaymentJobs } from "@/lib/payouts";

/**
 * Scheduled job endpoint (call every ~15 minutes from a cron service).
 * Requires `Authorization: Bearer <CRON_SECRET>`.
 */
function authorised(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization") ?? "";
  if (!secret || secret.length < 16) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const given = Buffer.from(header);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

async function handle(request: Request) {
  if (!authorised(request)) return Response.json({ error: "Unauthorised" }, { status: 401 });
  const result = await runPaymentJobs();
  return Response.json(result);
}

export const GET = handle;
export const POST = handle;
