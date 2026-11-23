import { cn } from "@/lib/utils";

/** A native select styled like the dashboard inputs. */
export function Select({
  className,
  options,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  options: { value: string | number; label: string }[];
}) {
  return (
    <select
      className={cn(
        // appearance-none: Safari ignores padding on native selects, so they'd be
        // shorter than the inputs next to them. The chevron comes from globals.css.
        "select-chevron w-full appearance-none rounded-lg border border-zinc-300 bg-white py-2.5 pr-9 pl-3 text-sm outline-none ring-brand-600 focus:ring-2",
        className,
      )}
      {...props}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

/** Preset choices, plus the current value if it isn't one of them. */
export function withCurrent(
  presets: { value: number; label: string }[],
  current: number,
  label: (value: number) => string,
) {
  return presets.some((p) => p.value === current)
    ? presets
    : [...presets, { value: current, label: label(current) }].sort((a, b) => a.value - b.value);
}
