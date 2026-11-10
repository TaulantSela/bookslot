# Example host sites

Two small websites that embed BookSlot, one per plan. BookSlot also serves both at `/demo`, linked from the landing page's **See demo** button.

| | Site | Plan | Integration | Live in the demo |
|---|---|---|---|---|
| [`html-free/`](html-free/index.html) | Lakeside Barbers | Free | One `<script>` tag | `/demo/barbershop` |
| [`nextjs-pro/`](nextjs-pro/app/bookslot-widget.tsx) | Bright Smile Dental | Pro | React component around `BookSlot.mount` | `/demo/dental` |

The Free site gets the widget in the shop's dashboard colour, with the "Powered by BookSlot" badge, resizing to fit.

The Pro site goes further:
- **Theme:** the widget matches the clinic's dark theme.
- **Prefill:** the signed-in patient's details are filled in by `postMessage`, never in the URL.
- **Service switching:** the clinic's own treatment list switches the widget's service.
- **Booking events:** a booking shows up in the clinic's page through the `booked` event.
- **Allowed websites:** only `localhost:3001` (and BookSlot itself) may embed the clinic's widget.

`nextjs-pro/app/bookslot-widget.tsx` is the file to copy into a React or Next.js app.

The demo pages render these exact files:
- `/demo/barbershop` serves `html-free/index.html` with the widget address swapped.
- `/demo/dental` renders `nextjs-pro/app/clinic-site.tsx`.

So changing an example changes the demo too.

## Run them

From the repo root:

1. Add the two example businesses (check which database `.env.local` points at first), then start BookSlot:

   ```bash
   npx tsx --env-file=.env.local scripts/seed-examples.ts
   npm run dev                      # BookSlot on http://localhost:3000
   ```

2. Serve the HTML site from any other origin:

   ```bash
   python3 -m http.server 5500 --directory examples/html-free
   ```

   Open http://localhost:5500.

3. Run the Next.js site. It uses the repo's own dependencies, so there is nothing to install:

   ```bash
   npm run example:pro              # http://localhost:3001
   ```

If BookSlot runs somewhere other than `http://localhost:3000`, change the `<script src>` in `html-free/index.html` and set `NEXT_PUBLIC_BOOKSLOT_URL` for the Next.js site:

```bash
NEXT_PUBLIC_BOOKSLOT_URL=http://localhost:3100 npm run example:pro
```

Owner logins for both businesses use the password `demo12345`: `barber@example.com` and `dental@example.com`.
