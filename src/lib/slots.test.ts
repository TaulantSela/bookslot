import { describe, expect, it } from "vitest";
import type { WorkingHour } from "@/db/schema";
import { getAvailableSlots, hoursOnDate, staffHoursOnDate } from "./slots";
import { zonedDateTime } from "./slots-internal";
import { acrossServerTimezones, restoreServerTimezone } from "./test-utils";

restoreServerTimezone();

const SKOPJE = "Europe/Skopje";
const MONDAY = "2026-11-16";
// Well before every test date, so "in the past" never filters by accident.
const NOW = new Date("2026-11-10T00:00:00Z");

function hours(
  startTime: string,
  endTime: string,
  days = [1, 2, 3, 4, 5],
): WorkingHour[] {
  return days.map((dayOfWeek) => ({
    id: `wh_${dayOfWeek}_${startTime}`,
    shopId: "shop",
    staffId: null,
    dayOfWeek,
    startTime,
    endTime,
  }));
}

function appointment(
  date: string,
  start: string,
  end: string,
  status = "confirmed",
  timezone = SKOPJE,
) {
  return {
    startsAt: zonedDateTime(date, start, timezone),
    endsAt: zonedDateTime(date, end, timezone),
    status,
  };
}

function labels({
  date = MONDAY,
  timezone = SKOPJE,
  workingHours = hours("09:00", "10:00"),
  durationMinutes = 30,
  appointments = [] as ReturnType<typeof appointment>[],
  now = NOW,
  slotIntervalMinutes,
}: {
  date?: string;
  timezone?: string;
  workingHours?: WorkingHour[];
  durationMinutes?: number;
  appointments?: ReturnType<typeof appointment>[];
  now?: Date;
  slotIntervalMinutes?: number;
} = {}) {
  return getAvailableSlots({
    date,
    timezone,
    workingHours,
    service: { durationMinutes },
    appointments,
    now,
    slotIntervalMinutes,
  }).map((slot) => slot.label);
}

describe("getAvailableSlots", () => {
  it("offers slots on a 15-minute grid", () => {
    expect(labels()).toEqual(["09:00", "09:15", "09:30"]);
  });

  it("only offers slots that finish by closing time", () => {
    expect(labels({ durationMinutes: 45 })).toEqual(["09:00", "09:15"]);
    expect(labels({ durationMinutes: 60 })).toEqual(["09:00"]);
    expect(labels({ durationMinutes: 61 })).toEqual([]);
  });

  it("returns nothing on a closed day", () => {
    expect(labels({ date: "2026-11-15" })).toEqual([]); // Sunday
  });

  it("returns nothing when the shop has no hours at all", () => {
    expect(labels({ workingHours: [] })).toEqual([]);
  });

  it("only offers slots that start after now", () => {
    // 09:20 in Skopje
    const now = new Date("2026-11-16T08:20:00Z");
    expect(labels({ now })).toEqual(["09:30"]);
  });

  it("does not offer a slot starting exactly now", () => {
    const now = zonedDateTime(MONDAY, "09:15", SKOPJE);
    expect(labels({ now })).toEqual(["09:30"]);
  });

  it("skips slots that overlap an appointment", () => {
    expect(
      labels({
        workingHours: hours("09:00", "11:00"),
        appointments: [appointment(MONDAY, "09:15", "09:45")],
      }),
    ).toEqual(["09:45", "10:00", "10:15", "10:30"]);
  });

  it("allows back-to-back appointments", () => {
    expect(
      labels({ appointments: [appointment(MONDAY, "09:00", "09:30")] }),
    ).toEqual(["09:30"]);
  });

  it("ignores cancelled appointments", () => {
    expect(
      labels({
        appointments: [appointment(MONDAY, "09:00", "10:00", "cancelled")],
      }),
    ).toEqual(["09:00", "09:15", "09:30"]);
  });

  it("supports split shifts on the same day", () => {
    expect(
      labels({
        workingHours: [...hours("09:00", "10:00"), ...hours("14:00", "15:00")],
      }),
    ).toEqual(["09:00", "09:15", "09:30", "14:00", "14:15", "14:30"]);
  });

  it("honours a custom slot interval", () => {
    expect(
      labels({ workingHours: hours("09:00", "11:00"), slotIntervalMinutes: 30 }),
    ).toEqual(["09:00", "09:30", "10:00", "10:30"]);
  });

  it("computes instants in the shop's timezone", () => {
    const [first] = getAvailableSlots({
      date: MONDAY,
      timezone: "America/New_York",
      workingHours: hours("09:00", "10:00"),
      service: { durationMinutes: 30 },
      appointments: [],
      now: NOW,
    });
    expect(first.label).toBe("09:00");
    expect(first.start.toISOString()).toBe("2026-11-16T14:00:00.000Z");
    expect(first.end.toISOString()).toBe("2026-11-16T14:30:00.000Z");
  });

  it("gives the same slots whatever the server timezone", () => {
    // Regression: on a UTC server, shops west of UTC used to get the
    // previous day's hours.
    for (const timezone of [SKOPJE, "America/New_York", "Asia/Tokyo"]) {
      const results = acrossServerTimezones(() =>
        getAvailableSlots({
          date: MONDAY,
          timezone,
          workingHours: hours("09:00", "10:00"),
          service: { durationMinutes: 30 },
          appointments: [],
          now: NOW,
        }).map((slot) => slot.start.toISOString()),
      );
      for (const result of results) expect(result).toEqual(results[0]);
      expect(results[0]).toHaveLength(3);
    }
  });

  it("skips the missing hour on the spring-forward day", () => {
    // 2027-03-28 is a Sunday; clocks jump from 02:00 to 03:00 in Skopje.
    const slots = getAvailableSlots({
      date: "2027-03-28",
      timezone: SKOPJE,
      workingHours: hours("01:00", "04:00", [0]),
      service: { durationMinutes: 30 },
      appointments: [],
      now: NOW,
    });

    expect(slots.map((s) => s.label).some((l) => l.startsWith("02:"))).toBe(
      false,
    );
    for (const slot of slots) {
      expect(slot.end.getTime() - slot.start.getTime()).toBe(30 * 60 * 1000);
    }
  });
});

