import { and, asc, eq, gte, isNull } from "drizzle-orm";
import { formatInTimeZone } from "date-fns-tz";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { dateOverrides, workingHours } from "@/db/schema";
import { getDashboardContext } from "@/lib/actions";
import { saveBookingRulesAction, saveWorkingHoursAction } from "@/lib/availability-actions";
import { weeklyHoursFormValues } from "@/lib/hours-form";
import { formatMinutes } from "@/lib/duration";
import { ActionForm } from "@/components/action-form";
import { Select, withCurrent } from "@/components/select";
import { DateOverrides } from "@/components/date-overrides";
import { WeeklyHoursFields } from "@/components/weekly-hours-fields";
import { Card, Label } from "@/components/ui";

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

export default async function AvailabilityPage() {
  const ctx = await getDashboardContext();
  if (!ctx?.shop) redirect("/login");
  const shop = ctx.shop;
  const today = formatInTimeZone(new Date(), shop.timezone, "yyyy-MM-dd");

  const [hours, overrides] = await Promise.all([
    db
      .select()
      .from(workingHours)
      .where(and(eq(workingHours.shopId, shop.id), isNull(workingHours.staffId))),
    db
      .select()
      .from(dateOverrides)
      .where(
        and(
          eq(dateOverrides.shopId, shop.id),
          isNull(dateOverrides.staffId),
          gte(dateOverrides.endDate, today),
        ),
      )
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

        <DateOverrides overrides={overrides} today={today} />
      </Card>
    </div>
  );
}
