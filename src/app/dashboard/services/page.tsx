import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { services, type Service } from "@/db/schema";
import { getDashboardContext, saveServiceAction, toggleServiceAction } from "@/lib/actions";
import { formatMinutes } from "@/lib/duration";
import { formatPrice } from "@/lib/regional";
import { ActionForm } from "@/components/action-form";
import { Button, Card, Input, Label } from "@/components/ui";

function ServiceFields({
  service,
  currency,
  shopBuffer,
}: {
  service?: Service;
  currency: string;
  shopBuffer: number;
}) {
  const id = (name: string) => `${service?.id ?? "new"}-${name}`;
  return (
    <>
      {service && <input type="hidden" name="serviceId" value={service.id} />}
      <div className="md:col-span-2">
        <Label htmlFor={id("name")}>Name</Label>
        <Input id={id("name")} name="name" placeholder="Haircut" defaultValue={service?.name} required />
      </div>
      <div>
        <Label htmlFor={id("duration")}>Duration (minutes)</Label>
        <Input
          id={id("duration")}
          name="durationMinutes"
          type="number"
          min={5}
          max={480}
          defaultValue={service?.durationMinutes ?? 30}
          required
        />
      </div>
      <div>
        <Label htmlFor={id("price")}>Price in {currency} (optional)</Label>
        <Input
          id={id("price")}
          name="price"
          type="number"
          min={0}
          step="any"
          placeholder="800"
          defaultValue={service?.priceCents != null ? service.priceCents / 100 : undefined}
        />
      </div>
      <div>
        <Label htmlFor={id("buffer")}>Gap after (minutes)</Label>
        <Input
          id={id("buffer")}
          name="bufferMinutes"
          type="number"
          min={0}
          max={240}
          placeholder={`Shop default (${shopBuffer})`}
          defaultValue={service?.bufferMinutes ?? undefined}
        />
      </div>
    </>
  );
}

export default async function ServicesPage() {
  const ctx = await getDashboardContext();
  if (!ctx?.shop) redirect("/login");
  const shop = ctx.shop;

  const list = await db
    .select()
    .from(services)
    .where(eq(services.shopId, shop.id))
    .orderBy(services.sortOrder);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Services</h1>
        <p className="text-sm text-zinc-600">What clients can book</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {list.map((service) => {
          const price = formatPrice(service.priceCents, shop.currency);
          const gap = service.bufferMinutes ?? shop.bufferMinutes;
          return (
            <Card key={service.id}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-medium text-zinc-900">{service.name}</h2>
                  <p className="mt-1 text-sm text-zinc-500">
                    {formatMinutes(service.durationMinutes)}
                    {price ? ` · ${price}` : ""}
                    {gap > 0 ? ` · ${formatMinutes(gap)} gap after` : ""}
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
              <details className="mt-4 border-t border-zinc-100 pt-3">
                <summary className="cursor-pointer text-sm text-blue-600">Edit</summary>
                <ActionForm
                  action={saveServiceAction}
                  submitLabel="Save service"
                  submitVariant="secondary"
                  className="mt-3 grid gap-3 md:grid-cols-2"
                >
                  <ServiceFields service={service} currency={shop.currency} shopBuffer={shop.bufferMinutes} />
                </ActionForm>
              </details>
            </Card>
          );
        })}
      </div>

      <Card>
        <h2 className="font-medium text-zinc-900">Add service</h2>
        <ActionForm
          action={saveServiceAction}
          submitLabel="Add service"
          pendingLabel="Adding…"
          resetOnSuccess
          className="mt-4 grid gap-4 md:grid-cols-5"
        >
          <ServiceFields currency={shop.currency} shopBuffer={shop.bufferMinutes} />
        </ActionForm>
      </Card>
    </div>
  );
}
