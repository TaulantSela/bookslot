import { describe, expect, it } from "vitest";
import { escapeHtml } from "./email";

describe("escapeHtml", () => {
  it("neutralises markup in customer-supplied names", () => {
    expect(
      escapeHtml(`<a href="https://evil.example">Verify your account</a>`),
    ).toBe(
      "&lt;a href=&quot;https://evil.example&quot;&gt;Verify your account&lt;/a&gt;",
    );
  });

  it("escapes ampersands first so entities are not double-decoded", () => {
    expect(escapeHtml("Tom & Jerry's &lt;")).toBe("Tom &amp; Jerry&#39;s &amp;lt;");
  });

  it("leaves plain text alone", () => {
    expect(escapeHtml("Ana Petrovska")).toBe("Ana Petrovska");
    expect(escapeHtml("Салон Ана")).toBe("Салон Ана");
  });
});
