import { cn } from "@/lib/utils";

const TIMES = ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "13:00", "13:30"];
const SELECTED_TIME = "10:30";

function Check({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className={cn("size-4", className)}>
      <path d="M5 10.5l3.2 3.2L15 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * A static picture of the booking widget for the landing page, laid out like
 * the real one (src/components/booking-widget.tsx) with the Lakeside Barbers
 * demo data. Decorative only: hidden from assistive tech.
 */
export function WidgetMockup() {
  return (
    <div aria-hidden="true" className="relative isolate mx-auto w-full max-w-md select-none">
      <div className="absolute -inset-6 -z-10 rounded-[2.5rem] bg-gradient-to-br from-brand-200/60 via-white to-amber-100/60 blur-2xl" />

      <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-xl shadow-zinc-900/5">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-full bg-brand-600 text-sm font-semibold text-white">
            LB
          </div>
          <div>
            <p className="font-semibold text-zinc-900">Lakeside Barbers</p>
            <p className="text-xs text-zinc-500">Book an appointment online</p>
          </div>
        </div>

        <p className="mt-6 text-xs font-medium text-zinc-700">Service</p>
        <div className="mt-2 grid gap-2">
          <div className="flex items-center justify-between rounded-xl border-2 border-brand-600 bg-brand-50 px-4 py-2.5">
            <div>
              <p className="text-sm font-medium text-zinc-900">Haircut</p>
              <p className="text-xs text-zinc-500">30 min · MKD 600</p>
            </div>
            <span className="flex size-5 items-center justify-center rounded-full bg-brand-600 text-white">
              <Check className="size-3.5" />
            </span>
          </div>
          <div className="rounded-xl border border-zinc-200 px-4 py-2.5">
            <p className="text-sm font-medium text-zinc-900">Haircut + beard</p>
            <p className="text-xs text-zinc-500">45 min · MKD 800</p>
          </div>
        </div>

        <p className="mt-5 text-xs font-medium text-zinc-700">Barber</p>
        <div className="mt-2 flex gap-2">
          {["Anyone", "Sam", "Jordan"].map((name) => (
            <span
              key={name}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-xs",
                name === "Sam"
                  ? "border-brand-600 bg-brand-50 font-medium text-brand-700"
                  : "border-zinc-200 text-zinc-600",
              )}
            >
              {name}
            </span>
          ))}
        </div>

        <p className="mt-5 text-xs font-medium text-zinc-700">Time · Wed 26 Nov</p>
        <div className="mt-2 grid grid-cols-4 gap-2">
          {TIMES.map((time) => (
            <span
              key={time}
              className={cn(
                "rounded-lg border py-1.5 text-center text-xs tabular-nums",
                time === SELECTED_TIME
                  ? "border-brand-600 bg-brand-600 font-medium text-white"
                  : "border-zinc-200 text-zinc-700",
              )}
            >
              {time}
            </span>
          ))}
        </div>

        <div className="mt-6 rounded-xl bg-brand-600 py-2.5 text-center text-sm font-medium text-white">
          Confirm booking
        </div>
        <p className="mt-3 text-center text-[11px] text-zinc-400">Powered by BookSlot</p>
      </div>

      <div className="absolute -top-11 -right-2 flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3 shadow-lg sm:-top-5 sm:-right-10">
        <span className="flex size-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
          <Check />
        </span>
        <div>
          <p className="text-xs font-semibold text-zinc-900">Booked: Wed 10:30</p>
          <p className="text-[11px] text-zinc-500">Confirmation emailed to Arta</p>
        </div>
      </div>

      <div className="absolute -bottom-12 -left-3 flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3 shadow-lg sm:-left-10">
        <span className="flex size-8 items-center justify-center rounded-full bg-amber-100 text-amber-700">
          <svg viewBox="0 0 20 20" fill="none" className="size-4">
            <path
              d="M10 3a5 5 0 00-5 5v2.5L3.5 13h13L15 10.5V8a5 5 0 00-5-5zM8 15.5a2 2 0 004 0"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <div>
          <p className="text-xs font-semibold text-zinc-900">Reminder sent</p>
          <p className="text-[11px] text-zinc-500">24 hours before, with a cancel link</p>
        </div>
      </div>
    </div>
  );
}
