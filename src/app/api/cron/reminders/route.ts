import { and, eq, gte, isNull, lte } from "drizzle-orm";
import { addHours } from "date-fns";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { appointments, services, shops } from "@/db/schema";
import { buildCancelUrl, sendReminderEmail } from "@/lib/email";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const windowEnd = addHours(now, 48);

  const pending = await db
    .select({
      appointment: appointments,
      shop: shops,
      service: services,
    })
    .from(appointments)
    .innerJoin(shops, eq(appointments.shopId, shops.id))
    .innerJoin(services, eq(appointments.serviceId, services.id))
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

  return NextResponse.json({ checked: pending.length, sent });
}
