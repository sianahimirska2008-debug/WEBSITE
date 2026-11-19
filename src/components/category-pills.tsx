import Link from "next/link";
import { CATEGORIES } from "@/lib/categories";

export function CategoryPills({ active }: { active?: string }) {
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
                  isActive ? "border-adam bg-adam text-on-adam" : "border-line bg-card text-ink hover:border-line-strong"
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
