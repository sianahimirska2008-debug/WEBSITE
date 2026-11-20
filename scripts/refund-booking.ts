/**
 * Admin: refund a completed booking in full (e.g. after a complaint).
 * Reverses the business's transfer first, then refunds the customer.
 * Usage: npm run refund -- GT-ABC123
 */
import { prisma } from "../src/lib/db";
import { refundAfterCompletion } from "../src/lib/payouts";

async function main() {
  const reference = process.argv[2];
  if (!reference) throw new Error("Usage: npm run refund -- <booking reference>");
  const booking = await prisma.booking.findUnique({ where: { reference } });
  if (!booking) throw new Error(`No booking ${reference}`);
  const result = await refundAfterCompletion(booking.id);
  console.log(`${reference}: refund ${result.refundStatus}, payout ${result.payoutStatus}`);
}

main()
  .catch((e) => {
    console.error(e.message ?? e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
