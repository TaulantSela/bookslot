import { and, eq, gte, lte } from "drizzle-orm";
import { NextResponse } from "next/server";
import { parseISO } from "date-fns";
import { fromZonedTime } from "date-fns-tz";
import { db } from "@/db";
import { appointments, services, shops, workingHours } from "@/db/schema";
import { getAvailableSlots } from "@/lib/slots";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");
  const serviceId = searchParams.get("serviceId");
  const dateStr = searchParams.get("date");

  if (!slug || !serviceId || !dateStr) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  const [shop] = await db
    .select()
    .from(shops)
    .where(eq(shops.slug, slug))
    .limit(1);

  if (!shop) {
    return NextResponse.json({ error: "Shop not found" }, { status: 404 });
  }

  const [service] = await db
    .select()
    .from(services)
    .where(and(eq(services.id, serviceId), eq(services.shopId, shop.id)))
    .limit(1);

  if (!service || !service.active) {
    return NextResponse.json({ error: "Service not found" }, { status: 404 });
  }

  const hours = await db
    .select()
    .from(workingHours)
    .where(eq(workingHours.shopId, shop.id));

  const date = parseISO(dateStr);
  const dayStart = fromZonedTime(parseISO(`${dateStr}T00:00:00`), shop.timezone);
  const dayEnd = fromZonedTime(parseISO(`${dateStr}T23:59:59`), shop.timezone);

  const dayAppointments = await db
    .select()
    .from(appointments)
    .where(
      and(
        eq(appointments.shopId, shop.id),
        gte(appointments.startsAt, dayStart),
        lte(appointments.startsAt, dayEnd),
      ),
    );

  const slots = getAvailableSlots({
    date,
    timezone: shop.timezone,
    workingHours: hours,
    service,
    appointments: dayAppointments,
  });

  return NextResponse.json({
    slots: slots.map((s) => s.label),
  });
}
