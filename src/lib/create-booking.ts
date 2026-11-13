import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { services, type Shop } from "@/db/schema";
import {
  bufferFor,
  getActiveStaff,
  getFormFields,
  getSlotsForDay,
  insertAppointmentIfFree,
  isAcceptingOnlineBookings,
  noOnlineBookingsMessage,
  offersService,
} from "@/lib/booking";
import {
  standardFields,
  validateAnswers,
  validateCustomer,
  type CustomerInput,
} from "@/lib/booking-form";
import { buildCancelUrl, sendBookingConfirmation } from "@/lib/email";
import { newId } from "@/lib/id";
import { formatAppointmentRange } from "@/lib/slots";
import { isValidDateString } from "@/lib/slots-internal";

export type BookingResult = {
  appointmentId: string;
  serviceId: string;
  serviceName: string;
  /** Who it's with; null in shops without staff. */
  staffId: string | null;
  staffName: string | null;
  startsAt: string;
  endsAt: string;
  /** Human-readable date and time range in the shop's timezone. */
  when: string;
};

export type BookingFailure = {
  error: string;
  code:
    | "invalid_customer"
    | "invalid_answers"
    | "invalid_date"
    | "limit_reached"
    | "service_unavailable"
    | "staff_unavailable"
    | "slot_taken";
};

export const SLOT_TAKEN_ERROR = "That time slot is no longer available.";

/**
 * Books one appointment after checking everything on the server: the plan's
 * monthly limit, the service, the staff member, and that the time is one of
 * the slots actually offered. Used by the widget and the public API.
 */
export async function createBooking({
  shop,
  serviceId,
  date,
  time,
  staffId,
  customer: customerInput,
  answers: answerInput = {},
}: {
  shop: Shop;
  serviceId: string;
  /** yyyy-MM-dd in the shop's timezone. */
  date: string;
  /** HH:mm in the shop's timezone. */
  time: string;
  /** A specific staff member, or undefined/null for anyone. */
  staffId?: string | null;
  /** Checked against the shop's form settings. */
  customer: CustomerInput;
  /** Answers to the shop's custom questions, keyed by question key. */
  answers?: Record<string, unknown>;
}): Promise<{ booking: BookingResult } | BookingFailure> {
  const checkedCustomer = validateCustomer(standardFields(shop), customerInput);
  if ("error" in checkedCustomer) return { error: checkedCustomer.error, code: "invalid_customer" };
  const customer = checkedCustomer.customer;

  const checkedAnswers = validateAnswers(await getFormFields(shop), answerInput);
  if ("error" in checkedAnswers) return { error: checkedAnswers.error, code: "invalid_answers" };

  if (!isValidDateString(date)) {
    return { error: "Please pick a valid date.", code: "invalid_date" };
  }

  if (!(await isAcceptingOnlineBookings(shop))) {
    return { error: noOnlineBookingsMessage(shop), code: "limit_reached" };
  }

  const [service] = await db
    .select()
    .from(services)
    .where(and(eq(services.id, serviceId), eq(services.shopId, shop.id)))
    .limit(1);
  if (!service || !service.active) {
    return { error: "Service not available.", code: "service_unavailable" };
  }

  const team = await getActiveStaff(shop.id);
  if (staffId) {
    const member = team.find((m) => m.id === staffId);
    if (!member || !offersService(member, service.id)) {
      return {
        error: `That ${shop.staffLabel.toLowerCase()} isn't available for ${service.name}.`,
        code: "staff_unavailable",
      };
    }
  }

  // Never trust the submitted time: it must be one of the slots the shop
  // actually offers (inside working hours, in the future, on the grid).
  const slots = await getSlotsForDay({ shop, service, date, staffId: staffId || undefined });
  const slot = slots.find((s) => s.label === time);
  if (!slot) return { error: SLOT_TAKEN_ERROR, code: "slot_taken" };

  // Free staff for the slot, least busy first; null in shops without staff.
  const candidates: (string | null)[] = team.length === 0 ? [null] : slot.staffIds;
  const appointmentId = newId("appt");
  const cancelToken = newId("cancel");
  let bookedWith: string | null | undefined;

  for (const candidate of candidates) {
    const ok = await insertAppointmentIfFree({
      id: appointmentId,
      shopId: shop.id,
      serviceId: service.id,
      staffId: candidate,
      customerName: customer.name,
      customerPhone: customer.phone,
      customerEmail: customer.email,
      startsAt: slot.start,
      endsAt: slot.end,
      bufferMinutes: bufferFor(service, shop),
      notes: customer.notes,
      answers: checkedAnswers.answers,
      cancelToken,
    });
    if (ok) {
      bookedWith = candidate;
      break;
    }
  }
  if (bookedWith === undefined) return { error: SLOT_TAKEN_ERROR, code: "slot_taken" };

  const staffName = team.find((m) => m.id === bookedWith)?.name ?? null;

  if (customer.email) {
    await sendBookingConfirmation({
      to: customer.email,
      customerName: customer.name,
      shopName: shop.name,
      serviceName: service.name,
      staffName,
      startsAt: slot.start,
      endsAt: slot.end,
      timezone: shop.timezone,
      cancelUrl: buildCancelUrl(cancelToken),
    });
  }

  return {
    booking: {
      appointmentId,
      serviceId: service.id,
      serviceName: service.name,
      staffId: bookedWith,
      staffName,
      startsAt: slot.start.toISOString(),
      endsAt: slot.end.toISOString(),
      when: formatAppointmentRange(slot.start, slot.end, shop.timezone),
    },
  };
}
