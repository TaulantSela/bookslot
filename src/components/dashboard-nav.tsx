import { logoutAction } from "@/lib/actions";
import { buildBookingUrl } from "@/lib/email";
import { LogoMark } from "@/components/logo";
import { DashboardNavLinks } from "@/components/dashboard-nav-links";
import Link from "next/link";

export function DashboardNav({ shopName, shopSlug }: { shopName: string; shopSlug: string }) {
  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 pt-4 pb-3">
        <Link href="/dashboard" className="flex min-w-0 items-center gap-3">
          <LogoMark className="size-9" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-zinc-900">BookSlot</p>
            <p className="truncate text-sm text-zinc-500">{shopName}</p>
          </div>
        </Link>
        <div className="flex shrink-0 items-center gap-1">
          <a
            href={buildBookingUrl(shopSlug)}
            target="_blank"
            rel="noreferrer"
            className="hidden rounded-lg px-3 py-2 text-sm text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900 sm:inline-flex"
          >
            View booking page ↗
          </a>
          <form action={logoutAction}>
            <button className="rounded-lg px-3 py-2 text-sm text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900">
              Log out
            </button>
          </form>
        </div>
      </div>
      <DashboardNavLinks />
    </header>
  );
}
