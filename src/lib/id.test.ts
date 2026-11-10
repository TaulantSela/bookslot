import { describe, expect, it } from "vitest";
import { newId, slugify } from "./id";

describe("slugify", () => {
  it.each([
    ["Demo Beauty Salon", "demo-beauty-salon"],
    // Macedonian
    ["Салон Ана", "salon-ana"],
    ["Берберница Ѓорѓи", "berbernica-gjorgji"],
    ["Стоматолошка ординација Д-р Ќириќ", "stomatoloshka-ordinacija-d-r-kjirikj"],
    ["Барбершоп «Џеки» – Скопје", "barbershop-dzheki-skopje"],
    ["Ѕвезда", "dzvezda"],
    // Serbian
    ["Ђорђе и Ћира", "djordje-i-cira"],
    // Russian / Bulgarian (ъ follows the Bulgarian "a" convention)
    ["Щука и Юля", "shtuka-i-yulya"],
    ["България", "balgariya"],
    // Albanian and other Latin accents
    ["Sallon Bukurie Çelë", "sallon-bukurie-cele"],
    ["Café Ëmma", "cafe-emma"],
    // Punctuation and spacing
    ["  Dr. Smith's  Dental & Co.  ", "dr-smith-s-dental-co"],
  ])("%s -> %s", (input, expected) => {
    expect(slugify(input)).toBe(expected);
  });

  it("returns an empty string when nothing usable remains", () => {
    expect(slugify("!!!")).toBe("");
    expect(slugify("")).toBe("");
  });

  it("caps slugs at 48 characters without a trailing hyphen", () => {
    const slug = slugify(`${"a".repeat(47)} bcd`);
    expect(slug.length).toBeLessThanOrEqual(48);
    expect(slug.endsWith("-")).toBe(false);
  });
});

describe("newId", () => {
  it("adds the prefix", () => {
    expect(newId("appt")).toMatch(/^appt_[A-Za-z0-9_-]{12}$/);
  });

  it("is unique", () => {
    const ids = new Set(Array.from({ length: 1000 }, () => newId()));
    expect(ids.size).toBe(1000);
  });
});
