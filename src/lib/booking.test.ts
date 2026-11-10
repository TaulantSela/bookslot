import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { newId } from "./id";
import { zonedDateTime } from "./slots-internal";

// Runs against a throwaway SQLite file so the real SQL (including the atomic
// "insert only if free" statement) is exercised. Modules that open the
// database are imported only after DATABASE_URL points at that file.
let dir: string;
let booking: typeof import("./booking");
let db: typeof import("@/db").db;
let schema: typeof import("@/db/schema");

const TZ = "Europe/Skopje";
// Far enough in the future that "only future slots" never interferes.
const MONDAY = "2030-01-07";
const TUESDAY = "2030-01-08";

const shop = { id: "shop_test", timezone: TZ };
const nightShop = { id: "shop_night", timezone: TZ };
const service = { id: "svc_test", durationMinutes: 30 };

function at(date: string, time: string) {
  return zonedDateTime(date, time, TZ);
}

function book(
  shopId: string,
  startsAt: Date,
  minutes = 30,
  overrides: Partial<Parameters<typeof booking.insertAppointmentIfFree>[0]> = {},
) {
  return booking.insertAppointmentIfFree({
    id: newId("appt"),
    shopId,
    serviceId: service.id,
    customerName: "Test Customer",
    customerPhone: "070000000",
    customerEmail: null,
    startsAt,
    endsAt: new Date(startsAt.getTime() + minutes * 60_000),
    notes: null,
    cancelToken: newId("cancel"),
    ...overrides,
  });
}

beforeAll(async () => {
  dir = mkdtempSync(path.join(tmpdir(), "bookslot-test-"));
  process.env.DATABASE_URL = `file:${path.join(dir, "test.db")}`;
  process.env.DATABASE_AUTH_TOKEN = "";

  ({ db } = await import("@/db"));
  schema = await import("@/db/schema");
  booking = await import("./booking");
  const { migrate } = await import("drizzle-orm/libsql/migrator");
  await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });

  const now = new Date();
  await db.insert(schema.users).values({
    id: "usr_test",
    email: "owner@example.com",
    passwordHash: "x",
    name: "Owner",
    createdAt: now,
  });
  for (const s of [shop, nightShop]) {
    await db.insert(schema.shops).values({
      id: s.id,
      userId: "usr_test",
      slug: s.id,
      name: s.id,
      timezone: TZ,
      createdAt: now,
    });
    await db.insert(schema.services).values({
      id: s === shop ? service.id : "svc_night",
      shopId: s.id,
      name: "Haircut",
      durationMinutes: 30,
    });
  }
  // Day shop: Monday–Friday 09:00–12:00. Night shop: Tuesday 00:00–02:00.
  await db.insert(schema.workingHours).values([
    ...[1, 2, 3, 4, 5].map((day) => ({
      id: `wh_${day}`,
      shopId: shop.id,
      dayOfWeek: day,
      startTime: "09:00",
      endTime: "12:00",
    })),
    {
      id: "wh_night",
      shopId: nightShop.id,
      dayOfWeek: 2,
      startTime: "00:00",
      endTime: "02:00",
    },
  ]);
});

afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("insertAppointmentIfFree", () => {
  it("lets exactly one of many concurrent requests take a slot", async () => {
    const results = await Promise.all(
      Array.from({ length: 8 }, () => book(shop.id, at(MONDAY, "10:00"))),
    );
    expect(results.filter(Boolean)).toHaveLength(1);
  });

  it("rejects a partially overlapping booking", async () => {
    expect(await book(shop.id, at(MONDAY, "10:15"))).toBe(false);
    expect(await book(shop.id, at(MONDAY, "09:45"))).toBe(false);
  });

  it("accepts back-to-back bookings", async () => {
    expect(await book(shop.id, at(MONDAY, "10:30"))).toBe(true);
    expect(await book(shop.id, at(MONDAY, "09:30"))).toBe(true);
  });

  it("does not let other shops' appointments block a slot", async () => {
    expect(await book(nightShop.id, at(MONDAY, "10:00"))).toBe(true);
  });

  it("frees the slot again once the appointment is cancelled", async () => {
    const token = newId("cancel");
    expect(await book(shop.id, at(MONDAY, "11:00"), 30, { cancelToken: token })).toBe(true);
    expect(await booking.cancelAppointmentByToken(token)).toBe(true);
    expect(await book(shop.id, at(MONDAY, "11:00"))).toBe(true);
  });
});

