import { Resend } from "resend";
import { formatAppointmentRange } from "./slots";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const fromEmail =
  process.env.EMAIL_FROM ?? "BookSlot <onboarding@resend.dev>";

// Customer and shop names are user input. Escape everything interpolated into
// email HTML so nobody can inject links or markup into mail sent from our domain.
export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

type AppointmentEmail = {
  to: string;
  customerName: string;
  shopName: string;
  serviceName: string;
  startsAt: Date;
  endsAt: Date;
  timezone: string;
  cancelUrl: string;
};

function appointmentEmailHtml({
  heading,
  intro,
  cancelPrompt,
  serviceName,
  when,
  cancelUrl,
}: {
  heading: string;
  intro: string;
  cancelPrompt: string;
  serviceName: string;
  when: string;
  cancelUrl: string;
}) {
  return `
    <div style="font-family: system-ui, sans-serif; max-width: 480px;">
      <h2 style="margin: 0 0 8px;">${escapeHtml(heading)}</h2>
      <p>${intro}</p>
      <p style="background:#f4f4f5;padding:16px;border-radius:8px;">
        <strong>${escapeHtml(serviceName)}</strong><br/>
        ${escapeHtml(when)}
      </p>
      <p>${escapeHtml(cancelPrompt)} <a href="${escapeHtml(cancelUrl)}">Cancel appointment</a></p>
    </div>
  `;
}

export async function sendBookingConfirmation(email: AppointmentEmail) {
  const html = appointmentEmailHtml({
    heading: "Appointment confirmed",
    intro: `Hi ${escapeHtml(email.customerName)}, your appointment at <strong>${escapeHtml(email.shopName)}</strong> is booked.`,
    cancelPrompt: "Need to cancel?",
    serviceName: email.serviceName,
    when: formatAppointmentRange(email.startsAt, email.endsAt, email.timezone),
    cancelUrl: email.cancelUrl,
  });

  return sendEmail({
    to: email.to,
    subject: `Confirmed: ${email.serviceName} at ${email.shopName}`,
    html,
  });
}

export async function sendReminderEmail(email: AppointmentEmail) {
  const html = appointmentEmailHtml({
    heading: "Reminder: upcoming appointment",
    intro: `Hi ${escapeHtml(email.customerName)}, this is a reminder for your appointment at <strong>${escapeHtml(email.shopName)}</strong>.`,
    cancelPrompt: "Can't make it?",
    serviceName: email.serviceName,
    when: formatAppointmentRange(email.startsAt, email.endsAt, email.timezone),
    cancelUrl: email.cancelUrl,
  });

  return sendEmail({
    to: email.to,
    subject: `Reminder: ${email.serviceName} at ${email.shopName}`,
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
