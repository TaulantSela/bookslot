import { desc, eq } from "drizzle-orm";
import { formatInTimeZone } from "date-fns-tz";
import { db } from "@/db";
import { appointments, services, staff } from "@/db/schema";
import { getDashboardContext, updateAppointmentStatusAction } from "@/lib/actions";
import { formatAnswer } from "@/lib/booking-form";
import { Button, Card } from "@/components/ui";
import { redirect } from "next/navigation";

export default async function AppointmentsPage() {
  const ctx = await getDashboardContext();
  if (!ctx?.shop) redirect("/login");

  const rows = await db
    .select({
      appointment: appointments,
      serviceName: services.name,
      staffName: staff.name,
    })
    .from(appointments)
    .innerJoin(services, eq(appointments.serviceId, services.id))
    .leftJoin(staff, eq(appointments.staffId, staff.id))
    .where(eq(appointments.shopId, ctx.shop.id))
    .orderBy(desc(appointments.startsAt))
    .limit(50);

  const withStaff = rows.some((row) => row.staffName);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Appointments</h1>
        <p className="text-sm text-zinc-600">All bookings for {ctx.shop.name}</p>
      </div>

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-zinc-50 text-left text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Service</th>
                {withStaff && <th className="px-4 py-3 font-medium">{ctx.shop.staffLabel}</th>}
                <th className="px-4 py-3 font-medium">When</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ appointment, serviceName, staffName }) => (
                <tr key={appointment.id} className="border-t border-zinc-100">
                  <td className="px-4 py-3 align-top">
                    <div className="font-medium text-zinc-900">{appointment.customerName}</div>
                    {(appointment.customerEmail || appointment.notes || appointment.answers?.length) && (
                      <details className="mt-1 text-xs text-zinc-600">
                        <summary className="cursor-pointer text-blue-600">Details</summary>
                        <dl className="mt-1 space-y-0.5">
                          {appointment.customerEmail && (
                            <div>
                              <dt className="inline text-zinc-400">Email: </dt>
                              <dd className="inline">{appointment.customerEmail}</dd>
                            </div>
                          )}
                          {appointment.answers?.map((answer) => (
                            <div key={answer.key}>
                              <dt className="inline text-zinc-400">{answer.label}: </dt>
                              <dd className="inline">{formatAnswer(answer.value)}</dd>
                            </div>
                          ))}
                          {appointment.notes && (
                            <div>
                              <dt className="inline text-zinc-400">Notes: </dt>
                              <dd className="inline whitespace-pre-line">{appointment.notes}</dd>
                            </div>
                          )}
                        </dl>
                      </details>
                    )}
                  </td>
                  <td className="px-4 py-3">{serviceName}</td>
                  {withStaff && <td className="px-4 py-3">{staffName ?? "—"}</td>}
                  <td className="px-4 py-3">
                    {formatInTimeZone(
                      appointment.startsAt,
                      ctx.shop!.timezone,
                      "d MMM yyyy · HH:mm",
                    )}
                  </td>
                  <td className="px-4 py-3">{appointment.customerPhone || "—"}</td>
                  <td className="px-4 py-3 capitalize">{appointment.status}</td>
                  <td className="px-4 py-3">
                    {appointment.status === "confirmed" && (
                      <div className="flex gap-2">
                        <form
                          action={updateAppointmentStatusAction.bind(
                            null,
                            appointment.id,
                            "completed",
                          )}
                        >
                          <Button type="submit" variant="secondary" className="px-2 py-1 text-xs">
                            Done
                          </Button>
                        </form>
                        <form
                          action={updateAppointmentStatusAction.bind(
                            null,
                            appointment.id,
                            "cancelled",
                          )}
                        >
                          <Button type="submit" variant="ghost" className="px-2 py-1 text-xs">
                            Cancel
                          </Button>
                        </form>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
