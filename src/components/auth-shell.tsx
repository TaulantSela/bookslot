import Link from "next/link";
import { Logo } from "@/components/logo";

/** Centered layout for the log-in and sign-up pages. */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative isolate flex min-h-screen flex-col items-center justify-center overflow-hidden bg-zinc-50 px-4 py-12">
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_70%_50%_at_50%_-10%,var(--color-brand-100),transparent)]"
      />
      <Logo className="mb-8" />
      {children}
      <Link href="/" className="mt-8 text-sm text-zinc-500 transition hover:text-zinc-900">
        ← Back to the home page
      </Link>
    </main>
  );
}
