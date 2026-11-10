import { addDays, addMinutes, isAfter, startOfDay } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import type { Appointment, Service, WorkingHour } from "@/db/schema";
import { dayOfWeek, zonedDateTime } from "@/lib/slots-internal";

export type TimeSlot = {
  start: Date;
  end: Date;
  label: string;
};

export function getAvailableSlots({
  date,
  timezone,
  workingHours,
  service,
  appointments,
  now = new Date(),
  slotIntervalMinutes = 15,
}: {
  /** Calendar date in the shop's timezone, as yyyy-MM-dd. */
  date: string;
  timezone: string;
  workingHours: WorkingHour[];
  service: Pick<Service, "durationMinutes">;
  appointments: Pick<Appointment, "startsAt" | "endsAt" | "status">[];
  now?: Date;
  slotIntervalMinutes?: number;
}): TimeSlot[] {
  const weekday = dayOfWeek(date);
  const dayHours = workingHours.filter((h) => h.dayOfWeek === weekday);

  if (dayHours.length === 0) return [];

  const slots: TimeSlot[] = [];
  const duration = service.durationMinutes;

  for (const hours of dayHours) {
    let cursor = zonedDateTime(date, hours.startTime, timezone);
    const dayEnd = zonedDateTime(date, hours.endTime, timezone);

    while (addMinutes(cursor, duration) <= dayEnd) {
      const slotEnd = addMinutes(cursor, duration);

      if (isAfter(cursor, now)) {
        const overlaps = appointments.some((appt) => {
          if (appt.status === "cancelled") return false;
          return cursor < appt.endsAt && slotEnd > appt.startsAt;
        });

        if (!overlaps) {
          slots.push({
            start: cursor,
            end: slotEnd,
            label: formatInTimeZone(cursor, timezone, "HH:mm"),
          });
        }
      }

      cursor = addMinutes(cursor, slotIntervalMinutes);
    }
  }

  return slots;
}

export function getDateRange(days = 14) {
  const today = startOfDay(new Date());
  return Array.from({ length: days }, (_, i) => addDays(today, i));
}

export function formatAppointmentRange(
  startsAt: Date,
  endsAt: Date,
  timezone: string,
) {
  const date = formatInTimeZone(startsAt, timezone, "EEE, d MMM yyyy");
  const start = formatInTimeZone(startsAt, timezone, "HH:mm");
  const end = formatInTimeZone(endsAt, timezone, "HH:mm");
  return `${date} · ${start}–${end}`;
}

export function formatDateLabel(date: Date, timezone: string) {
  return formatInTimeZone(date, timezone, "EEE, d MMM");
}

export { formatInTimeZone };
