import { and, eq, gt, lt, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  appointments,
  services,
  shops,
  workingHours,
  type Appointment,
  type Service,
  type Shop,
} from "@/db/schema";
import { getAvailableSlots } from "@/lib/slots";
import { zonedDayRange } from "@/lib/slots-internal";

/** Bookable slots for one service on one calendar date (yyyy-MM-dd, shop timezone). */
export async function getSlotsForDay({
  shop,
  service,
  date,
}: {
  shop: Pick<Shop, "id" | "timezone">;
  service: Pick<Service, "durationMinutes">;
  date: string;
}) {
  const day = zonedDayRange(date, shop.timezone);

  const [hours, dayAppointments] = await Promise.all([
    db.select().from(workingHours).where(eq(workingHours.shopId, shop.id)),
    // Anything overlapping the day, including appointments that started the day before.
    db
      .select({
        startsAt: appointments.startsAt,
        endsAt: appointments.endsAt,
        status: appointments.status,
      })
      .from(appointments)
      .where(
        and(
          eq(appointments.shopId, shop.id),
          ne(appointments.status, "cancelled"),
          lt(appointments.startsAt, day.end),
          gt(appointments.endsAt, day.start),
        ),
      ),
  ]);

  return getAvailableSlots({
    date,
    timezone: shop.timezone,
    workingHours: hours,
    service,
    appointments: dayAppointments,
  });
}

const toUnixSeconds = (date: Date) => Math.floor(date.getTime() / 1000);

/**
 * Inserts a confirmed appointment only if nothing else overlaps it. The check
 * and the insert are one SQL statement, so two concurrent requests for the
 * same slot cannot both succeed. Returns false when the slot was taken.
 */
export async function insertAppointmentIfFree(values: {
  id: string;
  shopId: string;
  serviceId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  startsAt: Date;
  endsAt: Date;
  notes: string | null;
  cancelToken: string;
}) {
  const startsAt = toUnixSeconds(values.startsAt);
  const endsAt = toUnixSeconds(values.endsAt);

  const result = await db.run(sql`
    INSERT INTO appointments (
      id, shop_id, service_id, customer_name, customer_phone, customer_email,
      starts_at, ends_at, status, notes, cancel_token, reminder_sent_at, created_at
    )
    SELECT
      ${values.id}, ${values.shopId}, ${values.serviceId}, ${values.customerName},
      ${values.customerPhone}, ${values.customerEmail}, ${startsAt}, ${endsAt},
      'confirmed', ${values.notes}, ${values.cancelToken}, NULL, ${toUnixSeconds(new Date())}
    WHERE NOT EXISTS (
      SELECT 1 FROM appointments
      WHERE shop_id = ${values.shopId}
        AND status != 'cancelled'
        AND starts_at < ${endsAt}
        AND ends_at > ${startsAt}
    )
  `);

  return result.rowsAffected > 0;
}

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
