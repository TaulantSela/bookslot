import { describe, expect, it } from "vitest";
import {
  buildThemeCss,
  contrastText,
  parseFont,
  parseHexColor,
  parseRadius,
  parseScheme,
  parseThemeParams,
} from "./theme";

describe("parseHexColor", () => {
  it.each([
    ["#f5c542", "#f5c542"],
    ["F5C542", "#f5c542"],
    ["#abc", "#aabbcc"],
    ["abc", "#aabbcc"],
    [" #ABCDEF ", "#abcdef"],
  ])("%s -> %s", (input, expected) => {
    expect(parseHexColor(input)).toBe(expected);
  });

  it.each([
    "red",
    "#12345",
    "#1234567",
    "#ggg",
    "rgb(0,0,0)",
    "url(https://evil.example/x.png)",
    "#fff;}body{display:none",
    "",
    undefined,
    42,
  ])("rejects %s", (input) => {
    expect(parseHexColor(input)).toBeNull();
  });
});

describe("parseRadius / parseFont / parseScheme", () => {
  it("accepts small whole numbers and clamps large ones", () => {
    expect(parseRadius("0")).toBe(0);
    expect(parseRadius("8")).toBe(8);
    expect(parseRadius(16)).toBe(16);
    expect(parseRadius("999")).toBe(32);
  });

  it.each(["-1", "8px", "1.5", "1e3", "", "calc(1px)", "8;}"])(
    "rejects radius %s",
    (input) => expect(parseRadius(input)).toBeNull(),
  );

  it("only accepts known font presets", () => {
    expect(parseFont("serif")).toBe("serif");
    expect(parseFont("Comic Sans")).toBeNull();
    expect(parseFont("toString")).toBeNull();
    expect(parseFont("constructor")).toBeNull();
  });

  it("only accepts light, dark and auto", () => {
    expect(parseScheme("dark")).toBe("dark");
    expect(parseScheme("DARK")).toBeNull();
    expect(parseScheme("sepia")).toBeNull();
  });
});

describe("parseThemeParams", () => {
  it("keeps valid values and silently drops the rest", () => {
    expect(
      parseThemeParams({
        primary: "f5c542",
        background: "not-a-color",
        text: ["#ffffff", "#000000"],
        radius: "8",
        font: "serif",
        scheme: "dark",
        unrelated: "ignored",
      }),
    ).toEqual({
      primary: "#f5c542",
      text: "#ffffff",
      radius: 8,
      font: "serif",
      scheme: "dark",
    });
  });

  it("returns nothing for an empty query", () => {
    expect(parseThemeParams({})).toEqual({});
  });
});

describe("contrastText", () => {
  it("uses dark text on light colors and white on dark ones", () => {
    expect(contrastText("#f5c542")).toBe("#18181b"); // gold
    expect(contrastText("#ffffff")).toBe("#18181b");
    expect(contrastText("#2563eb")).toBe("#ffffff"); // blue
    expect(contrastText("#7c3aed")).toBe("#ffffff"); // purple
    expect(contrastText("#000000")).toBe("#ffffff");
  });
});

describe("buildThemeCss", () => {
  it("uses the shop color when there are no overrides", () => {
    const css = buildThemeCss({ shopPrimary: "#7c3aed", selector: ":root" });
    expect(css).toContain("--bs-primary:#7c3aed;");
    expect(css).toContain("color-scheme:light;");
    expect(css).not.toContain("prefers-color-scheme");
  });

  it("applies overrides on top of the shop color", () => {
    const css = buildThemeCss({
      shopPrimary: "#7c3aed",
      overrides: { primary: "#f5c542", radius: 4, font: "serif", scheme: "dark" },
      selector: ":root",
    });
    expect(css).toContain("--bs-primary:#f5c542;");
    expect(css).toContain("--bs-primary-text:#18181b;");
    expect(css).toContain("--bs-radius:4px;");
    expect(css).toContain("color-scheme:dark;");
    expect(css).toContain("Georgia");
  });

  it("adds a dark media query for the auto scheme", () => {
    const css = buildThemeCss({
      shopPrimary: "#2563eb",
      overrides: { scheme: "auto" },
      selector: ".bookslot",
    });
    expect(css.startsWith(".bookslot{")).toBe(true);
    expect(css).toContain("@media (prefers-color-scheme: dark){.bookslot{");
  });

  it("falls back to the default blue if the stored shop color is invalid", () => {
    const css = buildThemeCss({ shopPrimary: "javascript:alert(1)", selector: ":root" });
    expect(css).toContain("--bs-primary:#2563eb;");
    expect(css).not.toContain("javascript");
  });

  it("never contains characters that could close the style block", () => {
    const css = buildThemeCss({
      shopPrimary: "#fff",
      overrides: parseThemeParams({
        primary: "</style><script>alert(1)</script>",
        background: "#000;}body{display:none",
        font: "serif",
      }),
      selector: ":root",
      paintBody: true,
    });
    expect(css).not.toMatch(/<|>|script|display:none/);
  });
});
