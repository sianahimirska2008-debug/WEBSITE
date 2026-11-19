import Link from "next/link";
import { Logo } from "./logo";

const COLUMNS = [
  {
    title: "Gettable",
    links: [
      { href: "/about", label: "About" },
      { href: "/careers", label: "Careers" },
      { href: "/contact", label: "Contact" },
    ],
  },
  {
    title: "Businesses",
    links: [
      { href: "/business", label: "For businesses" },
      { href: "/dashboard", label: "Business login" },
    ],
  },
  {
    title: "Support",
    links: [
      { href: "/help", label: "Help" },
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
      { href: "/cookies", label: "Cookies" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="on-adam bg-adam-deep text-on-adam">
      <div className="container-page grid gap-10 py-14 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="max-w-xs">
          <Logo inverted />
          <p className="mt-4 text-sm leading-relaxed text-on-adam-muted">
            Spare appointments at independent salons, beauty studios and barbers, for less.
          </p>
        </div>
        {COLUMNS.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <h2 className="font-sans text-sm font-medium text-on-adam">{col.title}</h2>
            <ul className="mt-4 space-y-3">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-on-adam-muted hover:text-on-adam">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-line-on-adam">
        <div className="container-page flex flex-col gap-2 py-6 text-xs text-on-adam-muted sm:flex-row sm:justify-between">
          <p>&copy; {new Date().getFullYear()} Gettable. Prices in GBP.</p>
          <p>Made in London.</p>
        </div>
      </div>
    </footer>
  );
}
