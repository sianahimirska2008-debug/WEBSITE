const TZ = "Europe/London";

export function formatTime(d: Date): string {
  return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: TZ }).format(d);
}

export function formatDay(d: Date, now = new Date()): string {
  const key = (x: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(x);
  const today = key(now);
  const tomorrow = key(new Date(now.getTime() + 86_400_000));
  if (key(d) === today) return "Today";
  if (key(d) === tomorrow) return "Tomorrow";
  return new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: TZ }).format(d);
}

export function formatLongDate(d: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TZ,
  }).format(d);
}

/** YYYY-MM-DD for a date in London time. */
export function londonDateKey(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d);
}

/** Hour (0-23) in London time. */
export function londonHour(d: Date): number {
  return Number(new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hour12: false, timeZone: TZ }).format(d)) % 24;
}

/** Convert a London wall-clock date + time ("2026-11-20", "14:30") to a UTC Date. */
export function londonToUtc(date: string, time: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  // Start with the naive UTC guess, then correct by London's offset at that instant.
  const guess = new Date(Date.UTC(y, m - 1, d, hh, mm));
  const londonAsUtc = new Date(
    new Intl.DateTimeFormat("en-US", {
      timeZone: TZ,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
      .format(guess)
      .replace(/(\d+)\/(\d+)\/(\d+), (\d+):(\d+)/, "$3-$1-$2T$4:$5:00Z")
      .replace("T24:", "T00:"),
  );
  const offset = londonAsUtc.getTime() - guess.getTime();
  return new Date(guess.getTime() - offset);
}

export function timeOfDay(d: Date): "morning" | "afternoon" | "evening" {
  const h = londonHour(d);
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}
