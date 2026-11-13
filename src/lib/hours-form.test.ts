import { describe, expect, it } from "vitest";
import { parseWeeklyHoursForm, weeklyHoursFormValues } from "./hours-form";

function form(fields: Record<string, string>) {
  return new Map(Object.entries(fields)) as unknown as FormData;
}

describe("parseWeeklyHoursForm", () => {
  it("reads open days and skips closed ones", () => {
    expect(
      parseWeeklyHoursForm(
        form({
          day_1_enabled: "on",
          day_1_start: "09:00",
          day_1_end: "17:00",
          day_2_start: "09:00",
          day_2_end: "17:00",
        }),
      ),
    ).toEqual({ ranges: [{ dayOfWeek: 1, startTime: "09:00", endTime: "17:00" }] });
  });

  it("splits a day with a break into two ranges", () => {
    expect(
      parseWeeklyHoursForm(
        form({
          day_3_enabled: "on",
          day_3_start: "09:00",
          day_3_end: "18:00",
          day_3_break_start: "13:00",
          day_3_break_end: "14:00",
        }),
      ),
    ).toEqual({
      ranges: [
        { dayOfWeek: 3, startTime: "09:00", endTime: "13:00" },
        { dayOfWeek: 3, startTime: "14:00", endTime: "18:00" },
      ],
    });
  });

  it.each([
    ["closing before opening", { day_1_start: "17:00", day_1_end: "09:00" }],
    ["a break outside the day", { day_1_start: "09:00", day_1_end: "17:00", day_1_break_start: "08:00", day_1_break_end: "10:00" }],
    ["a break that ends before it starts", { day_1_start: "09:00", day_1_end: "17:00", day_1_break_start: "13:00", day_1_break_end: "12:00" }],
    ["half a break", { day_1_start: "09:00", day_1_end: "17:00", day_1_break_start: "13:00" }],
    ["an invalid time", { day_1_start: "25:00", day_1_end: "26:00" }],
  ])("rejects %s, naming the day", (_label, fields) => {
    const result = parseWeeklyHoursForm(form({ day_1_enabled: "on", ...fields }));
    expect("error" in result && result.error).toMatch(/^Monday:/);
  });

  it("reads fields with a prefix (staff hours)", () => {
    expect(
      parseWeeklyHoursForm(
        form({ s_day_0_enabled: "on", s_day_0_start: "10:00", s_day_0_end: "12:00" }),
        "s_",
      ),
    ).toEqual({ ranges: [{ dayOfWeek: 0, startTime: "10:00", endTime: "12:00" }] });
  });
});

describe("weeklyHoursFormValues", () => {
  it("turns two ranges on a day back into a day with a break", () => {
    const values = weeklyHoursFormValues([
      { dayOfWeek: 3, startTime: "14:00", endTime: "18:00" },
      { dayOfWeek: 3, startTime: "09:00", endTime: "13:00" },
    ]);
    expect(values[3]).toEqual({
      open: true,
      start: "09:00",
      end: "18:00",
      breakStart: "13:00",
      breakEnd: "14:00",
    });
    expect(values[1].open).toBe(false);
  });
});
