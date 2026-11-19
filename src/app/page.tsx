import Link from "next/link";
import { searchSlots } from "@/lib/slots";
import { SearchBar } from "@/components/search-bar";
import { CategoryPills } from "@/components/category-pills";
import { SlotCard } from "@/components/slot-card";
import { ArrowRightIcon, CheckIcon } from "@/components/icons";

export const dynamic = "force-dynamic";

const STEPS = [
  { title: "Find a spare slot", body: "Browse last-minute openings at salons, studios and barbers near you, updated by the businesses themselves." },
  { title: "Book at a discount", body: "Pick a time and pay the discounted price up front. Your booking is confirmed instantly." },
  { title: "Turn up and enjoy", body: "Show your booking reference when you arrive. Same treatment, same team, smaller bill." },
];

const BENEFITS = [
  { title: "Real savings", body: "Typically 20 to 50% off the standard price, shown clearly before you book." },
  { title: "Last-minute availability", body: "Today, tonight or this weekend. Slots that would otherwise go empty." },
  { title: "Independent local businesses", body: "Every salon, studio and barber is an independent business in your area." },
  { title: "No membership", body: "No subscription and no booking fees. Pay only for the appointment you book." },
];

const BUSINESS_POINTS = [
  { title: "Fill empty chairs", body: "Turn cancellations and quiet afternoons into paid appointments." },
  { title: "Post slots in seconds", body: "Pick a treatment, a time and a price. It's live straight away." },
  { title: "No upfront cost", body: "Free to join. You only pay a small commission on slots you fill." },
];

// Placeholder testimonials. Names and quotes are fictional.
const TESTIMONIALS = [
  { quote: "Booked a cut on my lunch break for less than I usually pay for a blow-dry.", name: "Alex P.", detail: "Placeholder review" },
  { quote: "The Tuesday afternoon gap in our book is now our busiest hour.", name: "Sample Salon Owner", detail: "Placeholder review" },
  { quote: "I just check it on a Friday and see who's got space. Easy.", name: "Jamie R.", detail: "Placeholder review" },
];

