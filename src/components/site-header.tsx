"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { signOut } from "next-auth/react";
import { Logo } from "./logo";

const NAV = [
  { href: "/slots", label: "Browse slots" },
  { href: "/business", label: "For businesses" },
  { href: "/about", label: "About" },
];

type HeaderUser = { name: string; role: "CUSTOMER" | "BUSINESS" } | null;

export function SiteHeader({ user }: { user: HeaderUser }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const accountLink = user
    ? user.role === "BUSINESS"
      ? { href: "/dashboard", label: "Dashboard" }
      : { href: "/bookings", label: "My bookings" }
    : null;

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="on-adam sticky top-0 z-40 border-b border-line-on-adam bg-adam text-on-adam">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Logo inverted />

        <nav aria-label="Main" className="hidden md:block">
          <ul className="flex items-center gap-1">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className="rounded-full px-3.5 py-2 text-sm text-on-adam-muted transition-colors hover:text-on-adam aria-[current=page]:bg-white/10 aria-[current=page]:font-medium aria-[current=page]:text-on-adam"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {user ? (
            <>
              {accountLink && (
                <Link href={accountLink.href} className="rounded-full px-3.5 py-2 text-sm font-medium text-on-adam hover:bg-white/10">
                  {accountLink.label}
                </Link>
              )}
              <button type="button" onClick={() => signOut({ callbackUrl: "/" })} className="btn border border-line-on-adam text-on-adam hover:border-on-adam">
                Log out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="rounded-full px-3.5 py-2 text-sm font-medium text-on-adam hover:bg-white/10">
                Log in
              </Link>
              <Link href="/business#join" className="btn-light">
                List your business
              </Link>
            </>
          )}
        </div>

        <button
          ref={buttonRef}
          type="button"
          className="-mr-2 inline-flex h-11 w-11 items-center justify-center rounded-full text-on-adam hover:bg-white/10 md:hidden"
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen((o) => !o)}
        >
          <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
            {open ? <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" /> : <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />}
          </svg>
        </button>
      </div>

      <div id="mobile-menu" hidden={!open} className="border-t border-line-on-adam bg-adam md:hidden">
        <nav aria-label="Mobile" className="container-page py-4">
          <ul className="flex flex-col">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className="block border-b border-line-on-adam py-3.5 text-base text-on-adam"
                >
                  {item.label}
                </Link>
              </li>
            ))}
            {accountLink && (
              <li>
                <Link href={accountLink.href} className="block border-b border-line-on-adam py-3.5 text-base text-on-adam">
                  {accountLink.label}
                </Link>
              </li>
            )}
          </ul>
          <div className="mt-5 flex flex-col gap-3">
            {user ? (
              <button type="button" onClick={() => signOut({ callbackUrl: "/" })} className="btn w-full border border-line-on-adam py-3 text-on-adam">
                Log out
              </button>
            ) : (
              <>
                <Link href="/business#join" className="btn-light w-full py-3">
                  List your business
                </Link>
                <Link href="/login" className="btn w-full border border-line-on-adam py-3 text-on-adam">
                  Log in
                </Link>
              </>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
