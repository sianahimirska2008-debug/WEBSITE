import type { Metadata } from "next";
import { requireBusinessUser } from "@/lib/auth";
import { getOwnedBusiness } from "@/lib/business";
import { getDashboardData } from "@/lib/dashboard";
import { BusinessBookingRow } from "@/components/business-booking-row";

export const metadata: Metadata = { title: "Bookings" };

export default async function DashboardBookings() {
  const user = await requireBusinessUser("/dashboard/bookings");
  const business = await getOwnedBusiness(user.id);
  const now = new Date();
  const d = await getDashboardData(business, now);

  const sections = [
    { id: "needs", title: "Waiting to be marked", hint: "Appointments that have started. Mark them completed or no-show to release your payout.", items: d.needsAction },
    { id: "upcoming", title: "Upcoming", hint: "You can cancel up to the start time. The customer is refunded in full and you aren't charged.", items: d.upcoming },
    { id: "past", title: "Past and cancelled", hint: null, items: d.past },
  ];

  return (
    <>
      {sections.map((s) => (
        <section key={s.id} aria-labelledby={`${s.id}-title`}>
          <h2 id={`${s.id}-title`} className="text-2xl text-ink">
            {s.title} <span className="font-sans text-base text-ink-muted">({s.items.length})</span>
          </h2>
          {s.hint && <p className="mt-1 text-sm text-ink-muted">{s.hint}</p>}
          {s.items.length === 0 ? (
            <p className="card mt-4 p-6 text-center text-sm text-ink-muted">Nothing here.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {s.items.map((b) => (
                <BusinessBookingRow key={b.id} b={b} now={now} />
              ))}
            </ul>
          )}
        </section>
      ))}
    </>
  );
}
