import Link from "next/link";
import { CATEGORIES } from "@/lib/categories";

export function CategoryPills({ active, onDark = false }: { active?: string; onDark?: boolean }) {
  return (
    <nav aria-label="Browse by treatment" className="-mx-4 sm:mx-0">
      <ul className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-1 sm:flex-wrap sm:px-0">
        {CATEGORIES.map((c) => {
          const isActive = active === c.slug;
          return (
            <li key={c.slug} className="shrink-0">
              <Link
                href={`/slots?category=${c.slug}`}
                aria-current={isActive ? "true" : undefined}
                className={`inline-flex items-center rounded-full border px-4 py-2 text-sm transition-colors ${
                  onDark
                    ? "border-line-on-adam text-on-adam hover:border-on-adam hover:bg-white/5"
                    : isActive
                      ? "border-adam bg-adam text-on-adam"
                      : "border-line bg-card text-ink hover:border-adam"
                }`}
              >
                {c.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
