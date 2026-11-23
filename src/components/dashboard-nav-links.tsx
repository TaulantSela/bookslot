"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const links = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/appointments", label: "Appointments" },
  { href: "/dashboard/services", label: "Services" },
  { href: "/dashboard/hours", label: "Availability" },
  { href: "/dashboard/staff", label: "Staff" },
  { href: "/dashboard/form", label: "Booking form" },
  { href: "/dashboard/embed", label: "Widget" },
  { href: "/dashboard/developers", label: "Developers" },
  { href: "/dashboard/settings", label: "Settings" },
];

function isActive(pathname: string, href: string) {
  return href === "/dashboard" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

export function DashboardNavLinks() {
  const pathname = usePathname();

  return (
    <nav aria-label="Dashboard" className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4">
      {links.map((link) => {
        const active = isActive(pathname, link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "border-b-2 px-3 pt-1 pb-3 text-sm whitespace-nowrap transition",
              active
                ? "border-brand-600 font-medium text-zinc-900"
                : "border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-900",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
