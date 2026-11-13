"use server";

import { and, count, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { apiKeys, webhookEndpoints } from "@/db/schema";
import { generateApiKey } from "@/lib/api-keys";
import { refreshDashboard, requireOwnerShop, type ActionState } from "@/lib/dashboard";
import { newId } from "@/lib/id";
import { entitlementsFor } from "@/lib/plans";
import {
  MAX_ENDPOINTS,
  WEBHOOK_EVENTS,
  generateWebhookSecret,
  recordEvent,
  requeueDelivery,
  sendDeliveries,
  validateWebhookUrl,
} from "@/lib/webhooks";

const MAX_KEYS = 10;
const PRO_ONLY = "The API and webhooks are part of the Pro plan.";

export type ApiKeyState = ActionState & {
  /** The new key, shown once. */
  key?: string;
};

async function requireApiShop() {
  const shop = await requireOwnerShop();
  return entitlementsFor(shop.plan).api ? shop : null;
}

export async function createApiKeyAction(
  _prev: ApiKeyState,
  formData: FormData,
): Promise<ApiKeyState> {
  const shop = await requireApiShop();
  if (!shop) return { error: PRO_ONLY };

  const name = String(formData.get("name") ?? "").trim().slice(0, 60) || "API key";
  const [{ value: active }] = await db
    .select({ value: count() })
    .from(apiKeys)
    .where(and(eq(apiKeys.shopId, shop.id), isNull(apiKeys.revokedAt)));
  if (active >= MAX_KEYS) return { error: `You can have up to ${MAX_KEYS} keys. Revoke one first.` };

  const { key, prefix, hash } = generateApiKey();
  await db.insert(apiKeys).values({
    id: newId("key"),
    shopId: shop.id,
    name,
    prefix,
    hash,
    createdAt: new Date(),
  });

  refreshDashboard();
  return { success: `Created “${name}”. Copy it now: it won't be shown again.`, key };
}

export async function revokeApiKeyAction(keyId: string) {
  const shop = await requireOwnerShop();
  await db
    .update(apiKeys)
    .set({ revokedAt: new Date() })
    .where(and(eq(apiKeys.id, keyId), eq(apiKeys.shopId, shop.id), isNull(apiKeys.revokedAt)));
  refreshDashboard();
}

function readEvents(formData: FormData) {
  const chosen = formData.getAll("events").map(String);
  return WEBHOOK_EVENTS.filter((event) => chosen.includes(event));
}

export async function addWebhookAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const shop = await requireApiShop();
  if (!shop) return { error: PRO_ONLY };

  const checked = validateWebhookUrl(String(formData.get("url") ?? ""));
  if ("error" in checked) return { error: checked.error };
  const events = readEvents(formData);
  if (events.length === 0) return { error: "Pick at least one event." };

  const [{ value: existing }] = await db
    .select({ value: count() })
    .from(webhookEndpoints)
    .where(eq(webhookEndpoints.shopId, shop.id));
  if (existing >= MAX_ENDPOINTS) return { error: `You can add up to ${MAX_ENDPOINTS} webhook URLs.` };

  await db.insert(webhookEndpoints).values({
    id: newId("whe"),
    shopId: shop.id,
    url: checked.url,
    secret: generateWebhookSecret(),
    events,
    createdAt: new Date(),
  });

  refreshDashboard();
  return { success: "Webhook added. Use “Send test event” to check it." };
}

export async function updateWebhookEventsAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const shop = await requireApiShop();
  if (!shop) return { error: PRO_ONLY };
  const events = readEvents(formData);
  if (events.length === 0) return { error: "Pick at least one event." };

  await db
    .update(webhookEndpoints)
    .set({ events })
    .where(and(eq(webhookEndpoints.id, String(formData.get("endpointId"))), eq(webhookEndpoints.shopId, shop.id)));
  refreshDashboard();
  return { success: "Saved." };
}

export async function toggleWebhookAction(endpointId: string, active: boolean) {
  const shop = await requireOwnerShop();
  await db
    .update(webhookEndpoints)
    .set({ active })
    .where(and(eq(webhookEndpoints.id, endpointId), eq(webhookEndpoints.shopId, shop.id)));
  refreshDashboard();
}

export async function deleteWebhookAction(endpointId: string) {
  const shop = await requireOwnerShop();
  await db
    .delete(webhookEndpoints)
    .where(and(eq(webhookEndpoints.id, endpointId), eq(webhookEndpoints.shopId, shop.id)));
  refreshDashboard();
}

/** New signing secret; the old one stops working at once. */
export async function rotateWebhookSecretAction(endpointId: string) {
  const shop = await requireOwnerShop();
  await db
    .update(webhookEndpoints)
    .set({ secret: generateWebhookSecret() })
    .where(and(eq(webhookEndpoints.id, endpointId), eq(webhookEndpoints.shopId, shop.id)));
  refreshDashboard();
}

export async function sendTestWebhookAction(endpointId: string) {
  const shop = await requireApiShop();
  if (!shop) return;
  const ids = await recordEvent(shop, "ping", { message: "Test event from BookSlot" }, { endpointId });
  // Sent before the dashboard refreshes, so the result shows straight away.
  await sendDeliveries(ids);
  refreshDashboard();
}

export async function resendDeliveryAction(deliveryId: string) {
  const shop = await requireApiShop();
  if (!shop) return;
  await sendDeliveries(await requeueDelivery(shop.id, deliveryId));
  refreshDashboard();
}
