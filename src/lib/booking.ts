import { and, count, eq, gt, gte, lt, ne, sql } from "drizzle-orm";
import { formatInTimeZone } from "date-fns-tz";
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
import { entitlementsFor } from "@/lib/plans";
import { getAvailableSlots } from "@/lib/slots";
import { zonedDateTime, zonedDayRange } from "@/lib/slots-internal";

/** Bookings (not cancelled) a shop received since the 1st of this month, in its timezone. */
export async function monthlyBookingCount(
  shop: Pick<Shop, "id" | "timezone">,
  now = new Date(),
) {
  const monthStart = zonedDateTime(
    formatInTimeZone(now, shop.timezone, "yyyy-MM-01"),
    "00:00",
    shop.timezone,
  );
  const [row] = await db
    .select({ value: count() })
    .from(appointments)
    .where(
      and(
        eq(appointments.shopId, shop.id),
        ne(appointments.status, "cancelled"),
        gte(appointments.createdAt, monthStart),
      ),
    );
  return row?.value ?? 0;
}

export function noOnlineBookingsMessage(shop: Pick<Shop, "name" | "phone">) {
  return `${shop.name} isn't taking more online bookings this month. ${
    shop.phone ? `Please call ${shop.phone}.` : "Please contact them directly."
  }`;
}

/** Everything the public booking page and the embed need for one shop. */
export async function getPublicBookingContext(slug: string) {
  const [shop] = await db
    .select()
    .from(shops)
    .where(eq(shops.slug, slug))
    .limit(1);
  if (!shop) return null;

  const [activeServices, bookingOpen] = await Promise.all([
    db
      .select({
        id: services.id,
        name: services.name,
        durationMinutes: services.durationMinutes,
        priceCents: services.priceCents,
      })
      .from(services)
      .where(and(eq(services.shopId, shop.id), eq(services.active, true)))
      .orderBy(services.sortOrder),
    isAcceptingOnlineBookings(shop),
  ]);

  return {
    shop,
    services: activeServices,
    entitlements: entitlementsFor(shop.plan),
    bookingOpen,
    closedMessage: bookingOpen ? undefined : noOnlineBookingsMessage(shop),
  };
}

/** Whether the shop's plan still allows online bookings this month. */
export async function isAcceptingOnlineBookings(
  shop: Pick<Shop, "id" | "timezone" | "plan">,
  now = new Date(),
) {
  const limit = entitlementsFor(shop.plan).monthlyBookingLimit;
  if (limit === null) return true;
  return (await monthlyBookingCount(shop, now)) < limit;
}

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
