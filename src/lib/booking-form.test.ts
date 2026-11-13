import { describe, expect, it } from "vitest";
import {
  makeFieldKey,
  parseOptions,
  standardFields,
  validateAnswers,
  validateCustomer,
} from "./booking-form";

const defaults = standardFields({ phoneField: "required", emailField: "optional", notesField: "optional" });

describe("validateCustomer", () => {
  it("keeps today's behaviour by default: phone required, email and notes optional", () => {
    expect(validateCustomer(defaults, { name: "Ana", phone: "070123456" })).toEqual({
      customer: { name: "Ana", phone: "070123456", email: null, notes: null },
    });
    expect(validateCustomer(defaults, { name: "Ana" })).toEqual({
      error: "Please enter your phone number.",
    });
  });

  it("drops hidden fields even when they are sent", () => {
    const fields = standardFields({ phoneField: "hidden", emailField: "hidden", notesField: "hidden" });
    expect(
      validateCustomer(fields, { name: "Ana", phone: "070", email: "not-an-email", notes: "hi" }),
    ).toEqual({ customer: { name: "Ana", phone: "", email: null, notes: null } });
  });

  it("enforces required email and notes", () => {
    const fields = standardFields({ phoneField: "optional", emailField: "required", notesField: "required" });
    expect(validateCustomer(fields, { name: "Ana", notes: "x" })).toEqual({ error: "Please enter your email." });
    expect(validateCustomer(fields, { name: "Ana", email: "a@b.co" })).toEqual({ error: "Please add a note." });
    expect(validateCustomer(fields, { name: "Ana", email: "a@b.co", notes: "x" })).toMatchObject({
      customer: { phone: "", email: "a@b.co", notes: "x" },
    });
  });

  it("rejects bad values in optional fields", () => {
    expect(validateCustomer(defaults, { name: "Ana", phone: "070123456", email: "nope" })).toEqual({
      error: "Please enter a valid email address.",
    });
    expect(validateCustomer(defaults, { name: "A", phone: "070123456" })).toEqual({
      error: "Please enter your name.",
    });
  });
});

describe("validateAnswers", () => {
  const fields = [
    { key: "allergies", label: "Allergies", type: "text", required: false, options: null },
    { key: "visit", label: "Visit", type: "select", required: true, options: ["First", "Returning"] },
    { key: "age", label: "Age", type: "number", required: false, options: null },
    { key: "consent", label: "I agree", type: "checkbox", required: true, options: null },
    { key: "dob", label: "Date of birth", type: "date", required: false, options: null },
  ];

  it("returns answers with their labels and typed values", () => {
    expect(
      validateAnswers(fields, { allergies: " Latex ", visit: "First", age: "41", consent: "on", dob: "1985-03-02" }),
    ).toEqual({
      answers: [
        { key: "allergies", label: "Allergies", value: "Latex" },
        { key: "visit", label: "Visit", value: "First" },
        { key: "age", label: "Age", value: 41 },
        { key: "consent", label: "I agree", value: true },
        { key: "dob", label: "Date of birth", value: "1985-03-02" },
      ],
    });
  });

  it("leaves out unanswered optional questions and ignores unknown keys", () => {
    expect(validateAnswers(fields, { visit: "Returning", consent: true, extra: "x" })).toEqual({
      answers: [
        { key: "visit", label: "Visit", value: "Returning" },
        { key: "consent", label: "I agree", value: true },
      ],
    });
  });

  it.each([
    [{ consent: "on" }, "Please answer “Visit”."],
    [{ visit: "Other", consent: "on" }, "Please pick one of the options for “Visit”."],
    [{ visit: "First" }, "Please tick “I agree”."],
    [{ visit: "First", consent: "on", age: "old" }, "“Age” must be a number."],
    [{ visit: "First", consent: "on", dob: "2026-02-30" }, "“Date of birth” must be a date."],
    [{ visit: "First", consent: "on", allergies: "x".repeat(201) }, "“Allergies” can be up to 200 characters."],
  ])("rejects %j", (raw, error) => {
    expect(validateAnswers(fields, raw)).toEqual({ error });
  });
});

describe("makeFieldKey / parseOptions", () => {
  it("makes readable unique keys", () => {
    expect(makeFieldKey("Any allergies?", [])).toBe("any_allergies");
    expect(makeFieldKey("Car model", ["car_model"])).toBe("car_model_2");
    expect(makeFieldKey("Car model", ["car_model", "car_model_2"])).toBe("car_model_3");
    expect(makeFieldKey("Première visite", [])).toBe("premiere_visite");
    expect(makeFieldKey("???", [])).toBe("question");
  });

  it("cleans dropdown choices", () => {
    expect(parseOptions(" First \n\nReturning\nFirst\r\n")).toEqual(["First", "Returning"]);
  });
});
