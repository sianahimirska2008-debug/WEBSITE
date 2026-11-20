"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

const STAGGER_MS = 90;
const MAX_STAGGER_STEPS = 6;

/**
 * Adds .is-visible to [data-reveal] elements, and to each child of
 * [data-reveal-stagger], as they scroll into view (once). Children that
 * enter the screen together appear one after another. Re-scans on navigation.
 */
export function ScrollReveal() {
  const pathname = usePathname();

  useEffect(() => {
    (window as unknown as { __revealReady?: boolean }).__revealReady = true;
    if (!document.documentElement.classList.contains("motion-ok") || !("IntersectionObserver" in window)) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entering = entries
          .filter((e) => e.isIntersecting)
          .map((e) => e.target as HTMLElement)
          .sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
        let step = 0;
        for (const el of entering) {
          if (el.hasAttribute("data-reveal-stagger")) {
            // A sideways-scrolling row, watched as a whole: reveal all its items in sequence.
            Array.from(el.children).forEach((child, i) => {
              (child as HTMLElement).style.setProperty("--reveal-delay", `${Math.min(i, MAX_STAGGER_STEPS) * STAGGER_MS}ms`);
              child.classList.add("is-visible");
            });
            el.classList.add("is-revealed");
            observer.unobserve(el);
            continue;
          }
          if (el.parentElement?.hasAttribute("data-reveal-stagger")) {
            el.style.setProperty("--reveal-delay", `${Math.min(step++, MAX_STAGGER_STEPS) * STAGGER_MS}ms`);
          }
          el.classList.add("is-visible");
          observer.unobserve(el);
        }
      },
      // Any part on screen (minus a strip at the bottom) counts, so very tall elements still trigger.
      { rootMargin: "0px 0px -8% 0px", threshold: 0 },
    );

    // Items scrolled out of a sideways row never count as on screen, so watch such rows whole.
    const scrollsSideways = (el: HTMLElement) => /(auto|scroll)/.test(getComputedStyle(el).overflowX) && el.scrollWidth > el.clientWidth + 1;

    const scan = () => {
      document.querySelectorAll<HTMLElement>("[data-reveal]:not(.is-visible)").forEach((el) => observer.observe(el));
      document.querySelectorAll<HTMLElement>("[data-reveal-stagger]:not(.is-revealed)").forEach((group) => {
        if (scrollsSideways(group)) observer.observe(group);
        else Array.from(group.children).forEach((c) => !c.classList.contains("is-visible") && observer.observe(c));
      });
    };

    scan();
    // Pick up content that renders after navigation or filtering.
    const mo = new MutationObserver(scan);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      mo.disconnect();
      observer.disconnect();
    };
  }, [pathname]);

  return null;
}
