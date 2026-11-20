import type { Metadata, Viewport } from "next";
import { Inter, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Providers } from "@/components/providers";
import { getCurrentUser } from "@/lib/auth";
import { ScrollReveal } from "@/components/scroll-reveal";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Gettable: your next appointment, for less", template: "%s · Gettable" },
  description:
    "Discounted spare appointments at independent salons, beauty studios and barbers near you. Book last-minute slots for less.",
};

export const viewport: Viewport = { themeColor: "#cfdecb" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  return (
    <html lang="en-GB" className={`${inter.variable} ${instrumentSerif.variable}`} suppressHydrationWarning>
      <head>
        {/* Enable scroll animations before first paint, unless the visitor prefers reduced motion.
            Safety net: if the animation script never starts, show everything after 2.5s. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches){var d=document.documentElement;d.classList.add('motion-ok');setTimeout(function(){if(!window.__revealReady)d.classList.remove('motion-ok')},2500)}}catch(e){}",
          }}
        />
      </head>
      <body className="flex min-h-dvh flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-adam focus:px-4 focus:py-2 focus:text-on-adam"
        >
          Skip to content
        </a>
        <Providers>
          <SiteHeader user={user ? { name: user.name ?? "", role: user.role } : null} />
          <main id="main" className="flex-1">
            {children}
          </main>
          <SiteFooter />
          <ScrollReveal />
        </Providers>
      </body>
    </html>
  );
}
