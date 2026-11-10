import Link from "next/link";
import { canCustomerCancel, getAppointmentByCancelToken } from "@/lib/booking";
import { CancelStatusCard, contactShopText } from "../status-card";

// Read-only on purpose: a GET (link previews, email scanners, refreshes)
// must never cancel anything. The cancellation happens in the form action.
export default async function CancelDonePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const row = await getAppointmentByCancelToken(token);

  if (!row) {
    return (
      <CancelStatusCard title="Appointment not found">
        <p className="mt-2 text-sm text-zinc-600">
          This cancellation link is invalid.
        </p>
      </CancelStatusCard>
    );
  }

  if (row.appointment.status === "cancelled") {
    return (
      <CancelStatusCard title="Appointment cancelled">
        <p className="mt-2 text-sm text-zinc-600">
          Your appointment at {row.shopName} has been cancelled.
        </p>
      </CancelStatusCard>
    );
  }

  if (canCustomerCancel(row.appointment)) {
    return (
      <CancelStatusCard title="Not cancelled yet">
        <p className="mt-2 text-sm text-zinc-600">
          Your appointment is still booked.{" "}
          <Link
            href={`/cancel/${encodeURIComponent(token)}`}
            className="text-blue-600 hover:underline"
          >
            Cancel it here
          </Link>
          .
        </p>
      </CancelStatusCard>
    );
  }

  return (
    <CancelStatusCard title="Not cancelled">
      <p className="mt-2 text-sm text-zinc-600">
        We couldn&apos;t cancel this appointment online.{" "}
        {contactShopText(row.shopName, row.shopPhone)}
      </p>
    </CancelStatusCard>
  );
}
