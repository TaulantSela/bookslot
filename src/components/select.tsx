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
        "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm outline-none ring-blue-600 focus:ring-2",
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
