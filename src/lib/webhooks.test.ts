import { describe, expect, it } from "vitest";
import { generateApiKey, hashApiKey, looksLikeApiKey } from "./api-keys";
import { isPrivateAddress, signPayload, validateWebhookUrl, verifySignature } from "./webhooks";

describe("webhook signatures", () => {
  const secret = "whsec_test";
  const body = JSON.stringify({ id: "evt_1", type: "appointment.created" });
  const now = 1_763_035_200_000;
  const header = signPayload(secret, body, now / 1000);

  it("verifies its own signatures", () => {
    expect(header).toMatch(/^t=1763035200,v1=[0-9a-f]{64}$/);
    expect(verifySignature(secret, body, header, { now })).toBe(true);
  });

  it("rejects a changed body, the wrong secret, garbage and old timestamps", () => {
    expect(verifySignature(secret, body + " ", header, { now })).toBe(false);
    expect(verifySignature("whsec_other", body, header, { now })).toBe(false);
    expect(verifySignature(secret, body, "t=abc,v1=zz", { now })).toBe(false);
    expect(verifySignature(secret, body, header, { now: now + 301_000 })).toBe(false);
  });
});

describe("isPrivateAddress", () => {
  it.each(["127.0.0.1", "10.1.2.3", "172.16.0.1", "172.31.255.255", "192.168.1.1", "169.254.169.254", "100.64.0.1", "0.0.0.0", "::1", "fd00::1", "fe80::1", "::ffff:10.0.0.1"])(
    "%s is private",
    (address) => expect(isPrivateAddress(address)).toBe(true),
  );

  it.each(["8.8.8.8", "172.32.0.1", "192.169.0.1", "2a00:1450:4001::200e", "::ffff:8.8.8.8"])(
    "%s is public",
    (address) => expect(isPrivateAddress(address)).toBe(false),
  );
});

describe("validateWebhookUrl", () => {
  const prod = { allowLocal: false };

  it("accepts public https URLs and drops the fragment", () => {
    expect(validateWebhookUrl("https://example.com/hooks/bookslot#x", prod)).toEqual({
      url: "https://example.com/hooks/bookslot",
    });
  });

  it.each([
    ["http://example.com/hook", "Webhook URLs must use https."],
    ["https://localhost/hook", "Webhooks must go to a public address."],
    ["https://10.0.0.5/hook", "Webhooks must go to a public address."],
    ["https://[::1]/hook", "Webhooks must go to a public address."],
    ["https://user:pass@example.com/hook", "Leave credentials out of the URL."],
    ["example.com/hook", "Enter a full URL, like https://example.com/webhooks/bookslot."],
    ["ftp://example.com/hook", "Webhook URLs must use https."],
  ])("rejects %s in production", (url, error) => {
    expect(validateWebhookUrl(url, prod)).toEqual({ error });
  });

  it("allows http://localhost only in development", () => {
    expect(validateWebhookUrl("http://localhost:4000/hook", { allowLocal: true })).toEqual({
      url: "http://localhost:4000/hook",
    });
    expect(validateWebhookUrl("http://example.com/hook", { allowLocal: true })).toEqual({
      error: "Webhook URLs must use https.",
    });
  });
});

describe("API keys", () => {
  it("generates long random keys and only needs their hash", () => {
    const a = generateApiKey();
    const b = generateApiKey();
    expect(looksLikeApiKey(a.key)).toBe(true);
    expect(a.key).not.toBe(b.key);
    expect(a.prefix).toBe(a.key.slice(0, 10));
    expect(a.hash).toBe(hashApiKey(a.key));
    expect(a.hash).toMatch(/^[0-9a-f]{64}$/);
    expect(looksLikeApiKey("bsk_short")).toBe(false);
  });
});
