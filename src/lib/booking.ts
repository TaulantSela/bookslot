import { and, count, eq, gt, gte, lt, lte, ne, sql } from "drizzle-orm";
import { formatInTimeZone } from "date-fns-tz";
import { db } from "@/db";
import {
  appointments,
  dateOverrides,
  services,
  shops,
  workingHours,
  type Appointment,
  type Service,
  type Shop,
} from "@/db/schema";
import { entitlementsFor } from "@/lib/plans";
import { formatPrice } from "@/lib/regional";
import { getAvailableSlots, hoursOnDate, lastBookableDate } from "@/lib/slots";
import { zonedDateTime, zonedDayRange } from "@/lib/slots-internal";

/** The shop settings that decide which times can be booked. */
export type BookingRules = Pick<
  Shop,
  | "id"
  | "timezone"
  | "slotIntervalMinutes"
  | "bufferMinutes"
  | "minNoticeMinutes"
  | "maxAdvanceDays"
>;

/** Gap kept free after an appointment for this service. */
export function bufferFor(
  service: Pick<Service, "bufferMinutes">,
  shop: Pick<Shop, "bufferMinutes">,
) {
  return service.bufferMinutes ?? shop.bufferMinutes;
}

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
    // Prices are formatted here, on the server, so the widget's first render
    // and hydration agree (Intl output differs between runtimes).
    services: activeServices.map((service) => ({
      ...service,
      priceLabel: formatPrice(service.priceCents, shop.currency),
    })),
    lastBookableDate: lastBookableDate(shop.timezone, shop.maxAdvanceDays),
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

/**
 * Bookable slots for one service on one calendar date (yyyy-MM-dd, shop
 * timezone), plus why there are none when the shop is closed that day.
 */
export async function getDayAvailability({
  shop,
  service,
  date,
  now = new Date(),
}: {
  shop: BookingRules;
  service: Pick<Service, "durationMinutes" | "bufferMinutes">;
  date: string;
  now?: Date;
}) {
  const day = zonedDayRange(date, shop.timezone);
  // Gaps can reach across midnight, so look a day either side.
  const windowStart = new Date(day.start.getTime() - 86_400_000);
  const windowEnd = new Date(day.end.getTime() + 86_400_000);

  const [hours, overrides, nearbyAppointments] = await Promise.all([
    db.select().from(workingHours).where(eq(workingHours.shopId, shop.id)),
    db
      .select()
      .from(dateOverrides)
      .where(
        and(
          eq(dateOverrides.shopId, shop.id),
          lte(dateOverrides.startDate, date),
          gte(dateOverrides.endDate, date),
        ),
      ),
    db
      .select({
        startsAt: appointments.startsAt,
        endsAt: appointments.endsAt,
        bufferMinutes: appointments.bufferMinutes,
        status: appointments.status,
      })
      .from(appointments)
      .where(
        and(
          eq(appointments.shopId, shop.id),
          ne(appointments.status, "cancelled"),
          lt(appointments.startsAt, windowEnd),
          gt(appointments.endsAt, windowStart),
        ),
      ),
  ]);

  const slots = getAvailableSlots({
    date,
    timezone: shop.timezone,
    workingHours: hours,
    overrides,
    service,
    bufferMinutes: bufferFor(service, shop),
    appointments: nearbyAppointments,
    now,
    slotIntervalMinutes: shop.slotIntervalMinutes,
    minNoticeMinutes: shop.minNoticeMinutes,
    maxAdvanceDays: shop.maxAdvanceDays,
  });

  const { closed } = hoursOnDate({ date, workingHours: hours, overrides });
  return { slots, closed };
}

export async function getSlotsForDay(args: Parameters<typeof getDayAvailability>[0]) {
  return (await getDayAvailability(args)).slots;
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
  /** Gap kept free after this appointment. */
  bufferMinutes?: number;
  notes: string | null;
  cancelToken: string;
}) {
  const startsAt = toUnixSeconds(values.startsAt);
  const endsAt = toUnixSeconds(values.endsAt);
  const bufferMinutes = values.bufferMinutes ?? 0;
  const blockedUntil = endsAt + bufferMinutes * 60;

  // Each appointment occupies its own time plus its gap; two appointments
  // conflict when those spans overlap.
  const result = await db.run(sql`
    INSERT INTO appointments (
      id, shop_id, service_id, customer_name, customer_phone, customer_email,
      starts_at, ends_at, buffer_minutes, status, notes, cancel_token,
      reminder_sent_at, created_at
    )
    SELECT
      ${values.id}, ${values.shopId}, ${values.serviceId}, ${values.customerName},
      ${values.customerPhone}, ${values.customerEmail}, ${startsAt}, ${endsAt},
      ${bufferMinutes}, 'confirmed', ${values.notes}, ${values.cancelToken}, NULL,
      ${toUnixSeconds(new Date())}
    WHERE NOT EXISTS (
      SELECT 1 FROM appointments
      WHERE shop_id = ${values.shopId}
        AND status != 'cancelled'
        AND starts_at < ${blockedUntil}
        AND ends_at + buffer_minutes * 60 > ${startsAt}
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
