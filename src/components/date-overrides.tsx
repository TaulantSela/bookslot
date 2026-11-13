import type { DateOverride } from "@/db/schema";
import { addDateOverrideAction, deleteDateOverrideAction } from "@/lib/availability-actions";
import { ActionForm } from "@/components/action-form";
import { Button, Input, Label } from "@/components/ui";

function describe(o: DateOverride) {
  const days = o.startDate === o.endDate ? o.startDate : `${o.startDate} → ${o.endDate}`;
  const what = o.startTime && o.endTime ? `Open ${o.startTime}–${o.endTime}` : "Closed";
  return { days, what };
}

/** Upcoming closed days / special hours, with a form to add more. */
export function DateOverrides({
  overrides,
  today,
  staffId,
  closedLabel = "Closed",
  notePlaceholder = "Public holiday",
}: {
  overrides: DateOverride[];
  /** yyyy-MM-dd in the shop's timezone. */
  today: string;
  /** Set for one staff member's time off; omit for the whole shop. */
  staffId?: string;
  closedLabel?: string;
  notePlaceholder?: string;
}) {
  const id = (name: string) => `${staffId ?? "shop"}-${name}`;
  return (
    <>
      {overrides.length > 0 && (
        <ul className="mt-4 divide-y divide-zinc-100 rounded-lg border border-zinc-200">
          {overrides.map((o) => {
            const { days, what } = describe(o);
            return (
              <li key={o.id} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                <div>
                  <span className="font-medium text-zinc-900">{days}</span>
                  <span className="text-zinc-600"> · {what}</span>
                  {o.label && <span className="text-zinc-500"> · {o.label}</span>}
                </div>
                <form action={deleteDateOverrideAction.bind(null, o.id)}>
                  <Button type="submit" variant="ghost" className="px-2 py-1 text-xs">
                    Remove
                  </Button>
                </form>
              </li>
            );
          })}
        </ul>
      )}

      <ActionForm
        action={addDateOverrideAction}
        submitLabel="Add"
        resetOnSuccess
        className="mt-4 grid gap-4 md:grid-cols-4"
      >
        {staffId && <input type="hidden" name="staffId" value={staffId} />}
        <div>
          <Label htmlFor={id("startDate")}>From</Label>
          <Input id={id("startDate")} name="startDate" type="date" min={today} required />
        </div>
        <div>
          <Label htmlFor={id("endDate")}>To (optional)</Label>
          <Input id={id("endDate")} name="endDate" type="date" min={today} />
        </div>
        <div className="md:col-span-2">
          <Label htmlFor={id("label")}>Note for clients (optional)</Label>
          <Input id={id("label")} name="label" placeholder={notePlaceholder} maxLength={80} />
        </div>
        <fieldset className="md:col-span-4">
          <legend className="mb-1.5 text-sm font-medium text-zinc-700">On those days</legend>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-zinc-700">
            <label className="flex items-center gap-2">
              <input type="radio" name="kind" value="closed" defaultChecked /> {closedLabel}
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="kind" value="hours" /> Available from
            </label>
            <Input name="startTime" type="time" defaultValue="10:00" className="w-32" aria-label="From" />
            <span>to</span>
            <Input name="endTime" type="time" defaultValue="14:00" className="w-32" aria-label="To" />
          </div>
        </fieldset>
      </ActionForm>
    </>
  );
}
