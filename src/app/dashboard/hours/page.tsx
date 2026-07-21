import { eq } from "drizzle-orm";
import { db } from "@/db";
import { workingHours } from "@/db/schema";
import { getDashboardContext, saveWorkingHoursAction } from "@/lib/actions";
import { DAY_LABELS } from "@/lib/validation";
import { Button, Card, Input, Label } from "@/components/ui";
import { redirect } from "next/navigation";

export default async function HoursPage() {
  const ctx = await getDashboardContext();
  if (!ctx?.shop) redirect("/login");

  const hours = await db
    .select()
    .from(workingHours)
    .where(eq(workingHours.shopId, ctx.shop.id));

  const byDay = Object.fromEntries(hours.map((h) => [h.dayOfWeek, h]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Working hours</h1>
        <p className="text-sm text-zinc-600">When clients can book</p>
      </div>

      <Card>
        <form action={saveWorkingHoursAction} className="space-y-4">
          {DAY_LABELS.map((label, day) => {
            const row = byDay[day];
            const enabled = Boolean(row);
            return (
              <div
                key={label}
                className="grid items-center gap-3 border-b border-zinc-100 pb-4 last:border-0 md:grid-cols-[140px_80px_1fr_1fr]"
              >
                <div className="font-medium text-zinc-900">{label}</div>
                <label className="flex items-center gap-2 text-sm text-zinc-600">
                  <input
                    type="checkbox"
                    name={`day_${day}_enabled`}
                    defaultChecked={enabled}
                  />
                  Open
                </label>
                <div>
                  <Label htmlFor={`day_${day}_start`}>From</Label>
                  <Input
                    id={`day_${day}_start`}
                    name={`day_${day}_start`}
                    type="time"
                    defaultValue={row?.startTime ?? "09:00"}
                  />
                </div>
                <div>
                  <Label htmlFor={`day_${day}_end`}>To</Label>
                  <Input
                    id={`day_${day}_end`}
                    name={`day_${day}_end`}
                    type="time"
                    defaultValue={row?.endTime ?? "17:00"}
                  />
                </div>
              </div>
            );
          })}
          <Button type="submit">Save hours</Button>
        </form>
      </Card>
    </div>
  );
}
