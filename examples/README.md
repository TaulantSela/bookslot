# Example host sites

Two small websites that embed BookSlot, one per plan:

| | Site | Plan | Integration |
|---|---|---|---|
| [`html-free/`](html-free/index.html) | Brija Barbershop | Free | One `<script>` tag |
| [`nextjs-pro/`](nextjs-pro/app/bookslot-widget.tsx) | Smile Dental Clinic | Pro | React component around `BookSlot.mount` |

The Free site gets the widget in the shop's dashboard colour, with the "Powered by BookSlot" badge, resizing to fit.

The Pro site goes further:
- **Theme:** the widget matches the clinic's dark theme.
- **Prefill:** the signed-in patient's details are filled in by `postMessage`, never in the URL.
- **Service switching:** the clinic's own treatment list switches the widget's service.
- **Booking events:** a booking shows up in the clinic's page through the `booked` event.
- **Allowed websites:** only `localhost:3001` may embed the clinic's widget.

`nextjs-pro/app/bookslot-widget.tsx` is the file to copy into a React or Next.js app.

## Run them

1. Start BookSlot and add the two example businesses (check which database `.env.local` points at first):

   ```bash
   npx tsx --env-file=.env.local scripts/seed-examples.ts
   npm run dev                      # BookSlot on http://localhost:3000
   ```

2. Serve the HTML site from any other origin:

   ```bash
   python3 -m http.server 5500 --directory examples/html-free
   ```

   Open http://localhost:5500.

3. Run the Next.js site:

   ```bash
   cd examples/nextjs-pro
   npm install
   npm run dev                      # http://localhost:3001
   ```

If BookSlot runs somewhere other than `http://localhost:3000`, change the `<script src>` in `html-free/index.html` and set `NEXT_PUBLIC_BOOKSLOT_URL` for the Next.js site:

```bash
NEXT_PUBLIC_BOOKSLOT_URL=https://bookslot-rho.vercel.app npm run dev
```

The example businesses must exist in that BookSlot's database, and the Pro one only allows `localhost:3001` to embed it.

Owner logins for both businesses use the password `demo12345`: `barber@example.com` and `dental@example.com`.
