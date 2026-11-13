import { relations } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const shops = sqliteTable("shops", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  primaryColor: text("primary_color").notNull().default("#2563eb"),
  /** IANA timezone; working hours and closed days are wall-clock times in it. */
  timezone: text("timezone").notNull().default("Europe/Skopje"),
  /** ISO 4217 code. Prices are stored in hundredths of it (see src/lib/money.ts). */
  currency: text("currency").notNull().default("MKD"),
  phone: text("phone"),
  address: text("address"),
  reminderHoursBefore: integer("reminder_hours_before").notNull().default(24),
  /** Billing plan, set manually after payment. See src/lib/plans.ts. */
  plan: text("plan").notNull().default("free"),
  /** Sites allowed to embed the widget (CSP frame-ancestors). Null or empty = any site. */
  embedDomains: text("embed_domains", { mode: "json" }).$type<string[]>(),
  // Booking rules (src/lib/slots.ts).
  /** Start times are offered every N minutes. */
  slotIntervalMinutes: integer("slot_interval_minutes").notNull().default(15),
  /** Gap kept free after every appointment, unless its service sets its own. */
  bufferMinutes: integer("buffer_minutes").notNull().default(0),
  /** Bookings must start at least this many minutes from now. */
  minNoticeMinutes: integer("min_notice_minutes").notNull().default(0),
  /** How many days ahead customers can book (today counts as day 0). */
  maxAdvanceDays: integer("max_advance_days").notNull().default(90),
  /** What customers see staff called, e.g. "Barber", "Dentist", "Room". */
  staffLabel: text("staff_label").notNull().default("Staff member"),
  /** "choose": customers may pick a staff member or "Anyone". "auto": always assigned for them. */
  staffChoice: text("staff_choice").notNull().default("choose"),
  // Standard booking-form fields: "required" | "optional" | "hidden".
  // (Name is always required.) See src/lib/booking-form.ts.
  phoneField: text("phone_field").notNull().default("required"),
  emailField: text("email_field").notNull().default("optional"),
  notesField: text("notes_field").notNull().default("optional"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const services = sqliteTable("services", {
  id: text("id").primaryKey(),
  shopId: text("shop_id")
    .notNull()
    .references(() => shops.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  durationMinutes: integer("duration_minutes").notNull(),
  /** Hundredths of the shop's currency. */
  priceCents: integer("price_cents"),
  /** Gap after this service. Null = the shop's default. */
  bufferMinutes: integer("buffer_minutes"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
});

/**
 * People or resources (chairs, rooms) that take bookings. A shop with no
 * active staff works as a single calendar, as before staff existed.
 */
export const staff = sqliteTable("staff", {
  id: text("id").primaryKey(),
  shopId: text("shop_id")
    .notNull()
    .references(() => shops.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  /** Services this person offers. Null = every service. */
  serviceIds: text("service_ids", { mode: "json" }).$type<string[]>(),
  /** True: works the shop's weekly hours. False: their own rows in working_hours. */
  useShopHours: integer("use_shop_hours", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

/** Extra questions on the booking form (Pro). */
export const formFields = sqliteTable("form_fields", {
  id: text("id").primaryKey(),
  shopId: text("shop_id")
    .notNull()
    .references(() => shops.id, { onDelete: "cascade" }),
  /** Stable machine name, e.g. "allergies": used in prefill, the API and webhooks. */
  key: text("key").notNull(),
  label: text("label").notNull(),
  /** text | textarea | number | select | checkbox | date */
  type: text("type").notNull(),
  required: integer("required", { mode: "boolean" }).notNull().default(false),
  /** Choices for "select". */
  options: text("options", { mode: "json" }).$type<string[]>(),
  helpText: text("help_text"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const workingHours = sqliteTable("working_hours", {
  id: text("id").primaryKey(),
  shopId: text("shop_id")
    .notNull()
    .references(() => shops.id, { onDelete: "cascade" }),
  /** Null = the shop's hours; set = that staff member's own hours. */
  staffId: text("staff_id").references(() => staff.id, { onDelete: "cascade" }),
  dayOfWeek: integer("day_of_week").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
});

/**
 * Exceptions to the weekly hours for a run of calendar dates (shop timezone):
 * closed (no times) or open with special hours. Several rows with hours on
 * the same date add up; a closed row wins over everything.
 */
export const dateOverrides = sqliteTable("date_overrides", {
  id: text("id").primaryKey(),
  shopId: text("shop_id")
    .notNull()
    .references(() => shops.id, { onDelete: "cascade" }),
  /** Null = the whole shop; set = one staff member's time off or special hours. */
  staffId: text("staff_id").references(() => staff.id, { onDelete: "cascade" }),
  /** yyyy-MM-dd, inclusive. */
  startDate: text("start_date").notNull(),
  /** yyyy-MM-dd, inclusive. */
  endDate: text("end_date").notNull(),
  /** HH:mm. Both null = closed. */
  startTime: text("start_time"),
  endTime: text("end_time"),
  /** Shown to customers, e.g. "Public holiday". */
  label: text("label"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const appointments = sqliteTable("appointments", {
  id: text("id").primaryKey(),
  shopId: text("shop_id")
    .notNull()
    .references(() => shops.id, { onDelete: "cascade" }),
  serviceId: text("service_id")
    .notNull()
    .references(() => services.id),
  /** Who the appointment is with. Null in shops without staff. */
  staffId: text("staff_id").references(() => staff.id),
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone").notNull(),
  customerEmail: text("customer_email"),
  startsAt: integer("starts_at", { mode: "timestamp" }).notNull(),
  endsAt: integer("ends_at", { mode: "timestamp" }).notNull(),
  /** Gap kept free after this appointment, fixed when it was booked. */
  bufferMinutes: integer("buffer_minutes").notNull().default(0),
  status: text("status").notNull().default("confirmed"),
  notes: text("notes"),
  /** Answers to the shop's custom questions, with the label as it was when booked. */
  answers: text("answers", { mode: "json" }).$type<BookingAnswer[]>(),
  cancelToken: text("cancel_token").notNull().unique(),
  reminderSentAt: integer("reminder_sent_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

/** Secret keys for the public API (Pro). Only a hash is stored. */
export const apiKeys = sqliteTable("api_keys", {
  id: text("id").primaryKey(),
  shopId: text("shop_id")
    .notNull()
    .references(() => shops.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  /** First characters of the key, to recognise it in the dashboard. */
  prefix: text("prefix").notNull(),
  /** SHA-256 of the full key, hex. */
  hash: text("hash").notNull().unique(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  lastUsedAt: integer("last_used_at", { mode: "timestamp" }),
  revokedAt: integer("revoked_at", { mode: "timestamp" }),
});

/** URLs a shop's appointment events are POSTed to (Pro). */
export const webhookEndpoints = sqliteTable("webhook_endpoints", {
  id: text("id").primaryKey(),
  shopId: text("shop_id")
    .notNull()
    .references(() => shops.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  /** Signs every delivery (HMAC-SHA256); the shop verifies with it. */
  secret: text("secret").notNull(),
  /** Event types to send. */
  events: text("events", { mode: "json" }).$type<string[]>().notNull(),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

/** One event for one endpoint, with its retry state. */
export const webhookDeliveries = sqliteTable(
  "webhook_deliveries",
  {
    id: text("id").primaryKey(),
    endpointId: text("endpoint_id")
      .notNull()
      .references(() => webhookEndpoints.id, { onDelete: "cascade" }),
    shopId: text("shop_id")
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),
    eventId: text("event_id").notNull(),
    event: text("event").notNull(),
    /** The exact JSON body sent (and signed). */
    payload: text("payload").notNull(),
    /** pending | succeeded | failed */
    status: text("status").notNull().default("pending"),
    attempts: integer("attempts").notNull().default(0),
    nextAttemptAt: integer("next_attempt_at", { mode: "timestamp" }),
    lastStatusCode: integer("last_status_code"),
    lastError: text("last_error"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    deliveredAt: integer("delivered_at", { mode: "timestamp" }),
  },
  (table) => [index("webhook_deliveries_due").on(table.status, table.nextAttemptAt)],
);

export const usersRelations = relations(users, ({ many }) => ({
  shops: many(shops),
}));

export const shopsRelations = relations(shops, ({ one, many }) => ({
  user: one(users, { fields: [shops.userId], references: [users.id] }),
  services: many(services),
  staff: many(staff),
  formFields: many(formFields),
  workingHours: many(workingHours),
  dateOverrides: many(dateOverrides),
  appointments: many(appointments),
}));

export const servicesRelations = relations(services, ({ one, many }) => ({
  shop: one(shops, { fields: [services.shopId], references: [shops.id] }),
  appointments: many(appointments),
}));

export const staffRelations = relations(staff, ({ one, many }) => ({
  shop: one(shops, { fields: [staff.shopId], references: [shops.id] }),
  workingHours: many(workingHours),
  dateOverrides: many(dateOverrides),
  appointments: many(appointments),
}));

export const workingHoursRelations = relations(workingHours, ({ one }) => ({
  shop: one(shops, { fields: [workingHours.shopId], references: [shops.id] }),
}));

export const dateOverridesRelations = relations(dateOverrides, ({ one }) => ({
  shop: one(shops, { fields: [dateOverrides.shopId], references: [shops.id] }),
}));

export const appointmentsRelations = relations(appointments, ({ one }) => ({
  shop: one(shops, { fields: [appointments.shopId], references: [shops.id] }),
  service: one(services, {
    fields: [appointments.serviceId],
    references: [services.id],
  }),
}));

export type BookingAnswer = { key: string; label: string; value: string | number | boolean };

export type User = typeof users.$inferSelect;
export type Shop = typeof shops.$inferSelect;
export type Service = typeof services.$inferSelect;
export type Staff = typeof staff.$inferSelect;
export type FormField = typeof formFields.$inferSelect;
export type ApiKey = typeof apiKeys.$inferSelect;
export type WebhookEndpoint = typeof webhookEndpoints.$inferSelect;
export type WebhookDelivery = typeof webhookDeliveries.$inferSelect;
export type WorkingHour = typeof workingHours.$inferSelect;
export type DateOverride = typeof dateOverrides.$inferSelect;
export type Appointment = typeof appointments.$inferSelect;
