import Link from "next/link";
import { Button } from "@/components/ui";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-zinc-50">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-6">
        <div className="text-xl font-semibold text-zinc-900">BookSlot</div>
        <div className="flex gap-3">
          <Link href="/login" className="text-sm text-zinc-600 hover:text-zinc-900">
            Log in
          </Link>
          <Link href="/register">
            <Button>Start free</Button>
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="max-w-2xl">
          <p className="text-sm font-medium text-blue-600">For salons, dentists, mechanics & more</p>
          <h1 className="mt-3 text-5xl font-semibold tracking-tight text-zinc-900">
            Let clients book online. Stop answering calls all day.
          </h1>
          <p className="mt-5 text-lg text-zinc-600">
            BookSlot gives your business a booking page and embeddable widget.
            Clients pick a time, get reminders, and you see your schedule in one place.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/register">
              <Button className="px-6 py-3 text-base">Create your booking page</Button>
            </Link>
            <Link href="/demo">
              <Button variant="secondary" className="px-6 py-3 text-base">
                See demo
              </Button>
            </Link>
          </div>
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {[
            {
              title: "Booking link",
              text: "Share on Instagram, Google Maps, or Viber bio.",
            },
            {
              title: "Embeddable widget",
              text: "Paste one line of code on any website.",
            },
            {
              title: "Automatic reminders",
              text: "Email reminders reduce no-shows.",
            },
          ].map((item) => (
            <div key={item.title} className="rounded-2xl border border-zinc-200 bg-white p-6">
              <h3 className="font-semibold text-zinc-900">{item.title}</h3>
              <p className="mt-2 text-sm text-zinc-600">{item.text}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
