/**
 * Runs the scheduled payment job once: releases lapsed slot holds, auto-completes
 * bookings 48h after the appointment, pays out what's due and retries failed refunds.
 * Usage: npm run jobs
 */
import { runPaymentJobs } from "../src/lib/payouts";
import { prisma } from "../src/lib/db";

runPaymentJobs()
  .then((r) => console.log("Payment jobs:", r))
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
