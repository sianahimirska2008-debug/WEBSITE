import { formatPrice } from "@/lib/money";
import { formatDay, formatTime } from "@/lib/time";
import { PAYOUT_LABEL } from "@/lib/dashboard";
import { StatusPill } from "./status-pill";
import { BookingActions } from "./booking-actions";

type Row = {
  id: string;
  reference: string;
  status: string;
  totalPaid: number;
  commission: number;
  businessAmount: number;
  payoutStatus: string;
  refundStatus: string;
  cancelledBy: string | null;
  autoCompleted: boolean;
  user: { name: string };
  slot: { startsAt: Date; durationMins: number; stylistName: string | null; treatment: { name: string } };
};

const STATUS: Record<string, { label: string; tone: "good" | "wait" | "bad" | "muted" }> = {
  CONFIRMED: { label: "Confirmed", tone: "good" },
  COMPLETED: { label: "Completed", tone: "muted" },
  NO_SHOW: { label: "No-show", tone: "bad" },
  CANCELLED: { label: "Cancelled", tone: "muted" },
};

export function BusinessBookingRow({ b, now, actions = true }: { b: Row; now: Date; actions?: boolean }) {
  const status = STATUS[b.status] ?? { label: b.status, tone: "muted" as const };
  const payout = PAYOUT_LABEL[b.payoutStatus];
  const started = b.slot.startsAt <= now;
  return (
    <li className="card flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-2">
          <span className="font-serif text-xl text-ink">{b.slot.treatment.name}</span>
          <StatusPill {...status} />
          {b.status !== "CONFIRMED" && b.status !== "CANCELLED" && payout && <StatusPill label={payout.label} tone={payout.tone} />}
        </p>
        <p className="mt-0.5 text-sm text-ink">
          {formatDay(b.slot.startsAt, now)}, {formatTime(b.slot.startsAt)} · {b.slot.durationMins} min · {b.user.name}
          {b.slot.stylistName ? ` with ${b.slot.stylistName}` : ""}
        </p>
        <p className="mt-1 text-xs text-ink-muted">
          Ref <span className="font-mono text-ink">{b.reference}</span> · Customer paid {formatPrice(b.totalPaid)} · Commission {formatPrice(b.commission)} ·{" "}
          <span className="font-medium text-ink">You get {formatPrice(b.businessAmount)}</span>
          {b.autoCompleted ? " · Auto-completed" : ""}
          {b.status === "CANCELLED" ? ` · Cancelled by ${b.cancelledBy === "BUSINESS" ? "you" : b.cancelledBy === "CUSTOMER" ? "the customer" : "GETTABLE"}, customer refunded` : ""}
        </p>
      </div>
      {actions && b.status === "CONFIRMED" && (
        <div className="shrink-0">
          <BookingActions bookingId={b.id} started={started} priceLabel={formatPrice(b.totalPaid)} />
        </div>
      )}
    </li>
  );
}
