"use server";

import { and, asc, count, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { appointments, dateOverrides, services, shops, staff, workingHours } from "@/db/schema";
import { refreshDashboard, requireOwnerShop, type ActionState } from "@/lib/dashboard";
import { parseWeeklyHoursForm } from "@/lib/hours-form";
import { newId } from "@/lib/id";

const STAFF_CHOICES = ["choose", "auto"] as const;
export type StaffChoice = (typeof STAFF_CHOICES)[number];

const staffSettingsSchema = z.object({
  staffLabel: z.string().trim().min(1).max(30),
  staffChoice: z.enum(STAFF_CHOICES),
});

const staffNameSchema = z.string().trim().min(1).max(60);

export async function saveStaffSettingsAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const shop = await requireOwnerShop();
  const parsed = staffSettingsSchema.safeParse({
    staffLabel: formData.get("staffLabel"),
    staffChoice: formData.get("staffChoice"),
  });
  if (!parsed.success) return { error: "Give staff a name of up to 30 characters." };

  await db.update(shops).set(parsed.data).where(eq(shops.id, shop.id));
  refreshDashboard();
  return { success: "Saved." };
}

async function shopServiceIds(shopId: string) {
  const rows = await db.select({ id: services.id }).from(services).where(eq(services.shopId, shopId));
  return new Set(rows.map((r) => r.id));
}

/** Null for "all services", otherwise the checked services that belong to the shop. */
function readServiceIds(formData: FormData, valid: Set<string>) {
  if (formData.get("allServices") === "on") return null;
  return formData
    .getAll("serviceIds")
    .map(String)
    .filter((id) => valid.has(id));
}

export async function addStaffAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const shop = await requireOwnerShop();
  const name = staffNameSchema.safeParse(formData.get("name"));
  if (!name.success) return { error: "Enter a name of up to 60 characters." };

  const [{ value: activeCount }] = await db
    .select({ value: count() })
    .from(staff)
    .where(and(eq(staff.shopId, shop.id), eq(staff.active, true)));
  const [{ value: total }] = await db
    .select({ value: count() })
    .from(staff)
    .where(eq(staff.shopId, shop.id));

  const id = newId("stf");
  await db.insert(staff).values({
    id,
    shopId: shop.id,
    name: name.data,
    sortOrder: total,
    serviceIds: null,
    useShopHours: true,
    createdAt: new Date(),
  });

  // The first person takes over the shop's existing bookings, so the
  // calendar they were made in stays blocked.
  if (activeCount === 0) {
    await db
      .update(appointments)
      .set({ staffId: id })
      .where(and(eq(appointments.shopId, shop.id), isNull(appointments.staffId)));
  }

  refreshDashboard();
  return {
    success:
      activeCount === 0
        ? `Added ${name.data}. Existing bookings are now with ${name.data}.`
        : `Added ${name.data}.`,
  };
}

export async function saveStaffAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const shop = await requireOwnerShop();
  const staffId = String(formData.get("staffId") ?? "");
  const [member] = await db
    .select()
    .from(staff)
    .where(and(eq(staff.id, staffId), eq(staff.shopId, shop.id)));
  if (!member) return { error: "Staff member not found." };

  const name = staffNameSchema.safeParse(formData.get("name"));
  if (!name.success) return { error: "Enter a name of up to 60 characters." };

  const serviceIds = readServiceIds(formData, await shopServiceIds(shop.id));
  if (serviceIds && serviceIds.length === 0) {
    return { error: "Pick at least one service, or All services." };
  }

  const useShopHours = formData.get("hoursMode") !== "own";
  let ownRanges: ReturnType<typeof parseWeeklyHoursForm> = { ranges: [] };
  if (!useShopHours) {
    ownRanges = parseWeeklyHoursForm(formData, "own_");
    if ("error" in ownRanges) return { error: ownRanges.error };
  }

  await db.batch([
    db
      .update(staff)
      .set({ name: name.data, serviceIds, useShopHours })
      .where(eq(staff.id, member.id)),
    db.delete(workingHours).where(eq(workingHours.staffId, member.id)),
    ...("ranges" in ownRanges ? ownRanges.ranges : []).map((range) =>
      db.insert(workingHours).values({
        id: newId("wh"),
        shopId: shop.id,
        staffId: member.id,
        ...range,
      }),
    ),
  ]);

  refreshDashboard();
  return { success: `Saved ${name.data}.` };
}

export async function toggleStaffAction(staffId: string, active: boolean) {
  const shop = await requireOwnerShop();
  await db
    .update(staff)
    .set({ active })
    .where(and(eq(staff.id, staffId), eq(staff.shopId, shop.id)));
  refreshDashboard();
}

/** Deletes someone with no bookings. People with bookings can only be hidden. */
export async function deleteStaffAction(staffId: string) {
  const shop = await requireOwnerShop();
  const [{ value: booked }] = await db
    .select({ value: count() })
    .from(appointments)
    .where(and(eq(appointments.staffId, staffId), eq(appointments.shopId, shop.id)));
  if (booked > 0) return;

  // Explicit deletes: SQLite drops ON DELETE CASCADE from columns added by
  // ALTER TABLE, so the staff_id references don't cascade on their own.
  await db.batch([
    db.delete(workingHours).where(and(eq(workingHours.staffId, staffId), eq(workingHours.shopId, shop.id))),
    db.delete(dateOverrides).where(and(eq(dateOverrides.staffId, staffId), eq(dateOverrides.shopId, shop.id))),
    db.delete(staff).where(and(eq(staff.id, staffId), eq(staff.shopId, shop.id))),
  ]);
  refreshDashboard();
}

/** Moves a staff member one place up or down in the list customers see. */
export async function moveStaffAction(staffId: string, direction: "up" | "down") {
  const shop = await requireOwnerShop();
  const team = await db
    .select({ id: staff.id })
    .from(staff)
    .where(eq(staff.shopId, shop.id))
    .orderBy(asc(staff.sortOrder), asc(staff.createdAt));

  const from = team.findIndex((m) => m.id === staffId);
  const to = direction === "up" ? from - 1 : from + 1;
  if (from < 0 || to < 0 || to >= team.length) return;

  [team[from], team[to]] = [team[to], team[from]];
  const [first, ...rest] = team.map((m, index) =>
    db.update(staff).set({ sortOrder: index }).where(eq(staff.id, m.id)),
  );
  await db.batch([first, ...rest]);
  refreshDashboard();
}
