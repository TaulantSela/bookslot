import { describe, expect, it } from "vitest";
import {
  dayOfWeek,
  isValidDateString,
  isValidTimeString,
  nextDateString,
  zonedDateTime,
  zonedDayRange,
} from "./slots-internal";
import { acrossServerTimezones, restoreServerTimezone } from "./test-utils";

restoreServerTimezone();

const HOUR = 60 * 60 * 1000;

describe("isValidDateString", () => {
  it.each(["2026-11-16", "2028-02-29", "2026-12-31", "2027-01-01"])(
    "accepts %s",
    (value) => expect(isValidDateString(value)).toBe(true),
  );

  it.each([
    "2026-02-29", // not a leap year
    "2026-02-30",
    "2026-04-31",
    "2026-13-01",
    "2026-00-10",
    "2026-11-00",
    "2026-1-5",
    "16-11-2026",
    "2026-11-16T10:00",
    "",
    "abc",
  ])("rejects %s", (value) => expect(isValidDateString(value)).toBe(false));
});

describe("isValidTimeString", () => {
  it.each(["00:00", "09:30", "12:00", "23:59"])("accepts %s", (value) =>
    expect(isValidTimeString(value)).toBe(true),
  );

  it.each(["24:00", "9:30", "12:60", "12:5", "1230", "", "noon"])(
    "rejects %s",
    (value) => expect(isValidTimeString(value)).toBe(false),
  );
});

describe("dayOfWeek", () => {
  it.each([
    ["2026-11-15", 0],
    ["2026-11-16", 1],
    ["2026-11-21", 6],
    ["2028-02-29", 2],
  ])("%s is day %i", (date, expected) => {
    expect(dayOfWeek(date as string)).toBe(expected);
  });

  it("does not depend on the server timezone", () => {
    const results = acrossServerTimezones(() => dayOfWeek("2026-11-16"));
    expect(new Set(results)).toEqual(new Set([1]));
  });
});

describe("nextDateString", () => {
  it.each([
    ["2026-11-16", "2026-11-17"],
    ["2026-11-30", "2026-12-01"],
    ["2026-12-31", "2027-01-01"],
    ["2028-02-28", "2028-02-29"],
    ["2028-02-29", "2028-03-01"],
    ["2027-02-28", "2027-03-01"],
  ])("%s -> %s", (date, expected) => {
    expect(nextDateString(date)).toBe(expected);
  });
});

describe("zonedDateTime", () => {
  it.each([
    ["Europe/Skopje", "2026-11-16", "09:00", "2026-11-16T08:00:00.000Z"], // CET, UTC+1
    ["Europe/Skopje", "2026-07-15", "09:00", "2026-07-15T07:00:00.000Z"], // CEST, UTC+2
    ["America/New_York", "2026-11-16", "09:00", "2026-11-16T14:00:00.000Z"],
    ["Asia/Tokyo", "2026-11-16", "09:00", "2026-11-16T00:00:00.000Z"],
    ["Europe/Skopje", "2026-11-16", "00:00", "2026-11-15T23:00:00.000Z"],
  ])("%s %s %s -> %s", (tz, date, time, expected) => {
    expect(zonedDateTime(date, time, tz).toISOString()).toBe(expected);
  });

  it("does not depend on the server timezone", () => {
    const results = acrossServerTimezones(() =>
      zonedDateTime("2026-11-16", "09:00", "America/New_York").toISOString(),
    );
    expect(new Set(results)).toEqual(new Set(["2026-11-16T14:00:00.000Z"]));
  });
});

describe("zonedDayRange", () => {
  it("covers 24 hours on a normal day", () => {
    const { start, end } = zonedDayRange("2026-11-16", "Europe/Skopje");
    expect(start.toISOString()).toBe("2026-11-15T23:00:00.000Z");
    expect(end.getTime() - start.getTime()).toBe(24 * HOUR);
  });

  it("covers 23 hours on the spring-forward day", () => {
    const { start, end } = zonedDayRange("2027-03-28", "Europe/Skopje");
    expect(end.getTime() - start.getTime()).toBe(23 * HOUR);
  });

  it("covers 25 hours on the fall-back day", () => {
    const { start, end } = zonedDayRange("2026-10-25", "Europe/Skopje");
    expect(end.getTime() - start.getTime()).toBe(25 * HOUR);
  });
});
