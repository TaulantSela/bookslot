import Link from "next/link";
import { cn } from "@/lib/utils";

/** The app icon (src/app/icon.svg) drawn inline so it scales crisply. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 512 512" aria-hidden="true" className={cn("size-8 shrink-0", className)}>
      <rect width="512" height="512" rx="112" fill="#0f1117" />
      <rect x="163" y="80" width="26" height="64" rx="13" fill="#6366f1" />
      <rect x="323" y="80" width="26" height="64" rx="13" fill="#6366f1" />
      <rect x="96" y="112" width="320" height="308" rx="48" fill="#151a26" stroke="#2a3242" strokeWidth="8" />
      <path d="M100 184 H412" stroke="#2a3242" strokeWidth="8" />
      <circle cx="164" cy="248" r="20" fill="#39435a" />
      <circle cx="256" cy="248" r="20" fill="#39435a" />
      <circle cx="348" cy="248" r="20" fill="#39435a" />
      <circle cx="164" cy="340" r="20" fill="#39435a" />
      <rect x="220" y="308" width="168" height="64" rx="32" fill="#6366f1" />
      <path
        d="M258 340 l20 20 l38 -42"
        stroke="#ffffff"
        strokeWidth="18"
        fill="none"
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
