import { and, desc, eq, isNull } from "drizzle-orm";
import { formatInTimeZone } from "date-fns-tz";
import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { apiKeys, webhookDeliveries, webhookEndpoints } from "@/db/schema";
import { getDashboardContext } from "@/lib/actions";
import {
  addWebhookAction,
  deleteWebhookAction,
  resendDeliveryAction,
  revokeApiKeyAction,
  rotateWebhookSecretAction,
  sendTestWebhookAction,
  toggleWebhookAction,
  updateWebhookEventsAction,
} from "@/lib/developer-actions";
import { entitlementsFor } from "@/lib/plans";
import { MAX_ENDPOINTS, WEBHOOK_EVENTS } from "@/lib/webhooks";
import { ActionForm } from "@/components/action-form";
import { NewApiKeyForm } from "@/components/new-api-key-form";
import { Button, Card, Input, Label } from "@/components/ui";

function EventChoices({ selected }: { selected?: string[] }) {
  return (
    <fieldset className="md:col-span-full">
      <legend className="mb-1.5 text-sm font-medium text-zinc-700">Events</legend>
      <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-zinc-700">
        {WEBHOOK_EVENTS.map((event) => (
          <label key={event} className="flex items-center gap-2">
            <input type="checkbox" name="events" value={event} defaultChecked={selected ? selected.includes(event) : true} />
            <code className="text-xs">{event}</code>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

const STATUS_STYLE: Record<string, string> = {
  succeeded: "text-green-700",
  pending: "text-amber-700",
  failed: "text-red-700",
};

export default async function DevelopersPage() {
  const ctx = await getDashboardContext();
  if (!ctx?.shop) redirect("/login");
  const shop = ctx.shop;
  const pro = entitlementsFor(shop.plan).api;
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const when = (date: Date | null) =>
    date ? formatInTimeZone(date, shop.timezone, "d MMM yyyy, HH:mm") : "never";

  const [keys, endpoints, deliveries] = await Promise.all([
    db
      .select()
      .from(apiKeys)
      .where(and(eq(apiKeys.shopId, shop.id), isNull(apiKeys.revokedAt)))
      .orderBy(desc(apiKeys.createdAt)),
    db.select().from(webhookEndpoints).where(eq(webhookEndpoints.shopId, shop.id)),
    db
      .select()
      .from(webhookDeliveries)
      .where(eq(webhookDeliveries.shopId, shop.id))
      .orderBy(desc(webhookDeliveries.createdAt))
      .limit(20),
  ]);
  const endpointUrl = new Map(endpoints.map((e) => [e.id, e.url]));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Developers</h1>
          <p className="text-sm text-zinc-600">
            Connect BookSlot to your own systems: read and create bookings with the API, and get webhooks
            when bookings change.
          </p>
        </div>
        <Link href="/docs/api" className="text-sm text-blue-600 hover:underline">
          API reference →
        </Link>
      </div>

      {!pro && (
        <Card>
          <p className="text-sm text-zinc-600">
            The API and webhooks are part of the Pro plan. Ask for an upgrade on the Widget page.
          </p>
        </Card>
      )}

      {pro && (
        <>
          <Card>
            <h2 className="font-medium text-zinc-900">API keys</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Keep keys on your server; they can read and change every booking. Send them as{" "}
              <code className="rounded bg-zinc-100 px-1 text-xs">Authorization: Bearer bsk_…</code> to{" "}
              <code className="rounded bg-zinc-100 px-1 text-xs">{base}/api/v1</code>.
            </p>
            {keys.length > 0 && (
              <ul className="mt-4 divide-y divide-zinc-100 rounded-lg border border-zinc-200">
                {keys.map((key) => (
                  <li key={key.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
                    <div>
                      <span className="font-medium text-zinc-900">{key.name}</span>{" "}
                      <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs">{key.prefix}…</code>
                      <span className="text-zinc-500">
                        {" "}
                        · created {when(key.createdAt)} · last used {when(key.lastUsedAt)}
                      </span>
                    </div>
                    <form action={revokeApiKeyAction.bind(null, key.id)}>
                      <Button variant="ghost" className="px-2 py-1 text-xs text-red-600">
                        Revoke
                      </Button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
            <NewApiKeyForm />
          </Card>

          <Card>
            <h2 className="font-medium text-zinc-900">Webhooks</h2>
            <p className="mt-1 text-sm text-zinc-500">
              BookSlot POSTs JSON to these URLs when a booking is created, cancelled or completed, signed with
              the URL&apos;s secret (see the API reference to verify it). Failed deliveries are retried for
              about a day.
            </p>

            {endpoints.map((endpoint) => (
              <div key={endpoint.id} className="mt-4 rounded-lg border border-zinc-200 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 text-sm">
                    <p className="break-all font-medium text-zinc-900">{endpoint.url}</p>
                    <p className="mt-0.5 text-zinc-500">
                      {endpoint.active ? "Active" : "Paused"} · {endpoint.events.join(", ")}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <form action={sendTestWebhookAction.bind(null, endpoint.id)}>
                      <Button variant="secondary" className="px-2 py-1 text-xs" disabled={!endpoint.active}>
                        Send test event
                      </Button>
                    </form>
                    <form action={toggleWebhookAction.bind(null, endpoint.id, !endpoint.active)}>
                      <Button variant="ghost" className="px-2 py-1 text-xs">
                        {endpoint.active ? "Pause" : "Resume"}
                      </Button>
                    </form>
                    <form action={deleteWebhookAction.bind(null, endpoint.id)}>
                      <Button variant="ghost" className="px-2 py-1 text-xs text-red-600">
                        Delete
                      </Button>
                    </form>
                  </div>
                </div>
                <details className="mt-3">
                  <summary className="cursor-pointer text-sm text-blue-600">Signing secret and events</summary>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                    <code className="break-all rounded bg-zinc-100 px-2 py-1 text-xs">{endpoint.secret}</code>
                    <form action={rotateWebhookSecretAction.bind(null, endpoint.id)}>
                      <Button variant="ghost" className="px-2 py-1 text-xs">
                        Rotate
                      </Button>
                    </form>
                  </div>
                  <ActionForm
                    action={updateWebhookEventsAction}
                    submitLabel="Save events"
                    submitVariant="secondary"
                    className="mt-3 grid gap-3"
                  >
                    <input type="hidden" name="endpointId" value={endpoint.id} />
                    <EventChoices selected={endpoint.events} />
                  </ActionForm>
                </details>
              </div>
            ))}

            {endpoints.length < MAX_ENDPOINTS && (
              <ActionForm
                action={addWebhookAction}
                submitLabel="Add webhook"
                pendingLabel="Adding…"
                resetOnSuccess
                className="mt-4 grid gap-3 md:grid-cols-2"
              >
                <div className="md:col-span-2">
                  <Label htmlFor="webhook-url">URL</Label>
                  <Input
                    id="webhook-url"
                    name="url"
                    type="url"
                    placeholder="https://example.com/webhooks/bookslot"
                    required
                  />
                </div>
                <EventChoices />
              </ActionForm>
            )}
          </Card>

          {deliveries.length > 0 && (
            <Card className="overflow-hidden p-0">
              <h2 className="px-6 pt-6 font-medium text-zinc-900">Recent deliveries</h2>
              <div className="mt-3 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-zinc-50 text-left text-zinc-500">
                    <tr>
                      <th className="px-4 py-2 font-medium">Event</th>
                      <th className="px-4 py-2 font-medium">URL</th>
                      <th className="px-4 py-2 font-medium">Result</th>
                      <th className="px-4 py-2 font-medium">Attempts</th>
                      <th className="px-4 py-2 font-medium">Sent</th>
                      <th className="px-4 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {deliveries.map((d) => (
                      <tr key={d.id} className="border-t border-zinc-100">
                        <td className="px-4 py-2">
                          <code className="text-xs">{d.event}</code>
                        </td>
                        <td className="max-w-[16rem] truncate px-4 py-2 text-zinc-600">
                          {endpointUrl.get(d.endpointId) ?? "—"}
                        </td>
                        <td className={`px-4 py-2 ${STATUS_STYLE[d.status] ?? ""}`}>
                          {d.status}
                          {d.lastError ? ` · ${d.lastError}` : d.lastStatusCode ? ` · ${d.lastStatusCode}` : ""}
                        </td>
                        <td className="px-4 py-2">{d.attempts}</td>
                        <td className="px-4 py-2 text-zinc-600">{when(d.deliveredAt ?? d.createdAt)}</td>
                        <td className="px-4 py-2">
                          {d.status !== "pending" && (
                            <form action={resendDeliveryAction.bind(null, d.id)}>
                              <Button variant="ghost" className="px-2 py-1 text-xs">
                                Resend
                              </Button>
                            </form>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
