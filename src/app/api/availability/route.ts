import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { services, shops } from "@/db/schema";
import { getDayAvailability } from "@/lib/booking";
import { isValidDateString } from "@/lib/slots-internal";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");
  const serviceId = searchParams.get("serviceId");
  const dateStr = searchParams.get("date");

  if (!slug || !serviceId || !dateStr) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  if (!isValidDateString(dateStr)) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
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

  const { slots, closed } = await getDayAvailability({ shop, service, date: dateStr });

  return NextResponse.json({
    slots: slots.map((s) => s.label),
    ...(closed ? { closed } : {}),
  });
}