export default async function HomePage() {
  let todaySlots = await searchSlots({ today: true, sort: "soonest", limit: 8 });
  const showingToday = todaySlots.length > 0;
  if (!showingToday) todaySlots = await searchSlots({ sort: "soonest", limit: 8 });

  return (
    <>
      {/* Hero */}
      <section aria-labelledby="hero-title" className="container-page pb-10 pt-12 sm:pt-20 md:pb-14">
        <div className="max-w-4xl">
          <p className="eyebrow">Spare appointments across London</p>
          <h1 id="hero-title" className="mt-4 text-[2.9rem] leading-[1.02] text-ink sm:text-6xl md:text-7xl">
            Beautiful appointments, <span className="whitespace-nowrap"><em className="italic text-adam">for less</em>.</span>
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-ink-muted sm:text-lg">
            Salons, beauty studios and barbers post their free slots at a discount. You book the one that suits you.
          </p>
        </div>
        <div className="mt-8 max-w-4xl sm:mt-10">
          <SearchBar />
        </div>
        <div className="mt-6">
          <h2 className="sr-only">Browse by treatment</h2>
          <CategoryPills />
        </div>
      </section>

      {/* Available today */}
      <section aria-labelledby="today-title" className="border-t border-line py-14 sm:py-20">
        <div className="container-page">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 id="today-title" className="text-3xl text-ink sm:text-4xl">
                {showingToday ? (
                  <>
                    Available <em className="italic">today</em> near you
                  </>
                ) : (
                  <>
                    Next available <em className="italic">near you</em>
                  </>
                )}
              </h2>
              <p className="mt-2 text-sm text-ink-muted">Distances from central London. Prices include the discount.</p>
            </div>
            <Link href={showingToday ? "/slots?today=1" : "/slots"} className="hidden shrink-0 items-center gap-1.5 text-sm font-medium text-ink hover:text-adam sm:inline-flex">
              See all slots <ArrowRightIcon />
            </Link>
          </div>

          {todaySlots.length === 0 ? (
            <p className="card mt-8 p-8 text-center text-ink-muted">No open slots right now. Check back soon.</p>
          ) : (
            <ul className="no-scrollbar -mx-4 mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-4">
              {todaySlots.map((slot) => (
                <li key={slot.id} className="w-[82%] shrink-0 snap-start sm:w-auto">
                  <SlotCard slot={slot} />
                </li>
              ))}
            </ul>
          )}
          <Link href="/slots" className="btn-secondary mt-6 w-full sm:hidden">
            See all slots
          </Link>
        </div>
      </section>

      {/* How it works */}
      <section aria-labelledby="how-title" className="border-t border-line py-14 sm:py-20">
        <div className="container-page">
          <p className="eyebrow">How it works</p>
          <h2 id="how-title" className="mt-3 max-w-xl text-3xl text-ink sm:text-4xl">
            Three steps to a <em className="italic">better-value</em> appointment
          </h2>
          <ol className="mt-10 grid gap-4 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <li key={step.title} className="card p-6 sm:p-7">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-sage font-serif text-xl text-adam" aria-hidden="true">
                  {i + 1}
                </span>
                <h3 className="mt-5 text-2xl text-ink">
                  <span className="sr-only">Step {i + 1}: </span>
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Why Gettable */}
      <section aria-labelledby="why-title" className="border-t border-line py-14 sm:py-20">
        <div className="container-page">
          <p className="eyebrow">Why Gettable</p>
          <h2 id="why-title" className="mt-3 max-w-xl text-3xl text-ink sm:text-4xl">
            The same great appointment, <em className="italic">just gettable</em>
          </h2>
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {BENEFITS.map((b) => (
              <li key={b.title} className="card p-6">
                <span className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-adam" aria-hidden="true">
                  <CheckIcon />
                </span>
                <h3 className="mt-5 text-xl text-ink">{b.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">{b.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* For businesses */}
      <section aria-labelledby="biz-title" className="bg-sage py-14 sm:py-20">
        <div className="container-page grid gap-10 lg:grid-cols-[1fr_1.2fr] lg:items-center">
          <div>
            <p className="eyebrow">For businesses</p>
            <h2 id="biz-title" className="mt-3 text-3xl text-ink sm:text-5xl">
              Empty chairs, <em className="italic">filled</em>.
            </h2>
            <p className="mt-4 max-w-md text-base leading-relaxed text-ink-muted">
              Gettable helps independent salons, beauty studios and barbers turn spare time into income, without discounting your whole menu.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/business#join" className="btn-primary px-6 py-3">
                List your business
              </Link>
              <Link href="/business" className="btn-secondary px-6 py-3">
                How it works
              </Link>
            </div>
          </div>
          <ul className="grid gap-3">
            {BUSINESS_POINTS.map((p) => (
              <li key={p.title} className="flex gap-4 rounded-[var(--radius-card)] border border-line/70 bg-card p-5">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-adam text-on-adam" aria-hidden="true">
                  <CheckIcon className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="font-sans text-base font-medium text-ink">{p.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-ink-muted">{p.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Testimonials */}
      <section aria-labelledby="testimonials-title" className="py-14 sm:py-20">
        <div className="container-page">
          <h2 id="testimonials-title" className="text-3xl text-ink sm:text-4xl">
            What people <em className="italic">say</em>
          </h2>
          <p className="mt-2 text-sm text-ink-muted">Sample testimonials for illustration. Names and quotes are placeholders.</p>
          <ul className="mt-10 grid gap-4 md:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <li key={t.name} className="card flex flex-col p-6 sm:p-7">
                <figure className="flex h-full flex-col">
                  <blockquote className="font-serif text-2xl leading-snug text-ink">&ldquo;{t.quote}&rdquo;</blockquote>
                  <figcaption className="mt-auto pt-6 text-sm">
                    <span className="font-medium text-ink">{t.name}</span>
                    <span className="text-ink-muted"> · {t.detail}</span>
                  </figcaption>
                </figure>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Closing CTA */}
      <section aria-labelledby="cta-title" className="on-adam bg-adam text-on-adam">
        <div className="container-page flex flex-col items-start gap-6 py-16 sm:py-20 md:flex-row md:items-center md:justify-between">
          <h2 id="cta-title" className="max-w-2xl text-4xl leading-tight sm:text-5xl">
            Your next appointment is <em className="italic">already waiting</em>.
          </h2>
          <div className="flex flex-wrap gap-3">
            <Link href="/slots" className="btn-light px-6 py-3">
              Find a slot
            </Link>
            <Link href="/business#join" className="btn rounded-full border border-on-adam/40 px-6 py-3 text-on-adam hover:border-on-adam">
              List your business
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
