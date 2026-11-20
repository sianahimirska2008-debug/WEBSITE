const TONES = {
  good: "bg-adam text-on-adam",
  wait: "bg-band text-on-band",
  bad: "bg-danger/10 text-danger",
  muted: "border border-line-strong text-ink-muted",
} as const;

export function StatusPill({ label, tone }: { label: string; tone: keyof typeof TONES }) {
  return <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${TONES[tone]}`}>{label}</span>;
}
