/* eslint-disable no-console */
import { PrismaClient, type BusinessType } from "@prisma/client";
import bcrypt from "bcryptjs";
import { splitPayment } from "../src/lib/commission";

const prisma = new PrismaClient();

// Deterministic PRNG so the seed looks the same every run.
let seed = 42;
function rand() {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
}
const pick = <T,>(arr: readonly T[]) => arr[Math.floor(rand() * arr.length)];
const between = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min;

const DEFAULT_HOURS = {
  mon: "09:00-18:00",
  tue: "09:00-19:00",
  wed: "09:00-19:00",
  thu: "09:00-20:00",
  fri: "09:00-20:00",
  sat: "09:00-17:00",
  sun: "closed",
};

type T = { name: string; category: string; durationMins: number; standardPrice: number };

const SALON_MENU: T[] = [
  { name: "Cut & blow-dry", category: "haircut", durationMins: 60, standardPrice: 6500 },
  { name: "Restyle", category: "haircut", durationMins: 75, standardPrice: 8000 },
  { name: "Full head colour", category: "colour", durationMins: 120, standardPrice: 12000 },
  { name: "Half head highlights", category: "colour", durationMins: 105, standardPrice: 9500 },
  { name: "Blow-dry", category: "haircut", durationMins: 45, standardPrice: 3800 },
];
const BEAUTY_MENU: T[] = [
  { name: "Gel manicure", category: "nails", durationMins: 45, standardPrice: 3500 },
  { name: "BIAB infill", category: "nails", durationMins: 60, standardPrice: 4500 },
  { name: "Classic lash extensions", category: "lashes", durationMins: 90, standardPrice: 7000 },
  { name: "Lash lift & tint", category: "lashes", durationMins: 50, standardPrice: 5000 },
  { name: "Brow lamination", category: "brows", durationMins: 45, standardPrice: 4500 },
  { name: "Brow shape & tint", category: "brows", durationMins: 30, standardPrice: 2800 },
  { name: "Signature facial", category: "facials", durationMins: 60, standardPrice: 7500 },
  { name: "Deep tissue massage", category: "massage", durationMins: 60, standardPrice: 8000 },
  { name: "Full leg wax", category: "waxing", durationMins: 45, standardPrice: 4000 },
];
const BARBER_MENU: T[] = [
  { name: "Skin fade", category: "barber", durationMins: 40, standardPrice: 3200 },
  { name: "Scissor cut", category: "barber", durationMins: 40, standardPrice: 3000 },
  { name: "Beard trim & shape", category: "barber", durationMins: 25, standardPrice: 1800 },
  { name: "Cut & hot towel shave", category: "barber", durationMins: 60, standardPrice: 4800 },
  { name: "Kids cut", category: "haircut", durationMins: 30, standardPrice: 2000 },
];

