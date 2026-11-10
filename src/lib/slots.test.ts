import { describe, expect, it } from "vitest";
import type { WorkingHour } from "@/db/schema";
import { getAvailableSlots } from "./slots";
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
