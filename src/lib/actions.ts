"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import {
  appointments,
  services,
  shops,
  users,
  workingHours,
} from "@/db/schema";
import {
  createSession,
  destroySession,
  getSession,
  getUserShop,
  hashPassword,
  requireUserShop,
  verifyPassword,
  getUserByEmail,
} from "@/lib/auth";
import {
  getSlotsForDay,
  insertAppointmentIfFree,
  isAcceptingOnlineBookings,
  noOnlineBookingsMessage,
} from "@/lib/booking";
import { buildCancelUrl, sendBookingConfirmation } from "@/lib/email";
import { MAX_EMBED_DOMAINS, parseEmbedDomains } from "@/lib/embed";
import { newId, slugify } from "@/lib/id";
import { formatAppointmentRange } from "@/lib/slots";
import { isValidDateString } from "@/lib/slots-internal";
import {
  bookingSchema,
  loginSchema,
  registerSchema,
  serviceSchema,
  shopSettingsSchema,
  workingHourSchema,
} from "@/lib/validation";

export type ActionState = {
  error?: string;
  success?: string;
};

export type BookingResult = {
  appointmentId: string;
  serviceId: string;
  serviceName: string;
  startsAt: string;
  endsAt: string;
  /** Human-readable date and time range in the shop's timezone. */
  when: string;
};

export type BookingActionState = ActionState & { booking?: BookingResult };

// Dashboard pages read straight from the database, so every dashboard
// mutation refreshes them; otherwise the UI keeps showing the old values.
function refreshDashboard() {
  revalidatePath("/dashboard", "layout");
}

export async function registerAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    shopName: formData.get("shopName"),
  });

  if (!parsed.success) {
    return { error: "Please check your details and try again." };
  }

  const { name, email, password, shopName } = parsed.data;

  const existing = await getUserByEmail(email);
  if (existing) {
    return { error: "An account with this email already exists." };
  }

  let slug = slugify(shopName) || "shop";
  const [existingSlug] = await db
    .select({ slug: shops.slug })
    .from(shops)
    .where(eq(shops.slug, slug))
    .limit(1);

  if (existingSlug) {
    slug = `${slug}-${newId().slice(0, 4).toLowerCase()}`;
  }

  const userId = newId("usr");
  const shopId = newId("shop");
  const now = new Date();

  await db.insert(users).values({
    id: userId,
    email: email.toLowerCase(),
    passwordHash: await hashPassword(password),
    name,
    createdAt: now,
  });

  await db.insert(shops).values({
    id: shopId,
    userId,
    slug,
    name: shopName,
    description: null,
    primaryColor: "#2563eb",
    timezone: "Europe/Skopje",
    phone: null,
    address: null,
    reminderHoursBefore: 24,
    createdAt: now,
  });

  const defaultServices = [
    { name: "Standard appointment", durationMinutes: 30, priceCents: 0 },
    { name: "Extended appointment", durationMinutes: 60, priceCents: 0 },
  ];

  await db.insert(services).values(
    defaultServices.map((s, i) => ({
      id: newId("svc"),
      shopId,
      name: s.name,
      durationMinutes: s.durationMinutes,
      priceCents: s.priceCents,
      active: true,
      sortOrder: i,
    })),
  );

  const weekdays = [1, 2, 3, 4, 5];
  await db.insert(workingHours).values(
    weekdays.map((day) => ({
      id: newId("wh"),
      shopId,
      dayOfWeek: day,
      startTime: "09:00",
      endTime: "17:00",
    })),
  );

  await createSession({ userId, email: email.toLowerCase(), name });
  redirect("/dashboard");
}

export async function loginAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: "Invalid email or password." };
  }

  const user = await getUserByEmail(parsed.data.email);
  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return { error: "Invalid email or password." };
  }

  await createSession({
    userId: user.id,
    email: user.email,
    name: user.name,
  });
  redirect("/dashboard");
}

export async function logoutAction() {
  await destroySession();
  redirect("/");
}

const SLOT_TAKEN_ERROR = "That time slot is no longer available.";