const BUSINESSES: {
  name: string;
  type: BusinessType;
  area: string;
  address: string;
  postcode: string;
  lat: number;
  lng: number;
  description: string;
}[] = [
  { name: "Fern & Foil", type: "SALON", area: "Shoreditch", address: "14 Redchurch Street, London", postcode: "E2 7DJ", lat: 51.5242, lng: -0.0754, description: "A calm, plant-filled salon specialising in lived-in colour and precision cuts." },
  { name: "The Linden Room", type: "SALON", area: "Islington", address: "201 Upper Street, London", postcode: "N1 1RQ", lat: 51.5401, lng: -0.1027, description: "Independent salon on Upper Street. Known for soft balayage and unhurried consultations." },
  { name: "Hollis Hair Studio", type: "SALON", area: "Clapham", address: "38 Clapham High Street, London", postcode: "SW4 7UR", lat: 51.4627, lng: -0.1376, description: "Friendly neighbourhood studio with a focus on healthy hair and curly cuts." },
  { name: "Maple Street Salon", type: "SALON", area: "Notting Hill", address: "112 Westbourne Grove, London", postcode: "W2 5RU", lat: 51.5148, lng: -0.1964, description: "Bright Westbourne Grove salon for colour corrections, blow-dries and big occasions." },
  { name: "Petal & Polish", type: "BEAUTY", area: "Soho", address: "9 Broadwick Street, London", postcode: "W1F 0DB", lat: 51.5136, lng: -0.1365, description: "Nails, brows and lashes in the middle of Soho. Walk-in friendly." },
  { name: "Still Skin Studio", type: "BEAUTY", area: "Marylebone", address: "56 Marylebone High Street, London", postcode: "W1U 5HS", lat: 51.5205, lng: -0.1518, description: "Results-led facials and massage in a quiet Marylebone treatment room." },
  { name: "Lumen Lash & Brow", type: "BEAUTY", area: "Hackney", address: "23 Mare Street, London", postcode: "E8 4RP", lat: 51.5363, lng: -0.0553, description: "Lash and brow specialists. Natural-looking sets and expert lamination." },
  { name: "Wren Beauty Rooms", type: "BEAUTY", area: "Fulham", address: "480 Fulham Road, London", postcode: "SW6 1BY", lat: 51.4803, lng: -0.1951, description: "Three treatment rooms for nails, waxing and facials, just off Fulham Broadway." },
  { name: "Sharp & Sons", type: "BARBER", area: "Camden", address: "77 Camden High Street, London", postcode: "NW1 7JL", lat: 51.5376, lng: -0.1415, description: "Classic barbershop with modern fades. Hot towel shaves a speciality." },
  { name: "Northside Barbers", type: "BARBER", area: "Dalston", address: "5 Kingsland High Street, London", postcode: "E8 2JS", lat: 51.5466, lng: -0.0754, description: "Dalston's busiest chairs. Skin fades, tapers and beard work." },
  { name: "Brixton Blade Co.", type: "BARBER", area: "Brixton", address: "18 Atlantic Road, London", postcode: "SW9 8HY", lat: 51.4613, lng: -0.1137, description: "Community barber in Brixton Village. All hair types, all ages." },
  { name: "Rye Lane Grooming", type: "BARBER", area: "Peckham", address: "142 Rye Lane, London", postcode: "SE15 4RZ", lat: 51.4689, lng: -0.0692, description: "Relaxed Peckham barbershop with great music and sharper lines." },
];

const STYLISTS = ["Ava", "Sam", "Priya", "Jordan", "Leo", "Maya", "Kofi", "Ella", "Tom", "Zara", null, null];

const slugify = (s: string) =>
  s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

/** Build a Date for a London wall-clock time `dayOffset` days from today. */
function londonTime(dayOffset: number, hour: number, minute: number): Date {
  const now = new Date();
  const londonDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(
    new Date(now.getTime() + dayOffset * 86_400_000),
  );
  const [y, m, d] = londonDate.split("-").map(Number);
  const guess = new Date(Date.UTC(y, m - 1, d, hour, minute));
  const londonHour = Number(
    new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hour12: false, timeZone: "Europe/London" }).format(guess),
  ) % 24;
  const offsetHours = londonHour - hour; // 0 in GMT, 1 in BST
  return new Date(guess.getTime() - offsetHours * 3_600_000);
}

function discountedPrice(original: number): number {
  const pct = pick([0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5]);
  return Math.round((original * (1 - pct)) / 50) * 50; // round to 50p
}

