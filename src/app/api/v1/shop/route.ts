import { json, withApiKey } from "@/lib/api-http";
import { standardFields } from "@/lib/booking-form";

/** GET /api/v1/shop: the shop the API key belongs to and its booking settings. */
export const GET = withApiKey(async ({ shop }) =>
  json({
    id: shop.id,
    slug: shop.slug,
    name: shop.name,
    timezone: shop.timezone,
    currency: shop.currency,
    phone: shop.phone,
    address: shop.address,
    plan: shop.plan,
    bookingRules: {
      slotIntervalMinutes: shop.slotIntervalMinutes,
      bufferMinutes: shop.bufferMinutes,
      minNoticeMinutes: shop.minNoticeMinutes,
      maxAdvanceDays: shop.maxAdvanceDays,
    },
    staff: { label: shop.staffLabel, choice: shop.staffChoice },
    fields: standardFields(shop),
  }),
);
