"use client";

import { useState } from "react";
import {
  BookSlotWidget,
  type BookSlotBooking,
  type BookSlotCustomer,
  type BookSlotEvent,
  type BookSlotTheme,
} from "./bookslot-widget";

// Service ids come from the clinic's BookSlot account.
const TREATMENTS = [
  { id: "svc_smile_checkup", name: "Check-up & cleaning", detail: "45 min · 1500 MKD" },
  { id: "svc_smile_consult", name: "Consultation", detail: "30 min · 800 MKD" },
  { id: "svc_smile_whitening", name: "Teeth whitening", detail: "60 min · 6000 MKD" },
];

// Matches the clinic's own brand instead of BookSlot's defaults (Pro).
const THEME: BookSlotTheme = {
  primary: "#2dd4bf",
  background: "#0f2a3d",
  text: "#e6f1f5",
  radius: 6,
  font: "system",
  scheme: "dark",
};

function describe(event: BookSlotEvent) {
  switch (event.type) {
    case "ready":
      return `ready (${event.detail.shop})`;
    case "resize":
      return `resize → ${event.detail.height}px`;
    case "booked":
      return `booked ${event.detail.appointmentId}`;
    case "error":
      return `error: ${event.detail.message}`;
  }
}

export function BookingSection({ patient }: { patient: BookSlotCustomer }) {
  const [service, setService] = useState(TREATMENTS[0].id);
  const [booking, setBooking] = useState<BookSlotBooking | null>(null);
  const [log, setLog] = useState<string[]>([]);

  function handleEvent(event: BookSlotEvent) {
    const time = new Date().toLocaleTimeString("en-GB");
    setLog((prev) => [`${time}  ${describe(event)}`, ...prev].slice(0, 8));
    if (event.type === "booked") setBooking(event.detail);
  }

  return (
    <section className="booking" id="book">
      <div className="booking-inner">
        <div>
          <h2>Book a visit</h2>
          <p className="lead">
            You’re signed in, so your details are already filled in. Pick a
            treatment and a time.
          </p>

          <ul className="treatments">
            {TREATMENTS.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  aria-pressed={service === t.id}
                  onClick={() => setService(t.id)}
                >
                  <strong>{t.name}</strong>
                  <span>{t.detail}</span>
                </button>
              </li>
            ))}
          </ul>

          {booking && (
            <div className="confirmation" role="status">
              <strong>Added to your patient portal</strong>
              <p>
                {booking.serviceName}, {booking.when}
              </p>
              <p className="muted">Appointment {booking.appointmentId}</p>
            </div>
          )}

          <div className="events">
            <span>Events this site received from BookSlot</span>
            <pre>{log.length ? log.join("\n") : "waiting…"}</pre>
          </div>
        </div>

        <div className="widget">
          <BookSlotWidget
            shop="smile-dental"
            theme={THEME}
            service={service}
            customer={patient}
            onEvent={handleEvent}
          />
        </div>
      </div>
    </section>
  );
}
