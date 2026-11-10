import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui";

export const metadata: Metadata = {
  title: "Demo · BookSlot",
  description: "BookSlot on a booking page, a plain HTML website and a Next.js website.",
};

const DEMOS = [
  {
    name: "Demo Beauty Salon",
    tag: "Booking page",
    text: "Every business gets its own booking page to share on Instagram, Google Maps or Viber.",
    code: null,
    href: "/book/demo-salon",
    cta: "Open the booking page",
  },
  {
    name: "Berberi Arbër",
    tag: "Free plan · plain HTML",
    text: "A barbershop website with one line of HTML. The widget sizes itself, uses the shop's colour and shows a small “Powered by BookSlot” badge.",
    code: '<script src="…/widget.js"\n  data-shop="berberi-arber"\n  async></script>',
    href: "/demo/barbershop",
    cta: "Open the barbershop’s website",
  },
  {
    name: "Besa Dental Clinic",
    tag: "Pro plan · Next.js",
    text: "A clinic website in Next.js. The widget matches the clinic's design, the signed-in patient is already filled in, and the clinic's site shows the appointment as soon as it's booked.",
    code: '<BookSlotWidget\n  shop="besa-dental"\n  theme={…}\n  customer={patient}\n  onEvent={…}\n/>',
    href: "/demo/dental",
    cta: "Open the clinic’s website",
  },
];

export default function DemoPage() {
  return (
    <main className="min-h-screen bg-zinc-50">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-6">
        <Link href="/" className="text-xl font-semibold text-zinc-900">
          BookSlot
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm text-zinc-600 hover:text-zinc-900">
            Log in
          </Link>
          <Link href="/register">
            <Button>Start free</Button>
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 pt-12 pb-20">
        <h1 className="text-4xl font-semibold tracking-tight text-zinc-900">
          See BookSlot on real websites
        </h1>
        <p className="mt-3 max-w-2xl text-lg text-zinc-600">
          A booking page and two example businesses with their own websites.
          Book a slot on any of them. It’s a demo, so nobody will turn up.
        </p>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {DEMOS.map((demo) => (
            <article
              key={demo.href}
              className="flex flex-col rounded-2xl border border-zinc-200 bg-white p-6"
            >
              <span className="text-xs font-medium tracking-wide text-blue-600 uppercase">
                {demo.tag}
              </span>
              <h2 className="mt-2 text-lg font-semibold text-zinc-900">{demo.name}</h2>
              <p className="mt-2 text-sm text-zinc-600">{demo.text}</p>
              {demo.code && (
                <pre className="mt-4 overflow-x-auto rounded-lg bg-zinc-950 p-3 text-xs text-zinc-100">
                  <code>{demo.code}</code>
                </pre>
              )}
              {/* Plain links: /demo/barbershop is a static page, not part of this app. */}
              <a
                href={demo.href}
                className="mt-auto pt-5 text-sm font-medium text-blue-600 hover:underline"
              >
                {demo.cta} →
              </a>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
