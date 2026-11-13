import type { DayFormValues } from "@/lib/hours-form";
import { DAY_LABELS } from "@/lib/validation";
import { Input, Label } from "@/components/ui";

/** Inputs for a week of opening hours, read by parseWeeklyHoursForm. */
export function WeeklyHoursFields({
  values,
  prefix = "",
}: {
  values: DayFormValues[];
  prefix?: string;
}) {
  // Monday first, Sunday last.
  const order = [1, 2, 3, 4, 5, 6, 0];
  return (
    <div className="space-y-4">
      {order.map((day) => {
        const row = values[day];
        const name = (field: string) => `${prefix}day_${day}_${field}`;
        return (
          <div
            key={day}
            className="grid items-end gap-3 border-b border-zinc-100 pb-4 last:border-0 md:grid-cols-[120px_70px_1fr_1fr_1fr_1fr]"
          >
            <div className="font-medium text-zinc-900 md:pb-2.5">{DAY_LABELS[day]}</div>
            <label className="flex items-center gap-2 text-sm text-zinc-600 md:pb-2.5">
              <input type="checkbox" name={name("enabled")} defaultChecked={row.open} />
              Open
            </label>
            <div>
              <Label htmlFor={name("start")}>From</Label>
              <Input id={name("start")} name={name("start")} type="time" defaultValue={row.start} />
            </div>
            <div>
              <Label htmlFor={name("end")}>To</Label>
              <Input id={name("end")} name={name("end")} type="time" defaultValue={row.end} />
            </div>
            <div>
              <Label htmlFor={name("break_start")} className="text-zinc-500">
                Break from
              </Label>
              <Input
                id={name("break_start")}
                name={name("break_start")}
                type="time"
                defaultValue={row.breakStart}
              />
            </div>
            <div>
              <Label htmlFor={name("break_end")} className="text-zinc-500">
                Break to
              </Label>
              <Input
                id={name("break_end")}
                name={name("break_end")}
                type="time"
                defaultValue={row.breakEnd}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
