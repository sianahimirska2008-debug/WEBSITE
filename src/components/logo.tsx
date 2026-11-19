import Link from "next/link";

export function LogoMark({ className = "h-7 w-7", inverted = false }: { className?: string; inverted?: boolean }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" focusable="false">
      <rect width="32" height="32" rx="9" fill={inverted ? "#f6f5f1" : "#34483b"} />
      <text
        x="16"
        y="21.5"
        textAnchor="middle"
        fontFamily="var(--font-instrument-serif), Georgia, serif"
        fontSize="22"
        fontStyle="italic"
        fill={inverted ? "#34483b" : "#f6f5f1"}
      >
        g
      </text>
    </svg>
  );
}

export function Logo({ inverted = false }: { inverted?: boolean }) {
  return (
    <Link href="/" className="inline-flex items-center gap-2" aria-label="Gettable home">
      <LogoMark inverted={inverted} />
      <span className={`font-serif text-[1.65rem] leading-none ${inverted ? "text-on-adam" : "text-ink"}`}>gettable</span>
    </Link>
  );
}
