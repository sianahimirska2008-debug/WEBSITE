import { DAYS, formatHours, parseHours } from "@/lib/hours";

export function OpeningHours({ json }: { json: string }) {
  const hours = parseHours(json);
  if (Object.keys(hours).length === 0) return <p className="text-sm text-ink-muted">Opening hours not listed.</p>;
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 text-sm">
      {DAYS.map(([key, label]) => (
        <div key={key} className="contents">
          <dt className="text-ink-muted">{label}</dt>
          <dd className="text-right text-ink tabular-nums">{formatHours(hours[key])}</dd>
        </div>
      ))}
    </dl>
  );
}
