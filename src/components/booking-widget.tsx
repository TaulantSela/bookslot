"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  createBookingAction,
  type BookingActionState,
  type BookingResult,
} from "@/lib/actions";
import { formatPrice } from "@/lib/utils";
import { formatInTimeZone } from "@/lib/slots";

type Service = {
  id: string;
  name: string;
  durationMinutes: number;
  priceCents: number | null;
};

/** How the embed talks to the page that hosts it (see public/widget docs). */
export type HostBridge = {
  /** Origin of the embedding page, as declared by widget.js. */
  origin: string | null;
  /** Lets the host tell several widgets on one page apart. */
  instance: string | null;
  /** Plan allows `booked` / `error` events. */
  events: boolean;
  /** Plan allows the host to prefill customer details. */
  prefill: boolean;
};

type Props = {
  shopSlug: string;
  shopName: string;
  timezone: string;
  services: Service[];
  embed?: boolean;
  /** False once a free plan's monthly booking limit is reached. */
  bookingOpen?: boolean;
  closedMessage?: string;
  /** Preselected service (already validated against `services`). */
  initialServiceId?: string;
  /** Link for the "Powered by BookSlot" badge; no badge when omitted. */
  badgeHref?: string;
  host?: HostBridge;
};

const EMPTY_CUSTOMER = {
  customerName: "",
  customerPhone: "",
  customerEmail: "",
  notes: "",
};

// Every color, radius and font comes from CSS variables set by the theme
// (src/lib/theme.ts), so host sites can restyle the widget on paid plans.
const styles = {
  label: "mb-1.5 block text-sm font-medium text-[var(--bs-text)]",
  muted: "text-sm text-[var(--bs-muted)]",
  field:
    "w-full rounded-[var(--bs-radius)] border border-[var(--bs-border)] bg-[var(--bs-input)] px-3 py-2.5 text-sm text-[var(--bs-text)] outline-none transition focus:border-[var(--bs-primary)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--bs-primary)_30%,transparent)]",
  option:
    "rounded-[var(--bs-radius)] border text-sm transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--bs-primary)]",
  optionIdle:
    "border-[var(--bs-border)] bg-[var(--bs-surface)] hover:border-[var(--bs-muted)]",
  serviceSelected:
    "border-[var(--bs-primary)] bg-[color-mix(in_srgb,var(--bs-primary)_10%,var(--bs-surface))]",
  slotSelected:
    "border-[var(--bs-primary)] bg-[var(--bs-primary)] text-[var(--bs-primary-text)]",
  primaryButton:
    "w-full rounded-[var(--bs-radius)] bg-[var(--bs-primary)] px-4 py-3 text-sm font-medium text-[var(--bs-primary-text)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50",
  error:
    "rounded-[var(--bs-radius)] border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-600",
};

function clip(value: unknown, max: number) {
  return typeof value === "string" ? value.slice(0, max) : undefined;
}

