import type { Metadata } from "next";
import Link from "next/link";
import { requireBusinessUser } from "@/lib/auth";
import { getOwnedBusiness } from "@/lib/business";
import { getDashboardData } from "@/lib/dashboard";
import { formatPrice } from "@/lib/money";
import { BusinessBookingRow } from "@/components/business-booking-row";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardOverview() {
  const user = await requireBusinessUser("/dashboard");
  const business = await getOwnedBusiness(user.id);
  const now = new Date();
  const d = await getDashboardData(business, now);

  const tiles = [
    { label: "Today's bookings", value: String(d.stats.todaysCount), hint: d.stats.todaysCount ? `${formatPrice(d.stats.todaysValue)} to you` : "None yet today" },
    { label: "Slots filled, next 7 days", value: `${d.stats.filled}/${d.stats.slotsNextWeek}`, hint: d.stats.slotsNextWeek ? `${Math.round((d.stats.filled / d.stats.slotsNextWeek) * 100)}% booked` : "No slots posted" },
    { label: "Revenue, last 7 days", value: formatPrice(d.stats.weekNet), hint: `${formatPrice(d.stats.weekGross)} paid by customers` },
    { label: "Paid out to you", value: formatPrice(d.earnings.paidOut), hint: d.earnings.onHold ? `${formatPrice(d.earnings.onHold)} on hold` : "All time" },
  ];

  return (
    <>
      <h2 className="sr-only">Overview</h2>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((t) => (
          <li key={t.label} className="card p-5">
            <p className="text-sm text-ink-muted">{t.label}</p>
            <p className="mt-2 font-serif text-4xl text-ink tabular-nums">{t.value}</p>
            <p className="mt-1 text-xs text-ink-muted">{t.hint}</p>
          </li>
        ))}
      </ul>

      {d.needsAction.length > 0 && (
        <section aria-labelledby="action-title">
          <h2 id="action-title" className="text-2xl text-ink">
            Needs your <em className="italic text-adam">attention</em>
          </h2>
          <p className="mt-1 text-sm text-ink-muted">Mark each finished appointment so we can pay you. Unmarked bookings complete automatically 48 hours after the appointment.</p>
          <ul className="mt-4 space-y-3">
            {d.needsAction.map((b) => (
              <BusinessBookingRow key={b.id} b={b} now={now} />
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="today-title">
        <div className="flex items-end justify-between gap-3">
          <h2 id="today-title" className="text-2xl text-ink">
            Today
          </h2>
          <Link href="/dashboard/bookings" className="text-sm font-medium text-ink hover:text-adam">
            All bookings
          </Link>
        </div>
        {d.todays.length === 0 ? (
          <div className="card mt-4 p-8 text-center">
            <p className="text-ink-muted">No bookings today.</p>
            <Link href="/dashboard/slots" className="btn-primary mt-4">
              Post a slot
            </Link>
          </div>
        ) : (
          <ul className="mt-4 space-y-3">
            {d.todays.map((b) => (
              <BusinessBookingRow key={b.id} b={b} now={now} />
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
