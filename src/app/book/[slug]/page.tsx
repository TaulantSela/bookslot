import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { BookingWidget } from "@/components/booking-widget";
import { getPublicBookingContext } from "@/lib/booking";
import { buildBadgeUrl } from "@/lib/email";
import { buildThemeCss } from "@/lib/theme";

// Shared by generateMetadata and the page, so the shop is loaded once per request.
const getContext = cache(getPublicBookingContext);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const context = await getContext(slug);
  if (!context) return { title: "Booking page not found" };
  const { shop } = context;
  return {
    // The shop's page, so its name leads and no "· BookSlot" suffix is added.
    title: { absolute: `${shop.name} · Book online` },
    description: shop.description ?? `Book an appointment with ${shop.name} online.`,
  };
}

export default async function BookPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const context = await getContext(slug);
  if (!context) notFound();

  const { shop, services, staff, fields, entitlements, bookingOpen, closedMessage, lastBookableDate } = context;
  const css = buildThemeCss({ shopPrimary: shop.primaryColor, selector: ".bookslot" });
  const phoneHref = shop.phone ? `tel:${shop.phone.replace(/[^\d+]/g, "")}` : null;

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-8 sm:py-12">
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <BookingWidget
        shopSlug={shop.slug}
        shopName={shop.name}
        timezone={shop.timezone}
        services={services}
        lastBookableDate={lastBookableDate}
        fields={fields}
        staff={staff}
        staffLabel={shop.staffLabel}
        staffChoice={shop.staffChoice === "auto" ? "auto" : "choose"}
        bookingOpen={bookingOpen}
        closedMessage={closedMessage}
        badgeHref={entitlements.showBadge ? buildBadgeUrl(shop.slug) : undefined}
      />
      {(shop.address || shop.phone) && (
        <p className="mx-auto mt-5 flex max-w-lg flex-wrap justify-center gap-x-4 gap-y-1 text-center text-sm text-zinc-500">
          {shop.address && <span>{shop.address}</span>}
          {shop.phone && phoneHref && (
            <a href={phoneHref} className="hover:text-zinc-900">
              {shop.phone}
            </a>
          )}
        </p>
      )}
    </main>
  );
}
