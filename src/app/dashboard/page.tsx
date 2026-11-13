import Link from "next/link";
import { and, eq, gte } from "drizzle-orm";
import { formatInTimeZone } from "date-fns-tz";
import { db } from "@/db";
import { appointments, services, staff } from "@/db/schema";
import { getDashboardContext } from "@/lib/actions";
import { buildBookingUrl, buildEmbedUrl } from "@/lib/email";
import { Card } from "@/components/ui";
import { redirect } from "next/navigation";

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

  const bookingUrl = buildBookingUrl(ctx.shop.slug);
  const embedUrl = buildEmbedUrl(ctx.shop.slug);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Overview</h1>
        <p className="text-sm text-zinc-600">Your booking widget is ready to share</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <h2 className="font-medium text-zinc-900">Booking link</h2>
          <p className="mt-1 text-sm text-zinc-600">Share on Instagram, Google Maps, Viber</p>
          <code className="mt-3 block overflow-x-auto rounded-lg bg-zinc-100 px-3 py-2 text-sm">
            {bookingUrl}
          </code>
          <Link href={bookingUrl} className="mt-3 inline-block text-sm text-blue-600 hover:underline">
            Open booking page →
          </Link>
        </Card>

        <Card>
          <h2 className="font-medium text-zinc-900">Embed widget</h2>
          <p className="mt-1 text-sm text-zinc-600">Add to any website</p>
          <code className="mt-3 block overflow-x-auto rounded-lg bg-zinc-100 px-3 py-2 text-sm">
            {`<script src="${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/widget.js" data-shop="${ctx.shop.slug}" async></script>`}
          </code>
          <Link href="/dashboard/embed" className="mt-3 inline-block text-sm text-blue-600 hover:underline">
            Get embed code →
          </Link>
        </Card>
      </div>

      <Card>
        <div className="flex items-center justify-between">
          <h2 className="font-medium text-zinc-900">Upcoming appointments</h2>
          <Link href="/dashboard/appointments" className="text-sm text-blue-600 hover:underline">
            View all
          </Link>
        </div>
        {upcoming.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-500">No upcoming appointments yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-zinc-100">
            {upcoming.map(({ appointment, serviceName, staffName }) => (
              <li key={appointment.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium text-zinc-900">{appointment.customerName}</p>
                  <p className="text-sm text-zinc-500">
                    {serviceName}
                    {staffName ? ` · ${staffName}` : ""}
                  </p>
                </div>
                <p className="text-sm text-zinc-600">
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

      <Card>
        <h2 className="font-medium text-zinc-900">Preview embed</h2>
        <iframe
          src={embedUrl}
          className="mt-4 h-[720px] w-full max-w-md rounded-2xl border border-zinc-200"
          title="Booking widget preview"
        />
      </Card>
    </div>
  );
}
