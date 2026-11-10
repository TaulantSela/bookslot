import { fromZonedTime } from "date-fns-tz";

// Calendar dates travel as "yyyy-MM-dd" strings and times as "HH:mm" strings.
// Every helper here works on those strings directly, so the result never
// depends on the timezone of the server running the code.

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

function toUtcDate(dateStr: string) {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

/** True for a real calendar date in yyyy-MM-dd form (rejects 2026-02-30). */
export function isValidDateString(value: string) {
  if (!DATE_PATTERN.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = toUtcDate(value);
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/** True for a 24-hour wall-clock time in HH:mm form. */
export function isValidTimeString(value: string) {
  return TIME_PATTERN.test(value);
}

/** Day of the week (0 = Sunday) of a yyyy-MM-dd calendar date. */
export function dayOfWeek(dateStr: string) {
  return toUtcDate(dateStr).getUTCDay();
}

/** The calendar date one day after a yyyy-MM-dd date. */
export function nextDateString(dateStr: string) {
  const date = toUtcDate(dateStr);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

/** The instant at which a wall-clock time on a calendar date occurs in `timezone`. */
export function zonedDateTime(dateStr: string, time: string, timezone: string) {
  return fromZonedTime(`${dateStr}T${time}:00`, timezone);
}

/** The [start, end) instants of a calendar date in `timezone`. */
export function zonedDayRange(dateStr: string, timezone: string) {
  return {
    start: zonedDateTime(dateStr, "00:00", timezone),
    end: zonedDateTime(nextDateString(dateStr), "00:00", timezone),
  };
}
