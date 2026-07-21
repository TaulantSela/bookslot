import { getDashboardContext, saveShopSettingsAction } from "@/lib/actions";
import { Button, Card, Input, Label, Textarea } from "@/components/ui";
import { redirect } from "next/navigation";

export default async function SettingsPage() {
  const ctx = await getDashboardContext();
  if (!ctx?.shop) redirect("/login");
  const shop = ctx.shop;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Settings</h1>
        <p className="text-sm text-zinc-600">Business details and reminders</p>
      </div>

      <Card>
        <form action={saveShopSettingsAction} className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <Label htmlFor="name">Business name</Label>
            <Input id="name" name="name" defaultValue={shop.name} required />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" defaultValue={shop.description ?? ""} rows={3} />
          </div>
          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" name="phone" defaultValue={shop.phone ?? ""} />
          </div>
          <div>
            <Label htmlFor="address">Address</Label>
            <Input id="address" name="address" defaultValue={shop.address ?? ""} />
          </div>
          <div>
            <Label htmlFor="primaryColor">Brand color</Label>
            <Input id="primaryColor" name="primaryColor" type="color" defaultValue={shop.primaryColor} />
          </div>
          <div>
            <Label htmlFor="reminderHoursBefore">Reminder (hours before)</Label>
            <Input
              id="reminderHoursBefore"
              name="reminderHoursBefore"
              type="number"
              min={1}
              max={168}
              defaultValue={shop.reminderHoursBefore}
            />
          </div>
          <div className="md:col-span-2">
            <Button type="submit">Save settings</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
