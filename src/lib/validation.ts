import { z } from "zod";
import { isValidCurrency, isValidTimeZone } from "@/lib/regional";
import { isValidDateString, isValidTimeString } from "@/lib/slots-internal";

const timezone = z.string().refine(isValidTimeZone, "Unknown timezone");
const currency = z.string().refine(isValidCurrency, "Unknown currency");
const time = z.string().refine(isValidTimeString, "Use HH:mm");
const date = z.string().refine(isValidDateString, "Use yyyy-MM-dd");

/** Empty form fields become undefined, so optional numbers can be left blank. */
const blankToUndefined = (value: unknown) =>
  value === "" || value === null ? undefined : value;

export const registerSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(100),
  shopName: z.string().min(2).max(80),
  timezone: timezone.optional(),
  currency: currency.optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const serviceSchema = z.object({
  name: z.string().min(1).max(80),
  durationMinutes: z.coerce.number().int().min(5).max(480),
  /** Whole currency units as typed by the owner (e.g. 800 MKD), not cents. */
  price: z.preprocess(blankToUndefined, z.coerce.number().min(0).max(10_000_000).optional()),
  /** Gap after this service in minutes. Blank = the shop's default. */
  bufferMinutes: z.preprocess(
    blankToUndefined,
    z.coerce.number().int().min(0).max(240).optional(),
  ),
});

export const workingHourSchema = z
  .object({
    dayOfWeek: z.coerce.number().int().min(0).max(6),
    startTime: time,
    endTime: time,
  })
  .refine((h) => h.startTime < h.endTime, "Closing time must be after opening time");

export const shopSettingsSchema = z.object({
  name: z.string().min(2).max(80),
  description: z.string().max(500).optional(),
  phone: z.string().max(30).optional(),
  address: z.string().max(200).optional(),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  reminderHoursBefore: z.coerce.number().int().min(1).max(168),
  timezone,
  currency,
});

export const bookingRulesSchema = z.object({
  slotIntervalMinutes: z.coerce.number().int().min(5).max(240),
  bufferMinutes: z.coerce.number().int().min(0).max(240),
  /** Up to 30 days. */
  minNoticeMinutes: z.coerce.number().int().min(0).max(43_200),
  /** Up to two years ahead; 0 = today only. */
  maxAdvanceDays: z.coerce.number().int().min(0).max(730),
});

export const MAX_OVERRIDE_DAYS = 366;

export const dateOverrideSchema = z
  .object({
    startDate: date,
    endDate: date,
    closed: z.boolean(),
    startTime: time.optional(),
    endTime: time.optional(),
    label: z.string().trim().max(80).optional(),
  })
  .refine((o) => o.startDate <= o.endDate, {
    message: "The last day must be on or after the first day.",
  })
  .refine(
    (o) =>
      (Date.parse(o.endDate) - Date.parse(o.startDate)) / 86_400_000 < MAX_OVERRIDE_DAYS,
    { message: `Pick at most ${MAX_OVERRIDE_DAYS} days at a time.` },
  )
  .refine((o) => o.closed || (o.startTime && o.endTime && o.startTime < o.endTime), {
    message: "Special hours need an opening time before the closing time.",
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
