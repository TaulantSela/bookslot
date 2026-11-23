import Link from "next/link";
import { Logo } from "@/components/logo";
import { ButtonLink } from "@/components/ui";

const NAV = [
  { href: "/#features", label: "Features" },
  { href: "/#developers", label: "Developers" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/demo", label: "Demo" },
];

/** Header for the public, logged-out pages (landing, demo, docs). */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200/70 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo />
        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-2 text-sm text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <ButtonLink href="/login" variant="ghost" className="whitespace-nowrap">
            Log in
          </ButtonLink>
          <ButtonLink href="/register" className="whitespace-nowrap">
            Start free
          </ButtonLink>
        </div>
      </div>
    </header>
  );
}
