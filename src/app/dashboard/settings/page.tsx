import { formatInTimeZone } from "date-fns-tz";
import { redirect } from "next/navigation";
import { getDashboardContext, saveShopSettingsAction } from "@/lib/actions";
import { currencyLabel, listCurrencies, listTimeZones } from "@/lib/regional";
import { ActionForm } from "@/components/action-form";
import { Select } from "@/components/select";
import { Card, Input, Label, Textarea } from "@/components/ui";

export default async function SettingsPage() {
  const ctx = await getDashboardContext();
  if (!ctx?.shop) redirect("/login");
  const shop = ctx.shop;

  const timezones = listTimeZones().map((tz) => ({ value: tz, label: tz.replaceAll("_", " ") }));
  const currencies = listCurrencies().map((code) => ({ value: code, label: currencyLabel(code) }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Settings</h1>
        <p className="text-sm text-zinc-600">Business details, region and reminders</p>
      </div>

      <Card>
        <ActionForm
          action={saveShopSettingsAction}
          submitLabel="Save settings"
          className="grid gap-4 md:grid-cols-2"
        >
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
            <Label htmlFor="timezone">Time zone</Label>
            <Select id="timezone" name="timezone" defaultValue={shop.timezone} options={timezones} />
            <p className="mt-1 text-xs text-zinc-500">
              Hours and bookings use this zone. It&apos;s {formatInTimeZone(new Date(), shop.timezone, "HH:mm")}{" "}
              there now. Existing bookings keep their exact time.
            </p>
          </div>
          <div>
            <Label htmlFor="currency">Currency</Label>
            <Select id="currency" name="currency" defaultValue={shop.currency} options={currencies} />
            <p className="mt-1 text-xs text-zinc-500">
              Prices are shown in it. Changing it doesn&apos;t convert existing prices.
            </p>
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
        </ActionForm>
      </Card>
    </div>
  );
}
