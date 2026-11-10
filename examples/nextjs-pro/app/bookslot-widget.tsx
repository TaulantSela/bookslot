"use client";

// A reusable React wrapper around BookSlot's widget.js. Copy this file into
// your app. Theme, service, customer and booking events need the Pro plan;
// on Free the widget still works but ignores them.

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

const BOOKSLOT_URL = process.env.NEXT_PUBLIC_BOOKSLOT_URL ?? "http://localhost:3000";

export type BookSlotTheme = {
  primary?: string;
  background?: string;
  text?: string;
  radius?: number;
  font?: "sans" | "system" | "serif" | "mono";
  scheme?: "light" | "dark" | "auto";
};

export type BookSlotCustomer = {
  name?: string;
  email?: string;
  phone?: string;
  notes?: string;
};

export type BookSlotBooking = {
  appointmentId: string;
  serviceId: string;
  serviceName: string;
  startsAt: string;
  endsAt: string;
  when: string;
};

export type BookSlotEvent =
  | { type: "ready"; detail: { shop: string } }
  | { type: "resize"; detail: { height: number } }
  | { type: "booked"; detail: BookSlotBooking }
  | { type: "error"; detail: { message: string } };

type Instance = {
  on(type: BookSlotEvent["type"], fn: (detail: unknown) => void): Instance;
  prefill(customer: BookSlotCustomer, service?: string): Instance;
  destroy(): void;
};

declare global {
  interface Window {
    BookSlot?: {
      version: number;
      mount(target: HTMLElement, options: Record<string, unknown>): Instance;
    };
  }
}

const EVENT_TYPES: BookSlotEvent["type"][] = ["ready", "resize", "booked", "error"];

export function BookSlotWidget({
  shop,
  theme,
  service,
  customer,
  onEvent,
}: {
  shop: string;
  theme?: BookSlotTheme;
  /** Service id to preselect. Changing it later switches the widget's selection. */
  service?: string;
  /** Details of the signed-in user, sent by postMessage (never in the URL). */
  customer?: BookSlotCustomer;
  onEvent?: (event: BookSlotEvent) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const widget = useRef<Instance | null>(null);
  const [scriptReady, setScriptReady] = useState(false);

  // Latest props, read inside the widget's callbacks without remounting it.
  const latest = useRef({ theme, service, customer, onEvent });
  useEffect(() => {
    latest.current = { theme, service, customer, onEvent };
  });

  useEffect(() => {
    if (!scriptReady || !container.current || !window.BookSlot) return;
    const { theme, service, customer } = latest.current;
    const instance = window.BookSlot.mount(container.current, {
      shop,
      theme,
      service,
      prefill: customer,
    });
    for (const type of EVENT_TYPES) {
      instance.on(type, (detail) =>
        latest.current.onEvent?.({ type, detail } as BookSlotEvent),
      );
    }
    widget.current = instance;
    return () => {
      instance.destroy();
      widget.current = null;
    };
  }, [scriptReady, shop]);

  // Switch service when the host page asks for a different one.
  useEffect(() => {
    if (service) widget.current?.prefill({}, service);
  }, [service]);

  // Re-send customer details if they change (e.g. the user signs in).
  const customerKey = JSON.stringify(customer ?? {});
  useEffect(() => {
    if (customerKey !== "{}") widget.current?.prefill(JSON.parse(customerKey));
  }, [customerKey]);

  return (
    <>
      <Script src={`${BOOKSLOT_URL}/widget.js`} onReady={() => setScriptReady(true)} />
      <div ref={container} />
    </>
  );
}
