import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * The calendar mark, with no background: lines in the current text colour
 * (so it matches the wordmark next to it), binder rings and the booked
 * slot in the brand colour. Same drawing as the favicon (src/app/icon.svg).
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true" className={cn("size-8 shrink-0", className)}>
      <rect x="3.1" y="5.5" width="25.8" height="23.5" rx="5" stroke="currentColor" strokeWidth="2.2" />
      <path d="M3.1 11.3H28.9" stroke="currentColor" strokeWidth="2.2" />
      <g fill="currentColor" opacity="0.35">
        <circle cx="8.6" cy="16.4" r="1.6" />
        <circle cx="16" cy="16.4" r="1.6" />
        <circle cx="23.4" cy="16.4" r="1.6" />
        <circle cx="8.6" cy="23.4" r="1.6" />
      </g>
      <g className="fill-brand-600">
        <rect x="8.2" y="2.4" width="2.6" height="6" rx="1.3" />
        <rect x="21.2" y="2.4" width="2.6" height="6" rx="1.3" />
        <rect x="13" y="20.7" width="13.8" height="5.4" rx="2.7" />
      </g>
      <path
        d="M16.6 23.4l1.5 1.5 3.1-3.2"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Icon + wordmark, linking home (or wherever `href` says). */
export function Logo({
  href = "/",
  className,
  invert = false,
}: {
  href?: string;
  className?: string;
  /** Light wordmark for dark backgrounds. */
  invert?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-2.5 text-lg font-semibold tracking-tight",
        invert ? "text-white" : "text-zinc-900",
        className,
      )}
    >
      <LogoMark />
      BookSlot
    </Link>
  );
}
