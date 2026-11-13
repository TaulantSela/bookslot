import { and, asc, count, eq, gte, isNotNull, isNull } from "drizzle-orm";
import { formatInTimeZone } from "date-fns-tz";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { appointments, dateOverrides, services, staff, workingHours } from "@/db/schema";
import { getDashboardContext } from "@/lib/actions";
import { weeklyHoursFormValues } from "@/lib/hours-form";
import {
  addStaffAction,
  deleteStaffAction,
  moveStaffAction,
  saveStaffAction,
  saveStaffSettingsAction,
  toggleStaffAction,
} from "@/lib/staff-actions";
import { ActionForm } from "@/components/action-form";
import { DateOverrides } from "@/components/date-overrides";
import { Select } from "@/components/select";
import { WeeklyHoursFields } from "@/components/weekly-hours-fields";
import { Button, Card, Input, Label } from "@/components/ui";

export default async function StaffPage() {
  const ctx = await getDashboardContext();
  if (!ctx?.shop) redirect("/login");
  const shop = ctx.shop;
  const today = formatInTimeZone(new Date(), shop.timezone, "yyyy-MM-dd");

  const [team, serviceList, hours, overrides, bookingCounts] = await Promise.all([
    db
      .select()
      .from(staff)
      .where(eq(staff.shopId, shop.id))
      .orderBy(asc(staff.sortOrder), asc(staff.createdAt)),
    db
      .select({ id: services.id, name: services.name })
      .from(services)
      .where(eq(services.shopId, shop.id))
      .orderBy(services.sortOrder),
    db
      .select()
      .from(workingHours)
      .where(and(eq(workingHours.shopId, shop.id), isNotNull(workingHours.staffId))),
    db
      .select()
      .from(dateOverrides)
      .where(
        and(
          eq(dateOverrides.shopId, shop.id),
          isNotNull(dateOverrides.staffId),
          gte(dateOverrides.endDate, today),
        ),
      )
      .orderBy(asc(dateOverrides.startDate)),
    db
      .select({ staffId: appointments.staffId, value: count() })
      .from(appointments)
      .where(and(eq(appointments.shopId, shop.id), isNotNull(appointments.staffId)))
      .groupBy(appointments.staffId),
  ]);
  const shopHours = await db
    .select()
    .from(workingHours)
    .where(and(eq(workingHours.shopId, shop.id), isNull(workingHours.staffId)));

  const booked = new Map(bookingCounts.map((r) => [r.staffId, r.value]));
  const serviceName = new Map(serviceList.map((s) => [s.id, s.name]));
  const label = shop.staffLabel;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Staff</h1>
        <p className="text-sm text-zinc-600">
          People or resources (chairs, rooms) that take bookings, each with their own calendar.
          With nobody added, the shop works as one calendar.
        </p>
      </div>

      <Card>
        <h2 className="font-medium text-zinc-900">How clients see staff</h2>
        <ActionForm
          action={saveStaffSettingsAction}
          submitLabel="Save"
          className="mt-4 grid gap-4 md:grid-cols-2"
        >
          <div>
            <Label htmlFor="staffLabel">Call them</Label>
            <Input
              id="staffLabel"
              name="staffLabel"
              defaultValue={shop.staffLabel}
              placeholder="Barber, Dentist, Room…"
              maxLength={30}
              required
            />
          </div>
          <div>
            <Label htmlFor="staffChoice">When booking</Label>
            <Select
              id="staffChoice"
              name="staffChoice"
              defaultValue={shop.staffChoice}
              options={[
                { value: "choose", label: `Clients pick a ${label.toLowerCase()} or “Anyone”` },
                { value: "auto", label: "Assign automatically (clients don’t choose)" },
              ]}
            />
          </div>
        </ActionForm>
      </Card>

      {team.map((member, index) => {
        const bookings = booked.get(member.id) ?? 0;
        const offers =
          member.serviceIds == null
            ? "All services"
            : member.serviceIds.map((id) => serviceName.get(id)).filter(Boolean).join(", ") ||
              "No services";
        const own = hours.filter((h) => h.staffId === member.id);
        return (
          <Card key={member.id} className={member.active ? "" : "opacity-70"}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="font-medium text-zinc-900">{member.name}</h2>
                <p className="mt-1 text-sm text-zinc-500">
                  {offers} · {member.useShopHours ? "Shop hours" : "Own hours"} · {bookings} booking
                  {bookings === 1 ? "" : "s"}
                </p>
                {!member.active && (
                  <p className="mt-1 text-xs uppercase tracking-wide text-zinc-400">
                    Hidden: not bookable
                  </p>
                )}
              </div>
              <div className="flex gap-1">
                <form action={moveStaffAction.bind(null, member.id, "up")}>
                  <Button variant="ghost" className="px-2 text-xs" disabled={index === 0} aria-label="Move up">
                    ↑
                  </Button>
                </form>
                <form action={moveStaffAction.bind(null, member.id, "down")}>
                  <Button
                    variant="ghost"
                    className="px-2 text-xs"
                    disabled={index === team.length - 1}
                    aria-label="Move down"
                  >
                    ↓
                  </Button>
                </form>
                <form action={toggleStaffAction.bind(null, member.id, !member.active)}>
                  <Button variant="secondary" className="text-xs">
                    {member.active ? "Hide" : "Show"}
                  </Button>
                </form>
                {bookings === 0 && (
                  <form action={deleteStaffAction.bind(null, member.id)}>
                    <Button variant="ghost" className="text-xs text-red-600">
                      Delete
                    </Button>
                  </form>
                )}
              </div>
            </div>

            <details className="mt-4 border-t border-zinc-100 pt-3">
              <summary className="cursor-pointer text-sm text-blue-600">Edit services and hours</summary>
              <ActionForm action={saveStaffAction} submitLabel={`Save ${member.name}`} className="mt-4 space-y-5">
                <input type="hidden" name="staffId" value={member.id} />
                <div className="max-w-sm">
                  <Label htmlFor={`${member.id}-name`}>Name</Label>
                  <Input id={`${member.id}-name`} name="name" defaultValue={member.name} required maxLength={60} />
                </div>
                <fieldset>
                  <legend className="mb-1.5 text-sm font-medium text-zinc-700">Services</legend>
                  <label className="flex items-center gap-2 text-sm text-zinc-700">
                    <input type="checkbox" name="allServices" defaultChecked={member.serviceIds == null} />
                    All services, including ones added later
                  </label>
                  <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-sm text-zinc-700">
                    {serviceList.map((service) => (
                      <label key={service.id} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          name="serviceIds"
                          value={service.id}
                          defaultChecked={member.serviceIds?.includes(service.id) ?? true}
                        />
                        {service.name}
                      </label>
                    ))}
                  </div>
                  <p className="mt-1 text-xs text-zinc-500">Untick “All services” to choose.</p>
                </fieldset>
                <fieldset>
                  <legend className="mb-1.5 text-sm font-medium text-zinc-700">Hours</legend>
                  <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-zinc-700">
                    <label className="flex items-center gap-2">
                      <input type="radio" name="hoursMode" value="shop" defaultChecked={member.useShopHours} />
                      Same as the shop
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="radio" name="hoursMode" value="own" defaultChecked={!member.useShopHours} />
                      Own hours (below)
                    </label>
                  </div>
                  <div className="mt-4">
                    <WeeklyHoursFields
                      prefix="own_"
                      values={weeklyHoursFormValues(member.useShopHours || own.length === 0 ? shopHours : own)}
                    />
                  </div>
                </fieldset>
              </ActionForm>
            </details>

            <details className="mt-3 border-t border-zinc-100 pt-3">
              <summary className="cursor-pointer text-sm text-blue-600">Time off</summary>
              <p className="mt-2 text-sm text-zinc-500">
                Vacation, sick days or different hours for {member.name}. The shop&apos;s closed days
                (Availability) apply to everyone.
              </p>
              <DateOverrides
                overrides={overrides.filter((o) => o.staffId === member.id)}
                today={today}
                staffId={member.id}
                closedLabel="Off"
                notePlaceholder="On vacation"
              />
            </details>
          </Card>
        );
      })}

      <Card>
        <h2 className="font-medium text-zinc-900">Add {label.toLowerCase()}</h2>
        {team.length === 0 && (
          <p className="mt-1 text-sm text-zinc-500">
            The first person takes over the shop&apos;s existing bookings.
          </p>
        )}
        <ActionForm
          action={addStaffAction}
          submitLabel="Add"
          pendingLabel="Adding…"
          resetOnSuccess
          className="mt-4 flex flex-wrap items-end gap-3"
        >
          <div className="w-full max-w-sm">
            <Label htmlFor="new-staff-name">Name</Label>
            <Input id="new-staff-name" name="name" placeholder="Ana" required maxLength={60} />
          </div>
        </ActionForm>
      </Card>
    </div>
  );
}
