import { CalendarIcon, PinIcon, SearchIcon } from "./icons";

type Props = { defaults?: { q?: string; area?: string; date?: string }; compact?: boolean };

/** Plain GET form to /slots, so it works without JavaScript. */
export function SearchBar({ defaults = {}, compact = false }: Props) {
  return (
    <form
      action="/slots"
      method="get"
      role="search"
      aria-label="Find a slot"
      className={`card grid gap-2 p-2 shadow-[0_1px_0_rgba(28,36,32,0.03)] md:grid-cols-[1.4fr_1fr_0.9fr_auto] md:items-center md:gap-0 md:rounded-full md:p-1.5 ${compact ? "" : "md:pl-3"}`}
    >
      <label className="flex items-center gap-2.5 rounded-full px-3 py-2.5 md:border-r md:border-line">
        <SearchIcon className="h-4 w-4 shrink-0 text-ink-muted" />
        <span className="sr-only">Treatment or business</span>
        <input
          name="q"
          defaultValue={defaults.q}
          placeholder="Treatment or business"
          className="w-full bg-transparent text-sm text-ink placeholder:text-ink-muted focus:outline-none"
        />
      </label>
      <label className="flex items-center gap-2.5 rounded-full px-3 py-2.5 md:border-r md:border-line">
        <PinIcon className="h-4 w-4 shrink-0 text-ink-muted" />
        <span className="sr-only">Area or postcode</span>
        <input
          name="area"
          defaultValue={defaults.area}
          placeholder="Area or postcode"
          autoComplete="postal-code"
          className="w-full bg-transparent text-sm text-ink placeholder:text-ink-muted focus:outline-none"
        />
      </label>
      <label className="flex items-center gap-2.5 rounded-full px-3 py-2.5">
        <CalendarIcon className="h-4 w-4 shrink-0 text-ink-muted" />
        <span className="sr-only">Date</span>
        <input
          type="date"
          name="date"
          defaultValue={defaults.date}
          className="w-full bg-transparent text-sm text-ink focus:outline-none [&::-webkit-calendar-picker-indicator]:opacity-60"
        />
      </label>
      <button type="submit" className="btn-primary w-full px-6 py-3 md:w-auto">
        Find a slot
      </button>
    </form>
  );
}
