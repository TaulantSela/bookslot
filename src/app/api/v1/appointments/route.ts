import { and, asc, eq, gt, gte, lt, or } from "drizzle-orm";
import { db } from "@/db";
import { appointments, services, shops, staff } from "@/db/schema";
import { apiAppointmentColumns, loadApiAppointment, toApiAppointment } from "@/lib/api-format";
import { apiError, json, readJsonBody, withApiKey } from "@/lib/api-http";
import { APPOINTMENT_STATUSES } from "@/lib/appointment-status";
import { createBooking, type BookingFailure } from "@/lib/create-booking";
import { emitAppointmentEvent } from "@/lib/webhooks";

const MAX_LIMIT = 100;

function encodeCursor(startsAt: Date, id: string) {
  return Buffer.from(`${startsAt.getTime()}|${id}`).toString("base64url");
}

function decodeCursor(cursor: string) {
  const [ms, id] = Buffer.from(cursor, "base64url").toString().split("|");
  const time = Number(ms);
  return Number.isFinite(time) && id ? { startsAt: new Date(time), id } : null;
}

function parseInstant(value: string | null) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * GET /api/v1/appointments?from=…&to=…[&status=confirmed][&staff=stf_…][&limit=50][&cursor=…]
 * Appointments by start time. from/to are ISO dates or date-times; from
 * defaults to now. Pass nextCursor back as cursor for the next page.
 */
export const GET = withApiKey(async ({ request, shop }) => {
  const query = new URL(request.url).searchParams;
  const from = parseInstant(query.get("from"));
  const to = parseInstant(query.get("to"));
  const status = query.get("status");
  const staffId = query.get("staff");
  const limit = Number(query.get("limit") ?? 50);
  const cursor = query.get("cursor");

  if (from === null || to === null) return apiError(400, "invalid_range", "from and to must be ISO dates.");
  if (status && !(APPOINTMENT_STATUSES as readonly string[]).includes(status)) {
    return apiError(400, "invalid_status", `status must be one of ${APPOINTMENT_STATUSES.join(", ")}.`);
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
    return apiError(400, "invalid_limit", `limit must be 1–${MAX_LIMIT}.`);
  }
  const after = cursor ? decodeCursor(cursor) : undefined;
  if (after === null) return apiError(400, "invalid_cursor", "Unknown cursor.");

  const rows = await db
    .select(apiAppointmentColumns)
    .from(appointments)
    .innerJoin(services, eq(appointments.serviceId, services.id))
    .innerJoin(shops, eq(appointments.shopId, shops.id))
    .leftJoin(staff, eq(appointments.staffId, staff.id))
    .where(
      and(
        eq(appointments.shopId, shop.id),
        gte(appointments.startsAt, from ?? new Date()),
        to ? lt(appointments.startsAt, to) : undefined,
        status ? eq(appointments.status, status) : undefined,
        staffId ? eq(appointments.staffId, staffId) : undefined,
        after
          ? or(
              gt(appointments.startsAt, after.startsAt),
              and(eq(appointments.startsAt, after.startsAt), gt(appointments.id, after.id)),
            )
          : undefined,
      ),
    )
    .orderBy(asc(appointments.startsAt), asc(appointments.id))
    .limit(limit + 1);

  const page = rows.slice(0, limit);
  const last = page.at(-1);
  return json({
    data: page.map(toApiAppointment),
    nextCursor: rows.length > limit && last ? encodeCursor(last.appointment.startsAt, last.appointment.id) : null,
  });
});

const FAILURE_STATUS: Record<BookingFailure["code"], number> = {
  invalid_customer: 422,
  invalid_answers: 422,
  invalid_date: 422,
  service_unavailable: 422,
  staff_unavailable: 422,
  limit_reached: 403,
  slot_taken: 409,
};

/**
 * POST /api/v1/appointments
 * { "service": "svc_…", "date": "2026-11-16", "time": "10:00", "staff": "stf_…"?,
 *   "customer": { "name": "…", "phone": "…", "email": "…", "notes": "…" },
 *   "answers": { "<question key>": "…" } }
 * Same checks as the widget: the time must be one of the offered slots.
 */
export const POST = withApiKey(async ({ request, shop }) => {
  const body = await readJsonBody(request);
  if (body instanceof Response) return body;

  const text = (value: unknown) => (typeof value === "string" ? value : "");
  const customer = (body.customer && typeof body.customer === "object" ? body.customer : {}) as Record<string, unknown>;
  const answers = (body.answers && typeof body.answers === "object" && !Array.isArray(body.answers)
    ? body.answers
    : {}) as Record<string, unknown>;

  if (!text(body.service) || !text(body.date) || !/^\d{2}:\d{2}$/.test(text(body.time))) {
    return apiError(422, "invalid_request", "service, date (yyyy-MM-dd) and time (HH:mm) are required.");
  }

  const result = await createBooking({
    shop,
    serviceId: text(body.service),
    date: text(body.date),
    time: text(body.time),
    staffId: text(body.staff) || undefined,
    customer,
    answers,
  });
  if (!("booking" in result)) return apiError(FAILURE_STATUS[result.code], result.code, result.error);

  await emitAppointmentEvent(shop, "appointment.created", result.booking.appointmentId);
  return json(await loadApiAppointment(shop.id, result.booking.appointmentId), 201);
});
