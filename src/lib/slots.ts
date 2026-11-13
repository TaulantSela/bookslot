import { addDays, addMinutes, isAfter, startOfDay } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import type { Appointment, DateOverride, WorkingHour } from "@/db/schema";
import { addDaysToDateString, dayOfWeek, zonedDateTime } from "@/lib/slots-internal";

export type TimeSlot = {
  start: Date;
  end: Date;
  label: string;
};

type HoursRange = { startTime: string; endTime: string };

export type DayHours = {
  /** Wall-clock ranges the shop takes bookings in on that date. */
  ranges: HoursRange[];
  /** Set when an override closes the whole date. */
  closed?: { label: string | null };
  /** Set when an override replaces the weekly hours with special hours. */
  special?: { label: string | null };
};

type OverrideLike = Pick<DateOverride, "startDate" | "endDate" | "startTime" | "endTime" | "label">;

/**
 * Opening hours on one calendar date: the weekly hours, unless an override
 * covers the date. A closed override wins; otherwise every override with
 * hours on that date replaces the weekly hours.
 */
export function hoursOnDate({
  date,
  workingHours,
  overrides = [],
}: {
  date: string;
  workingHours: Pick<WorkingHour, "dayOfWeek" | "startTime" | "endTime">[];
  overrides?: OverrideLike[];
}): DayHours {
  const covering = overrides.filter((o) => o.startDate <= date && date <= o.endDate);
  const closing = covering.find((o) => !o.startTime || !o.endTime);
  if (closing) return { ranges: [], closed: { label: closing.label } };

  if (covering.length > 0) {
    return {
      ranges: covering
        .map((o) => ({ startTime: o.startTime!, endTime: o.endTime! }))
        .sort((a, b) => a.startTime.localeCompare(b.startTime)),
      special: { label: covering.find((o) => o.label)?.label ?? null },
    };
  }

  const weekday = dayOfWeek(date);
  return {
    ranges: workingHours
      .filter((h) => h.dayOfWeek === weekday)
      .map(({ startTime, endTime }) => ({ startTime, endTime }))
      .sort((a, b) => a.startTime.localeCompare(b.startTime)),
  };
}

/** The last calendar date (shop timezone) customers may book. */
export function lastBookableDate(timezone: string, maxAdvanceDays: number, now = new Date()) {
  return addDaysToDateString(formatInTimeZone(now, timezone, "yyyy-MM-dd"), maxAdvanceDays);
}

type BusyAppointment = Pick<Appointment, "startsAt" | "endsAt" | "status"> &
  Partial<Pick<Appointment, "bufferMinutes">>;

export function getAvailableSlots({
  date,
  timezone,
  workingHours,
  overrides = [],
  service,
  bufferMinutes = 0,
  appointments,
  now = new Date(),
  slotIntervalMinutes = 15,
  minNoticeMinutes = 0,
  maxAdvanceDays,
}: {
  /** Calendar date in the shop's timezone, as yyyy-MM-dd. */
  date: string;
  timezone: string;
  workingHours: Pick<WorkingHour, "dayOfWeek" | "startTime" | "endTime">[];
  overrides?: OverrideLike[];
  service: { durationMinutes: number };
  /** Gap the new appointment keeps free after itself. */
  bufferMinutes?: number;
  appointments: BusyAppointment[];
  now?: Date;
  slotIntervalMinutes?: number;
  /** Slots must start at least this long after `now`. */
  minNoticeMinutes?: number;
  /** No slots after this many days from today. Undefined = no limit. */
  maxAdvanceDays?: number;
}): TimeSlot[] {
  if (maxAdvanceDays != null && date > lastBookableDate(timezone, maxAdvanceDays, now)) {
    return [];
  }

  const { ranges } = hoursOnDate({ date, workingHours, overrides });
  if (ranges.length === 0) return [];

  const duration = service.durationMinutes;
  const step = Math.max(1, slotIntervalMinutes);
  const earliest = addMinutes(now, minNoticeMinutes);
  // Each existing appointment blocks its own time plus its gap.
  const busy = appointments
    .filter((appt) => appt.status !== "cancelled")
    .map((appt) => ({
      start: appt.startsAt,
      end: addMinutes(appt.endsAt, appt.bufferMinutes ?? 0),
    }));

  const slots: TimeSlot[] = [];
  const seen = new Set<number>();

  for (const range of ranges) {
    let cursor = zonedDateTime(date, range.startTime, timezone);
    const rangeEnd = zonedDateTime(date, range.endTime, timezone);

    while (addMinutes(cursor, duration) <= rangeEnd) {
      const slotEnd = addMinutes(cursor, duration);
      // The new appointment's gap may run past closing, but not into
      // someone else's appointment.
      const blockedUntil = addMinutes(slotEnd, bufferMinutes);

      if (isAfter(cursor, now) && cursor >= earliest && !seen.has(cursor.getTime())) {
        const overlaps = busy.some((b) => cursor < b.end && blockedUntil > b.start);
        if (!overlaps) {
          seen.add(cursor.getTime());
          slots.push({
            start: cursor,
            end: slotEnd,
            label: formatInTimeZone(cursor, timezone, "HH:mm"),
          });
        }
      }

      cursor = addMinutes(cursor, step);
    }
  }

  return slots.sort((a, b) => a.start.getTime() - b.start.getTime());
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
