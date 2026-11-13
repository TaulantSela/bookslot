import { DAY_LABELS, workingHourSchema } from "@/lib/validation";

// The weekly hours form: per day an "open" checkbox, opening and closing
// times, and an optional break that splits the day into two ranges.

export type WeeklyRange = { dayOfWeek: number; startTime: string; endTime: string };

export type DayFormValues = {
  open: boolean;
  start: string;
  end: string;
  breakStart: string;
  breakEnd: string;
};

type FormLike = { get(name: string): FormDataEntryValue | null };

const text = (form: FormLike, name: string) => {
  const value = form.get(name);
  return typeof value === "string" ? value.trim() : "";
};

export function parseWeeklyHoursForm(
  form: FormLike,
  prefix = "",
): { ranges: WeeklyRange[] } | { error: string } {
  const ranges: WeeklyRange[] = [];

  for (let day = 0; day <= 6; day++) {
    const field = (name: string) => text(form, `${prefix}day_${day}_${name}`);
    if (form.get(`${prefix}day_${day}_enabled`) !== "on") continue;

    const label = DAY_LABELS[day];
    const start = field("start");
    const end = field("end");
    const breakStart = field("break_start");
    const breakEnd = field("break_end");

    const whole = workingHourSchema.safeParse({ dayOfWeek: day, startTime: start, endTime: end });
    if (!whole.success) {
      return { error: `${label}: closing time must be after opening time.` };
    }

    if (!breakStart && !breakEnd) {
      ranges.push(whole.data);
      continue;
    }

    const before = workingHourSchema.safeParse({ dayOfWeek: day, startTime: start, endTime: breakStart });
    const after = workingHourSchema.safeParse({ dayOfWeek: day, startTime: breakEnd, endTime: end });
    if (!before.success || !after.success || breakStart >= breakEnd) {
      return {
        error: `${label}: the break must start after opening, end before closing, and end after it starts.`,
      };
    }
    ranges.push(before.data, after.data);
  }

  return { ranges };
}

/** Form values for each day (0 = Sunday) from stored ranges. */
export function weeklyHoursFormValues(
  rows: Pick<WeeklyRange, "dayOfWeek" | "startTime" | "endTime">[],
): DayFormValues[] {
  return DAY_LABELS.map((_, day) => {
    const ranges = rows
      .filter((r) => r.dayOfWeek === day)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
    if (ranges.length === 0) {
      return { open: false, start: "09:00", end: "17:00", breakStart: "", breakEnd: "" };
    }
    const first = ranges[0];
    const last = ranges[ranges.length - 1];
    return {
      open: true,
      start: first.startTime,
      end: last.endTime,
      // Two ranges read back as one day with a break. (Older data with more
      // ranges shows the first gap; saving rewrites it as at most two.)
      breakStart: ranges.length > 1 ? first.endTime : "",
      breakEnd: ranges.length > 1 ? ranges[1].startTime : "",
    };
  });
}