describe("getSlotsForDay", () => {
  it("leaves out booked times", async () => {
    await book(shop.id, at(TUESDAY, "09:00"));
    const slots = await booking.getSlotsForDay({ shop, service, date: TUESDAY });
    const labels = slots.map((s) => s.label);
    expect(labels).not.toContain("09:00");
    expect(labels).not.toContain("09:15");
    expect(labels[0]).toBe("09:30");
  });

  it("counts appointments that started the previous day", async () => {
    // Monday 23:30 → Tuesday 00:30 blocks the start of Tuesday's night shift.
    expect(await book(nightShop.id, at(MONDAY, "23:30"), 60)).toBe(true);
    const slots = await booking.getSlotsForDay({
      shop: nightShop,
      service,
      date: TUESDAY,
    });
    expect(slots[0]?.label).toBe("00:30");
  });
});

describe("cancelAppointmentByToken", () => {
  async function appointmentWith(startsAt: Date, status = "confirmed") {
    const token = newId("cancel");
    expect(await book(shop.id, startsAt, 30, { cancelToken: token })).toBe(true);
    if (status !== "confirmed") {
      await db
        .update(schema.appointments)
        .set({ status })
        .where(eq(schema.appointments.cancelToken, token));
    }
    return token;
  }

  async function statusOf(token: string) {
    const row = await booking.getAppointmentByCancelToken(token);
    return row?.appointment.status;
  }

  it("cancels an upcoming confirmed appointment once", async () => {
    const token = await appointmentWith(at("2030-01-09", "09:00"));
    expect(await booking.cancelAppointmentByToken(token)).toBe(true);
    expect(await statusOf(token)).toBe("cancelled");
    expect(await booking.cancelAppointmentByToken(token)).toBe(false);
  });

  it("refuses appointments that already started", async () => {
    const token = await appointmentWith(new Date("2020-01-06T09:00:00Z"));
    expect(await booking.cancelAppointmentByToken(token)).toBe(false);
    expect(await statusOf(token)).toBe("confirmed");
  });

  it("refuses completed appointments", async () => {
    const token = await appointmentWith(at("2030-01-10", "09:00"), "completed");
    expect(await booking.cancelAppointmentByToken(token)).toBe(false);
    expect(await statusOf(token)).toBe("completed");
  });

  it("returns false for an unknown token", async () => {
    expect(await booking.cancelAppointmentByToken("cancel_nope")).toBe(false);
    expect(await booking.getAppointmentByCancelToken("cancel_nope")).toBeNull();
  });
});

describe("canCustomerCancel", () => {
  const now = new Date("2030-01-07T08:00:00Z");

  it("allows confirmed appointments in the future", () => {
    expect(
      booking.canCustomerCancel(
        { status: "confirmed", startsAt: new Date("2030-01-07T09:00:00Z") },
        now,
      ),
    ).toBe(true);
  });

  it.each([
    ["started", "confirmed", "2030-01-07T08:00:00Z"],
    ["past", "confirmed", "2030-01-06T09:00:00Z"],
    ["cancelled", "cancelled", "2030-01-08T09:00:00Z"],
    ["completed", "completed", "2030-01-08T09:00:00Z"],
  ])("refuses %s appointments", (_label, status, startsAt) => {
    expect(
      booking.canCustomerCancel({ status, startsAt: new Date(startsAt) }, now),
    ).toBe(false);
  });
});
