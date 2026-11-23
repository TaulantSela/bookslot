import Link from "next/link";
import { CodeTabs } from "@/components/code-tabs";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { ButtonLink, buttonClasses } from "@/components/ui";
import { WidgetMockup } from "@/components/widget-mockup";
import { cn } from "@/lib/utils";

const VERTICALS = ["Barbers", "Salons", "Dentists", "Physios", "Tutors", "Mechanics", "Studios", "Clinics"];

const STEPS = [
  {
    title: "Add your services and hours",
    text: "Durations, prices, staff and the hours you take bookings. Time zone and currency are detected when you sign up.",
  },
  {
    title: "Share your link or embed it",
    text: "Put your booking link in your Instagram, Google Maps or Viber bio, or paste one line of HTML on your website.",
  },
  {
    title: "Clients book themselves",
    text: "They pick a free time and get a confirmation. You see every appointment in your dashboard.",
  },
];

type IconName = "clock" | "users" | "shield" | "bell" | "globe" | "form";

const FEATURES: { icon: IconName; title: string; text: string }[] = [
  {
    icon: "clock",
    title: "Hours that fit your week",
    text: "Weekly hours with breaks, closed days and special hours. Set minimum notice, how far ahead clients can book and the gap between appointments.",
  },
  {
    icon: "users",
    title: "Staff, chairs and rooms",
    text: "Each one has its own services, hours and time off. Clients pick someone, or choose “Anyone” and get whoever is free.",
  },
  {
    icon: "shield",
    title: "No double bookings",
    text: "A time is only booked if nothing overlaps it, gaps included, so two clients can never take the same slot.",
  },
  {
    icon: "bell",
    title: "Confirmations and reminders",
    text: "Clients who leave an email get a confirmation and a reminder before their visit, each with a link to cancel.",
  },
  {
    icon: "globe",
    title: "Any time zone, any currency",
    text: "Set per business. Prices show in your currency and times in your time zone, wherever your clients are.",
  },
  {
    icon: "form",
    title: "Your booking form",
    text: "Make phone, email and notes required, optional or hidden. On Pro, add your own questions.",
  },
];

const DEMOS = [
  {
    href: "/book/demo-salon",
    tag: "Booking page",
    name: "Demo Beauty Salon",
    text: "The link a business shares in its bio.",
  },
  {
    href: "/demo/barbershop",
    tag: "Free · plain HTML",
    name: "Lakeside Barbers",
    text: "One script tag on a barbershop's website.",
  },
  {
    href: "/demo/dental",
    tag: "Pro · Next.js",
    name: "Bright Smile Dental",
    text: "Themed to the clinic, patient prefilled.",
  },
];

const FREE_FEATURES = [
  "Booking page and embeddable widget",
  "50 online bookings a month",
  "Staff, hours, breaks and booking rules",
  "Email confirmations and reminders",
  "Your brand colour",
  "“Powered by BookSlot” badge",
];

const PRO_FEATURES = [
  "Everything in Free",
  "Unlimited online bookings",
  "No BookSlot badge",
  "Match your site: colours, radius, font, dark mode",
  "Preselect a service, prefill signed-in customers",
  "Custom questions on the booking form",
  "Booking events, REST API and signed webhooks",
];

