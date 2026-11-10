import { widgetScript } from "@/lib/widget-script";

// Served from the request's own origin, so preview deployments embed
// themselves rather than production.
export async function GET(request: Request) {
  const origin = new URL(request.url).origin;

  return new Response(widgetScript(origin), {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
