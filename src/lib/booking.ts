import { and, count, eq, gt, gte, lt, lte, ne, sql } from "drizzle-orm";
import { formatInTimeZone } from "date-fns-tz";
import { db } from "@/db";
import {
  appointments,
  dateOverrides,
  services,
  shops,
  staff,
  workingHours,
  type Appointment,
  type Service,
  type Shop,
  type Staff,
} from "@/db/schema";
import { entitlementsFor } from "@/lib/plans";
import { formatPrice } from "@/lib/regional";
import {
  getAvailableSlots,
  hoursOnDate,
  lastBookableDate,
  staffHoursOnDate,
  type TimeSlot,
} from "@/lib/slots";
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

/** Whether a staff member offers a service (no list = every service). */
export function offersService(member: Pick<Staff, "serviceIds">, serviceId: string) {
  return member.serviceIds == null || member.serviceIds.includes(serviceId);
}

/** A shop's active staff, in display order. */
export async function getActiveStaff(shopId: string) {
  return db
    .select()
    .from(staff)
    .where(and(eq(staff.shopId, shopId), eq(staff.active, true)))
    .orderBy(staff.sortOrder, staff.createdAt);
}

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

  const [activeServices, bookingOpen, team] = await Promise.all([
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
    getActiveStaff(shop.id),
  ]);

  return {
    shop,
    staff: team.map(({ id, name, serviceIds }) => ({ id, name, serviceIds })),
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

export type AvailableSlot = TimeSlot & {
  /** Staff free for this slot, least busy that day first. Empty in shops without staff. */
  staffIds: string[];
};

/**
 * Bookable slots for one service on one calendar date (yyyy-MM-dd, shop
 * timezone), plus why there are none when the shop is closed that day.
 *
 * In a shop with staff, each eligible person has their own hours and
 * calendar; a slot is offered when at least one of them is free (or the
 * requested person, when `staffId` is given).
 */
export async function getDayAvailability({
  shop,
  service,
  date,
  staffId,
  now = new Date(),
}: {
  shop: BookingRules;
  service: Pick<Service, "id" | "durationMinutes" | "bufferMinutes">;
  date: string;
  /** Only this staff member. Undefined = anyone. */
  staffId?: string;
  now?: Date;
}): Promise<{ slots: AvailableSlot[]; closed?: { label: string | null } }> {
  const day = zonedDayRange(date, shop.timezone);
  // Gaps can reach across midnight, so look a day either side.
  const windowStart = new Date(day.start.getTime() - 86_400_000);
  const windowEnd = new Date(day.end.getTime() + 86_400_000);

  const [hours, overrides, nearbyAppointments, team] = await Promise.all([
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
        staffId: appointments.staffId,
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
    getActiveStaff(shop.id),
  ]);

  const shopHours = hours.filter((h) => h.staffId == null);
  const shopOverrides = overrides.filter((o) => o.staffId == null);
  const rules = {
    date,
    timezone: shop.timezone,
    service,
    bufferMinutes: bufferFor(service, shop),
    now,
    slotIntervalMinutes: shop.slotIntervalMinutes,
    minNoticeMinutes: shop.minNoticeMinutes,
    maxAdvanceDays: shop.maxAdvanceDays,
  };

  // No staff: one calendar for the whole shop.
  if (team.length === 0) {
    const shopDay = hoursOnDate({ date, workingHours: shopHours, overrides: shopOverrides });
    const slots = getAvailableSlots({
      ...rules,
      ranges: shopDay.ranges,
      appointments: nearbyAppointments,
    });
    return { slots: slots.map((slot) => ({ ...slot, staffIds: [] })), closed: shopDay.closed };
  }

  const eligible = team.filter(
    (member) => offersService(member, service.id) && (!staffId || member.id === staffId),
  );
  const dayStart = day.start.getTime();
  const dayEnd = day.end.getTime();
  const bookedThatDay = (memberId: string) =>
    nearbyAppointments.filter(
      (a) =>
        a.staffId === memberId &&
        a.startsAt.getTime() < dayEnd &&
        a.endsAt.getTime() > dayStart,
    ).length;

  const bySlot = new Map<number, AvailableSlot>();
  let closed: { label: string | null } | undefined;

  for (const member of eligible) {
    const memberDay = staffHoursOnDate({
      date,
      shopHours,
      ownHours: member.useShopHours ? null : hours.filter((h) => h.staffId === member.id),
      shopOverrides,
      ownOverrides: overrides.filter((o) => o.staffId === member.id),
    });
    if (memberDay.closed && (staffId || !closed)) closed = memberDay.closed;

    const slots = getAvailableSlots({
      ...rules,
      ranges: memberDay.ranges,
      // Their own appointments, plus any not assigned to anyone.
      appointments: nearbyAppointments.filter((a) => a.staffId === member.id || a.staffId == null),
    });
    for (const slot of slots) {
      const key = slot.start.getTime();
      const existing = bySlot.get(key);
      if (existing) existing.staffIds.push(member.id);
      else bySlot.set(key, { ...slot, staffIds: [member.id] });
    }
  }

  const load = new Map(eligible.map((m) => [m.id, bookedThatDay(m.id)]));
  const slots = [...bySlot.values()]
    .sort((a, b) => a.start.getTime() - b.start.getTime())
    .map((slot) => ({
      ...slot,
      staffIds: slot.staffIds.sort((a, b) => load.get(a)! - load.get(b)!),
    }));

  // "Closed" only when nobody can work: the shop is closed, or the one
  // requested person is off.
  const shopClosed = hoursOnDate({ date, workingHours: shopHours, overrides: shopOverrides }).closed;
  return {
    slots,
    closed: shopClosed ?? (staffId && slots.length === 0 ? closed : undefined),
  };
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
  /** The staff member it's with; null in shops without staff. */
  staffId?: string | null;
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
  const staffId = values.staffId ?? null;

  // Each appointment occupies its own time plus its gap; two appointments
  // conflict when those spans overlap. With staff, only the same person's
  // appointments (and unassigned ones) conflict; without, the whole shop's.
  const result = await db.run(sql`
    INSERT INTO appointments (
      id, shop_id, service_id, staff_id, customer_name, customer_phone, customer_email,
      starts_at, ends_at, buffer_minutes, status, notes, cancel_token,
      reminder_sent_at, created_at
    )
    SELECT
      ${values.id}, ${values.shopId}, ${values.serviceId}, ${staffId}, ${values.customerName},
      ${values.customerPhone}, ${values.customerEmail}, ${startsAt}, ${endsAt},
      ${bufferMinutes}, 'confirmed', ${values.notes}, ${values.cancelToken}, NULL,
      ${toUnixSeconds(new Date())}
    WHERE NOT EXISTS (
      SELECT 1 FROM appointments
      WHERE shop_id = ${values.shopId}
        AND status != 'cancelled'
        AND (${staffId} IS NULL OR staff_id IS NULL OR staff_id = ${staffId})
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
      staffName: staff.name,
    })
    .from(appointments)
    .innerJoin(shops, eq(appointments.shopId, shops.id))
    .innerJoin(services, eq(appointments.serviceId, services.id))
    .leftJoin(staff, eq(appointments.staffId, staff.id))
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