describe("booking rules", () => {
  const nineToEleven = hours("09:00", "11:00");

  it("keeps the gap after existing appointments free", () => {
    expect(
      getAvailableSlots({
        date: MONDAY,
        timezone: SKOPJE,
        workingHours: nineToEleven,
        service: { durationMinutes: 30 },
        appointments: [{ ...appointment(MONDAY, "09:00", "09:30"), bufferMinutes: 15 }],
        now: NOW,
        slotIntervalMinutes: 15,
      }).map((s) => s.label),
    ).toEqual(["09:45", "10:00", "10:15", "10:30"]);
  });

  it("keeps the new appointment's own gap clear of the next one", () => {
    expect(
      getAvailableSlots({
        date: MONDAY,
        timezone: SKOPJE,
        workingHours: nineToEleven,
        service: { durationMinutes: 30 },
        bufferMinutes: 15,
        appointments: [appointment(MONDAY, "10:00", "10:30")],
        now: NOW,
      }).map((s) => s.label),
    ).toEqual(["09:00", "09:15", "10:30"]);
  });

  it("lets the last appointment's gap run past closing", () => {
    expect(
      getAvailableSlots({
        date: MONDAY,
        timezone: SKOPJE,
        workingHours: hours("09:00", "10:00"),
        service: { durationMinutes: 60 },
        bufferMinutes: 30,
        appointments: [],
        now: NOW,
      }).map((s) => s.label),
    ).toEqual(["09:00"]);
  });

  it("enforces minimum notice", () => {
    const now = zonedDateTime(MONDAY, "08:50", SKOPJE);
    expect(
      getAvailableSlots({
        date: MONDAY,
        timezone: SKOPJE,
        workingHours: nineToEleven,
        service: { durationMinutes: 30 },
        appointments: [],
        now,
        minNoticeMinutes: 60,
      })[0]?.label,
    ).toBe("10:00");
  });

  it("stops offering dates past the booking window", () => {
    const now = zonedDateTime("2026-11-09", "12:00", SKOPJE); // Monday a week before
    const slotsOn = (date: string, maxAdvanceDays: number) =>
      getAvailableSlots({
        date,
        timezone: SKOPJE,
        workingHours: nineToEleven,
        service: { durationMinutes: 30 },
        appointments: [],
        now,
        maxAdvanceDays,
      }).length;
    expect(slotsOn(MONDAY, 7)).toBeGreaterThan(0);
    expect(slotsOn(MONDAY, 6)).toBe(0);
  });
});

