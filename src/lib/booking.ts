import { and, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { appointments, services, shops, type Appointment } from "@/db/schema";

export async function getAppointmentByCancelToken(cancelToken: string) {
  const [row] = await db
    .select({
      appointment: appointments,
      shopName: shops.name,
      shopPhone: shops.phone,
      timezone: shops.timezone,
      serviceName: services.name,
    })
    .from(appointments)
    .innerJoin(shops, eq(appointments.shopId, shops.id))
    .innerJoin(services, eq(appointments.serviceId, services.id))
    .where(eq(appointments.cancelToken, cancelToken))
    .limit(1);

  return row ?? null;
}

/** Customers can cancel online only confirmed appointments that haven't started. */
export function canCustomerCancel(
  appointment: Pick<Appointment, "status" | "startsAt">,
  now = new Date(),
) {
  return appointment.status === "confirmed" && appointment.startsAt > now;
}

/** Cancels by token if the customer is still allowed to. Returns false otherwise. */
export async function cancelAppointmentByToken(cancelToken: string) {
  const result = await db
    .update(appointments)
    .set({ status: "cancelled" })
    .where(
      and(
        eq(appointments.cancelToken, cancelToken),
        eq(appointments.status, "confirmed"),
        gt(appointments.startsAt, new Date()),
      ),
    );

  return result.rowsAffected > 0;
}
