// Currency and timezone helpers. Both come from the runtime's Intl data, so
// any ISO 4217 currency and IANA timezone the server knows is accepted.

const EXTRA_TIMEZONES = ["UTC"];

let timezoneCache: string[] | null = null;
let currencyCache: string[] | null = null;

/** Every IANA timezone the runtime supports, sorted. */
export function listTimeZones() {
  timezoneCache ??= [
    ...new Set([...EXTRA_TIMEZONES, ...Intl.supportedValuesOf("timeZone")]),
  ].sort();
  return timezoneCache;
}

/** Every ISO 4217 currency code the runtime supports, sorted. */
export function listCurrencies() {
  currencyCache ??= [...Intl.supportedValuesOf("currency")].sort();
  return currencyCache;
}

export function isValidTimeZone(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0 || value.length > 64) {
    return false;
  }
  try {
    new Intl.DateTimeFormat("en", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

export function isValidCurrency(value: unknown): value is string {
  return typeof value === "string" && listCurrencies().includes(value);
}

/** "MKD — Macedonian Denar", for pickers. */
export function currencyLabel(code: string) {
  try {
    const name = new Intl.DisplayNames(["en"], { type: "currency" }).of(code);
    return name && name !== code ? `${code} — ${name}` : code;
  } catch {
    return code;
  }
}

// A first guess for new shops, refined in Settings. Only regions where the
// timezone pins the currency down; everything else falls back to euros.
const CURRENCY_BY_TIMEZONE: Record<string, string> = {
  "Europe/Skopje": "MKD",
  "Europe/Tirane": "ALL",
  "Europe/Belgrade": "RSD",
  "Europe/Sarajevo": "BAM",
  "Europe/Sofia": "BGN",
  "Europe/Bucharest": "RON",
  "Europe/Budapest": "HUF",
  "Europe/Warsaw": "PLN",
  "Europe/Prague": "CZK",
  "Europe/Istanbul": "TRY",
  "Europe/London": "GBP",
  "Europe/Zurich": "CHF",
  "Europe/Stockholm": "SEK",
  "Europe/Oslo": "NOK",
  "Europe/Copenhagen": "DKK",
  "Asia/Tokyo": "JPY",
  "Australia/Sydney": "AUD",
  "Australia/Melbourne": "AUD",
  "America/Toronto": "CAD",
  "America/Vancouver": "CAD",
};

export function guessCurrency(timezone: string) {
  if (CURRENCY_BY_TIMEZONE[timezone]) return CURRENCY_BY_TIMEZONE[timezone];
  if (timezone.startsWith("America/")) return "USD";
  return "EUR";
}

/**
 * A price for display, e.g. "€25", "MKD 800" or "£12.50". Prices are stored
 * in hundredths of the currency (priceCents), whatever its minor unit.
 * Returns null for no price or a zero price (shown as nothing).
 */
export function formatPrice(cents: number | null | undefined, currency: string) {
  if (cents == null || cents === 0) return null;
  const amount = cents / 100;
  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
      minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}
