# @bookslot/react

The [BookSlot](https://bookslot-rho.vercel.app) booking widget as a React component. Works in Next.js (App Router and Pages Router), Vite, Remix and any other React app.

```bash
npm install @bookslot/react
```

```tsx
import { BookSlotWidget } from "@bookslot/react";

export function Booking() {
  return <BookSlotWidget shop="your-shop-slug" />;
}
```

That's a working booking form. It loads the widget from BookSlot, resizes itself to fit, and shows the shop's services and free times. Find your shop slug in the BookSlot dashboard.

The package is already marked `"use client"`, so in the Next.js App Router a server component can render it with `shop`, `theme`, `service` and `customer`. Callbacks such as `onBooked` are functions, which React can't send from the server, so pass those from a client component.

## Match your site, prefill, react to bookings (Pro)

```tsx
<BookSlotWidget
  shop="your-shop-slug"
  theme={{ primary: "#2dd4bf", scheme: "dark", radius: 6, font: "system" }}
  service="svc_…"                                   // preselect; can change any time
  customer={{ name: user.name, email: user.email }} // the signed-in user
  onBooked={(booking) => router.push(`/thanks?id=${booking.appointmentId}`)}
/>
```

On the Free plan the widget still works, but it ignores these options and shows a "Powered by BookSlot" badge. BookSlot enforces this on its server, so editing the props can't unlock them.

## Props

| Prop | Type | |
|---|---|---|
| `shop` | `string` | Required. The shop's slug. |
| `bookslotUrl` | `string` | Where BookSlot runs. Defaults to the hosted service. |
| `theme` | `{ primary?, background?, text?, radius?, font?, scheme? }` | Pro. Hex colours, radius 0–32, font `sans` / `system` / `serif` / `mono`, scheme `light` / `dark` / `auto`. Changing it reloads the widget. |
| `service` | `string` | Pro. Service id to preselect, listed in **Dashboard → Widget**. |
| `customer` | `{ name?, email?, phone?, notes? }` | Pro. Fills in the form. Sent with `postMessage`, never in the URL. |
| `initialHeight` | `number` | Height before the widget reports its size. Default 720. |
| `maxWidth` | `number \| string` | Default 480px. |
| `title` | `string` | Accessible title of the iframe. |
| `className`, `style` | | Applied to the wrapper `div`. |
| `onReady` | `({ shop }) => void` | The widget loaded. |
| `onResize` | `({ height }) => void` | The widget changed height. |
| `onBooked` | `(booking) => void` | Pro. `{ appointmentId, serviceId, serviceName, startsAt, endsAt, when }`. |
| `onError` | `({ message }) => void` | Pro for booking errors; also called if the widget script can't load. |

## Without React

Load the script and call it directly:

```html
<script src="https://bookslot-rho.vercel.app/widget.js" data-shop="your-shop-slug" async></script>
```

`loadBookSlot(url?)` is exported too, if you want the underlying `BookSlot.mount` API in React.

## License

MIT