export function BookingWidget({
  shopSlug,
  shopName,
  timezone,
  services,
  embed = false,
  bookingOpen = true,
  closedMessage,
  initialServiceId,
  badgeHref,
  host,
}: Props) {
  const [serviceId, setServiceId] = useState(
    initialServiceId ?? services[0]?.id ?? "",
  );
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [slots, setSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotsError, setSlotsError] = useState(false);
  const [booked, setBooked] = useState<BookingResult | null>(null);
  const latestSlotsRequest = useRef(0);
  const rootRef = useRef<HTMLDivElement>(null);
  // Current choice, readable from the host message listener: a host page can
  // switch the service after the customer already picked a date.
  const selection = useRef({ date: "", serviceId });

  function chooseService(nextServiceId: string) {
    if (nextServiceId === selection.current.serviceId) return;
    selection.current.serviceId = nextServiceId;
    setServiceId(nextServiceId);
    // Times depend on the service's duration, so reload them for that date.
    if (selection.current.date) loadSlots(selection.current.date, nextServiceId);
  }

  // Controlled on purpose: React resets uncontrolled fields after every form
  // action, which wiped the customer's details whenever a booking failed.
  const [customer, setCustomer] = useState(EMPTY_CUSTOMER);

  function updateCustomer(field: keyof typeof customer, value: string) {
    setCustomer((prev) => ({ ...prev, [field]: value }));
  }

  // ---- Host page bridge (embed only) --------------------------------------
  function postToHost(
    type: "ready" | "resize" | "booked" | "error",
    payload: Record<string, unknown> = {},
  ) {
    if (!embed || !host || typeof window === "undefined") return;
    if (window.parent === window) return;
    const sensitive = type === "booked" || type === "error";
    // Booking details only ever go to the origin the host declared, and only
    // on plans that include host events. Size updates are harmless anywhere.
    if (sensitive && (!host.events || !host.origin)) return;
    window.parent.postMessage(
      { source: "bookslot", instance: host.instance, type, ...payload },
      host.origin ?? "*",
    );
  }

  useEffect(() => {
    postToHost("ready", { shop: shopSlug });
    const root = rootRef.current;
    if (!root || typeof ResizeObserver === "undefined") return;
    let lastHeight = 0;
    const observer = new ResizeObserver(() => {
      const height = Math.ceil(root.getBoundingClientRect().height);
      if (height !== lastHeight) {
        lastHeight = height;
        postToHost("resize", { height });
      }
    });
    observer.observe(root);
    return () => observer.disconnect();
    // The bridge is set up once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!embed || !host?.prefill || !host.origin) return;
    const origin = host.origin;
    function onMessage(event: MessageEvent) {
      if (event.origin !== origin || event.source !== window.parent) return;
      const data = event.data;
      if (!data || data.source !== "bookslot" || data.type !== "prefill") return;
      if (data.instance && data.instance !== host?.instance) return;

      const incoming = data.customer ?? {};
      setCustomer((prev) => ({
        customerName: clip(incoming.name, 80) ?? prev.customerName,
        customerPhone: clip(incoming.phone, 30) ?? prev.customerPhone,
        customerEmail: clip(incoming.email, 120) ?? prev.customerEmail,
        notes: clip(incoming.notes, 500) ?? prev.notes,
      }));
      if (
        typeof data.service === "string" &&
        services.some((s) => s.id === data.service)
      ) {
        chooseService(data.service);
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
    // chooseService only touches refs and state setters, so the copy from the
    // render that subscribed stays correct.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [embed, host, services]);

  // ---- Slots ----------------------------------------------------------------
  async function loadSlots(nextDate: string, nextServiceId: string) {
    selection.current.date = nextDate;
    setDate(nextDate);
    setTime("");
    setSlotsError(false);
    const requestId = ++latestSlotsRequest.current;

    if (!nextDate || !nextServiceId) {
      setSlots([]);
      return;
    }

    setLoadingSlots(true);
    try {
      const params = new URLSearchParams({
        slug: shopSlug,
        serviceId: nextServiceId,
        date: nextDate,
      });
      const res = await fetch(`/api/availability?${params}`);
      if (!res.ok) throw new Error(`Availability request failed: ${res.status}`);
      const data: { slots?: string[] } = await res.json();
      // Ignore responses for a date or service the customer has since changed.
      if (requestId === latestSlotsRequest.current) setSlots(data.slots ?? []);
    } catch {
      if (requestId === latestSlotsRequest.current) {
        setSlots([]);
        setSlotsError(true);
      }
    } finally {
      if (requestId === latestSlotsRequest.current) setLoadingSlots(false);
    }
  }

  const [state, formAction, pending] = useActionState<
    BookingActionState,
    FormData
  >(async (prev, formData) => {
    const result = (await createBookingAction(prev, formData)) ?? {};
    if (result.booking) {
      setBooked(result.booking);
      postToHost("booked", { booking: result.booking });
    } else if (result.error) {
      postToHost("error", { message: result.error });
      // A failed booking usually means the slot was just taken: refresh the
      // list so the customer doesn't keep picking an unavailable time.
      void loadSlots(
        String(formData.get("date") ?? ""),
        String(formData.get("serviceId") ?? ""),
      );
    }
    return result;
  }, {});

  function bookAnother() {
    setBooked(null);
    selection.current.date = "";
    setDate("");
    setTime("");
    setSlots([]);
    setCustomer((prev) => ({ ...prev, notes: "" }));
  }

  const minDate = formatInTimeZone(new Date(), timezone, "yyyy-MM-dd");

  // ---- Render -----------------------------------------------------------------
  let body: React.ReactNode;

  if (services.length === 0) {
    body = <p className={styles.muted}>Online booking is not available yet.</p>;
  } else if (!bookingOpen) {
    body = (
      <p className={styles.muted}>
        {closedMessage ?? "Online booking is not available right now."}
      </p>
    );
  } else if (booked) {
    body = (
      <div className="py-6 text-center" role="status">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--bs-primary)_15%,var(--bs-surface))] text-xl text-[var(--bs-primary)]">
          ✓
        </div>
        <h2 className="mt-4 text-xl font-semibold">You&apos;re booked</h2>
        <p className="mt-2 text-sm">
          <span className="font-medium">{booked.serviceName}</span>
          <br />
          {booked.when}
        </p>
        <p className={`mt-2 ${styles.muted}`}>
          {customer.customerEmail
            ? `A confirmation is on its way to ${customer.customerEmail}.`
            : `${shopName} will see your booking right away.`}
        </p>
        <button
          type="button"
          onClick={bookAnother}
          className="mt-6 text-sm text-[var(--bs-primary)] hover:underline"
        >
          Book another appointment
        </button>
      </div>
    );
  } else {
    body = (
      <form action={formAction} className="space-y-5">
        <input type="hidden" name="shopSlug" value={shopSlug} />
        <input type="hidden" name="serviceId" value={serviceId} />
        <input type="hidden" name="date" value={date} />
        <input type="hidden" name="time" value={time} />

        <div>
          <span className={styles.label}>Service</span>
          <div className="grid gap-2">
            {services.map((service) => (
              <button
                key={service.id}
                type="button"
                aria-pressed={serviceId === service.id}
                onClick={() => chooseService(service.id)}
                className={`${styles.option} px-4 py-3 text-left ${
                  serviceId === service.id
                    ? styles.serviceSelected
                    : styles.optionIdle
                }`}
              >
                <div className="font-medium">{service.name}</div>
                <div className="text-[var(--bs-muted)]">
                  {service.durationMinutes} min
                  {formatPrice(service.priceCents)
                    ? ` · ${formatPrice(service.priceCents)}`
                    : ""}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="date" className={styles.label}>
            Date
          </label>
          <input
            id="date"
            type="date"
            min={minDate}
            value={date}
            onChange={(e) => loadSlots(e.target.value, serviceId)}
            required
            className={styles.field}
          />
        </div>

        <div>
          <span className={styles.label}>Time</span>
          {loadingSlots ? (
            <p className={styles.muted}>Loading available times…</p>
          ) : slotsError ? (
            <p className="text-sm text-red-600">
              Couldn&apos;t load available times. Please try again.
            </p>
          ) : slots.length === 0 ? (
            <p className={styles.muted}>
              {date ? "No available times on this day." : "Pick a date first."}
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {slots.map((slot) => (
                <button
                  key={slot}
                  type="button"
                  aria-pressed={time === slot}
                  onClick={() => setTime(slot)}
                  className={`${styles.option} px-3 py-2 ${
                    time === slot ? styles.slotSelected : styles.optionIdle
                  }`}
                >
                  {slot}
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <label htmlFor="customerName" className={styles.label}>
            Your name
          </label>
          <input
            id="customerName"
            name="customerName"
            autoComplete="name"
            value={customer.customerName}
            onChange={(e) => updateCustomer("customerName", e.target.value)}
            required
            className={styles.field}
          />
        </div>

        <div>
          <label htmlFor="customerPhone" className={styles.label}>
            Phone (for reminders)
          </label>
          <input
            id="customerPhone"
            name="customerPhone"
            type="tel"
            autoComplete="tel"
            value={customer.customerPhone}
            onChange={(e) => updateCustomer("customerPhone", e.target.value)}
            required
            className={styles.field}
          />
        </div>

        <div>
          <label htmlFor="customerEmail" className={styles.label}>
            Email (optional)
          </label>
          <input
            id="customerEmail"
            name="customerEmail"
            type="email"
            autoComplete="email"
            value={customer.customerEmail}
            onChange={(e) => updateCustomer("customerEmail", e.target.value)}
            className={styles.field}
          />
        </div>

        <div>
          <label htmlFor="notes" className={styles.label}>
            Notes (optional)
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            value={customer.notes}
            onChange={(e) => updateCustomer("notes", e.target.value)}
            className={styles.field}
          />
        </div>

        {state.error && <p className={styles.error}>{state.error}</p>}

        <button
          type="submit"
          disabled={pending || !time || !date || !serviceId}
          className={styles.primaryButton}
        >
          {pending ? "Booking…" : "Confirm booking"}
        </button>
      </form>
    );
  }

  return (
    <div
      ref={rootRef}
      className={`bookslot bg-[var(--bs-bg)] text-[var(--bs-text)] ${
        embed
          ? "p-4"
          : "mx-auto max-w-lg rounded-[calc(var(--bs-radius)*1.5)] border border-[var(--bs-border)] p-6 shadow-sm"
      }`}
      style={{ fontFamily: "var(--bs-font)" }}
    >
      {!embed && (
        <div className="mb-6">
          <h1 className="text-2xl font-semibold">{shopName}</h1>
          <p className={`mt-1 ${styles.muted}`}>Book an appointment online</p>
        </div>
      )}

      {body}

      {badgeHref && (
        <a
          href={badgeHref}
          target="_blank"
          rel="noopener"
          className="mt-6 block text-center text-xs text-[var(--bs-muted)] hover:underline"
        >
          Powered by BookSlot
        </a>
      )}
    </div>
  );
}
