import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db";
import { shops } from "@/db/schema";
import { embedFrameAncestors } from "@/lib/embed";

// Only the embed may be framed by other sites, and only by the sites its shop
// allows. Every other page refuses framing via next.config.ts headers.
export async function proxy(request: NextRequest) {
  const response = NextResponse.next();
  const segment = request.nextUrl.pathname.split("/")[2] ?? "";

  let policy = "frame-ancestors 'self'";
  try {
    const slug = decodeURIComponent(segment);
    if (slug) {
      const [shop] = await db
        .select({ embedDomains: shops.embedDomains })
        .from(shops)
        .where(eq(shops.slug, slug))
        .limit(1);
      if (shop) policy = embedFrameAncestors(shop.embedDomains);
    }
  } catch (error) {
    // Fail closed: if we can't read the allowlist, only allow our own pages.
    console.error("[proxy] could not load embed domains", error);
  }

  response.headers.set("Content-Security-Policy", policy);
  return response;
}

export const config = {
  matcher: "/embed/:slug*",
};
