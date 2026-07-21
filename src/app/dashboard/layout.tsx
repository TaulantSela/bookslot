import { redirect } from "next/navigation";
import { getDashboardContext } from "@/lib/actions";
import { DashboardNav } from "@/components/dashboard-nav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getDashboardContext();
  if (!ctx) redirect("/login");
  if (!ctx.shop) redirect("/register");

  return (
    <div className="min-h-screen bg-zinc-50">
      <DashboardNav shopName={ctx.shop.name} />
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
