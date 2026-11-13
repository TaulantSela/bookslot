import { mkdtempSync, rmSync } from "node:fs";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// Drives the /api/v1 route handlers directly against a throwaway SQLite
// file, with a local HTTP server standing in for a shop's webhook receiver.

let dir: string;
let server: Server;
let received: { headers: Record<string, string | string[] | undefined>; body: string }[] = [];
let respondWith = 200;

let db: typeof import("@/db").db;
let schema: typeof import("@/db/schema");
let webhooks: typeof import("./webhooks");
let routes: {
  shop: typeof import("@/app/api/v1/shop/route");
  availability: typeof import("@/app/api/v1/availability/route");
  appointments: typeof import("@/app/api/v1/appointments/route");
  appointment: typeof import("@/app/api/v1/appointments/[id]/route");
};

const TZ = "Europe/Skopje";
const MONDAY = "2030-04-01";
let proKey: string;
let freeKey: string;
const SECRET = "whsec_api_test";

const noParams = { params: Promise.resolve({}) } as never;
const idParams = (id: string) => ({ params: Promise.resolve({ id }) });

function request(urlPath: string, key: string | null, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  if (key) headers.set("authorization", `Bearer ${key}`);
  if (init.body) headers.set("content-type", "application/json");
  return new Request(`http://localhost${urlPath}`, { ...init, headers });
}

beforeAll(async () => {
  dir = mkdtempSync(path.join(tmpdir(), "bookslot-api-"));
  process.env.DATABASE_URL = `file:${path.join(dir, "test.db")}`;
  process.env.DATABASE_AUTH_TOKEN = "";

  server = createServer((req, res) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      received.push({ headers: req.headers, body });
      res.statusCode = respondWith;
      res.end("ok");
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = (server.address() as AddressInfo).port;

  ({ db } = await import("@/db"));
  schema = await import("@/db/schema");
  webhooks = await import("./webhooks");
  const { migrate } = await import("drizzle-orm/libsql/migrator");
  await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  routes = {
    shop: await import("@/app/api/v1/shop/route"),
    availability: await import("@/app/api/v1/availability/route"),
    appointments: await import("@/app/api/v1/appointments/route"),
    appointment: await import("@/app/api/v1/appointments/[id]/route"),
  };
  const { generateApiKey } = await import("./api-keys");

  const now = new Date();
  await db.insert(schema.users).values({ id: "usr_api", email: "api@example.com", passwordHash: "x", name: "Owner", createdAt: now });
  for (const [id, plan] of [["shop_api_pro", "pro"], ["shop_api_free", "free"]] as const) {
    await db.insert(schema.shops).values({
      id,
      userId: "usr_api",
      slug: id,
      name: id,
      timezone: TZ,
      plan,
      maxAdvanceDays: 36_500,
      createdAt: now,
    });
    const key = generateApiKey();
    await db.insert(schema.apiKeys).values({ id: `key_${id}`, shopId: id, name: "test", prefix: key.prefix, hash: key.hash, createdAt: now });
    if (plan === "pro") proKey = key.key;
    else freeKey = key.key;
  }
  await db.insert(schema.services).values({ id: "svc_api", shopId: "shop_api_pro", name: "Check-up", durationMinutes: 30 });
  await db.insert(schema.workingHours).values({ id: "wh_api", shopId: "shop_api_pro", dayOfWeek: 1, startTime: "09:00", endTime: "11:00" });
  await db.insert(schema.webhookEndpoints).values({
    id: "whe_api",
    shopId: "shop_api_pro",
    url: `http://127.0.0.1:${port}/hook`,
    secret: SECRET,
    events: ["appointment.created", "appointment.cancelled"],
    createdAt: now,
  });
});

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
  rmSync(dir, { recursive: true, force: true });
});

describe("authentication", () => {
  it("rejects missing, unknown and revoked keys, and keys of Free shops", async () => {
    expect((await routes.shop.GET(request("/api/v1/shop", null), noParams)).status).toBe(401);
    expect((await routes.shop.GET(request("/api/v1/shop", "bsk_" + "x".repeat(40)), noParams)).status).toBe(401);
    const free = await routes.shop.GET(request("/api/v1/shop", freeKey), noParams);
    expect(free.status).toBe(403);
    expect(await free.json()).toEqual({
      error: { code: "plan_required", message: "The API is part of the Pro plan." },
    });
  });

  it("returns the key's shop", async () => {
    const response = await routes.shop.GET(request("/api/v1/shop", proKey), noParams);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ id: "shop_api_pro", timezone: TZ, currency: "MKD" });
  });
});

