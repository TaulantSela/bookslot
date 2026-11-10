"use client";

// @bookslot/react: the BookSlot booking widget as a React component.
//
// The widget itself is served by BookSlot (widget.js plus an iframe), so
// fixes and new features reach every site without a package update. This
// package only loads that script and gives it a typed React API.

import { useEffect, useRef, type CSSProperties } from "react";

export const DEFAULT_BOOKSLOT_URL = "https://bookslot-rho.vercel.app";

export type BookSlotTheme = {
  /** Hex colour for buttons and highlights. */
  primary?: string;
  /** Hex colour for the widget background. */
  background?: string;
  /** Hex colour for text. */
  text?: string;
  /** Corner radius in pixels, 0–32. */
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
  /** ISO timestamp. */
  startsAt: string;
  /** ISO timestamp. */
  endsAt: string;
  /** Human-readable time in the shop's timezone, e.g. "Thu, 12 Nov 2026 · 11:00–12:00". */
  when: string;
};

export type BookSlotWidgetProps = {
  /** The shop's slug from the BookSlot dashboard. */
  shop: string;
  /** Where BookSlot runs. Defaults to the hosted service. */
  bookslotUrl?: string;
  /** Pro: match your site's look. Changing it reloads the widget. */
  theme?: BookSlotTheme;
  /** Pro: service id to preselect (listed in Dashboard → Widget). Can change at any time. */
  service?: string;
  /** Pro: details of the signed-in user. Sent by postMessage, never in the URL. */
  customer?: BookSlotCustomer;
  /** Height in pixels before the widget reports its own size. Default 720. */
  initialHeight?: number;
  /** Max width of the frame. Default 480px. */
  maxWidth?: number | string;
  /** Accessible title of the iframe. */
  title?: string;
  className?: string;
  style?: CSSProperties;
  onReady?: (detail: { shop: string }) => void;
  onResize?: (detail: { height: number }) => void;
  /** Pro: a booking was made. */
  onBooked?: (booking: BookSlotBooking) => void;
  /** Pro: a booking failed. */
  onError?: (detail: { message: string }) => void;
};

type EventName = "ready" | "resize" | "booked" | "error";

type BookSlotInstance = {
  on(type: EventName, fn: (detail: unknown) => void): BookSlotInstance;
  prefill(customer: BookSlotCustomer, service?: string): BookSlotInstance;
  destroy(): void;
};

type BookSlotApi = {
  version: number;
  /** The BookSlot address this API talks to. */
  origin?: string;
  mount(target: HTMLElement, options: Record<string, unknown>): BookSlotInstance;
};

type BookSlotGlobals = {
  BookSlot?: BookSlotApi;
  /** widget.js registers one API per BookSlot address here. */
  __bookslot?: Record<string, BookSlotApi>;
};

/** The API that widget.js from `origin` registered, if it has loaded. */
function apiFor(origin: string, { justLoaded = false } = {}) {
  const globals = window as unknown as BookSlotGlobals;
  const registered = globals.__bookslot?.[origin];
  if (registered) return registered;
  // A widget.js from before the registry existed only sets window.BookSlot.
  // Trust that only right after loading this origin's script, so another
  // BookSlot's global is never handed out for this address.
  const legacy = globals.BookSlot;
  return justLoaded && legacy && !legacy.origin ? legacy : undefined;
}

const loading = new Map<string, Promise<BookSlotApi>>();

/** Loads widget.js once per BookSlot address and resolves with that address's API. */
export function loadBookSlot(bookslotUrl: string = DEFAULT_BOOKSLOT_URL): Promise<BookSlotApi> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("BookSlot can only load in the browser"));
  }
  const base = bookslotUrl.replace(/\/+$/, "");
  const origin = new URL(base || "/", window.location.href).origin;
  const src = `${base}/widget.js`;

  const loaded = loading.has(src) ? undefined : apiFor(origin);
  if (loaded) return Promise.resolve(loaded);

  let promise = loading.get(src);
  if (!promise) {
    promise = new Promise<BookSlotApi>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.onload = () => {
        const api = apiFor(origin, { justLoaded: true });
        if (api) resolve(api);
        else reject(new Error(`BookSlot: ${src} loaded but did not define BookSlot`));
      };
      script.onerror = () => {
        loading.delete(src);
        script.remove();
        reject(new Error(`BookSlot: could not load ${src}`));
      };
      document.head.appendChild(script);
    });
    loading.set(src, promise);
  }
  return promise;
}

export function BookSlotWidget({
  shop,
  bookslotUrl = DEFAULT_BOOKSLOT_URL,
  theme,
  service,
  customer,
  initialHeight,
  maxWidth,
  title,
  className,
  style,
  onReady,
  onResize,
  onBooked,
  onError,
}: BookSlotWidgetProps) {
  const container = useRef<HTMLDivElement>(null);
  const widget = useRef<BookSlotInstance | null>(null);

  // Latest props for the widget's callbacks, without remounting it.
  const latest = useRef({ service, customer, onReady, onResize, onBooked, onError });
  useEffect(() => {
    latest.current = { service, customer, onReady, onResize, onBooked, onError };
  });

  // Theme travels in the iframe URL, so a new theme means a new frame.
  const themeKey = JSON.stringify(theme ?? {});

  useEffect(() => {
    let cancelled = false;
    let instance: BookSlotInstance | null = null;

    loadBookSlot(bookslotUrl).then(
      (api) => {
        if (cancelled || !container.current) return;
        const { service, customer } = latest.current;
        instance = api.mount(container.current, {
          shop,
          theme: JSON.parse(themeKey),
          service,
          prefill: customer,
          height: initialHeight,
          maxWidth,
          title,
        });
        instance
          .on("ready", (d) => latest.current.onReady?.(d as { shop: string }))
          .on("resize", (d) => latest.current.onResize?.(d as { height: number }))
          .on("booked", (d) => latest.current.onBooked?.(d as BookSlotBooking))
          .on("error", (d) => latest.current.onError?.(d as { message: string }));
        widget.current = instance;
      },
      (error: Error) => {
        if (!cancelled) latest.current.onError?.({ message: error.message });
      },
    );

    return () => {
      cancelled = true;
      instance?.destroy();
      widget.current = null;
    };
  }, [shop, bookslotUrl, themeKey, initialHeight, maxWidth, title]);

  // Switch service when the host page picks a different one.
  useEffect(() => {
    if (service) widget.current?.prefill({}, service);
  }, [service]);

  // Re-send customer details when they change (e.g. after sign-in).
  const customerKey = JSON.stringify(customer ?? {});
  useEffect(() => {
    if (customerKey !== "{}") widget.current?.prefill(JSON.parse(customerKey));
  }, [customerKey]);

  return <div ref={container} className={className} style={style} />;
}
