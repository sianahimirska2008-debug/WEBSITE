# gettable

Discounted spare appointments at independent salons, beauty studios and barbers. Businesses post free slots at a discount; customers browse, book and pay; GETTABLE keeps a 15% commission on completed bookings and pays the rest to the business through **Stripe Connect**.

## Quick start

```bash
npm install
cp .env.example .env        # works as-is in demo mode (no Stripe keys needed)
npx prisma migrate dev
npm run seed
npm run dev                 # http://localhost:3000
```

Without Stripe keys the app runs in **demo mode**: payments, refunds and payouts are simulated with the same booking logic, so everything can be clicked through locally.

### Demo logins (password `password123`)

| Role | Email | What to try |
|---|---|---|
| Customer | `customer@gettable.dev` | Book a slot (card `4242 4242 4242 4242`; `4000 0000 0000 0002` declines), cancel a booking 24h+ ahead |
| Business | `business@gettable.dev` | Dashboard for Fern & Foil: mark yesterday's booking completed, see earnings, post slots |

The log-in page has buttons that fill these in.

## Payments: how money moves

GETTABLE uses Stripe Connect **separate charges and transfers** ([Stripe docs](https://docs.stripe.com/connect/separate-charges-and-transfers)): the customer pays GETTABLE, and the business's share is transferred only once the appointment has happened.

```
Customer ──pays £40──▶ GETTABLE (Stripe Checkout, embedded)
                         │  holds funds until the appointment
     booking completed ──┤
     or no-show          ▼
                       Transfer £34 (85%) ──▶ Business connected account ──▶ their bank (Stripe payouts)
                       GETTABLE keeps £6 (15%), minus Stripe's processing fee
```

| Situation | Result |
|---|---|
| Customer pays | Slot held for 35 min during checkout, confirmed when Stripe reports payment (webhook **and** return page; idempotent) |
| Customer cancels ≥ 24h before | Full refund, slot reopens, no transfer |
| Within 24h | Customers can't cancel; no refund |
| Business marks **completed** or **no-show** | 85% transferred to the business (`source_transaction` = the customer's charge) |
| Business doesn't mark it | Auto-completed and paid 48h after the appointment ends |
| Business cancels before the start | Full refund to customer, slot withdrawn, no transfer |
| Refund after completion (admin) | `npm run refund -- GT-XXXXXX` reverses the transfer, then refunds the customer |
| Dispute (chargeback) | Payout held while the dispute is open; released if won |
| Business hasn't finished Stripe onboarding | Payout waits ("on hold") and is sent automatically once Stripe enables transfers |

Amounts are integer pence. Commission = round(price × 15%); the business gets the rest, so the two always add up. GETTABLE pays Stripe's processing fee out of its commission.

### Stripe objects used

- **Checkout Sessions**, `ui_mode: "embedded_page"`: Stripe's secure payment form inside our checkout page. Card data never touches our servers.
- **Accounts v2** (`/v2/core/accounts`): one connected account per business with the *recipient* configuration (`stripe_balance.stripe_transfers`), `dashboard: "express"`, and GETTABLE as `fees_collector` / `losses_collector` (required for recipient accounts).
- **Account Links v2**: Stripe-hosted onboarding (identity and bank details collected by Stripe).
- **Transfers / Transfer reversals / Refunds**: all with idempotency keys derived from the booking id.
- **Account Sessions + Connect embedded components**: the business sees its live Stripe balance and bank payouts in the dashboard.

The SDK pins API version `2026-10-28.endive` (stripe-node 23.1.0).

## Setting up Stripe (test mode first)

1. In the Stripe Dashboard (test mode), **enable Connect** and complete the platform profile as a *marketplace*. Set your Express dashboard branding.
2. Create API keys. Prefer a **restricted key** with write access to: Checkout Sessions, PaymentIntents, Refunds, Transfers, Account Sessions and Connect accounts (v2 Accounts, Account Links).
3. Put them in `.env` (never commit `.env`):
   ```
   STRIPE_SECRET_KEY=sk_test_...
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
   ```
4. Webhooks: add an endpoint `https://YOUR-DOMAIN/api/stripe/webhook` for **your account** with these events, and set `STRIPE_WEBHOOK_SECRET` to its signing secret:
   `checkout.session.completed`, `checkout.session.expired`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `charge.refunded`, `charge.dispute.created`, `charge.dispute.updated`, `charge.dispute.closed`.
   Locally: `stripe listen --forward-to localhost:3000/api/stripe/webhook` and use the secret it prints.
5. Schedule the payment job every ~15 minutes (Vercel Cron, GitHub Actions, any cron):
   ```
   curl -H "Authorization: Bearer $CRON_SECRET" https://YOUR-DOMAIN/api/jobs/payments
   ```
   or run `npm run jobs` on a server. It releases lapsed holds, auto-completes old bookings, pays out what's due (with retries) and retries failed refunds.
6. Restart the app. Businesses then use **Dashboard → Earnings & payouts → Connect with Stripe**.

Connected-account status is read from Stripe when the business returns from onboarding and whenever they open the payouts page, so no Connect webhook is needed.

If your server reaches the internet through an HTTPS proxy, also set `STRIPE_HTTP_CLIENT=fetch` and `NODE_USE_ENV_PROXY=1`.

### Going live checklist

- Switch to live keys and a live webhook endpoint (new signing secret).
- Set `APP_URL` / `NEXTAUTH_URL` to your HTTPS domain and a strong `NEXTAUTH_SECRET` and `CRON_SECRET`.
- Move from SQLite to Postgres (`provider = "postgresql"` in `prisma/schema.prisma`).
- Make sure the cron job runs.
- Review Stripe's terms for your platform and how you show refund/cancellation terms to customers.

## Security notes

- Prices and amounts are always worked out on the server from the database, never taken from the browser.
- Bookings are confirmed only after asking Stripe (webhook or server-side session lookup), never from a redirect alone.
- Webhooks are verified with the signing secret; processed event ids are stored so duplicates are ignored.
- The slot hold (35 min) outlives the Checkout session (30 min), and claiming a slot is a conditional database update inside a transaction, so a slot can't be double-booked; a payment that somehow lands late is refunded automatically.
- Every business action checks on the server that the logged-in user owns the business; IDs from the browser are never trusted.
- `/api/jobs/payments` requires `CRON_SECRET` (constant-time comparison).

## Tests

```bash
npm test
```

Runs against a throwaway SQLite database (`prisma/test.db`) with the mock payment provider. Covered: slot holds and concurrent double-booking, confirming exactly once, declined cards, late payments after a hold lapses, the 24h cancellation window, the 15/85 split, payouts (completed, no-show, on hold until onboarding, retry after failure, 48h auto-complete), business cancellations, refunds after completion with transfer reversal, disputes, owner-only access, and webhook signature checks.

## Folder structure

```
prisma/
  schema.prisma          data model (User, Business, Treatment, Slot, Booking, Favourite, Review, StripeEvent)
  migrations/            SQL migrations
  seed.ts                12 London businesses, ~60 slots over the next 7 days, demo bookings
scripts/
  run-payment-jobs.ts    npm run jobs
  refund-booking.ts      npm run refund -- GT-XXXXXX
src/
  app/                   Next.js App Router pages
    page.tsx             home
    slots/               browse (list + map) and slot detail
    b/[slug]/            business public page
    book/[slotId]/       checkout (embedded Stripe Checkout)
    book/return/         where Stripe returns the customer; confirms the booking
    bookings/            customer's bookings + cancellation
    business/            for-businesses page + business sign-up
    dashboard/           business dashboard: overview, bookings, slots, earnings & payouts, profile
    api/stripe/webhook/  Stripe webhook endpoint
    api/jobs/payments/   scheduled payment job endpoint
    actions/             server actions (auth, booking, dashboard)
  components/            UI components
  lib/
    bookings.ts          holds, checkout, confirmation, cancellation, refunds
    payouts.ts           completion, transfers, auto-complete job, disputes, refund-after-completion
    business.ts          owner-checked slot/treatment/profile management
    commission.ts        15/85 split
    payments/            PaymentProvider interface; Stripe and mock implementations
    stripe/              Stripe client, Connect (Accounts v2), webhook handling
tests/                   Vitest suites
```

## Tech

Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 (theme tokens in `src/app/globals.css`) · Prisma 6 + SQLite · NextAuth (credentials) · Stripe (stripe-node 23, Stripe.js, Connect embedded components) · Leaflet + OpenStreetMap · Vitest
