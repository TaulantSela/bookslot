import type { Metadata } from "next";
import { Logo } from "@/components/logo";
import { ButtonLink } from "@/components/ui";

export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4 py-12 text-center">
      <Logo />
      <p className="mt-12 text-sm font-semibold text-brand-600">404</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900">Page not found</h1>
      <p className="mt-3 max-w-sm text-zinc-600">
        This page doesn&apos;t exist. If you followed a booking link, check it with the business that
        shared it.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <ButtonLink href="/">Go to the home page</ButtonLink>
        <ButtonLink href="/demo" variant="secondary">
          See demo
        </ButtonLink>
      </div>
    </main>
  );
}
