import { notFound } from "next/navigation";
import { BookingWidget } from "@/components/booking-widget";
import { getPublicBookingContext } from "@/lib/booking";
import { buildBadgeUrl } from "@/lib/email";
import { buildThemeCss } from "@/lib/theme";

export default async function BookPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const context = await getPublicBookingContext(slug);
  if (!context) notFound();

  const { shop, services, entitlements, bookingOpen, closedMessage, lastBookableDate } = context;
  const css = buildThemeCss({ shopPrimary: shop.primaryColor, selector: ".bookslot" });

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-8">
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <BookingWidget
        shopSlug={shop.slug}
        shopName={shop.name}
        timezone={shop.timezone}
        services={services}
        lastBookableDate={lastBookableDate}
        bookingOpen={bookingOpen}
        closedMessage={closedMessage}
        badgeHref={entitlements.showBadge ? buildBadgeUrl(shop.slug) : undefined}
      />
    </main>
  );
}
