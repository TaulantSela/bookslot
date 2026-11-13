"use server";

import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { dateOverrides, shops, staff, workingHours } from "@/db/schema";
import {
  firstIssue,
  refreshDashboard,
  requireOwnerShop,
  type ActionState,
} from "@/lib/dashboard";
import { newId } from "@/lib/id";
import { parseWeeklyHoursForm } from "@/lib/hours-form";
import { bookingRulesSchema, dateOverrideSchema } from "@/lib/validation";

export async function saveWorkingHoursAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const shop = await requireOwnerShop();
  const parsed = parseWeeklyHoursForm(formData);
  if ("error" in parsed) return { error: parsed.error };

  // One batch, so a failed insert never leaves the shop with no hours.
  const insert = parsed.ranges.map((range) =>
    db.insert(workingHours).values({ id: newId("wh"), shopId: shop.id, ...range }),
  );
  await db.batch([
    // Only the shop's own rows; staff members' hours are saved on their page.
    db
      .delete(workingHours)
      .where(and(eq(workingHours.shopId, shop.id), isNull(workingHours.staffId))),
    ...insert,
  ]);

  refreshDashboard();
  return {
    success:
      parsed.ranges.length === 0
        ? "Saved. The shop is closed every day, so nobody can book."
        : "Working hours saved.",
  };
}

export async function saveBookingRulesAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const shop = await requireOwnerShop();
  const parsed = bookingRulesSchema.safeParse({
    slotIntervalMinutes: formData.get("slotIntervalMinutes"),
    bufferMinutes: formData.get("bufferMinutes"),
    minNoticeMinutes: formData.get("minNoticeMinutes"),
    maxAdvanceDays: formData.get("maxAdvanceDays"),
  });

  if (!parsed.success) {
    return {
      error:
        "Use a time step of 5–240 minutes, a gap of 0–240 minutes, at most 30 days' notice and up to 730 days ahead.",
    };
  }

  await db.update(shops).set(parsed.data).where(eq(shops.id, shop.id));
  refreshDashboard();
  return { success: "Booking rules saved." };
}

export async function addDateOverrideAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const shop = await requireOwnerShop();
  // Set when adding time off for one staff member rather than the shop.
  const staffId = String(formData.get("staffId") ?? "") || null;
  if (staffId) {
    const [member] = await db
      .select({ id: staff.id })
      .from(staff)
      .where(and(eq(staff.id, staffId), eq(staff.shopId, shop.id)));
    if (!member) return { error: "Staff member not found." };
  }
  const startDate = String(formData.get("startDate") ?? "");
  const closed = formData.get("kind") !== "hours";
  const parsed = dateOverrideSchema.safeParse({
    startDate,
    endDate: String(formData.get("endDate") || startDate),
    closed,
    startTime: closed ? undefined : formData.get("startTime") || undefined,
    endTime: closed ? undefined : formData.get("endTime") || undefined,
    label: formData.get("label") || undefined,
  });

  if (!parsed.success) {
    return { error: firstIssue(parsed.error, "Please pick valid dates and times.") };
  }

  const { startDate: from, endDate: to, label } = parsed.data;
  await db.insert(dateOverrides).values({
    id: newId("dto"),
    shopId: shop.id,
    staffId,
    startDate: from,
    endDate: to,
    startTime: closed ? null : parsed.data.startTime!,
    endTime: closed ? null : parsed.data.endTime!,
    label: label || null,
    createdAt: new Date(),
  });

  refreshDashboard();
  const days = from === to ? from : `${from} to ${to}`;
  return {
    success: closed
      ? `Closed on ${days}. Existing bookings on those days are kept.`
      : `Special hours saved for ${days}.`,
  };
}

export async function deleteDateOverrideAction(overrideId: string) {
  const shop = await requireOwnerShop();
  await db
    .delete(dateOverrides)
    .where(and(eq(dateOverrides.id, overrideId), eq(dateOverrides.shopId, shop.id)));
  refreshDashboard();
}
