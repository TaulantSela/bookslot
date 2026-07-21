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

**iframe embed:**
```html
<iframe
  src="https://your-domain.com/embed/your-shop-slug"
  width="100%"
  height="720"
  style="border:0;border-radius:16px;max-width:480px;"
  title="Book appointment"
></iframe>
```

**Script widget** (auto-injects iframe):
```html
<script src="https://your-domain.com/widget.js?shop=your-shop-slug" data-height="720"></script>
```

Copy exact codes from **Dashboard → Widget** after signing up.

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

## Roadmap (not in v1)

- Viber/SMS reminders via Akton or Infobip
- Stripe / local payment deposits
- Multi-staff scheduling
- Albanian language UI
- Mobile app for shop owners

## License

Private — all rights reserved.
