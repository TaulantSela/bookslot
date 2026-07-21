import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(100),
  shopName: z.string().min(2).max(80),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const serviceSchema = z.object({
  name: z.string().min(1).max(80),
  durationMinutes: z.coerce.number().int().min(5).max(480),
  priceCents: z.coerce.number().int().min(0).optional(),
});

export const workingHourSchema = z.object({
  dayOfWeek: z.coerce.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
});

export const shopSettingsSchema = z.object({
  name: z.string().min(2).max(80),
  description: z.string().max(500).optional(),
  phone: z.string().max(30).optional(),
  address: z.string().max(200).optional(),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  reminderHoursBefore: z.coerce.number().int().min(1).max(168),
});

export const bookingSchema = z.object({
  shopSlug: z.string().min(1),
  serviceId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  customerName: z.string().min(2).max(80),
  customerPhone: z.string().min(5).max(30),
  customerEmail: z.string().email().optional().or(z.literal("")),
  notes: z.string().max(500).optional(),
});

export const DAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export const DAY_LABELS_MK = [
  "Недела",
  "Понеделник",
  "Вторник",
  "Среда",
  "Четврток",
  "Петок",
  "Сабота",
] as const;
