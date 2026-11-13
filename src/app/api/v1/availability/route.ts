import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { services } from "@/db/schema";
import { apiError, json, withApiKey } from "@/lib/api-http";
import { getDayAvailability } from "@/lib/booking";
import { addDaysToDateString, isValidDateString } from "@/lib/slots-internal";

const MAX_DAYS = 14;

/**
 * GET /api/v1/availability?service=svc_…&date=2026-11-16[&days=7][&staff=stf_…]
 * Bookable times per day in the shop's timezone, with who is free for each.
 */
export const GET = withApiKey(async ({ request, shop }) => {
  const query = new URL(request.url).searchParams;
  const serviceId = query.get("service");
  const date = query.get("date");
  const staffId = query.get("staff") || undefined;
  const days = Number(query.get("days") ?? 1);

  if (!serviceId) return apiError(400, "missing_service", "Pass ?service=<service id>.");
  if (!date || !isValidDateString(date)) return apiError(400, "invalid_date", "Pass ?date=yyyy-MM-dd.");
  if (!Number.isInteger(days) || days < 1 || days > MAX_DAYS) {
    return apiError(400, "invalid_days", `days must be 1–${MAX_DAYS}.`);
  }

  const [service] = await db
    .select()
    .from(services)
    .where(and(eq(services.id, serviceId), eq(services.shopId, shop.id)))
    .limit(1);
  if (!service || !service.active) return apiError(404, "service_not_found", "No active service with that id.");

  const dates = Array.from({ length: days }, (_, i) => addDaysToDateString(date, i));
  const results = await Promise.all(
    dates.map(async (day) => {
      const { slots, closed } = await getDayAvailability({ shop, service, date: day, staffId });
      return {
        date: day,
        ...(closed ? { closed: { label: closed.label } } : {}),
        slots: slots.map((slot) => ({
          time: slot.label,
          startsAt: slot.start.toISOString(),
          endsAt: slot.end.toISOString(),
          staffIds: slot.staffIds,
        })),
      };
    }),
  );

  return json({ timezone: shop.timezone, service: { id: service.id, durationMinutes: service.durationMinutes }, days: results });
});
