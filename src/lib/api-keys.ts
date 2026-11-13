import { createHash, randomBytes } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { apiKeys, shops, type Shop } from "@/db/schema";
import { entitlementsFor } from "@/lib/plans";

// Secret API keys look like "bsk_" + 40 base62-ish characters. Only their
// SHA-256 is stored: they're long and random, so a plain hash is enough
// (no slow hash needed, unlike passwords).

const KEY_PREFIX = "bsk_";
const KEY_PATTERN = /^bsk_[A-Za-z0-9_-]{40}$/;

export function generateApiKey() {
  const key = KEY_PREFIX + randomBytes(30).toString("base64url");
  return { key, prefix: key.slice(0, KEY_PREFIX.length + 6), hash: hashApiKey(key) };
}

export function hashApiKey(key: string) {
  return createHash("sha256").update(key).digest("hex");
}

export function looksLikeApiKey(value: string) {
  return KEY_PATTERN.test(value);
}

/** "Authorization: Bearer bsk_…" → the key, or null. */
export function bearerToken(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(\S+)$/i.exec(header.trim());
  return match ? match[1] : null;
}

export type ApiAuth =
  | { ok: true; shop: Shop; keyId: string }
  | { ok: false; status: 401 | 403; code: string; message: string };

/** Finds the shop a request's API key belongs to. */
export async function authenticateApiKey(request: Request): Promise<ApiAuth> {
  const key = bearerToken(request);
  if (!key || !looksLikeApiKey(key)) {
    return {
      ok: false,
      status: 401,
      code: "unauthorized",
      message: "Send your API key as: Authorization: Bearer bsk_…",
    };
  }

  const [row] = await db
    .select({ keyId: apiKeys.id, shop: shops })
    .from(apiKeys)
    .innerJoin(shops, eq(apiKeys.shopId, shops.id))
    .where(and(eq(apiKeys.hash, hashApiKey(key)), isNull(apiKeys.revokedAt)))
    .limit(1);

  if (!row) {
    return { ok: false, status: 401, code: "unauthorized", message: "Unknown or revoked API key." };
  }
  if (!entitlementsFor(row.shop.plan).api) {
    return {
      ok: false,
      status: 403,
      code: "plan_required",
      message: "The API is part of the Pro plan.",
    };
  }

  await db.update(apiKeys).set({ lastUsedAt: new Date() }).where(eq(apiKeys.id, row.keyId));
  return { ok: true, shop: row.shop, keyId: row.keyId };
}
