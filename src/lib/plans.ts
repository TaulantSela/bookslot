// What each billing plan unlocks. Plans are set per shop by hand after a
// customer pays (scripts/set-plan.ts); there is no payment integration.
//
// Rule of thumb: never gate basic booking. The embed is free (it is also our
// distribution); customisation, branding removal and integration are paid.

export const PLANS = ["free", "pro"] as const;
export type Plan = (typeof PLANS)[number];

export type Entitlements = {
  /** Online bookings accepted per calendar month (shop timezone). Null = unlimited. */
  monthlyBookingLimit: number | null;
  /** Show the "Powered by BookSlot" badge in the widget and booking page. */
  showBadge: boolean;
  /** Host sites may override colors, radius, font and light/dark scheme. */
  customTheme: boolean;
  /** Host sites may preselect a service and prefill customer details. */
  prefill: boolean;
  /** Widget sends `booked` and `error` events to the host page. (`ready` and `resize` are always sent.) */
  hostEvents: boolean;
  /** Custom questions on the booking form. (Showing/hiding the standard fields is free.) */
  customFields: boolean;
};

export const PLAN_ENTITLEMENTS: Record<Plan, Entitlements> = {
  free: {
    monthlyBookingLimit: 50,
    showBadge: true,
    customTheme: false,
    prefill: false,
    hostEvents: false,
    customFields: false,
  },
  pro: {
    monthlyBookingLimit: null,
    showBadge: false,
    customTheme: true,
    prefill: true,
    hostEvents: true,
    customFields: true,
  },
};

export function isPlan(value: unknown): value is Plan {
  return typeof value === "string" && (PLANS as readonly string[]).includes(value);
}

/** Unknown or missing plans fall back to the free plan, never to a paid one. */
export function entitlementsFor(plan: string | null | undefined): Entitlements {
  return PLAN_ENTITLEMENTS[isPlan(plan) ? plan : "free"];
}
