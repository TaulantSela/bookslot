import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { services } from "@/db/schema";
import { json, withApiKey } from "@/lib/api-http";
import { formatPrice } from "@/lib/regional";

/** GET /api/v1/services: every service, including hidden ones (active: false). */
export const GET = withApiKey(async ({ shop }) => {
  const rows = await db
    .select()
    .from(services)
    .where(eq(services.shopId, shop.id))
    .orderBy(asc(services.sortOrder));
  return json({
    data: rows.map((s) => ({
      id: s.id,
      name: s.name,
      durationMinutes: s.durationMinutes,
      price: s.priceCents == null ? null : { amount: s.priceCents / 100, currency: shop.currency, formatted: formatPrice(s.priceCents, shop.currency) },
      bufferMinutes: s.bufferMinutes ?? shop.bufferMinutes,
      active: s.active,
    })),
  });
});
