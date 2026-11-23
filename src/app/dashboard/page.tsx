import type { Metadata } from "next";
import Link from "next/link";
import { and, count, eq, gte } from "drizzle-orm";
import { formatInTimeZone } from "date-fns-tz";
import { db } from "@/db";
import { appointments, services, staff } from "@/db/schema";
import { getDashboardContext } from "@/lib/actions";
import { monthlyBookingCount } from "@/lib/booking";
import { entitlementsFor } from "@/lib/plans";
import { buildBookingUrl, buildEmbedUrl } from "@/lib/email";
import { Card } from "@/components/ui";
import { CopyButton } from "@/components/copy-button";
import { EmbedPreview } from "@/components/embed-preview";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Overview" };

export default async function DashboardPage() {
  const ctx = await getDashboardContext();
  if (!ctx?.shop) redirect("/login");

  const upcoming = await db
    .select({
      appointment: appointments,
      serviceName: services.name,
      staffName: staff.name,
    })
    .from(appointments)
    .innerJoin(services, eq(appointments.serviceId, services.id))
    .leftJoin(staff, eq(appointments.staffId, staff.id))
    .where(
      and(
        eq(appointments.shopId, ctx.shop.id),
        eq(appointments.status, "confirmed"),
        gte(appointments.startsAt, new Date()),
      ),
    )
    .orderBy(appointments.startsAt)
    .limit(5);

  const [[{ value: upcomingCount }], used] = await Promise.all([
    db
      .select({ value: count() })
      .from(appointments)
      .where(
        and(
          eq(appointments.shopId, ctx.shop.id),
          eq(appointments.status, "confirmed"),
          gte(appointments.startsAt, new Date()),
        ),
      ),
    monthlyBookingCount(ctx.shop),
  ]);
  const plan = entitlementsFor(ctx.shop.plan);
  const limit = plan.monthlyBookingLimit;
  const isPro = ctx.shop.plan === "pro";

  const bookingUrl = buildBookingUrl(ctx.shop.slug);
  const embedUrl = buildEmbedUrl(ctx.shop.slug);
  const embedCode = `<script src="${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/widget.js" data-shop="${ctx.shop.slug}" async></script>`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Overview</h1>
        <p className="text-sm text-zinc-600">Your booking widget is ready to share</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-sm text-zinc-500">Upcoming</p>
          <p className="mt-1 text-3xl font-semibold tracking-tight text-zinc-900 tabular-nums">{upcomingCount}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-zinc-500">Online bookings this month</p>
          <p className="mt-1 text-3xl font-semibold tracking-tight text-zinc-900 tabular-nums">
            {used}
            {limit !== null && <span className="text-lg font-normal text-zinc-400"> / {limit}</span>}
          </p>
          {limit !== null && (
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-100">
              <div
                className={used >= limit ? "h-full bg-red-500" : "h-full bg-brand-600"}
                style={{ width: `${Math.min(100, (used / limit) * 100)}%` }}
              />
            </div>
          )}
        </Card>
        <Card className="p-5">
          <p className="text-sm text-zinc-500">Plan</p>
          <p className="mt-1 text-3xl font-semibold tracking-tight text-zinc-900">{isPro ? "Pro" : "Free"}</p>
          <Link href="/dashboard/embed" className="mt-1 inline-block text-sm text-brand-600 hover:underline">
            {isPro ? "Embed options →" : "What Pro adds →"}
          </Link>
        </Card>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_25rem]">
        <div className="space-y-6">
          <Card>
            <h2 className="font-medium text-zinc-900">Booking link</h2>
            <p className="mt-1 text-sm text-zinc-600">Share on Instagram, Google Maps, Viber</p>
            <div className="mt-3 flex items-center gap-2 rounded-lg bg-zinc-100 py-1.5 pr-1.5 pl-3">
              <code className="min-w-0 flex-1 overflow-x-auto text-sm whitespace-nowrap">{bookingUrl}</code>
              <CopyButton value={bookingUrl} />
            </div>
            <Link href={bookingUrl} className="mt-3 inline-block text-sm text-brand-600 hover:underline">
              Open booking page →
            </Link>
          </Card>

          <Card>
            <h2 className="font-medium text-zinc-900">Embed widget</h2>
            <p className="mt-1 text-sm text-zinc-600">Add to any website</p>
            <div className="mt-3 flex items-start gap-2 rounded-lg bg-zinc-100 py-1.5 pr-1.5 pl-3">
              <code className="min-w-0 flex-1 py-0.5 text-sm break-all">{embedCode}</code>
              <CopyButton value={embedCode} />
            </div>
            <Link href="/dashboard/embed" className="mt-3 inline-block text-sm text-brand-600 hover:underline">
              Get embed code →
            </Link>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <h2 className="font-medium text-zinc-900">Upcoming appointments</h2>
              <Link href="/dashboard/appointments" className="text-sm text-brand-600 hover:underline">
                View all
              </Link>
            </div>
            {upcoming.length === 0 ? (
              <p className="mt-4 text-sm text-zinc-500">No upcoming appointments yet.</p>
            ) : (
              <ul className="mt-4 divide-y divide-zinc-100">
                {upcoming.map(({ appointment, serviceName, staffName }) => (
                  <li key={appointment.id} className="flex items-center justify-between gap-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-zinc-900">{appointment.customerName}</p>
                      <p className="truncate text-sm text-zinc-500">
                        {serviceName}
                        {staffName ? ` · ${staffName}` : ""}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm text-zinc-600 tabular-nums">
                      {formatInTimeZone(
                        appointment.startsAt,
                        ctx.shop!.timezone,
                        "EEE d MMM · HH:mm",
                      )}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <Card className="p-4">
          <h2 className="px-2 pt-2 font-medium text-zinc-900">Preview embed</h2>
          <div className="mt-4">
            <EmbedPreview src={embedUrl} />
          </div>
        </Card>
      </div>
    </div>
  );
}
