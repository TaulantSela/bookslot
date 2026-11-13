import { asc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { formFields, type FormField } from "@/db/schema";
import { getDashboardContext } from "@/lib/actions";
import {
  FIELD_TYPE_LABELS,
  FIELD_TYPES,
  MAX_FORM_FIELDS,
  standardFields,
} from "@/lib/booking-form";
import {
  addQuestionAction,
  deleteQuestionAction,
  moveQuestionAction,
  saveQuestionAction,
  saveStandardFieldsAction,
} from "@/lib/form-actions";
import { entitlementsFor } from "@/lib/plans";
import { ActionForm } from "@/components/action-form";
import { Select } from "@/components/select";
import { Button, Card, Input, Label, Textarea } from "@/components/ui";

const MODE_OPTIONS = [
  { value: "required", label: "Required" },
  { value: "optional", label: "Optional" },
  { value: "hidden", label: "Hidden" },
];

const TYPE_OPTIONS = FIELD_TYPES.map((type) => ({ value: type, label: FIELD_TYPE_LABELS[type] }));

function QuestionFields({ field }: { field?: FormField }) {
  const id = (name: string) => `${field?.id ?? "new"}-${name}`;
  return (
    <>
      {field && <input type="hidden" name="fieldId" value={field.id} />}
      <div className="md:col-span-2">
        <Label htmlFor={id("label")}>Question</Label>
        <Input
          id={id("label")}
          name="label"
          defaultValue={field?.label}
          placeholder="Any allergies we should know about?"
          maxLength={120}
          required
        />
      </div>
      <div>
        <Label htmlFor={id("type")}>Answer type</Label>
        <Select id={id("type")} name="type" defaultValue={field?.type ?? "text"} options={TYPE_OPTIONS} />
      </div>
      <label className="flex items-center gap-2 self-end pb-2.5 text-sm text-zinc-700">
        <input type="checkbox" name="required" defaultChecked={field?.required ?? false} />
        Required
      </label>
      <div className="md:col-span-2">
        <Label htmlFor={id("options")}>Dropdown choices (one per line)</Label>
        <Textarea
          id={id("options")}
          name="options"
          rows={3}
          defaultValue={field?.options?.join("\n") ?? ""}
          placeholder={"First visit\nReturning client"}
        />
      </div>
      <div className="md:col-span-2">
        <Label htmlFor={id("helpText")}>Hint under the question (optional)</Label>
        <Input id={id("helpText")} name="helpText" defaultValue={field?.helpText ?? ""} maxLength={200} />
      </div>
    </>
  );
}

export default async function BookingFormPage() {
  const ctx = await getDashboardContext();
  if (!ctx?.shop) redirect("/login");
  const shop = ctx.shop;
  const fields = standardFields(shop);
  const pro = entitlementsFor(shop.plan).customFields;

  const questions = await db
    .select()
    .from(formFields)
    .where(eq(formFields.shopId, shop.id))
    .orderBy(asc(formFields.sortOrder), asc(formFields.createdAt));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Booking form</h1>
        <p className="text-sm text-zinc-600">What clients fill in when they book</p>
      </div>

      <Card>
        <h2 className="font-medium text-zinc-900">Standard fields</h2>
        <p className="mt-1 text-sm text-zinc-500">Name is always required.</p>
        <ActionForm
          action={saveStandardFieldsAction}
          submitLabel="Save fields"
          className="mt-4 grid gap-4 md:grid-cols-3"
        >
          <div>
            <Label htmlFor="phoneField">Phone</Label>
            <Select id="phoneField" name="phoneField" defaultValue={fields.phone} options={MODE_OPTIONS} />
          </div>
          <div>
            <Label htmlFor="emailField">Email</Label>
            <Select id="emailField" name="emailField" defaultValue={fields.email} options={MODE_OPTIONS} />
            <p className="mt-1 text-xs text-zinc-500">Confirmations and reminders go by email.</p>
          </div>
          <div>
            <Label htmlFor="notesField">Notes</Label>
            <Select id="notesField" name="notesField" defaultValue={fields.notes} options={MODE_OPTIONS} />
          </div>
        </ActionForm>
      </Card>

      <Card>
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-medium text-zinc-900">Your questions</h2>
          {!pro && (
            <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-600">Pro</span>
          )}
        </div>
        <p className="mt-1 text-sm text-zinc-500">
          Ask what you need before the appointment: allergies, car model, first visit… Answers show up
          with each booking. The key in brackets is what the API, webhooks and prefill use.
        </p>

        {!pro ? (
          <p className="mt-4 rounded-lg bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
            Custom questions are part of the Pro plan. Ask for an upgrade on the Widget page.
            {questions.length > 0 && " Your existing questions are kept but not shown to clients."}
          </p>
        ) : (
          <>
            {questions.length > 0 && (
              <ul className="mt-4 space-y-3">
                {questions.map((field, index) => (
                  <li key={field.id} className="rounded-lg border border-zinc-200 px-4 py-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="text-sm">
                        <span className="font-medium text-zinc-900">{field.label}</span>
                        <span className="text-zinc-500">
                          {" "}
                          · {FIELD_TYPE_LABELS[field.type as keyof typeof FIELD_TYPE_LABELS] ?? field.type}
                          {field.required ? " · Required" : ""}
                        </span>{" "}
                        <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-600">{field.key}</code>
                      </div>
                      <div className="flex gap-1">
                        <form action={moveQuestionAction.bind(null, field.id, "up")}>
                          <Button variant="ghost" className="px-2 text-xs" disabled={index === 0} aria-label="Move up">
                            ↑
                          </Button>
                        </form>
                        <form action={moveQuestionAction.bind(null, field.id, "down")}>
                          <Button
                            variant="ghost"
                            className="px-2 text-xs"
                            disabled={index === questions.length - 1}
                            aria-label="Move down"
                          >
                            ↓
                          </Button>
                        </form>
                        <form action={deleteQuestionAction.bind(null, field.id)}>
                          <Button variant="ghost" className="text-xs text-red-600">
                            Delete
                          </Button>
                        </form>
                      </div>
                    </div>
                    <details className="mt-2">
                      <summary className="cursor-pointer text-sm text-blue-600">Edit</summary>
                      <ActionForm
                        action={saveQuestionAction}
                        submitLabel="Save question"
                        submitVariant="secondary"
                        className="mt-3 grid gap-3 md:grid-cols-4"
                      >
                        <QuestionFields field={field} />
                      </ActionForm>
                    </details>
                  </li>
                ))}
              </ul>
            )}

            {questions.length < MAX_FORM_FIELDS && (
              <div className="mt-6 border-t border-zinc-100 pt-4">
                <h3 className="text-sm font-medium text-zinc-900">Add a question</h3>
                <ActionForm
                  action={addQuestionAction}
                  submitLabel="Add question"
                  pendingLabel="Adding…"
                  resetOnSuccess
                  className="mt-3 grid gap-3 md:grid-cols-4"
                >
                  <QuestionFields />
                </ActionForm>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
