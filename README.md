# BookSlot

Online appointment booking widget for local service businesses — salons, barbers, dentists, mechanics, tutors.

Each business gets:
- A **public booking page** (`/book/your-shop`)
- An **embeddable widget** (iframe or script tag)
- A **dashboard** to manage services, hours, and appointments
- **Email reminders** to reduce no-shows

Built for North Macedonia (timezone: Europe/Skopje) but works anywhere.

## Quick start

```bash
npm install
cp .env.example .env.local
npm run db:setup
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Demo account

| | |
|---|---|
| Email | `demo@bookslot.mk` |
| Password | `demo12345` |
| Booking page | [/book/demo-salon](http://localhost:3000/book/demo-salon) |
| Embed widget | [/embed/demo-salon](http://localhost:3000/embed/demo-salon) |

## Embed on any website

**Booking link** (Instagram, Google Maps, Viber bio):
```
https://your-domain.com/book/your-shop-slug
```

**One line of HTML** (mounts right after the script tag, resizes itself):
```html
<script src="https://your-domain.com/widget.js" data-shop="your-shop-slug" async></script>
```

Style options (Pro): `data-primary`, `data-background`, `data-text` (hex colors), `data-radius` (0–32), `data-font` (`sans`, `system`, `serif`, `mono`), `data-scheme` (`light`, `dark`, `auto`). Also `data-height` (initial height) and `data-max-width`. The older `widget.js?shop=…` form still works.

**JavaScript API**, for apps:
```html
<div id="booking"></div>
<script src="https://your-domain.com/widget.js"></script>
<script>
  const widget = BookSlot.mount("#booking", {
    shop: "your-shop-slug",
    theme: { primary: "#f5c542", scheme: "auto", radius: 8, font: "system" }, // Pro
    service: "svc_…",                                                         // Pro: preselect
    prefill: { name: "Ana", email: "ana@example.com", phone: "070123456" },  // Pro
    onBooked: (booking) => console.log(booking.appointmentId, booking.when), // Pro
  });
  // widget.prefill({...}), widget.on("booked", fn), widget.destroy()
</script>
```

Events: `ready` and `resize` on every plan; `booked` and `error` on Pro. They arrive as callbacks (`onReady`, `onResize`, `onBooked`, `onError` or `widget.on(...)`) and as bubbling DOM events (`bookslot:booked`, …) on the mount element. Booking events are only posted to the origin that mounted the widget, and prefilled details travel by `postMessage`, never in the URL.

**Plain iframe** (no JavaScript, no resizing or events):
```html
<iframe src="https://your-domain.com/embed/your-shop-slug" width="100%" height="760" style="border:0;max-width:480px" title="Book an appointment"></iframe>
```

**Allowed websites:** in **Dashboard → Widget**, owners can list the sites allowed to embed their widget (sent as CSP `frame-ancestors`). Empty means any site. Every other page refuses to be framed.

Copy exact codes from **Dashboard → Widget** after signing up. [`examples/`](examples/README.md) has two complete host sites: plain HTML on the Free plan and Next.js on the Pro plan.

## Plans

Defined in `src/lib/plans.ts` and enforced on the server, so a host page can't unlock paid options by editing its embed code.

| | Free | Pro |
|---|---|---|
| Booking page + embed, auto-resize | ✓ | ✓ |
| Online bookings per month | 50 | Unlimited |
| "Powered by BookSlot" badge | Shown | Hidden |
| Theme overrides (colors, radius, font, dark mode) | — | ✓ |
| Preselect service, prefill customer | — | ✓ |
| `booked` / `error` events to the host page | — | ✓ |

There is no payment integration: invoice the customer, then set the plan by hand.

```bash
npx tsx --env-file=.env.local scripts/set-plan.ts your-shop-slug pro
```

Check which database your env file points at before running it.

## Environment variables

See `.env.example`:

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_APP_URL` | Production | Public URL of your app |
| `AUTH_SECRET` | Production | JWT signing secret (`openssl rand -base64 32`) |
| `DATABASE_URL` | Yes | SQLite file locally, Turso/libsql in production |
| `RESEND_API_KEY` | Optional | Send confirmation & reminder emails |
| `EMAIL_FROM` | Optional | Sender address for Resend |
| `CRON_SECRET` | Production | Protects `/api/cron/reminders` |
| `NEXT_PUBLIC_SALES_EMAIL` | Optional | Shown on the dashboard as the "ask us to upgrade" link |

Without `RESEND_API_KEY`, emails are logged to the console (fine for development).

## Production deployment (Vercel)

1. Push to GitHub
2. Import project in Vercel
3. Set environment variables
4. Use **Turso** for database:
   ```
   DATABASE_URL=libsql://your-db.turso.io
   DATABASE_AUTH_TOKEN=your-token
   ```
5. Cron job for reminders is configured in `vercel.json` (runs hourly)

Run migrations on deploy (included in `npm run build`).

## Project structure

```
src/
├── app/
│   ├── book/[slug]/       # Public booking page
│   ├── embed/[slug]/      # Embeddable widget (iframe)
│   ├── widget.js/         # Script embed endpoint
│   ├── dashboard/         # Shop owner dashboard
│   ├── api/availability/  # Slot availability API
│   └── api/cron/reminders/  # Reminder cron job
├── components/
│   └── booking-widget.tsx # Shared booking UI
├── db/                    # Drizzle schema
└── lib/                   # Auth, slots, email, actions
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Migrate DB + production build |
| `npm run db:setup` | Migrate + seed demo data |
| `npm run db:seed` | Seed demo shop only |
| `npm test` | Unit tests (slot engine, slugs, email escaping) and booking integration tests on a throwaway SQLite file |

## Roadmap (not in v1)

- Viber/SMS reminders via Akton or Infobip
- Stripe / local payment deposits
- Multi-staff scheduling
- Albanian language UI
- Mobile app for shop owners

## License

Private — all rights reserved.
