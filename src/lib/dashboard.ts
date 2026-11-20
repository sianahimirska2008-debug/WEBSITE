import type { Business } from "@prisma/client";
import { prisma } from "./db";
import { londonDateKey } from "./time";

/** Figures for the business dashboard. Everything is scoped to one business id. */
export async function getDashboardData(business: Business, now = new Date()) {
  const bookings = await prisma.booking.findMany({
    where: { slot: { businessId: business.id }, status: { notIn: ["PENDING_PAYMENT", "EXPIRED"] } },
    include: { user: { select: { name: true } }, slot: { include: { treatment: true } } },
    orderBy: { slot: { startsAt: "asc" } },
  });

  const today = londonDateKey(now);
  const weekAhead = new Date(now.getTime() + 7 * 86_400_000);
  const weekAgo = new Date(now.getTime() - 7 * 86_400_000);
  const live = bookings.filter((b) => b.status !== "CANCELLED");

  const todays = live.filter((b) => londonDateKey(b.slot.startsAt) === today);
  const needsAction = bookings.filter((b) => b.status === "CONFIRMED" && b.slot.startsAt <= now);
  const upcoming = bookings.filter((b) => b.status === "CONFIRMED" && b.slot.startsAt > now);
  const past = bookings.filter((b) => b.status !== "CONFIRMED").reverse();

  const slotsNextWeek = await prisma.slot.findMany({
    where: { businessId: business.id, startsAt: { gt: now, lte: weekAhead }, status: { in: ["OPEN", "HELD", "BOOKED"] } },
    select: { status: true },
  });
  const filled = slotsNextWeek.filter((s) => s.status === "BOOKED").length;

  const earned = live.filter((b) => b.status === "COMPLETED" || b.status === "NO_SHOW");
  const sum = (xs: { businessAmount: number }[]) => xs.reduce((n, b) => n + b.businessAmount, 0);
  const weekRevenue = live.filter((b) => b.slot.startsAt >= weekAgo && b.slot.startsAt <= now && b.status !== "CONFIRMED");

  return {
    bookings,
    todays,
    needsAction,
    upcoming,
    past,
    stats: {
      todaysCount: todays.length,
      todaysValue: todays.reduce((n, b) => n + b.businessAmount, 0),
      filled,
      slotsNextWeek: slotsNextWeek.length,
      weekGross: weekRevenue.reduce((n, b) => n + b.totalPaid, 0),
      weekNet: sum(weekRevenue),
    },
    earnings: {
      paidOut: sum(earned.filter((b) => b.payoutStatus === "PAID")),
      processing: sum(earned.filter((b) => b.payoutStatus === "PROCESSING" || b.payoutStatus === "NOT_DUE")),
      onHold: sum(earned.filter((b) => b.payoutStatus === "ON_HOLD" || b.payoutStatus === "FAILED")),
      upcoming: sum(upcoming),
      commission: earned.filter((b) => b.payoutStatus !== "NONE" && b.payoutStatus !== "REVERSED").reduce((n, b) => n + b.commission, 0),
      ledger: earned.slice().reverse(),
    },
  };
}

export const PAYOUT_LABEL: Record<string, { label: string; tone: "good" | "wait" | "bad" | "muted" }> = {
  NOT_DUE: { label: "Due after appointment", tone: "muted" },
  ON_HOLD: { label: "On hold", tone: "wait" },
  PROCESSING: { label: "Processing", tone: "wait" },
  PAID: { label: "Paid out", tone: "good" },
  FAILED: { label: "Retrying", tone: "bad" },
  REVERSED: { label: "Reversed", tone: "bad" },
  NONE: { label: "No payout", tone: "muted" },
};
