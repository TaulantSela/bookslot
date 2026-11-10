"use client";

import { useState } from "react";
import {
  BookSlotWidget,
  type BookSlotBooking,
  type BookSlotCustomer,
  type BookSlotTheme,
} from "@bookslot/react";
import styles from "./clinic.module.css";

// Service ids come from the clinic's BookSlot account.
const TREATMENTS = [
  { id: "svc_brightsmile_checkup", name: "Check-up & cleaning", detail: "45 min · 1500 MKD" },
  { id: "svc_brightsmile_consult", name: "Consultation", detail: "30 min · 800 MKD" },
  { id: "svc_brightsmile_whitening", name: "Teeth whitening", detail: "60 min · 6000 MKD" },
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

export function BookingSection({
  patient,
  bookslotUrl,
}: {
  patient: BookSlotCustomer;
  bookslotUrl: string;
}) {
  const [service, setService] = useState(TREATMENTS[0].id);
  const [booking, setBooking] = useState<BookSlotBooking | null>(null);
  const [log, setLog] = useState<string[]>([]);

  function logEvent(text: string) {
    const time = new Date().toLocaleTimeString("en-GB");
    setLog((prev) => [`${time}  ${text}`, ...prev].slice(0, 8));
  }

  return (
    <section className={styles.booking} id="book">
      <div className={styles.bookingInner}>
        <div>
          <h2>Book a visit</h2>
          <p className={styles.lead}>
            You’re signed in, so your details are already filled in. Pick a
            treatment and a time.
          </p>

          <ul className={styles.treatments}>
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
            <div className={styles.confirmation} role="status">
              <strong>Added to your patient portal</strong>
              <p>
                {booking.serviceName}, {booking.when}
              </p>
              <p className={styles.muted}>Appointment {booking.appointmentId}</p>
            </div>
          )}

          <div className={styles.events}>
            <span>Events this site received from BookSlot</span>
            <pre>{log.length ? log.join("\n") : "waiting…"}</pre>
          </div>
        </div>

        <div className={styles.widget}>
          <BookSlotWidget
            bookslotUrl={bookslotUrl}
            shop="bright-smile-dental"
            theme={THEME}
            service={service}
            customer={patient}
            onReady={({ shop }) => logEvent(`ready (${shop})`)}
            onResize={({ height }) => logEvent(`resize → ${height}px`)}
            onBooked={(booked) => {
              logEvent(`booked ${booked.appointmentId}`);
              setBooking(booked);
            }}
            onError={({ message }) => logEvent(`error: ${message}`)}
          />
        </div>
      </div>
    </section>
  );
}
