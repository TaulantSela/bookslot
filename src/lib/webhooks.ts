import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { and, asc, eq, inArray, lte } from "drizzle-orm";
import { db } from "@/db";
import { webhookDeliveries, webhookEndpoints, type WebhookEndpoint } from "@/db/schema";
import { loadApiAppointment } from "@/lib/api-format";
import { newId } from "@/lib/id";
import { entitlementsFor } from "@/lib/plans";

// Webhooks: every appointment event is stored as one delivery per endpoint,
// sent right away (after the response, via `after`), and retried with
// backoff by later events and the daily cron. Bodies are signed like
// Stripe's: BookSlot-Signature: t=<unix seconds>,v1=<hex HMAC-SHA256 of "t.body">.

export const WEBHOOK_EVENTS = [
  "appointment.created",
  "appointment.cancelled",
  "appointment.completed",
] as const;
export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number] | "ping";

export const MAX_ENDPOINTS = 5;
/** Delay before each retry, after the first attempt fails. */
export const RETRY_DELAYS_MINUTES = [1, 5, 30, 120, 720, 1440];
export const MAX_ATTEMPTS = RETRY_DELAYS_MINUTES.length + 1;
const TIMEOUT_MS = 10_000;

export function generateWebhookSecret() {
  return "whsec_" + randomBytes(24).toString("base64url");
}

export function signPayload(secret: string, body: string, timestamp = Math.floor(Date.now() / 1000)) {
  const signature = createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
  return `t=${timestamp},v1=${signature}`;
}

/**
 * Checks a BookSlot-Signature header. What receivers should do; exported
 * for tests and the docs example. Rejects signatures older than `toleranceSeconds`.
 */
export function verifySignature(
  secret: string,
  body: string,
  header: string,
  { toleranceSeconds = 300, now = Date.now() } = {},
) {
  const parts = Object.fromEntries(
    header.split(",").map((part) => {
      const [k, ...v] = part.split("=");
      return [k.trim(), v.join("=")];
    }),
  );
  const timestamp = Number(parts.t);
  if (!Number.isFinite(timestamp) || !parts.v1) return false;
  if (Math.abs(now / 1000 - timestamp) > toleranceSeconds) return false;

  const expected = createHmac("sha256", secret).update(`${timestamp}.${body}`).digest();
  const given = Buffer.from(parts.v1, "hex");
  return given.length === expected.length && timingSafeEqual(given, expected);
}

// ---- Where webhooks may be sent --------------------------------------------

/** Loopback, private, link-local, CGNAT, multicast and other non-public addresses. */
export function isPrivateAddress(address: string) {
  const version = isIP(address);
  if (version === 4) {
    const [a, b] = address.split(".").map(Number);
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 198 && (b === 18 || b === 19)) ||
      a >= 224
    );
  }
  if (version === 6) {
    const lower = address.toLowerCase();
    const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(lower);
    if (mapped) return isPrivateAddress(mapped[1]);
    return (
      lower === "::" ||
      lower === "::1" ||
      lower.startsWith("fc") ||
      lower.startsWith("fd") ||
      lower.startsWith("fe8") ||
      lower.startsWith("fe9") ||
      lower.startsWith("fea") ||
      lower.startsWith("feb") ||
      lower.startsWith("ff")
    );
  }
  return false;
}

const allowLocalTargets = () => process.env.NODE_ENV !== "production";

/**
 * Checks a URL an owner typed for webhooks. Production only allows public
 * https URLs; local development also allows http://localhost for testing.
 */
export function validateWebhookUrl(
  value: string,
  { allowLocal = allowLocalTargets() } = {},
): { url: string } | { error: string } {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    return { error: "Enter a full URL, like https://example.com/webhooks/bookslot." };
  }
  if (url.username || url.password) return { error: "Leave credentials out of the URL." };

  const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  const local = host === "localhost" || host.endsWith(".localhost") || isPrivateAddress(host);
  if (local && !allowLocal) return { error: "Webhooks must go to a public address." };
  if (url.protocol !== "https:" && !(url.protocol === "http:" && local && allowLocal)) {
    return { error: "Webhook URLs must use https." };
  }
  if (value.length > 500) return { error: "That URL is too long." };
  url.hash = "";
  return { url: url.toString() };
}

/** Refuses to send to a host that resolves to a private address (DNS can change after saving). */
async function assertPublicTarget(url: string) {
  if (allowLocalTargets()) return;
  const host = new URL(url).hostname.replace(/^\[|\]$/g, "");
  const addresses = isIP(host) ? [{ address: host }] : await lookup(host, { all: true });
  if (addresses.length === 0 || addresses.some((a) => isPrivateAddress(a.address))) {
    throw new Error("Address resolves to a private network");
  }
}

// ---- Recording and sending ---------------------------------------------------

/**
 * Stores one delivery per active endpoint that wants this event. Returns
 * their ids for sendDeliveries. Does nothing on plans without webhooks.
 */
