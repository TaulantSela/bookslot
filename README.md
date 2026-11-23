# 📅 BookSlot

Online appointment booking for any business that sells its time: barbers, dentists, salons, tutors, mechanics, physios. Each business gets a public booking page, an embeddable widget and a dashboard for its services, hours, staff and appointments. Clients pick a free time and get an email confirmation and reminder.

**▶ [Try it live →](https://bookslot.taulantsela.com)** — or open the [demo sites](https://bookslot.taulantsela.com/demo): a barbershop on the Free plan and a dental clinic on Pro.

Taking bookings by phone and DM means answering calls all day. BookSlot gives a business a link for its Instagram, Google Maps or Viber bio, and one line of HTML for its website. The widget can match the host site's look, prefill its signed-in user and report bookings back to it, while the plan rules stay on BookSlot's server, so editing the embed code can't unlock paid options.

## What a shop can configure

| Setting | Where |
|---|---|
| Time zone and currency (any IANA zone, any ISO 4217 code) | Settings (detected at sign-up) |
| Weekly hours, with an optional break per day | Availability |
| Closed days and special hours for a date or a range of dates | Availability |
| Start-time step, gap after appointments, minimum notice, how far ahead | Availability → Booking rules |
| Per-service duration, price and its own gap | Services |
| Staff or resources (chairs, rooms): their services, own hours, time off; clients pick one or "Anyone", or staff are assigned automatically | Staff |
| Phone, email and notes: required, optional or hidden | Booking form |
| Custom questions (text, long text, number, dropdown, checkbox, date) — Pro | Booking form |
| Sites allowed to embed the widget | Widget |
| Brand colour, reminder timing | Settings |

Clients who leave an email get a confirmation and a reminder, each with a link to cancel. Two clients can't take the same time: a booking is inserted only if no overlapping appointment exists, gaps included.

## Embed it

Copy exact codes from **Dashboard → Widget** after signing up. [`examples/`](examples/README.md) has two complete host sites: plain HTML on the Free plan and Next.js on Pro.

**Booking link:** `https://bookslot.taulantsela.com/book/your-shop-slug`

**One line of HTML** (mounts right after the script tag and resizes itself):

```html
<script src="https://bookslot.taulantsela.com/widget.js" data-shop="your-shop-slug" async></script>
```

Optional attributes: `data-height` (initial height) and `data-max-width`; on Pro also `data-primary`, `data-background`, `data-text` (hex colours), `data-radius` (0–32), `data-font` (`sans`, `system`, `serif`, `mono`), `data-scheme` (`light`, `dark`, `auto`), and `data-service` / `data-staff` to preselect. The older `widget.js?shop=…` form still works.

**JavaScript API**, for apps:

```html
<div id="booking"></div>
<script src="https://bookslot.taulantsela.com/widget.js"></script>
<script>
  const widget = BookSlot.mount("#booking", {
    shop: "your-shop-slug",
    theme: { primary: "#f5c542", scheme: "auto", radius: 8, font: "system" }, // Pro
    service: "svc_…",                                                         // Pro: preselect
    prefill: { name: "Arta", email: "arta@example.com", phone: "070123456" }, // Pro
    onBooked: (booking) => console.log(booking.appointmentId, booking.when), // Pro
  });
  // widget.prefill({...}), widget.on("booked", fn), widget.off(...), widget.destroy()
</script>
```

Events: `ready` and `resize` on every plan; `booked` and `error` on Pro. They arrive as callbacks (`onReady`, `onResize`, `onBooked`, `onError` or `widget.on(...)`) and as bubbling DOM events (`bookslot:booked`, …) on the mount element. Booking events are only posted to the origin that mounted the widget, and prefilled details travel by `postMessage`, never in the URL.

**React / Next.js:** [`@bookslot/react`](packages/react) wraps the same script with typed props.

```bash
npm install @bookslot/react
```

```tsx
import { BookSlotWidget } from "@bookslot/react";

<BookSlotWidget
  shop="your-shop-slug"
  theme={{ primary: "#2dd4bf", scheme: "dark" }}    // Pro
  staff="stf_…"                                     // Pro: preselect, "" = anyone
  customer={{ name: user.name, email: user.email }} // Pro
  onBooked={(booking) => console.log(booking.when)} // Pro
/>
```

It's a client component: an App Router server component can render it with plain props, and callbacks like `onBooked` go in a client component. It points at the hosted BookSlot by default; pass `bookslotUrl` for a self-hosted one. All props: [packages/react/README.md](packages/react/README.md).

**Plain iframe** (no JavaScript, no resizing or events):

```html
<iframe src="https://bookslot.taulantsela.com/embed/your-shop-slug" width="100%" height="760" style="border:0;max-width:480px" title="Book an appointment"></iframe>
```

**Allowed websites:** in **Dashboard → Widget**, owners can list the sites allowed to embed their widget (sent as CSP `frame-ancestors`). Empty means any site. Every other page refuses to be framed.

## API and webhooks (Pro)

Create a key under **Dashboard → Developers** and call `/api/v1` from your server with `Authorization: Bearer bsk_…`:

| Endpoint | |
|---|---|
| `GET /api/v1/shop`, `/services`, `/staff`, `/form-fields` | The shop and what can be booked |
| `GET /api/v1/availability` | Free times, up to 14 days per request |
| `GET`, `POST /api/v1/appointments` | List or create bookings (same checks as the widget) |
| `GET`, `PATCH /api/v1/appointments/:id` | Read one, or set its `status` to `cancelled`, `completed` or `confirmed` |

Up to five webhook URLs per shop receive `appointment.created`, `appointment.cancelled` and `appointment.completed`, signed with HMAC-SHA256 (`BookSlot-Signature: t=…,v1=…`). Failed deliveries retry with backoff: when the shop's next event is sent, and from the daily cron. In production, webhook URLs must be public `https` addresses. Full reference: [`/docs/api`](https://bookslot.taulantsela.com/docs/api).

## Plans

Defined in `src/lib/plans.ts` and enforced on the server (embed page, booking, form settings, API keys, webhook delivery).

| | Free | Pro |
|---|---|---|
| Booking page + embed, auto-resize | ✓ | ✓ |
| Staff, booking rules, standard form fields | ✓ | ✓ |
| Online bookings per month | 50 | Unlimited |
| "Powered by BookSlot" badge | Shown | Hidden |
| Theme overrides (colours, radius, font, dark mode) | — | ✓ |
| Preselect service or staff, prefill customer | — | ✓ |
| Custom questions on the booking form | — | ✓ |
| `booked` / `error` events to the host page | — | ✓ |
| Public API (`/api/v1`) and signed webhooks | — | ✓ |

There is no payment integration: invoice the customer, then set the plan by hand (check which database your env file points at first):

```bash
npx tsx --env-file=.env.local scripts/set-plan.ts your-shop-slug pro
```

## How it works

1. **App:** Next.js 16 (App Router) and Tailwind CSS 4. The dashboard runs on server actions; owners sign in with a bcrypt-hashed password and a signed JWT session cookie (`jose`).
2. **Data:** Drizzle ORM over libSQL: a SQLite file locally, Turso in production. Migrations live in `drizzle/` and run as part of `npm run build`.
3. **Booking UI:** one React component (`src/components/booking-widget.tsx`) serves both `/book/[slug]` and `/embed/[slug]`. It loads free times from `/api/availability`, computed in the shop's time zone from weekly hours, breaks, date overrides, staff hours, time off and booking rules (`src/lib/slots.ts`, `src/lib/booking.ts`).
4. **Embed:** `/widget.js` (`src/lib/widget-script.ts`) is a dependency-free script that mounts the `/embed/[slug]` iframe and talks to it by `postMessage` (resize, prefill, events). `src/proxy.ts` sets each embed's `frame-ancestors` from the shop's allowed sites; every other page sends `frame-ancestors 'none'`.
5. **Email and cron:** Resend sends the confirmation on booking. A Vercel cron (`vercel.json`, daily at 07:00 UTC) calls `/api/cron/reminders`, which sends due reminders and retries failing webhook deliveries.

## Run locally

```bash
npm install
cp .env.example .env.local
npm run db:setup   # migrate + seed a demo shop into data/bookslot.db
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in with the local seed account `demo@bookslot.mk` / `demo12345`. Its booking page is [/book/demo-salon](http://localhost:3000/book/demo-salon) and its widget [/embed/demo-salon](http://localhost:3000/embed/demo-salon). For the [/demo](http://localhost:3000/demo) sites, run `scripts/seed-examples.ts` first (see [`examples/`](examples/README.md)).

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | Production | Public URL of the app, used in emails, embed codes and the API docs |
| `AUTH_SECRET` | Production | JWT signing secret (`openssl rand -base64 32`) |
| `DATABASE_URL` | Production | Defaults to `file:./data/bookslot.db`; a `libsql://` Turso URL in production (`TURSO_DATABASE_URL` also works) |
| `DATABASE_AUTH_TOKEN` | With Turso | Turso token (`TURSO_AUTH_TOKEN` also works) |
| `CRON_SECRET` | Production | Protects `/api/cron/reminders`; without it the endpoint only runs in development |
| `RESEND_API_KEY` | Optional | Sends confirmation and reminder emails; without it they're logged to the console |
| `EMAIL_FROM` | Optional | Sender address for Resend |
| `NEXT_PUBLIC_SALES_EMAIL` | Optional | Shown on the dashboard as the "ask us to upgrade" link |

To deploy on Vercel, import the repo, set these variables with a Turso database and deploy: `npm run build` applies migrations first, and the reminder cron comes from `vercel.json`.

| Command | Description |
|---|---|
| `npm run dev` / `npm start` | Dev server / serve the production build |
| `npm run build` | Migrate the database, then build for production |
| `npm run lint` | ESLint |
| `npm test` / `npm run test:watch` | Vitest: slot engine, booking rules and form, embed, theme, API, webhooks, email escaping, plus booking integration tests on a throwaway SQLite file |
| `npm run db:generate` | Generate a migration from `src/db/schema.ts` |
| `npm run db:setup` | Migrate + seed the demo shop (`db:migrate` and `db:seed` run them separately) |
| `npm run example:pro` | Next.js example site on port 3001 (see [`examples/`](examples/README.md)) |
| `npm run build:react` | Build `@bookslot/react` into `packages/react/dist` |
| `npm run demo:record -- http://localhost:3000` | Re-record the looping booking video on `/demo` (`public/demo/`) with Chrome and ffmpeg, against a local build on a scratch database; steps in [`scripts/record-demo.mts`](scripts/record-demo.mts) |

CI (`.github/workflows/test.yml`) type-checks, lints, tests and builds the React package on pull requests and pushes to `main`.

## Known limitations

- No online payments: plans are switched by hand after an invoice, and clients can't pay deposits.
- Reminders are email only. The cron runs once a day, so a reminder goes out on the first run after its time, not at the exact hour.
- The interface is English only.

## License

The [`@bookslot/react`](packages/react) package is [MIT](packages/react/LICENSE). The rest of this repository is all rights reserved.
