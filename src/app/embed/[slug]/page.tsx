import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { services, shops } from "@/db/schema";
import { BookingWidget } from "@/components/booking-widget";

export default async function EmbedPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const [shop] = await db
    .select()
    .from(shops)
    .where(eq(shops.slug, slug))
    .limit(1);

  if (!shop) notFound();

  const activeServices = await db
    .select()
    .from(services)
    .where(and(eq(services.shopId, shop.id), eq(services.active, true)))
    .orderBy(services.sortOrder);

  return (
    <main className="min-h-screen bg-white">
      <BookingWidget
        shopSlug={shop.slug}
        shopName={shop.name}
        primaryColor={shop.primaryColor}
        timezone={shop.timezone}
        services={activeServices}
        embed
      />
    </main>
  );
}
