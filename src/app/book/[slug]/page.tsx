import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { services, shops } from "@/db/schema";
import { BookingWidget } from "@/components/booking-widget";

export default async function BookPage({
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

  if (activeServices.length === 0) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
        <p className="text-zinc-600">Online booking is not available yet.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-4">
      <BookingWidget
        shopSlug={shop.slug}
        shopName={shop.name}
        primaryColor={shop.primaryColor}
        services={activeServices}
      />
    </main>
  );
}
