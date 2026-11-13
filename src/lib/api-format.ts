import { and, eq } from "drizzle-orm";
import { formatInTimeZone } from "date-fns-tz";
import { db } from "@/db";
import { appointments, services, shops, staff, type Appointment } from "@/db/schema";

// The JSON shapes the public API returns and webhooks send. Kept in one
// place so both always agree. Changing a field here is a breaking change
// for integrations: add fields, don't rename or remove them.

export type ApiAppointment = {
  id: string;
  status: string;
  service: { id: string; name: string };
  staff: { id: string; name: string } | null;
  /** ISO 8601, UTC. */
  startsAt: string;
  endsAt: string;
  /** Wall-clock start in the shop's timezone. */
  date: string;
  time: string;
  timezone: string;
  customer: { name: string; phone: string | null; email: string | null };
  notes: string | null;
  /** Custom question answers keyed by question key. */
  answers: Record<string, string | number | boolean>;
  createdAt: string;
};

type Row = {
  appointment: Appointment;
  serviceName: string;
  staffName: string | null;
  timezone: string;
};

export function toApiAppointment({ appointment: a, serviceName, staffName, timezone }: Row): ApiAppointment {
  return {
    id: a.id,
    status: a.status,
    service: { id: a.serviceId, name: serviceName },
    staff: a.staffId ? { id: a.staffId, name: staffName ?? "" } : null,
    startsAt: a.startsAt.toISOString(),
    endsAt: a.endsAt.toISOString(),
    date: formatInTimeZone(a.startsAt, timezone, "yyyy-MM-dd"),
    time: formatInTimeZone(a.startsAt, timezone, "HH:mm"),
    timezone,
    customer: { name: a.customerName, phone: a.customerPhone || null, email: a.customerEmail },
    notes: a.notes,
    answers: Object.fromEntries((a.answers ?? []).map((answer) => [answer.key, answer.value])),
    createdAt: a.createdAt.toISOString(),
  };
}

/** Columns needed to build an ApiAppointment, for select(). */
export const apiAppointmentColumns = {
  appointment: appointments,
  serviceName: services.name,
  staffName: staff.name,
  timezone: shops.timezone,
};

/** One appointment of a shop in API form, or null. */
export async function loadApiAppointment(shopId: string, appointmentId: string) {
  const [row] = await db
    .select(apiAppointmentColumns)
    .from(appointments)
    .innerJoin(services, eq(appointments.serviceId, services.id))
    .innerJoin(shops, eq(appointments.shopId, shops.id))
    .leftJoin(staff, eq(appointments.staffId, staff.id))
    .where(and(eq(appointments.id, appointmentId), eq(appointments.shopId, shopId)))
    .limit(1);
  return row ? toApiAppointment(row) : null;
}
