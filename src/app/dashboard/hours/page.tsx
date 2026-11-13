import { and, asc, eq, gte } from "drizzle-orm";
import { formatInTimeZone } from "date-fns-tz";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { dateOverrides, workingHours } from "@/db/schema";
import { getDashboardContext } from "@/lib/actions";
import {
  addDateOverrideAction,
  deleteDateOverrideAction,
  saveBookingRulesAction,
  saveWorkingHoursAction,
} from "@/lib/availability-actions";
import { weeklyHoursFormValues } from "@/lib/hours-form";
import { formatMinutes } from "@/lib/duration";
import { ActionForm } from "@/components/action-form";
import { Select, withCurrent } from "@/components/select";
import { WeeklyHoursFields } from "@/components/weekly-hours-fields";
import { Button, Card, Input, Label } from "@/components/ui";

const minutes = (values: number[]) => values.map((value) => ({ value, label: formatMinutes(value) }));

const INTERVALS = minutes([5, 10, 15, 20, 30, 45, 60, 90, 120]);
const GAPS = [{ value: 0, label: "No gap" }, ...minutes([5, 10, 15, 20, 30, 45, 60, 90, 120])];
const NOTICE = [
  { value: 0, label: "None" },
  ...minutes([15, 30, 60, 120, 180, 360, 720, 1440, 2880, 4320, 10080]),
];
const ADVANCE = [0, 7, 14, 30, 60, 90, 180, 365, 730].map((value) => ({
  value,
  label: advanceLabel(value),
}));

function advanceLabel(days: number) {
  if (days === 0) return "Today only";
  if (days % 365 === 0) return days === 365 ? "1 year" : `${days / 365} years`;
  if (days % 7 === 0 && days < 60) return `${days / 7} week${days === 7 ? "" : "s"}`;
  return `${days} days`;
}

function describeOverride(o: typeof dateOverrides.$inferSelect) {
  const days = o.startDate === o.endDate ? o.startDate : `${o.startDate} → ${o.endDate}`;
  const what = o.startTime && o.endTime ? `Open ${o.startTime}–${o.endTime}` : "Closed";
  return { days, what };
}

export default async function AvailabilityPage() {
  const ctx = await getDashboardContext();
  if (!ctx?.shop) redirect("/login");
  const shop = ctx.shop;
  const today = formatInTimeZone(new Date(), shop.timezone, "yyyy-MM-dd");

  const [hours, overrides] = await Promise.all([
    db.select().from(workingHours).where(eq(workingHours.shopId, shop.id)),
    db
      .select()
      .from(dateOverrides)
      .where(and(eq(dateOverrides.shopId, shop.id), gte(dateOverrides.endDate, today)))
      .orderBy(asc(dateOverrides.startDate)),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Availability</h1>
        <p className="text-sm text-zinc-600">
          When clients can book. Times are in {shop.timezone} (change it in Settings).
        </p>
      </div>

      <Card>
        <h2 className="font-medium text-zinc-900">Weekly hours</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Add a break to close for lunch; leave it empty to stay open all day.
        </p>
        <ActionForm action={saveWorkingHoursAction} submitLabel="Save hours" className="mt-4">
          <WeeklyHoursFields values={weeklyHoursFormValues(hours)} />
        </ActionForm>
      </Card>

      <Card>
        <h2 className="font-medium text-zinc-900">Booking rules</h2>
        <ActionForm
          action={saveBookingRulesAction}
          submitLabel="Save rules"
          className="mt-4 grid gap-4 md:grid-cols-2"
        >
          <div>
            <Label htmlFor="slotIntervalMinutes">Start times every</Label>
            <Select
              id="slotIntervalMinutes"
              name="slotIntervalMinutes"
              defaultValue={shop.slotIntervalMinutes}
              options={withCurrent(INTERVALS, shop.slotIntervalMinutes, formatMinutes)}
            />
          </div>
          <div>
            <Label htmlFor="bufferMinutes">Gap after each appointment</Label>
            <Select
              id="bufferMinutes"
              name="bufferMinutes"
              defaultValue={shop.bufferMinutes}
              options={withCurrent(GAPS, shop.bufferMinutes, formatMinutes)}
            />
            <p className="mt-1 text-xs text-zinc-500">
              Time to clean up or prepare. A service can set its own gap.
            </p>
          </div>
          <div>
            <Label htmlFor="minNoticeMinutes">Minimum notice</Label>
            <Select
              id="minNoticeMinutes"
              name="minNoticeMinutes"
              defaultValue={shop.minNoticeMinutes}
              options={withCurrent(NOTICE, shop.minNoticeMinutes, formatMinutes)}
            />
            <p className="mt-1 text-xs text-zinc-500">How soon before a start time clients can still book it.</p>
          </div>
          <div>
            <Label htmlFor="maxAdvanceDays">Clients can book up to</Label>
            <Select
              id="maxAdvanceDays"
              name="maxAdvanceDays"
              defaultValue={shop.maxAdvanceDays}
              options={withCurrent(ADVANCE, shop.maxAdvanceDays, advanceLabel)}
            />
            <p className="mt-1 text-xs text-zinc-500">ahead of today.</p>
          </div>
        </ActionForm>
      </Card>

      <Card>
        <h2 className="font-medium text-zinc-900">Closed days &amp; special hours</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Holidays, vacations or a day with different hours. These replace the weekly hours on those dates.
        </p>

        {overrides.length > 0 && (
          <ul className="mt-4 divide-y divide-zinc-100 rounded-lg border border-zinc-200">
            {overrides.map((o) => {
              const { days, what } = describeOverride(o);
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
          <div>
            <Label htmlFor="startDate">From</Label>
            <Input id="startDate" name="startDate" type="date" min={today} required />
          </div>
          <div>
            <Label htmlFor="endDate">To (optional)</Label>
            <Input id="endDate" name="endDate" type="date" min={today} />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="label">Note for clients (optional)</Label>
            <Input id="label" name="label" placeholder="Public holiday" maxLength={80} />
          </div>
          <fieldset className="md:col-span-4">
            <legend className="mb-1.5 text-sm font-medium text-zinc-700">On those days</legend>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-zinc-700">
              <label className="flex items-center gap-2">
                <input type="radio" name="kind" value="closed" defaultChecked /> Closed
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" name="kind" value="hours" /> Open from
              </label>
              <Input name="startTime" type="time" defaultValue="10:00" className="w-32" aria-label="Opens at" />
              <span>to</span>
              <Input name="endTime" type="time" defaultValue="14:00" className="w-32" aria-label="Closes at" />
            </div>
          </fieldset>
        </ActionForm>
      </Card>
    </div>
  );
}
