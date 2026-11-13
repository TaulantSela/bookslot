import Link from "next/link";
import { logoutAction } from "@/lib/actions";

const links = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/appointments", label: "Appointments" },
  { href: "/dashboard/services", label: "Services" },
  { href: "/dashboard/hours", label: "Availability" },
  { href: "/dashboard/staff", label: "Staff" },
  { href: "/dashboard/embed", label: "Widget" },
  { href: "/dashboard/settings", label: "Settings" },
];

export function DashboardNav({ shopName }: { shopName: string }) {
  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <div>
          <Link href="/dashboard" className="text-lg font-semibold text-zinc-900">
            BookSlot
          </Link>
          <p className="text-sm text-zinc-500">{shopName}</p>
        </div>
        <form action={logoutAction}>
          <button className="text-sm text-zinc-600 hover:text-zinc-900">
            Log out
          </button>
        </form>
      </div>
      <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-3">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="whitespace-nowrap rounded-lg px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
