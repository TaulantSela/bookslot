import { describe, expect, it } from "vitest";
import {
  embedFrameAncestors,
  normalizeEmbedDomain,
  parseEmbedDomains,
  parseInstanceId,
  parseParentOrigin,
} from "./embed";
import { PLAN_ENTITLEMENTS, entitlementsFor, isPlan } from "./plans";
import { widgetScript } from "./widget-script";

describe("normalizeEmbedDomain", () => {
  it.each([
    ["example.com", "example.com"],
    ["Example.COM", "example.com"],
    ["  example.com/  ", "example.com"],
    ["https://www.example.com/book?x=1#top", "https://www.example.com"],
    ["http://shop.example.mk", "http://shop.example.mk"],
    ["*.example.com", "*.example.com"],
    ["https://*.example.com", "https://*.example.com"],
    ["localhost:3000", "localhost:3000"],
    ["http://127.0.0.1:4000", "http://127.0.0.1:4000"],
    ["xn--80ak6aa92e.com", "xn--80ak6aa92e.com"],
  ])("%s -> %s", (input, expected) => {
    expect(normalizeEmbedDomain(input)).toBe(expected);
  });

  it.each([
    "",
    "*",
    "example",
    "javascript:alert(1)",
    "ftp://example.com",
    "exa mple.com",
    "'self'",
    "example.com; script-src *",
    "*.com.*",
    "-bad-.com",
  ])("rejects %s", (input) => {
    expect(normalizeEmbedDomain(input)).toBeNull();
  });
});

describe("parseEmbedDomains", () => {
  it("splits on lines and commas, normalizes and de-duplicates", () => {
    expect(
      parseEmbedDomains("example.com\nhttps://www.example.com/\n, example.com,\n\n"),
    ).toEqual({ domains: ["example.com", "https://www.example.com"], invalid: [] });
  });

  it("reports what it couldn't parse", () => {
    expect(parseEmbedDomains("example.com\nnot a domain")).toEqual({
      domains: ["example.com"],
      invalid: ["not a domain"],
    });
  });
});

describe("embedFrameAncestors", () => {
  it("allows any site (plus ourselves) when no domains are set", () => {
    expect(embedFrameAncestors(null)).toBe("frame-ancestors 'self' *");
    expect(embedFrameAncestors([])).toBe("frame-ancestors 'self' *");
  });

  it("lists only valid domains", () => {
    expect(
      embedFrameAncestors(["example.com", "https://*.example.org", "bad; script-src *"]),
    ).toBe("frame-ancestors 'self' example.com https://*.example.org");
  });

  it("allows http and https for local hosts typed without a scheme", () => {
    // On an https BookSlot a bare "localhost:3001" would only match https,
    // but local dev sites are plain http.
    expect(embedFrameAncestors(["localhost:3001", "127.0.0.1:8080"])).toBe(
      "frame-ancestors 'self' http://localhost:3001 https://localhost:3001 http://127.0.0.1:8080 https://127.0.0.1:8080",
    );
    expect(embedFrameAncestors(["http://localhost:3001"])).toBe(
      "frame-ancestors 'self' http://localhost:3001",
    );
    expect(embedFrameAncestors(["example.com"])).toBe("frame-ancestors 'self' example.com");
  });

  it("does not fall back to * when every stored entry is invalid", () => {
    // Defensive: the action never stores invalid entries, but if one slipped
    // in we should not silently open the embed to every site.
    expect(embedFrameAncestors(["; script-src *"])).toBe("frame-ancestors 'self'");
  });
});

describe("parseParentOrigin / parseInstanceId", () => {
  it("accepts exact http(s) origins only", () => {
    expect(parseParentOrigin("https://example.com")).toBe("https://example.com");
    expect(parseParentOrigin("http://localhost:3000")).toBe("http://localhost:3000");
    expect(parseParentOrigin("https://example.com/page")).toBeNull();
    expect(parseParentOrigin("javascript:alert(1)")).toBeNull();
    expect(parseParentOrigin("null")).toBeNull();
    expect(parseParentOrigin(undefined)).toBeNull();
  });

  it("accepts short safe instance ids", () => {
    expect(parseInstanceId("bs1-k3j9x2")).toBe("bs1-k3j9x2");
    expect(parseInstanceId("<script>")).toBeNull();
    expect(parseInstanceId("x".repeat(41))).toBeNull();
  });
});

describe("plans", () => {
  it("falls back to the free plan for anything unknown", () => {
    expect(entitlementsFor(undefined)).toBe(PLAN_ENTITLEMENTS.free);
    expect(entitlementsFor("enterprise")).toBe(PLAN_ENTITLEMENTS.free);
    expect(entitlementsFor("PRO")).toBe(PLAN_ENTITLEMENTS.free);
    expect(entitlementsFor("pro")).toBe(PLAN_ENTITLEMENTS.pro);
  });

  it("keeps basic booking on the free plan and paid options on pro", () => {
    expect(PLAN_ENTITLEMENTS.free).toMatchObject({
      showBadge: true,
      customTheme: false,
      prefill: false,
      hostEvents: false,
    });
    expect(PLAN_ENTITLEMENTS.free.monthlyBookingLimit).toBeGreaterThan(0);
    expect(PLAN_ENTITLEMENTS.pro).toMatchObject({
      monthlyBookingLimit: null,
      showBadge: false,
      customTheme: true,
      prefill: true,
      hostEvents: true,
    });
  });

  it("recognizes plan names", () => {
    expect(isPlan("free")).toBe(true);
    expect(isPlan("pro")).toBe(true);
    expect(isPlan("gold")).toBe(false);
  });
});

describe("widgetScript", () => {
  it("is valid JavaScript", () => {
    expect(() => new Function(widgetScript("https://bookslot.example"))).not.toThrow();
  });

  it("keeps one API per BookSlot address", () => {
    const fakeWindow: Record<string, unknown> = {
      addEventListener() {},
      location: { origin: "https://host.example", href: "https://host.example/" },
    };
    const run = (base: string) =>
      new Function("window", "document", widgetScript(base))(fakeWindow, {
        currentScript: null,
      });

    run("https://hosted.example");
    run("https://self-hosted.example");
    run("https://hosted.example");

    const registry = fakeWindow.__bookslot as Record<string, { origin: string }>;
    expect(Object.keys(registry)).toEqual(["https://hosted.example", "https://self-hosted.example"]);
    expect(registry["https://self-hosted.example"].origin).toBe("https://self-hosted.example");
    // The global stays the first one loaded, and reloading reuses it.
    expect(fakeWindow.BookSlot).toBe(registry["https://hosted.example"]);
  });

  it("embeds the base URL as a JSON string literal", () => {
    const script = widgetScript('https://a.example"; alert(1); "');
    expect(script).toContain(JSON.stringify('https://a.example"; alert(1); "'));
    expect(() => new Function(script)).not.toThrow();
  });
});
