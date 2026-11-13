import { loadApiAppointment } from "@/lib/api-format";
import { apiError, json, readJsonBody, withApiKey } from "@/lib/api-http";
import { APPOINTMENT_STATUSES, setAppointmentStatus, type AppointmentStatus } from "@/lib/appointment-status";

type Params = { id: string };

/** GET /api/v1/appointments/:id */
export const GET = withApiKey<Params>(async ({ shop, params }) => {
  const appointment = await loadApiAppointment(shop.id, params.id);
  return appointment ? json(appointment) : apiError(404, "not_found", "No appointment with that id.");
});

/**
 * PATCH /api/v1/appointments/:id  { "status": "cancelled" | "completed" | "confirmed" }
 * Cancelling frees the time for new bookings and sends appointment.cancelled.
 */
export const PATCH = withApiKey<Params>(async ({ request, shop, params }) => {
  const body = await readJsonBody(request);
  if (body instanceof Response) return body;

  const status = body.status;
  if (typeof status !== "string" || !(APPOINTMENT_STATUSES as readonly string[]).includes(status)) {
    return apiError(422, "invalid_status", `status must be one of ${APPOINTMENT_STATUSES.join(", ")}.`);
  }

  const current = await loadApiAppointment(shop.id, params.id);
  if (!current) return apiError(404, "not_found", "No appointment with that id.");
  // A cancelled time may already be someone else's, so it can't be revived.
  if (current.status === "cancelled" && status !== "cancelled") {
    return apiError(409, "already_cancelled", "This appointment was cancelled. Create a new booking instead.");
  }
  if (current.status !== status) {
    await setAppointmentStatus(shop, params.id, status as AppointmentStatus);
  }
  return json(await loadApiAppointment(shop.id, params.id));
});
