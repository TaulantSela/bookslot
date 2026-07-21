import { eq } from "drizzle-orm";
import { db } from "@/db";
import { services } from "@/db/schema";
import {
  getDashboardContext,
  saveServiceAction,
  toggleServiceAction,
} from "@/lib/actions";
import { Button, Card, Input, Label } from "@/components/ui";
import { formatPrice } from "@/lib/utils";
import { redirect } from "next/navigation";

export default async function ServicesPage() {
  const ctx = await getDashboardContext();
  if (!ctx?.shop) redirect("/login");

  const list = await db
    .select()
    .from(services)
    .where(eq(services.shopId, ctx.shop.id))
    .orderBy(services.sortOrder);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Services</h1>
        <p className="text-sm text-zinc-600">What clients can book</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {list.map((service) => (
          <Card key={service.id}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-medium text-zinc-900">{service.name}</h2>
                <p className="mt-1 text-sm text-zinc-500">
                  {service.durationMinutes} min
                  {formatPrice(service.priceCents)
                    ? ` · ${formatPrice(service.priceCents)}`
                    : ""}
                </p>
                <p className="mt-1 text-xs uppercase tracking-wide text-zinc-400">
                  {service.active ? "Active" : "Hidden"}
                </p>
              </div>
              <form action={toggleServiceAction.bind(null, service.id, !service.active)}>
                <Button type="submit" variant="secondary" className="text-xs">
                  {service.active ? "Hide" : "Show"}
                </Button>
              </form>
            </div>
          </Card>
        ))}
      </div>

      <Card>
        <h2 className="font-medium text-zinc-900">Add service</h2>
        <form action={saveServiceAction} className="mt-4 grid gap-4 md:grid-cols-3">
          <div className="md:col-span-1">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" placeholder="Haircut" required />
          </div>
          <div>
            <Label htmlFor="durationMinutes">Duration (minutes)</Label>
            <Input id="durationMinutes" name="durationMinutes" type="number" defaultValue={30} required />
          </div>
          <div>
            <Label htmlFor="priceCents">Price in MKD (optional)</Label>
            <Input id="priceCents" name="priceCents" type="number" placeholder="800" />
          </div>
          <div className="md:col-span-3">
            <Button type="submit">Add service</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
