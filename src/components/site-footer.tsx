import Link from "next/link";
import { Logo } from "@/components/logo";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { href: "/#features", label: "Features" },
      { href: "/#pricing", label: "Pricing" },
      { href: "/demo", label: "Live demo" },
    ],
  },
  {
    title: "Developers",
    links: [
      { href: "/#developers", label: "Embed options" },
      { href: "/docs/api", label: "API reference" },
      { href: "https://www.npmjs.com/package/@bookslot/react", label: "@bookslot/react" },
    ],
  },
  {
    title: "Account",
    links: [
      { href: "/register", label: "Create an account" },
      { href: "/login", label: "Log in" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-zinc-200 bg-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div>
          <Logo />
          <p className="mt-3 max-w-xs text-sm text-zinc-500">
            A booking page, an embeddable widget and a dashboard for any business that runs on
            appointments.
          </p>
        </div>
        {COLUMNS.map((column) => (
          <div key={column.title}>
            <h2 className="text-sm font-semibold text-zinc-900">{column.title}</h2>
            <ul className="mt-3 space-y-2">
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-zinc-500 transition hover:text-zinc-900">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-zinc-100">
        <p className="mx-auto max-w-6xl px-4 py-6 text-xs text-zinc-400 sm:px-6">
          © {new Date().getFullYear()} BookSlot
        </p>
      </div>
    </footer>
  );
}
