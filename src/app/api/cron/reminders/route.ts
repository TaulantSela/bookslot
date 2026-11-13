import { and, eq, gte, isNull, lte } from "drizzle-orm";
import { addHours } from "date-fns";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { appointments, services, shops, staff } from "@/db/schema";
import { buildCancelUrl, sendReminderEmail } from "@/lib/email";
import { retryDueDeliveries } from "@/lib/webhooks";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  // Fail closed: without a configured secret the endpoint is only open in
  // local development, never in production.
  if (!cronSecret) {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { error: "CRON_SECRET is not configured" },
        { status: 500 },
      );
    }
  } else if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const windowEnd = addHours(now, 48);

  const pending = await db
    .select({
      appointment: appointments,
      shop: shops,
      service: services,
      staffName: staff.name,
    })
    .from(appointments)
    .innerJoin(shops, eq(appointments.shopId, shops.id))
    .innerJoin(services, eq(appointments.serviceId, services.id))
    .leftJoin(staff, eq(appointments.staffId, staff.id))
    .where(
      and(
        eq(appointments.status, "confirmed"),
        isNull(appointments.reminderSentAt),
        gte(appointments.startsAt, now),
        lte(appointments.startsAt, windowEnd),
      ),
    );

  let sent = 0;

  for (const row of pending) {
    const reminderAt = addHours(
      row.appointment.startsAt,
      -row.shop.reminderHoursBefore,
    );

    if (now < reminderAt) continue;
    if (!row.appointment.customerEmail) continue;

    const result = await sendReminderEmail({
      to: row.appointment.customerEmail,
      customerName: row.appointment.customerName,
      shopName: row.shop.name,
      serviceName: row.service.name,
      staffName: row.staffName,
      startsAt: row.appointment.startsAt,
      endsAt: row.appointment.endsAt,
      timezone: row.shop.timezone,
      cancelUrl: buildCancelUrl(row.appointment.cancelToken),
    });

    if (result.ok) {
      await db
        .update(appointments)
        .set({ reminderSentAt: new Date() })
        .where(eq(appointments.id, row.appointment.id));
      sent++;
    }
  }

  // The daily run also retries webhook deliveries that are still failing
  // (most retries happen sooner, when the shop's next event is sent).
  const webhookRetries = await retryDueDeliveries({ limit: 200 });

  return NextResponse.json({ checked: pending.length, sent, webhookRetries });
}