export async function recordEvent(
  shop: { id: string; plan: string },
  event: WebhookEvent,
  data: Record<string, unknown>,
  { endpointId }: { endpointId?: string } = {},
) {
  if (!entitlementsFor(shop.plan).api) return [];

  const endpoints = await db
    .select()
    .from(webhookEndpoints)
    .where(
      and(
        eq(webhookEndpoints.shopId, shop.id),
        eq(webhookEndpoints.active, true),
        endpointId ? eq(webhookEndpoints.id, endpointId) : undefined,
      ),
    );
  const targets = endpoints.filter((e) => event === "ping" || e.events.includes(event));
  if (targets.length === 0) return [];

  const eventId = newId("evt");
  const createdAt = new Date();
  const payload = JSON.stringify({ id: eventId, type: event, createdAt: createdAt.toISOString(), data });
  const rows = targets.map((endpoint) => ({
    id: newId("whd"),
    endpointId: endpoint.id,
    shopId: shop.id,
    eventId,
    event,
    payload,
    status: "pending",
    attempts: 0,
    nextAttemptAt: createdAt,
    createdAt,
  }));
  await db.insert(webhookDeliveries).values(rows);
  return rows.map((r) => r.id);
}

/** One POST of one delivery. Never throws; records the outcome. */
async function attempt(deliveryId: string, endpoint: WebhookEndpoint) {
  const [delivery] = await db.select().from(webhookDeliveries).where(eq(webhookDeliveries.id, deliveryId));
  if (!delivery || delivery.status !== "pending") return delivery?.status === "succeeded";

  const attempts = delivery.attempts + 1;
  let statusCode: number | null = null;
  let error: string | null = null;

  try {
    await assertPublicTarget(endpoint.url);
    const response = await fetch(endpoint.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "BookSlot-Webhooks/1",
        "BookSlot-Event": delivery.event,
        "BookSlot-Delivery": delivery.id,
        "BookSlot-Signature": signPayload(endpoint.secret, delivery.payload),
      },
      body: delivery.payload,
      redirect: "manual",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    statusCode = response.status;
    // Read (and drop) the body so the connection is released.
    await response.text().catch(() => "");
    if (response.status < 200 || response.status >= 300) error = `HTTP ${response.status}`;
  } catch (err) {
    error = err instanceof Error ? err.message.slice(0, 200) : "Request failed";
  }

  const succeeded = error === null;
  const delay = RETRY_DELAYS_MINUTES[attempts - 1];
  await db
    .update(webhookDeliveries)
    .set({
      attempts,
      lastStatusCode: statusCode,
      lastError: error,
      status: succeeded ? "succeeded" : attempts >= MAX_ATTEMPTS ? "failed" : "pending",
      nextAttemptAt: succeeded || delay === undefined ? null : new Date(Date.now() + delay * 60_000),
      deliveredAt: succeeded ? new Date() : null,
    })
    .where(eq(webhookDeliveries.id, delivery.id));
  return succeeded;
}

/** Sends the given deliveries now (one attempt each). */
export async function sendDeliveries(ids: string[]) {
  if (ids.length === 0) return;
  const rows = await db
    .select({ id: webhookDeliveries.id, endpoint: webhookEndpoints })
    .from(webhookDeliveries)
    .innerJoin(webhookEndpoints, eq(webhookDeliveries.endpointId, webhookEndpoints.id))
    .where(inArray(webhookDeliveries.id, ids));
  await Promise.all(rows.map((row) => attempt(row.id, row.endpoint)));
}

/** Retries deliveries whose next attempt is due, oldest first. Returns how many were tried. */
export async function retryDueDeliveries({ shopId, limit = 50 }: { shopId?: string; limit?: number } = {}) {
  const due = await db
    .select({ id: webhookDeliveries.id })
    .from(webhookDeliveries)
    .where(
      and(
        eq(webhookDeliveries.status, "pending"),
        lte(webhookDeliveries.nextAttemptAt, new Date()),
        shopId ? eq(webhookDeliveries.shopId, shopId) : undefined,
      ),
    )
    .orderBy(asc(webhookDeliveries.nextAttemptAt))
    .limit(limit);
  await sendDeliveries(due.map((d) => d.id));
  return due.length;
}

/** Puts a finished delivery back in the queue (dashboard "Resend"). */
export async function requeueDelivery(shopId: string, deliveryId: string) {
  await db
    .update(webhookDeliveries)
    .set({ status: "pending", attempts: 0, nextAttemptAt: new Date() })
    .where(and(eq(webhookDeliveries.id, deliveryId), eq(webhookDeliveries.shopId, shopId)));
  return [deliveryId];
}

/**
 * Runs `task` after the response is sent when inside a request (Next's
 * `after`), or right away otherwise (scripts, tests).
 */
export async function runAfterResponse(task: () => Promise<unknown>) {
  try {
    const { after } = await import("next/server");
    after(task);
  } catch {
    await task();
  }
}

/**
 * Records an appointment event and sends it after the response, along with
 * any of the shop's retries that are due.
 */
export async function emitAppointmentEvent(
  shop: { id: string; plan: string },
  event: (typeof WEBHOOK_EVENTS)[number],
  appointmentId: string,
) {
  try {
    if (!entitlementsFor(shop.plan).api) return;
    const appointment = await loadApiAppointment(shop.id, appointmentId);
    if (!appointment) return;
    const ids = await recordEvent(shop, event, { appointment });
    await runAfterResponse(async () => {
      await sendDeliveries(ids);
      await retryDueDeliveries({ shopId: shop.id, limit: 10 });
    });
  } catch (error) {
    // A webhook problem must never fail the booking itself.
    console.error("[webhooks] could not emit", event, error);
  }
}
