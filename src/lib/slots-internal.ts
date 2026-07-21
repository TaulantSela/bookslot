import { parse } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

export function parseTimeOnDate(date: Date, time: string, timezone: string) {
  const dayStr = formatInTimeZone(date, timezone, "yyyy-MM-dd");
  const local = parse(`${dayStr} ${time}`, "yyyy-MM-dd HH:mm", new Date());
  return fromZonedTime(local, timezone);
}
