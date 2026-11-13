import { describe, expect, it } from "vitest";
import {
  formatPrice,
  guessCurrency,
  isValidCurrency,
  isValidTimeZone,
  listTimeZones,
} from "./regional";

describe("formatPrice", () => {
  it("formats hundredths in the shop's currency", () => {
    expect(formatPrice(2500, "EUR")).toBe("€25");
    expect(formatPrice(1250, "GBP")).toBe("£12.50");
    expect(formatPrice(80000, "MKD")?.replace(/\s/g, " ")).toBe("MKD 800");
  });

  it("shows nothing for no price or a zero price", () => {
    expect(formatPrice(null, "EUR")).toBeNull();
    expect(formatPrice(undefined, "EUR")).toBeNull();
    expect(formatPrice(0, "EUR")).toBeNull();
  });
});

describe("validation", () => {
  it("accepts IANA timezones and rejects anything else", () => {
    expect(isValidTimeZone("Europe/Skopje")).toBe(true);
    expect(isValidTimeZone("America/Argentina/Buenos_Aires")).toBe(true);
    expect(isValidTimeZone("UTC")).toBe(true);
    expect(isValidTimeZone("Mars/Base")).toBe(false);
    expect(isValidTimeZone("")).toBe(false);
    expect(isValidTimeZone(undefined)).toBe(false);
    expect(listTimeZones()).toContain("UTC");
  });

  it("accepts ISO 4217 currencies only", () => {
    expect(isValidCurrency("MKD")).toBe(true);
    expect(isValidCurrency("EUR")).toBe(true);
    expect(isValidCurrency("eur")).toBe(false);
    expect(isValidCurrency("XYZ1")).toBe(false);
  });
});

describe("guessCurrency", () => {
  it("guesses from the timezone and falls back to euros", () => {
    expect(guessCurrency("Europe/Skopje")).toBe("MKD");
    expect(guessCurrency("Europe/London")).toBe("GBP");
    expect(guessCurrency("America/Chicago")).toBe("USD");
    expect(guessCurrency("Europe/Berlin")).toBe("EUR");
  });
});
