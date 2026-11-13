import type { Shop } from "@/db/schema";
import { authenticateApiKey } from "@/lib/api-keys";

// Shared plumbing for /api/v1 routes: key auth, JSON responses and errors
// in one shape: { "error": { "code": "…", "message": "…" } }.

const HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
};

export function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: HEADERS });
}

export function apiError(status: number, code: string, message: string) {
  return json({ error: { code, message } }, status);
}

type Context<P> = { params: Promise<P> };

/** Wraps a route handler with API-key auth and a catch-all error response. */
export function withApiKey<P = Record<string, never>>(
  handler: (args: { request: Request; shop: Shop; params: P }) => Promise<Response>,
) {
  return async (request: Request, context: Context<P>) => {
    try {
      const auth = await authenticateApiKey(request);
      if (!auth.ok) return apiError(auth.status, auth.code, auth.message);
      const params = context?.params ? await context.params : ({} as P);
      return await handler({ request, shop: auth.shop, params });
    } catch (error) {
      console.error("[api] unhandled error", error);
      return apiError(500, "server_error", "Something went wrong on our side.");
    }
  };
}

const MAX_BODY_BYTES = 64 * 1024;

/** Parses a JSON object body, or returns an error response. */
export async function readJsonBody(request: Request): Promise<Record<string, unknown> | Response> {
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_BODY_BYTES) return apiError(413, "body_too_large", "Request body is too large.");
  let text: string;
  try {
    text = await request.text();
  } catch {
    return apiError(400, "invalid_json", "Could not read the request body.");
  }
  if (text.length > MAX_BODY_BYTES) return apiError(413, "body_too_large", "Request body is too large.");
  try {
    const body = JSON.parse(text);
    if (body && typeof body === "object" && !Array.isArray(body)) return body;
  } catch {
    // fall through
  }
  return apiError(400, "invalid_json", "Send a JSON object with Content-Type: application/json.");
}