function Icon({ name }: { name: IconName }) {
  const paths: Record<IconName, React.ReactNode> = {
    clock: (
      <>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 7.5V12l3 2" />
      </>
    ),
    users: (
      <>
        <circle cx="9" cy="8.5" r="3" />
        <path d="M3.5 18.5a5.5 5.5 0 0111 0" />
        <path d="M15.5 6a3 3 0 010 5.5M17.5 13.6a5.5 5.5 0 013 4.9" />
      </>
    ),
    shield: (
      <>
        <path d="M12 3.5l7 2.8v5.2c0 4.3-3 7.6-7 9-4-1.4-7-4.7-7-9V6.3l7-2.8z" />
        <path d="M9 12l2.2 2.2L15.5 10" />
      </>
    ),
    bell: (
      <>
        <path d="M12 4a5.5 5.5 0 00-5.5 5.5v3L5 15.5h14L17.5 12.5v-3A5.5 5.5 0 0012 4z" />
        <path d="M10 18.5a2 2 0 004 0" />
      </>
    ),
    globe: (
      <>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M3.5 12h17M12 3.5c2.4 2.4 3.5 5.2 3.5 8.5s-1.1 6.1-3.5 8.5c-2.4-2.4-3.5-5.2-3.5-8.5S9.6 5.9 12 3.5z" />
      </>
    ),
    form: (
      <>
        <rect x="4.5" y="3.5" width="15" height="17" rx="2.5" />
        <path d="M8.5 8.5h7M8.5 12h7M8.5 15.5h4" />
      </>
    ),
  };
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="size-5"
    >
      {paths[name]}
    </svg>
  );
}

function CheckItem({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <li className="flex gap-3">
      <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className={cn("mt-0.5 size-5 shrink-0", dark ? "text-brand-400" : "text-brand-600")}>
        <path d="M5 10.5l3.2 3.2L15 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span>{children}</span>
    </li>
  );
}

function SectionHeading({
  eyebrow,
  title,
  text,
  invert = false,
}: {
  eyebrow: string;
  title: string;
  text?: string;
  invert?: boolean;
}) {
  return (
    <div className="max-w-2xl">
      <p className={cn("text-sm font-semibold", invert ? "text-brand-300" : "text-brand-600")}>{eyebrow}</p>
      <h2
        className={cn(
          "mt-2 text-3xl font-semibold tracking-tight text-balance sm:text-4xl",
          invert ? "text-white" : "text-zinc-900",
        )}
      >
        {title}
      </h2>
      {text && <p className={cn("mt-4 text-lg", invert ? "text-zinc-400" : "text-zinc-600")}>{text}</p>}
    </div>
  );
}

