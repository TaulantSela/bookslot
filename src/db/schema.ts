import { relations } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

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
  timezone: text("timezone").notNull().default("Europe/Skopje"),
  phone: text("phone"),
  address: text("address"),
  reminderHoursBefore: integer("reminder_hours_before").notNull().default(24),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const services = sqliteTable("services", {
  id: text("id").primaryKey(),
  shopId: text("shop_id")
    .notNull()
    .references(() => shops.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  durationMinutes: integer("duration_minutes").notNull(),
  priceCents: integer("price_cents"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const workingHours = sqliteTable("working_hours", {
  id: text("id").primaryKey(),
  shopId: text("shop_id")
    .notNull()
    .references(() => shops.id, { onDelete: "cascade" }),
  dayOfWeek: integer("day_of_week").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
});

export const appointments = sqliteTable("appointments", {
  id: text("id").primaryKey(),
  shopId: text("shop_id")
    .notNull()
    .references(() => shops.id, { onDelete: "cascade" }),
  serviceId: text("service_id")
    .notNull()
    .references(() => services.id),
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone").notNull(),
  customerEmail: text("customer_email"),
  startsAt: integer("starts_at", { mode: "timestamp" }).notNull(),
  endsAt: integer("ends_at", { mode: "timestamp" }).notNull(),
  status: text("status").notNull().default("confirmed"),
  notes: text("notes"),
  cancelToken: text("cancel_token").notNull().unique(),
  reminderSentAt: integer("reminder_sent_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  shops: many(shops),
}));

export const shopsRelations = relations(shops, ({ one, many }) => ({
  user: one(users, { fields: [shops.userId], references: [users.id] }),
  services: many(services),
  workingHours: many(workingHours),
  appointments: many(appointments),
}));

export const servicesRelations = relations(services, ({ one, many }) => ({
  shop: one(shops, { fields: [services.shopId], references: [shops.id] }),
  appointments: many(appointments),
}));

export const workingHoursRelations = relations(workingHours, ({ one }) => ({
  shop: one(shops, { fields: [workingHours.shopId], references: [shops.id] }),
}));

export const appointmentsRelations = relations(appointments, ({ one }) => ({
  shop: one(shops, { fields: [appointments.shopId], references: [shops.id] }),
  service: one(services, {
    fields: [appointments.serviceId],
    references: [services.id],
  }),
}));

export type User = typeof users.$inferSelect;
export type Shop = typeof shops.$inferSelect;
export type Service = typeof services.$inferSelect;
export type WorkingHour = typeof workingHours.$inferSelect;
export type Appointment = typeof appointments.$inferSelect;
