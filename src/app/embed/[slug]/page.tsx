import { notFound } from "next/navigation";
import { BookingWidget } from "@/components/booking-widget";
import { getPublicBookingContext } from "@/lib/booking";
import { parseInstanceId, parseParentOrigin } from "@/lib/embed";
import { buildBadgeUrl } from "@/lib/email";
import { buildThemeCss, parseThemeParams } from "@/lib/theme";

type Query = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

// Rendered inside an iframe on other sites (see src/app/widget.js). Which
// sites may frame it is enforced by the CSP set in src/proxy.ts. Plan
// entitlements are applied here, on the server, so a host page can't unlock
// paid options by editing its embed code.
export default async function EmbedPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Query>;
}) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const context = await getPublicBookingContext(slug);
  if (!context) notFound();

  const { shop, services, entitlements, bookingOpen, closedMessage } = context;
  const overrides = entitlements.customTheme ? parseThemeParams(query) : {};
  const requestedService = first(query.service);
  const initialServiceId =
    entitlements.prefill && services.some((s) => s.id === requestedService)
      ? requestedService
      : undefined;

  const css = buildThemeCss({
    shopPrimary: shop.primaryColor,
    overrides,
    selector: ":root",
    paintBody: true,
  });

  return (
    <>
      {/* Built only from validated hex colors, numbers and presets (src/lib/theme.ts). */}
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <BookingWidget
        embed
        shopSlug={shop.slug}
        shopName={shop.name}
        timezone={shop.timezone}
        services={services}
        bookingOpen={bookingOpen}
        closedMessage={closedMessage}
        initialServiceId={initialServiceId}
        badgeHref={entitlements.showBadge ? buildBadgeUrl(shop.slug) : undefined}
        host={{
          origin: parseParentOrigin(first(query.origin)),
          instance: parseInstanceId(first(query.instance)),
          events: entitlements.hostEvents,
          prefill: entitlements.prefill,
        }}
      />
    </>
  );
}
