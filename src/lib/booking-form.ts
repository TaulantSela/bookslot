import type { BookingAnswer, FormField, Shop } from "@/db/schema";
import { isValidDateString } from "@/lib/slots-internal";

// The booking form: the standard fields (name, phone, email, notes) that
// every plan can switch between required / optional / hidden, and the custom
// questions Pro shops add. Everything here runs on the server; the widget
// only renders what it is given.

export const FIELD_MODES = ["required", "optional", "hidden"] as const;
export type FieldMode = (typeof FIELD_MODES)[number];

export const FIELD_TYPES = ["text", "textarea", "number", "select", "checkbox", "date"] as const;
export type FieldType = (typeof FIELD_TYPES)[number];

export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  text: "Short text",
  textarea: "Long text",
  number: "Number",
  select: "Dropdown",
  checkbox: "Checkbox (yes/no)",
  date: "Date",
};

export const MAX_FORM_FIELDS = 15;
export const MAX_SELECT_OPTIONS = 30;

const TEXT_LIMITS: Record<FieldType, number> = {
  text: 200,
  textarea: 2000,
  number: 40,
  select: 100,
  checkbox: 5,
  date: 10,
};

export function fieldMode(value: unknown, fallback: FieldMode = "optional"): FieldMode {
  return (FIELD_MODES as readonly unknown[]).includes(value) ? (value as FieldMode) : fallback;
}

export function isFieldType(value: unknown): value is FieldType {
  return (FIELD_TYPES as readonly unknown[]).includes(value);
}

/** How the standard fields behave for a shop. */
export function standardFields(shop: Pick<Shop, "phoneField" | "emailField" | "notesField">) {
  return {
    phone: fieldMode(shop.phoneField, "required"),
    email: fieldMode(shop.emailField),
    notes: fieldMode(shop.notesField),
  };
}
export type StandardFields = ReturnType<typeof standardFields>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type CustomerInput = {
  name?: unknown;
  phone?: unknown;
  email?: unknown;
  notes?: unknown;
};

const str = (value: unknown) => (typeof value === "string" ? value.trim() : "");

/**
 * Checks the standard fields against the shop's settings. Hidden fields are
 * dropped even if sent. Phone is stored as "" when not given (the column is
 * NOT NULL from before it could be optional).
 */
export function validateCustomer(
  fields: StandardFields,
  input: CustomerInput,
):
  | { customer: { name: string; phone: string; email: string | null; notes: string | null } }
  | { error: string } {
  const name = str(input.name);
  if (name.length < 2 || name.length > 80) return { error: "Please enter your name." };

  const phone = fields.phone === "hidden" ? "" : str(input.phone);
  if (fields.phone === "required" && phone.length < 5) {
    return { error: "Please enter your phone number." };
  }
  if (phone && (phone.length < 5 || phone.length > 30)) {
    return { error: "Please enter a valid phone number." };
  }

  const email = fields.email === "hidden" ? "" : str(input.email);
  if (fields.email === "required" && !email) return { error: "Please enter your email." };
  if (email && (email.length > 120 || !EMAIL_PATTERN.test(email))) {
    return { error: "Please enter a valid email address." };
  }

  const notes = fields.notes === "hidden" ? "" : str(input.notes);
  if (fields.notes === "required" && !notes) return { error: "Please add a note." };
  if (notes.length > 500) return { error: "Notes can be up to 500 characters." };

  return { customer: { name, phone, email: email || null, notes: notes || null } };
}

/** Raw answer → stored value, or an error message for the customer. */
function readAnswer(
  field: Pick<FormField, "type" | "label" | "required" | "options">,
  raw: unknown,
): { value: BookingAnswer["value"] | null } | { error: string } {
  const type = isFieldType(field.type) ? field.type : "text";

  if (type === "checkbox") {
    const checked = raw === true || raw === "on" || raw === "true" || raw === "yes";
    if (field.required && !checked) return { error: `Please tick “${field.label}”.` };
    return { value: checked };
  }

  const text = typeof raw === "number" ? String(raw) : str(raw);
  if (!text) {
    return field.required ? { error: `Please answer “${field.label}”.` } : { value: null };
  }
  if (text.length > TEXT_LIMITS[type]) {
    return { error: `“${field.label}” can be up to ${TEXT_LIMITS[type]} characters.` };
  }

  switch (type) {
    case "number": {
      const number = Number(text.replace(",", "."));
      return Number.isFinite(number) ? { value: number } : { error: `“${field.label}” must be a number.` };
    }
    case "select":
      return (field.options ?? []).includes(text)
        ? { value: text }
        : { error: `Please pick one of the options for “${field.label}”.` };
    case "date":
      return isValidDateString(text) ? { value: text } : { error: `“${field.label}” must be a date.` };
    default:
      return { value: text };
  }
}

/**
 * Validates answers (keyed by field key) against the shop's questions and
 * returns them with the label as it is now, so later edits to a question
 * don't change what past customers answered.
 */
export function validateAnswers(
  fields: Pick<FormField, "key" | "type" | "label" | "required" | "options">[],
  raw: Record<string, unknown>,
): { answers: BookingAnswer[] } | { error: string } {
  const answers: BookingAnswer[] = [];
  for (const field of fields) {
    const result = readAnswer(field, raw[field.key]);
    if ("error" in result) return result;
    if (result.value !== null) answers.push({ key: field.key, label: field.label, value: result.value });
  }
  return { answers };
}

/** "Any allergies?" → "any_allergies", made unique among `taken`. */
export function makeFieldKey(label: string, taken: Iterable<string>) {
  const base =
    label
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 40) || "question";
  const used = new Set(taken);
  if (!used.has(base)) return base;
  for (let n = 2; ; n++) {
    if (!used.has(`${base}_${n}`)) return `${base}_${n}`;
  }
}

/** Dropdown choices typed one per line → a clean list. */
export function parseOptions(text: string) {
  return [...new Set(text.split(/\r?\n/).map((o) => o.trim()).filter(Boolean))]
    .map((o) => o.slice(0, 100))
    .slice(0, MAX_SELECT_OPTIONS);
}

/** An answer for display, e.g. in the dashboard. */
export function formatAnswer(value: BookingAnswer["value"]) {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}
