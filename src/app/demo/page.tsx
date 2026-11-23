import type { Metadata } from "next";
import { BookingVideo } from "@/components/booking-video";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { ButtonLink } from "@/components/ui";

export const metadata: Metadata = {
  title: "Demo",
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
    name: "Lakeside Barbers",
    tag: "Free plan · plain HTML",
    text: "A barbershop website with one line of HTML. The widget sizes itself, uses the shop's colour and shows a small “Powered by BookSlot” badge.",
    code: '<script src="…/widget.js"\n  data-shop="lakeside-barbers"\n  async></script>',
    href: "/demo/barbershop",
    cta: "Open the barbershop’s website",
  },
  {
    name: "Bright Smile Dental",
    tag: "Pro plan · Next.js",
    text: "A clinic website in Next.js. The widget matches the clinic's design, the signed-in patient is already filled in, and the clinic's site shows the appointment as soon as it's booked.",
    code: '<BookSlotWidget\n  shop="bright-smile-dental"\n  theme={…}\n  customer={patient}\n  onEvent={…}\n/>',
    href: "/demo/dental",
    cta: "Open the clinic’s website",
  },
];

const CLIENT_STEPS = [
  "Picks a service and a barber",
  "Chooses a day and a free time",
  "Types their name, phone and email",
  "Confirms, then gets a confirmation and a reminder by email",
];

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-zinc-50">
      <SiteHeader />
      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-14 px-4 pt-16 pb-16 sm:px-6 lg:grid-cols-[1fr_auto] lg:gap-20">
          <div>
            <p className="text-sm font-semibold text-brand-600">Live demo</p>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight text-zinc-900 sm:text-5xl">
              See BookSlot on real websites
            </h1>
            <p className="mt-3 max-w-2xl text-lg text-zinc-600">
              A booking page and two example businesses with their own websites.
              Book a slot on any of them. It’s a demo, so nobody will turn up.
            </p>

            <h2 className="mt-10 text-sm font-semibold text-zinc-900">What a client does, on a phone</h2>
            <ol className="mt-4 space-y-3">
              {CLIENT_STEPS.map((step, index) => (
                <li key={step} className="flex items-center gap-3 text-zinc-700">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white text-sm font-semibold text-brand-700 ring-1 ring-zinc-200">
                    {index + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/book/lakeside-barbers" size="lg">
                Try it yourself
              </ButtonLink>
              <ButtonLink href="/register" variant="secondary" size="lg">
                Create your booking page
              </ButtonLink>
            </div>
          </div>
          <BookingVideo />
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
          <h2 className="text-2xl font-semibold tracking-tight text-zinc-900">Three ways to use it</h2>
          <div className="mt-6 grid gap-6 md:grid-cols-3">
            {DEMOS.map((demo) => (
              <article
                key={demo.href}
                className="flex flex-col rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:border-brand-300 hover:shadow-md"
              >
                <span className="text-xs font-medium tracking-wide text-brand-600 uppercase">
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
                  className="mt-auto pt-6 text-sm font-medium text-brand-600 hover:text-brand-700"
                >
                  {demo.cta} →
                </a>
              </article>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
