import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container-page py-24 text-center">
      <p className="eyebrow">404</p>
      <h1 className="mt-3 text-5xl text-ink">
        We couldn&rsquo;t find <em className="italic">that page</em>
      </h1>
      <p className="mt-4 text-ink-muted">It may have moved, or the slot may no longer exist.</p>
      <div className="mt-8 flex justify-center gap-3">
        <Link href="/slots" className="btn-primary">
          Browse slots
        </Link>
        <Link href="/" className="btn-secondary">
          Home
        </Link>
      </div>
    </div>
  );
}
