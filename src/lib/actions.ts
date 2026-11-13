"use server";

import { and, eq } from "drizzle-orm";
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
  verifyPassword,
  getUserByEmail,
} from "@/lib/auth";
import { createBooking, type BookingResult } from "@/lib/create-booking";
import {
  firstIssue,
  refreshDashboard,
  requireOwnerShop,
  type ActionState,
} from "@/lib/dashboard";
import { MAX_EMBED_DOMAINS, parseEmbedDomains } from "@/lib/embed";
import { newId, slugify } from "@/lib/id";
import { guessCurrency } from "@/lib/regional";
import {
  bookingSchema,
  loginSchema,
  registerSchema,
  serviceSchema,
  shopSettingsSchema,
} from "@/lib/validation";

export type { ActionState };

export type { BookingResult };

export type BookingActionState = ActionState & { booking?: BookingResult };

export async function registerAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    shopName: formData.get("shopName"),
    timezone: formData.get("timezone") || undefined,
    currency: formData.get("currency") || undefined,
  });

  if (!parsed.success) {
    return { error: "Please check your details and try again." };
  }

  const { name, email, password, shopName } = parsed.data;
  const timezone = parsed.data.timezone ?? "Europe/Skopje";
  const currency = parsed.data.currency ?? guessCurrency(timezone);

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
    timezone,
    currency,
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

export async function createBookingAction(
  _prev: BookingActionState,
  formData: FormData,
): Promise<BookingActionState> {
  const parsed = bookingSchema.safeParse({
    shopSlug: formData.get("shopSlug"),
    serviceId: formData.get("serviceId"),
    staffId: formData.get("staffId") || undefined,
    date: formData.get("date"),
    time: formData.get("time"),
  });

  if (!parsed.success) {
    return { error: "Please pick a service, a date and a time." };
  }

  const data = parsed.data;
  const [shop] = await db
    .select()
    .from(shops)
    .where(eq(shops.slug, data.shopSlug))
    .limit(1);

  if (!shop) return { error: "Shop not found." };

  const result = await createBooking({
    shop,
    serviceId: data.serviceId,
    date: data.date,
    time: data.time,
    // Customers only pick staff when the shop lets them.
    staffId: shop.staffChoice === "choose" ? data.staffId : undefined,
    customer: {
      name: formData.get("customerName"),
      phone: formData.get("customerPhone"),
      email: formData.get("customerEmail"),
      notes: formData.get("notes"),
    },
    // Custom questions arrive as field_<key>.
    answers: Object.fromEntries(
      [...formData.entries()]
        .filter(([name]) => name.startsWith("field_"))
        .map(([name, value]) => [name.slice("field_".length), value]),
    ),
  });

  // Returned rather than redirected, so the widget can confirm inline (the
  // customer stays inside the embed) and tell the host page about it.
  return "booking" in result ? { booking: result.booking } : { error: result.error };
}

export async function saveEmbedDomainsAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const shop = await requireOwnerShop();

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

export async function saveServiceAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const shop = await requireOwnerShop();
  const parsed = serviceSchema.safeParse({
    name: formData.get("name"),
    durationMinutes: formData.get("durationMinutes"),
    price: formData.get("price"),
    bufferMinutes: formData.get("bufferMinutes"),
  });

  if (!parsed.success) {
    return {
      error: firstIssue(
        parsed.error,
        "Check the name, a duration of 5–480 minutes and a gap of 0–240 minutes.",
      ),
    };
  }

  // The form takes whole currency units (e.g. 800 MKD); the database stores hundredths.
  const priceCents =
    parsed.data.price == null ? null : Math.round(parsed.data.price * 100);
  const values = {
    name: parsed.data.name,
    durationMinutes: parsed.data.durationMinutes,
    priceCents,
    bufferMinutes: parsed.data.bufferMinutes ?? null,
  };
  const serviceId = formData.get("serviceId");

  if (typeof serviceId === "string" && serviceId) {
    await db
      .update(services)
      .set(values)
      .where(and(eq(services.id, serviceId), eq(services.shopId, shop.id)));
  } else {
    await db.insert(services).values({
      id: newId("svc"),
      shopId: shop.id,
      ...values,
      active: true,
      sortOrder: 99,
    });
  }

  refreshDashboard();
  return { success: serviceId ? "Service saved." : `Added ${values.name}.` };
}

export async function toggleServiceAction(serviceId: string, active: boolean) {
  const shop = await requireOwnerShop();

  await db
    .update(services)
    .set({ active })
    .where(and(eq(services.id, serviceId), eq(services.shopId, shop.id)));

  refreshDashboard();
}

export async function saveShopSettingsAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const shop = await requireOwnerShop();

  const parsed = shopSettingsSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    phone: formData.get("phone"),
    address: formData.get("address"),
    primaryColor: formData.get("primaryColor"),
    reminderHoursBefore: formData.get("reminderHoursBefore"),
    timezone: formData.get("timezone"),
    currency: formData.get("currency"),
  });

  if (!parsed.success) {
    return { error: firstIssue(parsed.error, "Please check the highlighted details.") };
  }

  await db
    .update(shops)
    .set({
      name: parsed.data.name,
      description: parsed.data.description || null,
      phone: parsed.data.phone || null,
      address: parsed.data.address || null,
      primaryColor: parsed.data.primaryColor,
      reminderHoursBefore: parsed.data.reminderHoursBefore,
      timezone: parsed.data.timezone,
      currency: parsed.data.currency,
    })
    .where(eq(shops.id, shop.id));

  refreshDashboard();
  return { success: "Settings saved." };
}

export async function updateAppointmentStatusAction(
  appointmentId: string,
  status: "confirmed" | "cancelled" | "completed",
) {
  const shop = await requireOwnerShop();

  await db
    .update(appointments)
    .set({ status })
    .where(
      and(eq(appointments.id, appointmentId), eq(appointments.shopId, shop.id)),
    );

  refreshDashboard();
}

export async function getDashboardContext() {
  const session = await getSession();
  if (!session) return null;
  const shop = await getUserShop(session.userId);
  return { session, shop };
}