describe("booking through the API", () => {
  let appointmentId: string;

  it("lists availability over several days", async () => {
    const response = await routes.availability.GET(
      request(`/api/v1/availability?service=svc_api&date=${MONDAY}&days=2`, proKey),
      noParams,
    );
    const body = await response.json();
    expect(body.days.map((d: { date: string }) => d.date)).toEqual([MONDAY, "2030-04-02"]);
    expect(body.days[0].slots[0]).toMatchObject({ time: "09:00", staffIds: [] });
    expect(body.days[1].slots).toEqual([]);
  });

  it("creates an appointment and sends a signed appointment.created webhook", async () => {
    received = [];
    const response = await routes.appointments.POST(
      request("/api/v1/appointments", proKey, {
        method: "POST",
        body: JSON.stringify({
          service: "svc_api",
          date: MONDAY,
          time: "09:00",
          customer: { name: "Arta Selmani", phone: "070123456", email: "arta@example.com" },
        }),
      }),
      noParams,
    );
    expect(response.status).toBe(201);
    const appointment = await response.json();
    appointmentId = appointment.id;
    expect(appointment).toMatchObject({
      status: "confirmed",
      date: MONDAY,
      time: "09:00",
      service: { id: "svc_api", name: "Check-up" },
      staff: null,
      customer: { name: "Arta Selmani", phone: "070123456", email: "arta@example.com" },
    });

    expect(received).toHaveLength(1);
    const [hook] = received;
    expect(hook.headers["bookslot-event"]).toBe("appointment.created");
    expect(webhooks.verifySignature(SECRET, hook.body, String(hook.headers["bookslot-signature"]))).toBe(true);
    expect(JSON.parse(hook.body)).toMatchObject({
      type: "appointment.created",
      data: { appointment: { id: appointmentId, status: "confirmed" } },
    });
  });

  it("refuses a taken time with 409 and invalid details with 422", async () => {
    const post = (body: object) =>
      routes.appointments.POST(request("/api/v1/appointments", proKey, { method: "POST", body: JSON.stringify(body) }), noParams);
    const taken = await post({ service: "svc_api", date: MONDAY, time: "09:00", customer: { name: "Ben", phone: "070999888" } });
    expect(taken.status).toBe(409);
    expect((await taken.json()).error.code).toBe("slot_taken");

    const noName = await post({ service: "svc_api", date: MONDAY, time: "10:00", customer: { phone: "070999888" } });
    expect(noName.status).toBe(422);
    expect((await noName.json()).error.code).toBe("invalid_customer");

    const offGrid = await post({ service: "svc_api", date: MONDAY, time: "09:07", customer: { name: "Ben", phone: "070999888" } });
    expect(offGrid.status).toBe(409);
  });

  it("pages through appointments", async () => {
    for (const time of ["09:30", "10:00"]) {
      await routes.appointments.POST(
        request("/api/v1/appointments", proKey, {
          method: "POST",
          body: JSON.stringify({ service: "svc_api", date: MONDAY, time, customer: { name: "Client", phone: "070000111" } }),
        }),
        noParams,
      );
    }
    const first = await (
      await routes.appointments.GET(request("/api/v1/appointments?from=2030-01-01&limit=2", proKey), noParams)
    ).json();
    expect(first.data.map((a: { time: string }) => a.time)).toEqual(["09:00", "09:30"]);
    expect(first.nextCursor).toBeTruthy();
    const second = await (
      await routes.appointments.GET(
        request(`/api/v1/appointments?from=2030-01-01&limit=2&cursor=${first.nextCursor}`, proKey),
        noParams,
      )
    ).json();
    expect(second.data.map((a: { time: string }) => a.time)).toEqual(["10:00"]);
    expect(second.nextCursor).toBeNull();
  });

  it("cancels, sends appointment.cancelled, and won't revive it", async () => {
    received = [];
    const patch = (status: string) =>
      routes.appointment.PATCH(
        request(`/api/v1/appointments/${appointmentId}`, proKey, { method: "PATCH", body: JSON.stringify({ status }) }),
        idParams(appointmentId),
      );
    const cancelled = await patch("cancelled");
    expect(cancelled.status).toBe(200);
    expect((await cancelled.json()).status).toBe("cancelled");
    expect(received.map((r) => r.headers["bookslot-event"])).toEqual(["appointment.cancelled"]);

    expect((await patch("confirmed")).status).toBe(409);
  });

  it("hides other shops' appointments", async () => {
    const response = await routes.appointment.GET(
      request(`/api/v1/appointments/${appointmentId}`, freeKey),
      idParams(appointmentId),
    );
    expect(response.status).toBe(403);
    const missing = await routes.appointment.GET(request("/api/v1/appointments/appt_nope", proKey), idParams("appt_nope"));
    expect(missing.status).toBe(404);
  });
});

describe("webhook retries", () => {
  it("schedules a retry after a failure and marks it delivered once it succeeds", async () => {
    respondWith = 500;
    const ids = await webhooks.recordEvent({ id: "shop_api_pro", plan: "pro" }, "ping", { hello: true });
    await webhooks.sendDeliveries(ids);

    const { eq } = await import("drizzle-orm");
    const [failed] = await db.select().from(schema.webhookDeliveries).where(eq(schema.webhookDeliveries.id, ids[0]));
    expect(failed).toMatchObject({ status: "pending", attempts: 1, lastStatusCode: 500, lastError: "HTTP 500" });
    expect(failed.nextAttemptAt!.getTime()).toBeGreaterThan(Date.now());

    // Make it due now, then let the retry succeed.
    respondWith = 200;
    await db.update(schema.webhookDeliveries).set({ nextAttemptAt: new Date(0) }).where(eq(schema.webhookDeliveries.id, ids[0]));
    expect(await webhooks.retryDueDeliveries({ shopId: "shop_api_pro" })).toBe(1);
    const [done] = await db.select().from(schema.webhookDeliveries).where(eq(schema.webhookDeliveries.id, ids[0]));
    expect(done).toMatchObject({ status: "succeeded", attempts: 2, lastStatusCode: 200, nextAttemptAt: null });
  });

  it("records nothing for shops without the API", async () => {
    expect(await webhooks.recordEvent({ id: "shop_api_free", plan: "free" }, "ping", {})).toEqual([]);
  });
});
