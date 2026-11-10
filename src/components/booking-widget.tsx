"use client";

import { useActionState, useRef, useState } from "react";
import { createBookingAction, type ActionState } from "@/lib/actions";
import { Button, Input, Label, Textarea } from "@/components/ui";
import { formatPrice } from "@/lib/utils";
import { formatInTimeZone } from "@/lib/slots";

type Service = {
  id: string;
  name: string;
  durationMinutes: number;
  priceCents: number | null;
};

type Props = {
  shopSlug: string;
  shopName: string;
  primaryColor: string;
  timezone: string;
  services: Service[];
  embed?: boolean;
};

export function BookingWidget({
  shopSlug,
  shopName,
  primaryColor,
  timezone,
  services,
  embed = false,
}: Props) {
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [slots, setSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotsError, setSlotsError] = useState(false);
  const latestSlotsRequest = useRef(0);

  // Controlled on purpose: React resets uncontrolled fields after every form
  // action, which wiped the customer's details whenever a booking failed.
  const [customer, setCustomer] = useState({
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    notes: "",
  });

  function updateCustomer(field: keyof typeof customer, value: string) {
    setCustomer((prev) => ({ ...prev, [field]: value }));
  }

  async function loadSlots(nextDate: string, nextServiceId: string) {
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

  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    async (prev, formData) => {
      const result = await createBookingAction(prev, formData);
      // A failed booking usually means the slot was just taken: refresh the
      // list so the customer doesn't keep picking an unavailable time.
      if (result?.error) {
        void loadSlots(
          String(formData.get("date") ?? ""),
          String(formData.get("serviceId") ?? ""),
        );
      }
      return result ?? {};
    },
    {},
  );

  const minDate = formatInTimeZone(new Date(), timezone, "yyyy-MM-dd");

  return (
    <div className={embed ? "p-4" : "mx-auto max-w-lg py-8"}>
      {!embed && (
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-zinc-900">{shopName}</h1>
          <p className="mt-1 text-sm text-zinc-600">Book an appointment online</p>
        </div>
      )}

      <form action={formAction} className="space-y-5">
        <input type="hidden" name="shopSlug" value={shopSlug} />
        <input type="hidden" name="serviceId" value={serviceId} />
        <input type="hidden" name="date" value={date} />
        <input type="hidden" name="time" value={time} />

        <div>
          <Label>Service</Label>
          <div className="grid gap-2">
            {services.map((service) => (
              <button
                key={service.id}
                type="button"
                onClick={() => {
                  setServiceId(service.id);
                  if (date) loadSlots(date, service.id);
                }}
                className={`rounded-xl border px-4 py-3 text-left text-sm transition ${
                  serviceId === service.id
                    ? "border-blue-600 bg-blue-50"
                    : "border-zinc-200 hover:border-zinc-300"
                }`}
                style={
                  serviceId === service.id
                    ? { borderColor: primaryColor, backgroundColor: `${primaryColor}10` }
                    : undefined
                }
              >
                <div className="font-medium">{service.name}</div>
                <div className="text-zinc-500">
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
          <Label htmlFor="date">Date</Label>
          <Input
            id="date"
            type="date"
            min={minDate}
            value={date}
            onChange={(e) => loadSlots(e.target.value, serviceId)}
            required
          />
        </div>

        <div>
          <Label>Time</Label>
          {loadingSlots ? (
            <p className="text-sm text-zinc-500">Loading available times…</p>
          ) : slotsError ? (
            <p className="text-sm text-red-700">
              Couldn&apos;t load available times. Please try again.
            </p>
          ) : slots.length === 0 ? (
            <p className="text-sm text-zinc-500">
              {date ? "No available times on this day." : "Pick a date first."}
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {slots.map((slot) => (
                <button
                  key={slot}
                  type="button"
                  onClick={() => setTime(slot)}
                  className={`rounded-lg border px-3 py-2 text-sm ${
                    time === slot
                      ? "border-blue-600 bg-blue-600 text-white"
                      : "border-zinc-200 hover:border-zinc-300"
                  }`}
                  style={
                    time === slot ? { backgroundColor: primaryColor, borderColor: primaryColor } : undefined
                  }
                >
                  {slot}
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <Label htmlFor="customerName">Your name</Label>
          <Input
            id="customerName"
            name="customerName"
            value={customer.customerName}
            onChange={(e) => updateCustomer("customerName", e.target.value)}
            required
          />
        </div>

        <div>
          <Label htmlFor="customerPhone">Phone (for reminders)</Label>
          <Input
            id="customerPhone"
            name="customerPhone"
            type="tel"
            value={customer.customerPhone}
            onChange={(e) => updateCustomer("customerPhone", e.target.value)}
            required
          />
        </div>

        <div>
          <Label htmlFor="customerEmail">Email (optional)</Label>
          <Input
            id="customerEmail"
            name="customerEmail"
            type="email"
            value={customer.customerEmail}
            onChange={(e) => updateCustomer("customerEmail", e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="notes">Notes (optional)</Label>
          <Textarea
            id="notes"
            name="notes"
            rows={3}
            value={customer.notes}
            onChange={(e) => updateCustomer("notes", e.target.value)}
          />
        </div>

        {state.error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {state.error}
          </p>
        )}

        <Button
          type="submit"
          disabled={pending || !time || !date || !serviceId}
          className="w-full"
          style={{ backgroundColor: primaryColor }}
        >
          {pending ? "Booking…" : "Confirm booking"}
        </Button>
      </form>
    </div>
  );
}
