import { redirect } from "next/navigation";
import { Button } from "@/components/ui";
import {
  canCustomerCancel,
  cancelAppointmentByToken,
  getAppointmentByCancelToken,
} from "@/lib/booking";
import { formatAppointmentRange } from "@/lib/slots";
import { CancelStatusCard, contactShopText } from "./status-card";

export default async function CancelPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const row = await getAppointmentByCancelToken(token);

  async function confirm() {
    "use server";
    await cancelAppointmentByToken(token);
    redirect(`/cancel/${encodeURIComponent(token)}/done`);
  }

  if (!row) {
    return (
      <CancelStatusCard title="Appointment not found">
        <p className="mt-2 text-sm text-zinc-600">
          This cancellation link is invalid.
        </p>
      </CancelStatusCard>
    );
  }

  const { appointment, shopName, shopPhone, serviceName, timezone } = row;

  if (appointment.status === "cancelled") {
    return (
      <CancelStatusCard title="Already cancelled">
        <p className="mt-2 text-sm text-zinc-600">
          This appointment has already been cancelled.
        </p>
      </CancelStatusCard>
    );
  }

  if (!canCustomerCancel(appointment)) {
    return (
      <CancelStatusCard title="Can't cancel online">
        <p className="mt-2 text-sm text-zinc-600">
          This appointment can no longer be cancelled online.{" "}
          {contactShopText(shopName, shopPhone)}
        </p>
      </CancelStatusCard>
    );
  }

  return (
    <CancelStatusCard title="Cancel appointment?">
      <p className="mt-3 rounded-lg bg-zinc-100 px-4 py-3 text-sm text-zinc-700">
        <span className="font-medium text-zinc-900">{serviceName}</span> at{" "}
        {shopName}
        <br />
        {formatAppointmentRange(appointment.startsAt, appointment.endsAt, timezone)}
      </p>
      <p className="mt-3 text-sm text-zinc-600">
        This will free up your time slot. You can book again anytime.
      </p>
      <form action={confirm} className="mt-6">
        <Button type="submit" variant="danger">
          Yes, cancel appointment
        </Button>
      </form>
    </CancelStatusCard>
  );
}
