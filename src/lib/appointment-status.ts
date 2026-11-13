import { and, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { appointments, shops, type Shop } from "@/db/schema";
import { emitAppointmentEvent } from "@/lib/webhooks";

export const APPOINTMENT_STATUSES = ["confirmed", "cancelled", "completed"] as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

/**
 * Changes an appointment's status and sends the matching webhook. Returns
 * false when the appointment isn't the shop's or already had that status.
 */
export async function setAppointmentStatus(
  shop: Pick<Shop, "id" | "plan">,
  appointmentId: string,
  status: AppointmentStatus,
) {
  const result = await db
    .update(appointments)
    .set({ status })
    .where(
      and(
        eq(appointments.id, appointmentId),
        eq(appointments.shopId, shop.id),
        ne(appointments.status, status),
      ),
    );
  if (result.rowsAffected === 0) return false;

  if (status === "cancelled") await emitAppointmentEvent(shop, "appointment.cancelled", appointmentId);
  if (status === "completed") await emitAppointmentEvent(shop, "appointment.completed", appointmentId);
  return true;
}

/** After a customer cancels with their link. */
export async function emitCustomerCancellation(appointment: { id: string; shopId: string }) {
  const [shop] = await db
    .select({ id: shops.id, plan: shops.plan })
    .from(shops)
    .where(eq(shops.id, appointment.shopId));
  if (shop) await emitAppointmentEvent(shop, "appointment.cancelled", appointment.id);
}