export default function HomePage() {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://bookslot.taulantsela.com";
  const salesEmail = process.env.NEXT_PUBLIC_SALES_EMAIL;

  const codeTabs = [
    {
      label: "HTML",
      file: "index.html",
      code: `<!-- Paste where the booking form should appear -->
<script
  src="${base}/widget.js"
  data-shop="your-shop"
  async
></script>`,
    },
    {
      label: "JavaScript",
      file: "app.js",
      code: `const widget = BookSlot.mount("#booking", {
  shop: "your-shop",
  theme: { primary: "#4f46e5", radius: 12, scheme: "auto" },
  prefill: { name: user.name, email: user.email },
  onBooked: (booking) => console.log(booking.when),
});`,
    },
    {
      label: "React",
      file: "booking.tsx",
      code: `import { BookSlotWidget } from "@bookslot/react";

export function Booking({ user }) {
  return (
    <BookSlotWidget
      shop="your-shop"
      customer={{ name: user.name, email: user.email }}
      onBooked={(booking) => console.log(booking.when)}
    />
  );
}`,
    },
  ];

  return (
    <div className="bg-white">
      <SiteHeader />

      <main>
        {/* Hero */}
        <section className="relative isolate overflow-hidden">
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,var(--color-brand-100),transparent)]"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,rgb(0_0_0/0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgb(0_0_0/0.04)_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,black,transparent)] bg-[size:48px_48px]"
          />
          <div className="mx-auto grid max-w-6xl items-center gap-16 px-4 pt-16 pb-24 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:pt-24 lg:pb-32">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white/70 px-3 py-1 text-sm font-medium text-brand-700">
                <span className="size-1.5 rounded-full bg-brand-500" aria-hidden="true" />
                For any business that runs on appointments
              </p>
              <h1 className="mt-6 text-4xl font-semibold tracking-tight text-balance text-zinc-900 sm:text-5xl lg:text-6xl">
                Let clients book online. Stop answering calls all day.
              </h1>
              <p className="mt-6 max-w-xl text-lg text-zinc-600">
                BookSlot gives your business a booking page and embeddable widget.
                Clients pick a time, get reminders, and you see your schedule in one place.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <ButtonLink href="/register" size="lg">
                  Create your booking page
                </ButtonLink>
                <ButtonLink href="/demo" variant="secondary" size="lg">
                  See demo
                </ButtonLink>
              </div>
              <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-zinc-600">
                {["Free plan", "No card needed", "Live in minutes"].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="size-4 text-brand-600">
                      <path d="M5 10.5l3.2 3.2L15 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="px-4 sm:px-10 lg:px-0">
              <WidgetMockup />
            </div>
          </div>
        </section>

        {/* Verticals */}
        <section aria-label="Who it's for" className="border-y border-zinc-100 bg-zinc-50/60">
          <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 py-8 sm:px-6 md:flex-row md:justify-between">
            <p className="text-sm font-medium text-zinc-500">One booking system for every kind of appointment</p>
            <ul className="flex flex-wrap justify-center gap-2">
              {VERTICALS.map((vertical) => (
                <li
                  key={vertical}
                  className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-sm text-zinc-700"
                >
                  {vertical}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
          <SectionHeading
            eyebrow="How it works"
            title="From sign-up to first booking in three steps"
          />
          <ol className="mt-12 grid gap-6 md:grid-cols-3">
            {STEPS.map((step, index) => (
              <li key={step.title} className="relative rounded-2xl border border-zinc-200 bg-white p-6">
                <span className="flex size-9 items-center justify-center rounded-full bg-zinc-900 text-sm font-semibold text-white">
                  {index + 1}
                </span>
                <h3 className="mt-5 font-semibold text-zinc-900">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-600">{step.text}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Features */}
        <section id="features" className="bg-zinc-50">
          <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
            <SectionHeading
              eyebrow="Features"
              title="Everything a business that runs on appointments needs"
              text="Set it up once and let clients book around your real schedule."
            />
            <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-200 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((feature) => (
                <div key={feature.title} className="bg-white p-7">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-brand-100">
                    <Icon name={feature.icon} />
                  </span>
                  <h3 className="mt-5 font-semibold text-zinc-900">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-600">{feature.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Developers */}
        <section id="developers" className="relative overflow-hidden bg-zinc-950">
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_80%_20%,rgb(99_102_241/0.25),transparent)]"
          />
          <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-24 sm:px-6 lg:grid-cols-2">
            <div>
              <SectionHeading
                invert
                eyebrow="For websites and developers"
                title="Built to be embedded"
                text="One script tag works on any site builder that accepts HTML. Developers get a JavaScript API, a React package and a REST API."
              />
              <ul className="mt-8 space-y-3 text-sm text-zinc-300">
                <CheckItem dark>Resizes itself to fit the page, on every plan</CheckItem>
                <CheckItem dark>Matches your site: colours, radius, font and dark mode</CheckItem>
                <CheckItem dark>Prefills the signed-in user and preselects a service</CheckItem>
                <CheckItem dark>Sends booking events to your page, plus signed webhooks</CheckItem>
                <CheckItem dark>Plan rules are enforced on our server, so editing the embed code can&apos;t unlock paid options</CheckItem>
              </ul>
              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm font-medium">
                <Link href="/docs/api" className="text-white hover:text-brand-300">
                  API reference →
                </Link>
                <a
                  href="https://www.npmjs.com/package/@bookslot/react"
                  className="text-white hover:text-brand-300"
                >
                  @bookslot/react on npm →
                </a>
              </div>
            </div>
            <CodeTabs tabs={codeTabs} />
          </div>
        </section>

        {/* Demos */}
        <section id="demo" className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <SectionHeading
              eyebrow="Live demo"
              title="Try it on real websites"
              text="Book a slot on any of them. It's a demo, so nobody will turn up."
            />
            <ButtonLink href="/demo" variant="secondary">
              All demos
            </ButtonLink>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {DEMOS.map((demo) => (
              // Plain links: /demo/barbershop is a static page, not part of this app.
              <a
                key={demo.href}
                href={demo.href}
                className="group rounded-2xl border border-zinc-200 bg-white p-6 transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-lg hover:shadow-brand-900/5"
              >
                <span className="text-xs font-semibold tracking-wide text-brand-600 uppercase">{demo.tag}</span>
                <h3 className="mt-2 text-lg font-semibold text-zinc-900">{demo.name}</h3>
                <p className="mt-1 text-sm text-zinc-600">{demo.text}</p>
                <span className="mt-5 inline-block text-sm font-medium text-zinc-900 group-hover:text-brand-600">
                  Open →
                </span>
              </a>
            ))}
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="bg-zinc-50">
          <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
            <SectionHeading
              eyebrow="Pricing"
              title="Free to start. Pay when you need more."
              text="Every business gets the booking page and widget for free. Pro is for businesses and agencies that want it to look and work like part of their own site."
            />
            <div className="mt-12 grid gap-6 lg:grid-cols-2">
              <div className="flex flex-col rounded-3xl border border-zinc-200 bg-white p-8">
                <h3 className="text-lg font-semibold text-zinc-900">Free</h3>
                <p className="mt-4 flex items-baseline gap-2">
                  <span className="text-4xl font-semibold tracking-tight text-zinc-900">€0</span>
                  <span className="text-sm text-zinc-500">no card needed</span>
                </p>
                <ul className="mt-8 space-y-3 text-sm text-zinc-700">
                  {FREE_FEATURES.map((feature) => (
                    <CheckItem key={feature}>{feature}</CheckItem>
                  ))}
                </ul>
                <div className="mt-auto pt-8">
                  <ButtonLink href="/register" variant="secondary" size="lg" className="w-full">
                    Start free
                  </ButtonLink>
                </div>
              </div>

              <div className="flex flex-col rounded-3xl bg-zinc-900 p-8 text-white">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold">Pro</h3>
                  <span className="rounded-full bg-brand-500/20 px-3 py-1 text-xs font-medium text-brand-200 ring-1 ring-brand-400/30">
                    For agencies & growing businesses
                  </span>
                </div>
                <p className="mt-4 flex items-baseline gap-2">
                  <span className="text-4xl font-semibold tracking-tight">On request</span>
                  <span className="text-sm text-zinc-400">priced per shop</span>
                </p>
                <ul className="mt-8 space-y-3 text-sm text-zinc-300">
                  {PRO_FEATURES.map((feature) => (
                    <CheckItem key={feature} dark>{feature}</CheckItem>
                  ))}
                </ul>
                <div className="mt-auto pt-8">
                  {salesEmail ? (
                    <a
                      href={`mailto:${salesEmail}?subject=BookSlot Pro`}
                      className={buttonClasses({ size: "lg", className: "w-full" })}
                    >
                      Ask about Pro
                    </a>
                  ) : (
                    <ButtonLink href="/register" size="lg" className="w-full">
                      Start free, upgrade later
                    </ButtonLink>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Closing CTA */}
        <section className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
          <div className="relative overflow-hidden rounded-3xl bg-brand-600 px-6 py-16 text-center sm:px-16">
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-[radial-gradient(ellipse_60%_80%_at_50%_120%,rgb(255_255_255/0.25),transparent)]"
            />
            <h2 className="relative mx-auto max-w-2xl text-3xl font-semibold tracking-tight text-balance text-white sm:text-4xl">
              Your booking page is a few minutes away
            </h2>
            <p className="relative mx-auto mt-4 max-w-xl text-lg text-brand-100">
              Add your services and hours, share the link, and let clients book while you work.
            </p>
            <div className="relative mt-8 flex flex-wrap justify-center gap-3">
              <ButtonLink
                href="/register"
                size="lg"
                className="bg-white text-brand-700 hover:bg-brand-50"
              >
                Create your booking page
              </ButtonLink>
              <ButtonLink
                href="/demo"
                size="lg"
                variant="ghost"
                className="text-white ring-1 ring-white/40 hover:bg-white/10 hover:text-white"
              >
                See demo
              </ButtonLink>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