async function main() {
  console.log("Clearing existing data…");
  await prisma.stripeEvent.deleteMany();
  await prisma.review.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.favourite.deleteMany();
  await prisma.slot.deleteMany();
  await prisma.treatment.deleteMany();
  await prisma.business.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("password123", 10);

  const customer = await prisma.user.create({
    data: { name: "Casey Customer", email: "customer@gettable.dev", passwordHash, role: "CUSTOMER" },
  });
  const demoOwner = await prisma.user.create({
    data: { name: "Bailey Business", email: "business@gettable.dev", passwordHash, role: "BUSINESS" },
  });

  const businesses = [];
  for (const [i, b] of BUSINESSES.entries()) {
    const owner =
      i === 0
        ? demoOwner
        : await prisma.user.create({
            data: { name: `${b.name} Owner`, email: `owner${i}@gettable.dev`, passwordHash, role: "BUSINESS" },
          });
    const menu = b.type === "SALON" ? SALON_MENU : b.type === "BEAUTY" ? BEAUTY_MENU : BARBER_MENU;
    const business = await prisma.business.create({
      data: {
        ownerId: owner.id,
        name: b.name,
        slug: slugify(b.name),
        type: b.type,
        description: b.description,
        address: b.address,
        postcode: b.postcode,
        area: b.area,
        lat: b.lat,
        lng: b.lng,
        phone: `020 7${between(100, 999)} ${between(1000, 9999)}`,
        openingHours: JSON.stringify(DEFAULT_HOURS),
        ratingAvg: Math.round((4.3 + rand() * 0.6) * 10) / 10,
        ratingCount: between(24, 310),
        treatments: {
          create: menu.map((t) => ({
            ...t,
            standardPrice: Math.round((t.standardPrice * (0.9 + rand() * 0.3)) / 100) * 100,
          })),
        },
      },
      include: { treatments: true },
    });
    businesses.push(business);
  }

  // ~60 open slots over the next 7 days, weighted towards today and tomorrow.
  const nowLondonHour = Number(
    new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hour12: false, timeZone: "Europe/London" }).format(new Date()),
  ) % 24;
  const dayWeights = [14, 12, 8, 7, 7, 6, 6]; // = 60
  let created = 0;
  for (const [day, count] of dayWeights.entries()) {
    for (let n = 0; n < count; n++) {
      const business = businesses[(created + day) % businesses.length];
      const treatment = pick(business.treatments);
      let hour: number;
      if (day === 0) {
        // Today: spread across whatever is left of the day (at least one hour from now).
        const earliest = Math.min(Math.max(nowLondonHour + 1, 9), 21);
        hour = between(earliest, Math.max(earliest, 20));
      } else {
        hour = between(9, 19);
      }
      const minute = pick([0, 15, 30, 45]);
      const startsAt = londonTime(day, hour, minute);
      if (startsAt.getTime() <= Date.now() + 30 * 60_000) {
        // Too late today: push to tomorrow so it's still bookable.
        startsAt.setTime(londonTime(1, between(9, 19), minute).getTime());
      }
      await prisma.slot.create({
        data: {
          businessId: business.id,
          treatmentId: treatment.id,
          startsAt,
          durationMins: treatment.durationMins,
          originalPrice: treatment.standardPrice,
          price: discountedPrice(treatment.standardPrice),
          stylistName: pick(STYLISTS),
        },
      });
      created++;
    }
  }

  // Demo customer history: one upcoming booking and two past ones (with a review).
  const demoBusiness = businesses[0];
  const upcomingSlot = await prisma.slot.create({
    data: {
      businessId: demoBusiness.id,
      treatmentId: demoBusiness.treatments[0].id,
      startsAt: londonTime(3, 11, 0),
      durationMins: demoBusiness.treatments[0].durationMins,
      originalPrice: demoBusiness.treatments[0].standardPrice,
      price: discountedPrice(demoBusiness.treatments[0].standardPrice),
      stylistName: "Ava",
      status: "BOOKED",
    },
  });
  await prisma.booking.create({
    data: { userId: customer.id, slotId: upcomingSlot.id, totalPaid: upcomingSlot.price, ...splitPayment(upcomingSlot.price), reference: "GT-DEMO01", paymentRef: "mock_seed_1" },
  });

  // A booking later today for the demo business dashboard (if there's time left today).
  const todaySlotStart = new Date(Math.max(Date.now() + 2 * 3_600_000, londonTime(0, 17, 0).getTime()));
  const todaySlot = await prisma.slot.create({
    data: {
      businessId: demoBusiness.id,
      treatmentId: demoBusiness.treatments[4].id,
      startsAt: todaySlotStart,
      durationMins: demoBusiness.treatments[4].durationMins,
      originalPrice: demoBusiness.treatments[4].standardPrice,
      price: discountedPrice(demoBusiness.treatments[4].standardPrice),
      status: "BOOKED",
    },
  });
  await prisma.booking.create({
    data: { userId: customer.id, slotId: todaySlot.id, totalPaid: todaySlot.price, ...splitPayment(todaySlot.price), reference: "GT-DEMO02", paymentRef: "mock_seed_2" },
  });

  // Yesterday's appointment at the demo business, waiting to be marked completed / no-show.
  const yesterdaySlot = await prisma.slot.create({
    data: {
      businessId: demoBusiness.id,
      treatmentId: demoBusiness.treatments[1].id,
      startsAt: londonTime(-1, 15, 30),
      durationMins: demoBusiness.treatments[1].durationMins,
      originalPrice: demoBusiness.treatments[1].standardPrice,
      price: discountedPrice(demoBusiness.treatments[1].standardPrice),
      status: "BOOKED",
    },
  });
  await prisma.booking.create({
    data: { userId: customer.id, slotId: yesterdaySlot.id, totalPaid: yesterdaySlot.price, ...splitPayment(yesterdaySlot.price), reference: "GT-DEMO03", paymentRef: "mock_seed_3", chargeId: "mock_ch_seed_3" },
  });

  // A completed, paid-out booking at the demo business (for the earnings page).
  const lastWeekSlot = await prisma.slot.create({
    data: {
      businessId: demoBusiness.id,
      treatmentId: demoBusiness.treatments[0].id,
      startsAt: londonTime(-4, 11, 0),
      durationMins: demoBusiness.treatments[0].durationMins,
      originalPrice: demoBusiness.treatments[0].standardPrice,
      price: discountedPrice(demoBusiness.treatments[0].standardPrice),
      status: "BOOKED",
    },
  });
  await prisma.booking.create({
    data: {
      userId: customer.id,
      slotId: lastWeekSlot.id,
      totalPaid: lastWeekSlot.price,
      ...splitPayment(lastWeekSlot.price),
      reference: "GT-DEMO04",
      status: "COMPLETED",
      completedAt: londonTime(-4, 12, 0),
      paymentRef: "mock_seed_4",
      chargeId: "mock_ch_seed_4",
      payoutStatus: "PAID",
      transferId: "mock_tr_seed_4",
      paidOutAt: londonTime(-4, 12, 0),
    },
  });

  for (const [i, daysAgo] of [6, 14].entries()) {
    const b = businesses[4 + i * 4];
    const t = b.treatments[0];
    const slot = await prisma.slot.create({
      data: {
        businessId: b.id,
        treatmentId: t.id,
        startsAt: londonTime(-daysAgo, 14, 0),
        durationMins: t.durationMins,
        originalPrice: t.standardPrice,
        price: discountedPrice(t.standardPrice),
        status: "BOOKED",
      },
    });
    const booking = await prisma.booking.create({
      data: {
        userId: customer.id,
        slotId: slot.id,
        totalPaid: slot.price,
        ...splitPayment(slot.price),
        reference: `GT-PAST0${i + 1}`,
        status: "COMPLETED",
        payoutStatus: "PAID",
        transferId: `mock_tr_seed_past_${i}`,
        paymentRef: `mock_seed_past_${i}`,
        createdAt: londonTime(-daysAgo - 1, 10, 0),
      },
    });
    if (i === 0) {
      await prisma.review.create({ data: { bookingId: booking.id, rating: 5, comment: "Lovely, would book again." } });
    }
  }

  await prisma.favourite.create({ data: { userId: customer.id, businessId: businesses[4].id } });

  console.log(`Seeded ${businesses.length} businesses and ${created} open slots.`);
  console.log("Demo logins (password: password123): customer@gettable.dev, business@gettable.dev");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
