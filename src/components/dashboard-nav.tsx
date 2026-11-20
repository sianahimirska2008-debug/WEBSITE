"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/bookings", label: "Bookings" },
  { href: "/dashboard/slots", label: "Slots" },
  { href: "/dashboard/payouts", label: "Earnings & payouts" },
  { href: "/dashboard/profile", label: "Profile" },
];

export function DashboardNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Dashboard" className="-mx-4 sm:mx-0">
      <ul className="no-scrollbar flex gap-1 overflow-x-auto px-4 sm:px-0">
        {TABS.map((t) => {
          const active = t.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(t.href);
          return (
            <li key={t.href} className="shrink-0">
              <Link
                href={t.href}
                aria-current={active ? "page" : undefined}
                className="inline-block rounded-full px-4 py-2 text-sm text-on-band-muted transition-colors hover:bg-white/40 hover:text-on-band aria-[current=page]:bg-card aria-[current=page]:font-medium aria-[current=page]:text-on-band"
              >
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
