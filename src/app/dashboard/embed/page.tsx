import { getDashboardContext } from "@/lib/actions";
import { buildBookingUrl, buildEmbedUrl } from "@/lib/email";
import { Card } from "@/components/ui";
import { redirect } from "next/navigation";

export default async function EmbedPage() {
  const ctx = await getDashboardContext();
  if (!ctx?.shop) redirect("/login");

  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const bookingUrl = buildBookingUrl(ctx.shop.slug);
  const embedUrl = buildEmbedUrl(ctx.shop.slug);
  const iframeCode = `<iframe src="${embedUrl}" width="100%" height="720" style="border:0;border-radius:16px;max-width:480px;" title="Book appointment"></iframe>`;
  const scriptCode = `<script src="${base}/widget.js?shop=${ctx.shop.slug}" data-height="720"></script>`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Widget & embed</h1>
        <p className="text-sm text-zinc-600">Add booking to your website or share a link</p>
      </div>

      <Card>
        <h2 className="font-medium text-zinc-900">Booking link</h2>
        <p className="mt-1 text-sm text-zinc-600">For Instagram bio, Google Maps, Viber status</p>
        <code className="mt-3 block overflow-x-auto rounded-lg bg-zinc-100 px-3 py-2 text-sm">
          {bookingUrl}
        </code>
      </Card>

      <Card>
        <h2 className="font-medium text-zinc-900">Option 1 — iframe embed</h2>
        <p className="mt-1 text-sm text-zinc-600">Paste anywhere on your website</p>
        <code className="mt-3 block overflow-x-auto rounded-lg bg-zinc-100 px-3 py-2 text-sm whitespace-pre-wrap">
          {iframeCode}
        </code>
      </Card>

      <Card>
        <h2 className="font-medium text-zinc-900">Option 2 — script widget</h2>
        <p className="mt-1 text-sm text-zinc-600">Auto-injects the booking iframe</p>
        <code className="mt-3 block overflow-x-auto rounded-lg bg-zinc-100 px-3 py-2 text-sm whitespace-pre-wrap">
          {scriptCode}
        </code>
      </Card>

      <Card>
        <h2 className="font-medium text-zinc-900">Live preview</h2>
        <iframe
          src={embedUrl}
          className="mt-4 h-[720px] w-full max-w-md rounded-2xl border border-zinc-200"
          title="Booking widget preview"
        />
      </Card>
    </div>
  );
}
