import type { Metadata } from "next";
import Link from "next/link";
import { MAX_ATTEMPTS, WEBHOOK_EVENTS } from "@/lib/webhooks";

export const metadata: Metadata = {
  title: "BookSlot API reference",
  description: "Read and create bookings, and receive webhooks when they change.",
};

function Code({ children }: { children: string }) {
  return (
    <pre className="mt-3 overflow-x-auto rounded-lg bg-zinc-950 p-4 text-xs leading-relaxed text-zinc-100">
      <code>{children}</code>
    </pre>
  );
}

function Endpoint({ method, path, children }: { method: string; path: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-zinc-200 pt-6">
      <h3 className="font-mono text-sm font-semibold text-zinc-900">
        <span className="mr-2 rounded bg-zinc-900 px-1.5 py-0.5 text-xs text-white">{method}</span>
        {path}
      </h3>
      <div className="mt-2 space-y-2 text-sm text-zinc-700">{children}</div>
    </section>
  );
}

export default function ApiDocsPage() {
  const base = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/v1`;

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <Link href="/dashboard/developers" className="text-sm text-blue-600 hover:underline">
        ← Developers
      </Link>
      <h1 className="mt-4 text-3xl font-semibold text-zinc-900">API reference</h1>
      <p className="mt-2 text-zinc-600">
        Read a shop&apos;s services, staff and availability, create and change bookings, and get webhooks
        when bookings change. Part of the Pro plan.
      </p>

      <h2 className="mt-10 text-xl font-semibold text-zinc-900">Authentication</h2>
      <p className="mt-2 text-sm text-zinc-700">
        Create a key under Dashboard → Developers and send it with every request. Keys are secret: call the
        API from your server, never from a browser. Each key belongs to one shop.
      </p>
      <Code>{`curl ${base}/shop \\
  -H "Authorization: Bearer bsk_…"`}</Code>

      <h2 className="mt-10 text-xl font-semibold text-zinc-900">Conventions</h2>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-zinc-700">
        <li>JSON in and out. Instants are ISO 8601 in UTC (<code>startsAt</code>); dates and times you send are wall-clock in the shop&apos;s timezone (<code>date</code>, <code>time</code>).</li>
        <li>Errors look like <code>{`{ "error": { "code": "slot_taken", "message": "…" } }`}</code> with a matching HTTP status: 400 bad query, 401 bad key, 403 not on Pro, 404 not found, 409 conflict, 422 invalid booking.</li>
        <li>Lists return <code>{`{ "data": [...] }`}</code>; paged lists add <code>nextCursor</code>.</li>
        <li>New fields can appear in responses at any time; existing ones won&apos;t be renamed or removed.</li>
      </ul>

      <h2 className="mt-10 text-xl font-semibold text-zinc-900">Endpoints</h2>
      <div className="mt-4 space-y-6">
        <Endpoint method="GET" path="/shop">
          <p>The shop: name, timezone, currency, booking rules, what staff are called and which standard fields it asks for.</p>
        </Endpoint>

        <Endpoint method="GET" path="/services">
          <p>Every service with its duration, price and gap after; hidden ones have <code>active: false</code>.</p>
        </Endpoint>

        <Endpoint method="GET" path="/staff">
          <p>Staff members (people or resources) with the services they offer (<code>serviceIds: null</code> = all).</p>
        </Endpoint>

        <Endpoint method="GET" path="/form-fields">
          <p>Which standard fields are required, optional or hidden, and the shop&apos;s custom questions with their <code>key</code>s.</p>
        </Endpoint>

        <Endpoint method="GET" path="/availability?service=svc_…&date=2026-11-16&days=7&staff=stf_…">
          <p>
            Bookable times per day for one service. <code>days</code> (1–14) defaults to 1; <code>staff</code> limits it
            to one person. Each slot lists the <code>staffIds</code> free for it, least busy first.
          </p>
          <Code>{`{
  "timezone": "Europe/Skopje",
  "service": { "id": "svc_…", "durationMinutes": 30 },
  "days": [
    { "date": "2026-11-16", "slots": [
      { "time": "09:00", "startsAt": "2026-11-16T08:00:00.000Z", "endsAt": "…", "staffIds": ["stf_…"] }
    ] },
    { "date": "2026-11-17", "closed": { "label": "Public holiday" }, "slots": [] }
  ]
}`}</Code>
        </Endpoint>

        <Endpoint method="GET" path="/appointments?from=…&to=…&status=confirmed&staff=stf_…&limit=50&cursor=…">
          <p>
            Appointments by start time. <code>from</code> defaults to now; <code>limit</code> is 1–100. Pass{" "}
            <code>nextCursor</code> back as <code>cursor</code> for the next page.
          </p>
        </Endpoint>

        <Endpoint method="POST" path="/appointments">
          <p>
            Books an appointment with the same checks as the widget: the time must be one of the offered slots,
            and the customer details and answers must match the shop&apos;s form. Leave out <code>staff</code> for
            anyone. Returns <code>201</code> with the appointment, or <code>409 slot_taken</code>.
          </p>
          <Code>{`curl -X POST ${base}/appointments \\
  -H "Authorization: Bearer bsk_…" \\
  -H "Content-Type: application/json" \\
  -d '{
    "service": "svc_…",
    "date": "2026-11-16",
    "time": "10:00",
    "staff": "stf_…",
    "customer": { "name": "Arta Selmani", "phone": "070 123 456", "email": "arta@example.com" },
    "answers": { "any_allergies": "Latex" }
  }'`}</Code>
        </Endpoint>

        <Endpoint method="GET" path="/appointments/:id">
          <p>One appointment:</p>
          <Code>{`{
  "id": "appt_…",
  "status": "confirmed",
  "service": { "id": "svc_…", "name": "Check-up" },
  "staff": { "id": "stf_…", "name": "Dr. Morgan" },
  "startsAt": "2026-11-16T09:00:00.000Z",
  "endsAt": "2026-11-16T09:45:00.000Z",
  "date": "2026-11-16",
  "time": "10:00",
  "timezone": "Europe/Skopje",
  "customer": { "name": "Arta Selmani", "phone": "070 123 456", "email": "arta@example.com" },
  "notes": null,
  "answers": { "any_allergies": "Latex" },
  "createdAt": "2026-11-13T12:00:00.000Z"
}`}</Code>
        </Endpoint>

        <Endpoint method="PATCH" path="/appointments/:id">
          <p>
            <code>{`{ "status": "cancelled" }`}</code>, <code>completed</code> or <code>confirmed</code> (to undo
            completed). A cancelled appointment can&apos;t be revived (<code>409</code>): book again instead.
          </p>
        </Endpoint>
      </div>

      <h2 className="mt-12 text-xl font-semibold text-zinc-900">Webhooks</h2>
      <p className="mt-2 text-sm text-zinc-700">
        Add a URL under Dashboard → Developers. BookSlot POSTs one JSON event per change, from the widget, the
        dashboard, the customer&apos;s cancel link or the API. Events:{" "}
        {WEBHOOK_EVENTS.map((e, i) => (
          <span key={e}>
            {i > 0 && ", "}
            <code>{e}</code>
          </span>
        ))}
        , plus <code>ping</code> from &ldquo;Send test event&rdquo;.
      </p>
      <Code>{`POST /your/webhook
Content-Type: application/json
BookSlot-Event: appointment.created
BookSlot-Delivery: whd_…
BookSlot-Signature: t=1763035200,v1=5f2b…

{ "id": "evt_…", "type": "appointment.created", "createdAt": "…",
  "data": { "appointment": { …same as GET /appointments/:id… } } }`}</Code>
      <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-zinc-700">
        <li>Reply with any 2xx within 10 seconds. Anything else is retried with backoff, up to {MAX_ATTEMPTS} attempts over about a day; redirects aren&apos;t followed.</li>
        <li>Deliveries can arrive more than once or out of order: use the event <code>id</code> to skip duplicates and <code>data.appointment.status</code> as the truth.</li>
        <li>Verify every request: the signature is an HMAC-SHA256 of <code>{"`${t}.${body}`"}</code> with the URL&apos;s signing secret. Reject old timestamps to stop replays.</li>
      </ul>
      <Code>{`import { createHmac, timingSafeEqual } from "node:crypto";

// body: the raw request body as a string (before JSON.parse)
export function verifyBookSlot(body, header, secret, toleranceSeconds = 300) {
  const parts = Object.fromEntries(header.split(",").map((p) => p.split("=")));
  const t = Number(parts.t);
  if (!t || Math.abs(Date.now() / 1000 - t) > toleranceSeconds) return false;
  const expected = createHmac("sha256", secret).update(\`\${t}.\${body}\`).digest();
  const given = Buffer.from(parts.v1 ?? "", "hex");
  return given.length === expected.length && timingSafeEqual(given, expected);
}`}</Code>
    </main>
  );
}
