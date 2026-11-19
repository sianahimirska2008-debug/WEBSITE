/** Logo if the business has one, otherwise a monogram on sage. */
export function BusinessAvatar({ name, logoUrl, size = "h-14 w-14 text-2xl" }: { name: string; logoUrl?: string | null; size?: string }) {
  if (logoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={logoUrl} alt={`${name} logo`} className={`${size} shrink-0 rounded-2xl border border-line object-cover`} />;
  }
  const initials = name
    .replace(/&/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("");
  return (
    <span aria-hidden="true" className={`${size} flex shrink-0 items-center justify-center rounded-2xl bg-sage-deep font-serif text-adam`}>
      {initials}
    </span>
  );
}
