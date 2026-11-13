"use server";

import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { formFields, shops } from "@/db/schema";
import {
  FIELD_MODES,
  FIELD_TYPES,
  MAX_FORM_FIELDS,
  makeFieldKey,
  parseOptions,
} from "@/lib/booking-form";
import { refreshDashboard, requireOwnerShop, type ActionState } from "@/lib/dashboard";
import { newId } from "@/lib/id";
import { entitlementsFor } from "@/lib/plans";

const standardFieldsSchema = z.object({
  phoneField: z.enum(FIELD_MODES),
  emailField: z.enum(FIELD_MODES),
  notesField: z.enum(FIELD_MODES),
});

export async function saveStandardFieldsAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const shop = await requireOwnerShop();
  const parsed = standardFieldsSchema.safeParse({
    phoneField: formData.get("phoneField"),
    emailField: formData.get("emailField"),
    notesField: formData.get("notesField"),
  });
  if (!parsed.success) return { error: "Pick required, optional or hidden for each field." };

  await db.update(shops).set(parsed.data).where(eq(shops.id, shop.id));
  refreshDashboard();
  return {
    success:
      parsed.data.emailField === "hidden"
        ? "Saved. Without email, clients get no confirmation or reminder emails."
        : "Saved.",
  };
}

const questionSchema = z
  .object({
    label: z.string().trim().min(1).max(120),
    type: z.enum(FIELD_TYPES),
    required: z.boolean(),
    options: z.array(z.string()),
    helpText: z.string().trim().max(200),
  })
  .refine((q) => q.type !== "select" || q.options.length >= 2, {
    message: "A dropdown needs at least two choices, one per line.",
  });

function readQuestion(formData: FormData) {
  return questionSchema.safeParse({
    label: formData.get("label"),
    type: formData.get("type"),
    required: formData.get("required") === "on",
    options: parseOptions(String(formData.get("options") ?? "")),
    helpText: String(formData.get("helpText") ?? ""),
  });
}

async function requireProShop() {
  const shop = await requireOwnerShop();
  return entitlementsFor(shop.plan).customFields ? shop : null;
}

export async function addQuestionAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const shop = await requireProShop();
  if (!shop) return { error: "Custom questions are part of the Pro plan." };

  const parsed = readQuestion(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues.find((i) => i.path.length === 0)?.message ?? "Enter a question of up to 120 characters." };
  }

  const existing = await db
    .select({ key: formFields.key })
    .from(formFields)
    .where(eq(formFields.shopId, shop.id));
  if (existing.length >= MAX_FORM_FIELDS) {
    return { error: `You can add up to ${MAX_FORM_FIELDS} questions.` };
  }

  const q = parsed.data;
  await db.insert(formFields).values({
    id: newId("fld"),
    shopId: shop.id,
    key: makeFieldKey(q.label, existing.map((f) => f.key)),
    label: q.label,
    type: q.type,
    required: q.required,
    options: q.type === "select" ? q.options : null,
    helpText: q.helpText || null,
    sortOrder: existing.length,
    createdAt: new Date(),
  });

  refreshDashboard();
  return { success: `Added “${q.label}”.` };
}

export async function saveQuestionAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const shop = await requireProShop();
  if (!shop) return { error: "Custom questions are part of the Pro plan." };

  const parsed = readQuestion(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues.find((i) => i.path.length === 0)?.message ?? "Enter a question of up to 120 characters." };
  }

  const q = parsed.data;
  // The key stays as it was: integrations rely on it.
  await db
    .update(formFields)
    .set({
      label: q.label,
      type: q.type,
      required: q.required,
      options: q.type === "select" ? q.options : null,
      helpText: q.helpText || null,
    })
    .where(and(eq(formFields.id, String(formData.get("fieldId"))), eq(formFields.shopId, shop.id)));

  refreshDashboard();
  return { success: "Saved." };
}

/** Past bookings keep their answers (stored with each appointment). */
export async function deleteQuestionAction(fieldId: string) {
  const shop = await requireOwnerShop();
  await db
    .delete(formFields)
    .where(and(eq(formFields.id, fieldId), eq(formFields.shopId, shop.id)));
  refreshDashboard();
}

export async function moveQuestionAction(fieldId: string, direction: "up" | "down") {
  const shop = await requireOwnerShop();
  const list = await db
    .select({ id: formFields.id })
    .from(formFields)
    .where(eq(formFields.shopId, shop.id))
    .orderBy(asc(formFields.sortOrder), asc(formFields.createdAt));

  const from = list.findIndex((f) => f.id === fieldId);
  const to = direction === "up" ? from - 1 : from + 1;
  if (from < 0 || to < 0 || to >= list.length) return;

  [list[from], list[to]] = [list[to], list[from]];
  const [first, ...rest] = list.map((f, index) =>
    db.update(formFields).set({ sortOrder: index }).where(eq(formFields.id, f.id)),
  );
  await db.batch([first, ...rest]);
  refreshDashboard();
}
