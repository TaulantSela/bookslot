import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { services } from "@/db/schema";
import { Card } from "@/components/ui";
import { EmbedDomainsForm } from "@/components/embed-domains-form";
import { getDashboardContext } from "@/lib/actions";
import { monthlyBookingCount } from "@/lib/booking";
import { buildBookingUrl, buildEmbedUrl } from "@/lib/email";
import { entitlementsFor } from "@/lib/plans";

function Snippet({ title, note, code }: { title: string; note: string; code: string }) {
  return (
    <Card>
      <h2 className="font-medium text-zinc-900">{title}</h2>
      <p className="mt-1 text-sm text-zinc-600">{note}</p>
      <pre className="mt-3 overflow-x-auto rounded-lg bg-zinc-950 p-4 text-xs leading-relaxed text-zinc-100">
        <code>{code}</code>
      </pre>
    </Card>
  );
}

function Feature({ on, children }: { on: boolean; children: React.ReactNode }) {
  return (
    <li className={on ? "text-zinc-800" : "text-zinc-400"}>
      {on ? "✓" : "—"} {children}
    </li>
  );
}

export default async function EmbedPage() {
  const ctx = await getDashboardContext();
  if (!ctx?.shop) redirect("/login");
  const shop = ctx.shop;

  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  // The address @bookslot/react uses when no bookslotUrl is passed. (Not
  // imported: that package is a client module, so a server component would
  // get a client reference instead of the string.)
  const packageDefaultUrl = "https://bookslot-rho.vercel.app";
  const plan = entitlementsFor(shop.plan);
  const isPro = shop.plan === "pro";
  const used = await monthlyBookingCount(shop);
  const serviceList = await db
    .select({ id: services.id, name: services.name, active: services.active })
    .from(services)
    .where(eq(services.shopId, shop.id))
    .orderBy(services.sortOrder);
  const salesEmail = process.env.NEXT_PUBLIC_SALES_EMAIL;
  const proTag = isPro ? "" : " (Pro)";

  const scriptCode = `<script src="${base}/widget.js" data-shop="${shop.slug}" async></script>`;

  const scriptThemedCode = `<script
  src="${base}/widget.js"
  data-shop="${shop.slug}"
  data-primary="#f5c542"
  data-scheme="dark"
  data-radius="8"
  data-font="serif"
  async
></script>`;

  const jsCode = `<div id="booking"></div>
<script src="${base}/widget.js"></script>
<script>
  const widget = BookSlot.mount("#booking", {
    shop: "${shop.slug}",
    theme: { primary: "#f5c542", scheme: "auto", radius: 8, font: "system" },
    prefill: { name: "Arta Selmani", email: "arta@example.com", phone: "070123456" },
    onBooked: (booking) => console.log("Booked", booking),
  });
</script>`;

  const reactCode = `// npm install @bookslot/react
import { BookSlotWidget } from "@bookslot/react";

export function Booking({ user }) {
  return (
    <BookSlotWidget
      shop="${shop.slug}"${base === packageDefaultUrl ? "" : `
      bookslotUrl="${base}"`}
      customer={{ name: user?.name, email: user?.email }}
      onBooked={(booking) => console.log("Booked", booking.appointmentId)}
    />
  );
}`;

  const iframeCode = `<iframe src="${buildEmbedUrl(shop.slug)}" width="100%" height="760" style="border:0;max-width:480px" title="Book an appointment"></iframe>`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Widget & embed</h1>
        <p className="text-sm text-zinc-600">
          Add booking to any website, or share your booking link
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between">
            <h2 className="font-medium text-zinc-900">Your plan</h2>
            <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium uppercase tracking-wide text-zinc-700">
              {isPro ? "Pro" : "Free"}
            </span>
          </div>
          <ul className="mt-3 space-y-1.5 text-sm">
            <Feature on>Booking page and embeddable widget</Feature>
            <Feature on>Widget resizes to fit its content</Feature>
            <Feature on={plan.monthlyBookingLimit === null}>
              {plan.monthlyBookingLimit === null
                ? "Unlimited online bookings"
                : `${used} of ${plan.monthlyBookingLimit} online bookings used this month`}
            </Feature>
            <Feature on={!plan.showBadge}>No “Powered by BookSlot” badge</Feature>
            <Feature on={plan.customTheme}>Match your site: colors, radius, font, dark mode</Feature>
            <Feature on={plan.prefill}>Preselect a service and prefill customer details</Feature>
            <Feature on={plan.hostEvents}>Booking events for your site (analytics, redirects)</Feature>
          </ul>
          {!isPro && (
            <p className="mt-4 text-sm text-zinc-600">
              Want the Pro options?{" "}
              {salesEmail ? (
                <a href={`mailto:${salesEmail}?subject=BookSlot Pro for ${shop.slug}`} className="text-blue-600 hover:underline">
                  Ask us to upgrade
                </a>
              ) : (
                "Ask us to upgrade your shop."
              )}
            </p>
          )}
        </Card>

        <Card>
          <h2 className="font-medium text-zinc-900">Where it can be embedded</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Restrict the widget to your own websites so nobody else can show
            your booking form.
          </p>
          <EmbedDomainsForm domains={shop.embedDomains ?? []} />
        </Card>
      </div>

      <Card>
        <h2 className="font-medium text-zinc-900">Booking link</h2>
        <p className="mt-1 text-sm text-zinc-600">For Instagram bio, Google Maps, Viber status</p>
        <code className="mt-3 block overflow-x-auto rounded-lg bg-zinc-100 px-3 py-2 text-sm">
          {buildBookingUrl(shop.slug)}
        </code>
      </Card>

      <Snippet
        title="1 · One line of HTML"
        note="Paste where the booking form should appear. Works on any website builder that accepts HTML."
        code={scriptCode}
      />
      <Snippet
        title={`2 · Match your website's look${proTag}`}
        note="Same snippet with style options: data-primary, data-background, data-text (hex colors), data-radius (0–32), data-font (sans, system, serif, mono), data-scheme (light, dark, auto)."
        code={scriptThemedCode}
      />
      <Snippet
        title={`3 · JavaScript API${proTag}`}
        note="For developers: mount it anywhere, prefill a signed-in customer, and react when a booking is made. Events also fire as DOM events (bookslot:booked, bookslot:error) on the container."
        code={jsCode}
      />
      <Snippet
        title="4 · React / Next.js"
        note="Install the @bookslot/react package. Works in Next.js, Vite and Remix. Callbacks like onBooked need a client component. Theme, service, customer and onBooked need Pro."
        code={reactCode}
      />
      <Card>
        <h2 className="font-medium text-zinc-900">Service IDs{proTag}</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Pass one as <code>service</code> (or <code>data-service</code>) to open the widget on that service.
        </p>
        {serviceList.length ? (
          <ul className="mt-3 divide-y divide-zinc-100 text-sm">
            {serviceList.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-4 py-2">
                <span className={s.active ? "text-zinc-800" : "text-zinc-400"}>
                  {s.name}
                  {s.active ? "" : " (hidden)"}
                </span>
                <code className="rounded bg-zinc-100 px-2 py-0.5 text-xs">{s.id}</code>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-zinc-500">Add services first.</p>
        )}
      </Card>

      <Snippet
        title="5 · Plain iframe"
        note="No JavaScript at all. It won't resize itself or send events."
        code={iframeCode}
      />

      <Card>
        <h2 className="font-medium text-zinc-900">Live preview</h2>
        <iframe
          src={buildEmbedUrl(shop.slug)}
          className="mt-4 h-[760px] w-full max-w-md rounded-2xl border border-zinc-200"
          title="Booking widget preview"
        />
      </Card>
    </div>
  );
}
