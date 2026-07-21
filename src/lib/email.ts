import { Resend } from "resend";
import { formatAppointmentRange } from "./slots";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const fromEmail =
  process.env.EMAIL_FROM ?? "BookSlot <onboarding@resend.dev>";

export async function sendBookingConfirmation({
  to,
  customerName,
  shopName,
  serviceName,
  startsAt,
  endsAt,
  timezone,
  cancelUrl,
}: {
  to: string;
  customerName: string;
  shopName: string;
  serviceName: string;
  startsAt: Date;
  endsAt: Date;
  timezone: string;
  cancelUrl: string;
}) {
  const when = formatAppointmentRange(startsAt, endsAt, timezone);

  const html = `
    <div style="font-family: system-ui, sans-serif; max-width: 480px;">
      <h2 style="margin: 0 0 8px;">Appointment confirmed</h2>
      <p>Hi ${customerName}, your appointment at <strong>${shopName}</strong> is booked.</p>
      <p style="background:#f4f4f5;padding:16px;border-radius:8px;">
        <strong>${serviceName}</strong><br/>
        ${when}
      </p>
      <p>Need to cancel? <a href="${cancelUrl}">Cancel appointment</a></p>
    </div>
  `;

  return sendEmail({
    to,
    subject: `Confirmed: ${serviceName} at ${shopName}`,
    html,
  });
}

export async function sendReminderEmail({
  to,
  customerName,
  shopName,
  serviceName,
  startsAt,
  endsAt,
  timezone,
  cancelUrl,
}: {
  to: string;
  customerName: string;
  shopName: string;
  serviceName: string;
  startsAt: Date;
  endsAt: Date;
  timezone: string;
  cancelUrl: string;
}) {
  const when = formatAppointmentRange(startsAt, endsAt, timezone);

  const html = `
    <div style="font-family: system-ui, sans-serif; max-width: 480px;">
      <h2 style="margin: 0 0 8px;">Reminder: appointment tomorrow</h2>
      <p>Hi ${customerName}, this is a reminder for your appointment at <strong>${shopName}</strong>.</p>
      <p style="background:#f4f4f5;padding:16px;border-radius:8px;">
        <strong>${serviceName}</strong><br/>
        ${when}
      </p>
      <p>Can't make it? <a href="${cancelUrl}">Cancel appointment</a></p>
    </div>
  `;

  return sendEmail({
    to,
    subject: `Reminder: ${serviceName} at ${shopName}`,
    html,
  });
}

async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  if (!resend) {
    console.log("[email:dev]", { to, subject });
    return { ok: true as const, dev: true };
  }

  const { error } = await resend.emails.send({ from: fromEmail, to, subject, html });
  if (error) {
    console.error("[email:error]", error);
    return { ok: false as const, error: error.message };
  }
  return { ok: true as const };
}

export function buildCancelUrl(cancelToken: string) {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${base}/cancel/${cancelToken}`;
}

export function buildBookingUrl(slug: string) {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${base}/book/${slug}`;
}

export function buildEmbedUrl(slug: string) {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${base}/embed/${slug}`;
}