describe("hoursOnDate", () => {
  const weekly = hours("09:00", "17:00");
  const override = (startDate: string, endDate: string, startTime: string | null = null, endTime: string | null = null, label: string | null = null) => ({
    startDate,
    endDate,
    startTime,
    endTime,
    label,
  });

  it("uses the weekly hours with no override", () => {
    expect(hoursOnDate({ date: MONDAY, workingHours: weekly })).toEqual({
      ranges: [{ startTime: "09:00", endTime: "17:00" }],
    });
  });

  it("closes every date in an inclusive range", () => {
    const overrides = [override("2026-11-16", "2026-11-18", null, null, "Holiday")];
    for (const date of ["2026-11-16", "2026-11-17", "2026-11-18"]) {
      expect(hoursOnDate({ date, workingHours: weekly, overrides })).toEqual({
        ranges: [],
        closed: { label: "Holiday" },
      });
    }
    expect(hoursOnDate({ date: "2026-11-19", workingHours: weekly, overrides }).ranges).toHaveLength(1);
  });

  it("replaces the weekly hours with special hours, even on a normally closed day", () => {
    const sunday = "2026-11-15";
    const overrides = [override(sunday, sunday, "10:00", "13:00", "Christmas market")];
    expect(hoursOnDate({ date: sunday, workingHours: weekly, overrides })).toEqual({
      ranges: [{ startTime: "10:00", endTime: "13:00" }],
      special: { label: "Christmas market" },
    });
  });

  it("lets a closed override win over special hours", () => {
    const overrides = [
      override(MONDAY, MONDAY, "10:00", "12:00"),
      override("2026-11-10", "2026-11-20"),
    ];
    expect(hoursOnDate({ date: MONDAY, workingHours: weekly, overrides }).closed).toBeDefined();
  });

  it("adds up several special-hours overrides on one date", () => {
    const overrides = [
      override(MONDAY, MONDAY, "14:00", "15:00"),
      override(MONDAY, MONDAY, "09:00", "10:00"),
    ];
    expect(
      getAvailableSlots({
        date: MONDAY,
        timezone: SKOPJE,
        workingHours: weekly,
        overrides,
        service: { durationMinutes: 60 },
        appointments: [],
        now: NOW,
      }).map((s) => s.label),
    ).toEqual(["09:00", "14:00"]);
  });
});

describe("staffHoursOnDate", () => {
  const shopHours = hours("09:00", "17:00");
  const own = hours("12:00", "20:00");
  const off = (date: string, label: string | null = null) => ({
    startDate: date,
    endDate: date,
    startTime: null,
    endTime: null,
    label,
  });
  const special = (date: string, startTime: string, endTime: string) => ({
    startDate: date,
    endDate: date,
    startTime,
    endTime,
    label: null,
  });

  it("uses the shop's hours, or the person's own", () => {
    expect(staffHoursOnDate({ date: MONDAY, shopHours, ownHours: null }).ranges).toEqual([
      { startTime: "09:00", endTime: "17:00" },
    ]);
    expect(staffHoursOnDate({ date: MONDAY, shopHours, ownHours: own }).ranges).toEqual([
      { startTime: "12:00", endTime: "20:00" },
    ]);
  });

  it("closes everyone on the shop's closed days", () => {
    expect(
      staffHoursOnDate({ date: MONDAY, shopHours, ownHours: own, shopOverrides: [off(MONDAY, "Holiday")] }),
    ).toEqual({ ranges: [], closed: { label: "Holiday" } });
  });

  it("applies the person's time off and special hours before the shop's special hours", () => {
    const shopOverrides = [special(MONDAY, "10:00", "14:00")];
    expect(
      staffHoursOnDate({ date: MONDAY, shopHours, ownHours: null, shopOverrides, ownOverrides: [off(MONDAY)] }).closed,
    ).toBeDefined();
    expect(
      staffHoursOnDate({
        date: MONDAY,
        shopHours,
        ownHours: null,
        shopOverrides,
        ownOverrides: [special(MONDAY, "11:00", "12:00")],
      }).ranges,
    ).toEqual([{ startTime: "11:00", endTime: "12:00" }]);
  });

  it("applies the shop's special hours to people with their own hours", () => {
    expect(
      staffHoursOnDate({
        date: MONDAY,
        shopHours,
        ownHours: own,
        shopOverrides: [special(MONDAY, "10:00", "14:00")],
      }).ranges,
    ).toEqual([{ startTime: "10:00", endTime: "14:00" }]);
  });
});