export async function createBookingAction(
  _prev: BookingActionState,
  formData: FormData,
): Promise<BookingActionState> {
  const parsed = bookingSchema.safeParse({
    shopSlug: formData.get("shopSlug"),
    serviceId: formData.get("serviceId"),
    date: formData.get("date"),
    time: formData.get("time"),
    customerName: formData.get("customerName"),
    customerPhone: formData.get("customerPhone"),
    customerEmail: formData.get("customerEmail"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    return { error: "Please fill in all required fields." };
  }

  const data = parsed.data;

  if (!isValidDateString(data.date)) {
    return { error: "Please pick a valid date." };
  }

  const [shop] = await db
    .select()
    .from(shops)
    .where(eq(shops.slug, data.shopSlug))
    .limit(1);

  if (!shop) return { error: "Shop not found." };

  if (!(await isAcceptingOnlineBookings(shop))) {
    return { error: noOnlineBookingsMessage(shop) };
  }

  const [service] = await db
    .select()
    .from(services)
    .where(and(eq(services.id, data.serviceId), eq(services.shopId, shop.id)))
    .limit(1);

  if (!service || !service.active) return { error: "Service not available." };

  // Never trust the submitted time: it must be one of the slots the shop
  // actually offers (inside working hours, in the future, on the grid).
  const slots = await getSlotsForDay({ shop, service, date: data.date });
  const slot = slots.find((s) => s.label === data.time);

  if (!slot) return { error: SLOT_TAKEN_ERROR };

  const cancelToken = newId("cancel");
  const appointmentId = newId("appt");

  const booked = await insertAppointmentIfFree({
    id: appointmentId,
    shopId: shop.id,
    serviceId: service.id,
    customerName: data.customerName,
    customerPhone: data.customerPhone,
    customerEmail: data.customerEmail || null,
    startsAt: slot.start,
    endsAt: slot.end,
    notes: data.notes || null,
    cancelToken,
  });

  if (!booked) return { error: SLOT_TAKEN_ERROR };

  if (data.customerEmail) {
    await sendBookingConfirmation({
      to: data.customerEmail,
      customerName: data.customerName,
      shopName: shop.name,
      serviceName: service.name,
      startsAt: slot.start,
      endsAt: slot.end,
      timezone: shop.timezone,
      cancelUrl: buildCancelUrl(cancelToken),
    });
  }

  // Returned rather than redirected, so the widget can confirm inline (the
  // customer stays inside the embed) and tell the host page about it.
  return {
    booking: {
      appointmentId,
      serviceId: service.id,
      serviceName: service.name,
      startsAt: slot.start.toISOString(),
      endsAt: slot.end.toISOString(),
      when: formatAppointmentRange(slot.start, slot.end, shop.timezone),
    },
  };
}

export async function saveEmbedDomainsAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSession();
  if (!session) redirect("/login");
  const shop = await requireUserShop(session.userId);

  const { domains, invalid } = parseEmbedDomains(
    String(formData.get("domains") ?? ""),
  );

  if (invalid.length > 0) {
    return { error: `Not a valid domain: ${invalid.join(", ")}` };
  }
  if (domains.length > MAX_EMBED_DOMAINS) {
    return { error: `You can list up to ${MAX_EMBED_DOMAINS} domains.` };
  }

  await db
    .update(shops)
    .set({ embedDomains: domains.length ? domains : null })
    .where(eq(shops.id, shop.id));

  refreshDashboard();
  return {
    success: domains.length
      ? `Saved. Only ${domains.join(", ")} can embed your widget.`
      : "Saved. Any website can embed your widget.",
  };
}

export async function saveServiceAction(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");

  const shop = await requireUserShop(session.userId);
  const parsed = serviceSchema.safeParse({
    name: formData.get("name"),
    durationMinutes: formData.get("durationMinutes"),
    price: formData.get("price") || undefined,
  });

  if (!parsed.success) return;

  // The form takes whole currency units (e.g. 800 MKD); the database stores cents.
  const priceCents =
    parsed.data.price == null ? null : Math.round(parsed.data.price * 100);
  const serviceId = formData.get("serviceId") as string | null;

  if (serviceId) {
    await db
      .update(services)
      .set({
        name: parsed.data.name,
        durationMinutes: parsed.data.durationMinutes,
        priceCents,
      })
      .where(and(eq(services.id, serviceId), eq(services.shopId, shop.id)));
  } else {
    await db.insert(services).values({
      id: newId("svc"),
      shopId: shop.id,
      name: parsed.data.name,
      durationMinutes: parsed.data.durationMinutes,
      priceCents,
      active: true,
      sortOrder: 99,
    });
  }

  refreshDashboard();
}

export async function toggleServiceAction(serviceId: string, active: boolean) {
  const session = await getSession();
  if (!session) redirect("/login");
  const shop = await requireUserShop(session.userId);

  await db
    .update(services)
    .set({ active })
    .where(and(eq(services.id, serviceId), eq(services.shopId, shop.id)));

  refreshDashboard();
}

export async function saveWorkingHoursAction(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");
  const shop = await requireUserShop(session.userId);

  await db.delete(workingHours).where(eq(workingHours.shopId, shop.id));

  const entries: (typeof workingHours.$inferInsert)[] = [];

  for (let day = 0; day <= 6; day++) {
    const enabled = formData.get(`day_${day}_enabled`) === "on";
    if (!enabled) continue;

    const parsed = workingHourSchema.safeParse({
      dayOfWeek: day,
      startTime: formData.get(`day_${day}_start`),
      endTime: formData.get(`day_${day}_end`),
    });

    if (!parsed.success) continue;

    entries.push({
      id: newId("wh"),
      shopId: shop.id,
      ...parsed.data,
    });
  }

  if (entries.length > 0) {
    await db.insert(workingHours).values(entries);
  }

  refreshDashboard();
}

export async function saveShopSettingsAction(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");
  const shop = await requireUserShop(session.userId);

  const parsed = shopSettingsSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    phone: formData.get("phone"),
    address: formData.get("address"),
    primaryColor: formData.get("primaryColor"),
    reminderHoursBefore: formData.get("reminderHoursBefore"),
  });

  if (!parsed.success) return;

  await db
    .update(shops)
    .set({
      name: parsed.data.name,
      description: parsed.data.description || null,
      phone: parsed.data.phone || null,
      address: parsed.data.address || null,
      primaryColor: parsed.data.primaryColor,
      reminderHoursBefore: parsed.data.reminderHoursBefore,
    })
    .where(eq(shops.id, shop.id));

  refreshDashboard();
}

export async function updateAppointmentStatusAction(
  appointmentId: string,
  status: "confirmed" | "cancelled" | "completed",
) {
  const session = await getSession();
  if (!session) redirect("/login");
  const shop = await requireUserShop(session.userId);

  await db
    .update(appointments)
    .set({ status })
    .where(
      and(eq(appointments.id, appointmentId), eq(appointments.shopId, shop.id)),
    );

  refreshDashboard();
}

export async function getShopBySlug(slug: string) {
  const [shop] = await db
    .select()
    .from(shops)
    .where(eq(shops.slug, slug))
    .limit(1);
  return shop ?? null;
}

export async function getDashboardContext() {
  const session = await getSession();
  if (!session) return null;
  const shop = await getUserShop(session.userId);
  return { session, shop };
}
