import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { staff } from "@/db/schema";
import { json, withApiKey } from "@/lib/api-http";

/** GET /api/v1/staff: staff members (people or resources), including hidden ones. */
export const GET = withApiKey(async ({ shop }) => {
  const rows = await db
    .select()
    .from(staff)
    .where(eq(staff.shopId, shop.id))
    .orderBy(asc(staff.sortOrder), asc(staff.createdAt));
  return json({
    data: rows.map((m) => ({
      id: m.id,
      name: m.name,
      active: m.active,
      /** null = every service. */
      serviceIds: m.serviceIds,
      usesShopHours: m.useShopHours,
    })),
  });
});
