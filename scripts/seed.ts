import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { eq } from "drizzle-orm";
import {
  appointments,
  services,
  shops,
  users,
  workingHours,
} from "../src/db/schema";
import { hashPassword } from "../src/lib/auth";
import { newId } from "../src/lib/id";

async function main() {
  const url =
    process.env.DATABASE_URL ??
    process.env.TURSO_DATABASE_URL ??
    "file:./data/bookslot.db";
  const authToken =
    process.env.DATABASE_AUTH_TOKEN ?? process.env.TURSO_AUTH_TOKEN;
  const client = createClient({ url, authToken });
  const db = drizzle(client);

  const demoEmail = "demo@bookslot.mk";
  const existing = await db.select().from(users).where(eq(users.email, demoEmail));

  if (existing.length > 0) {
    console.log("Demo data already exists.");
    client.close();
    return;
  }

  const now = new Date();
  const userId = newId("usr");
  const shopId = newId("shop");

  await db.insert(users).values({
    id: userId,
    email: demoEmail,
    passwordHash: await hashPassword("demo12345"),
    name: "Demo Owner",
    createdAt: now,
  });

  await db.insert(shops).values({
    id: shopId,
    userId,
    slug: "demo-salon",
    name: "Demo Beauty Salon",
    description: "Example salon for testing BookSlot",
    primaryColor: "#7c3aed",
    timezone: "Europe/Skopje",
    phone: "+389 70 000 000",
    address: "Skopje, North Macedonia",
    reminderHoursBefore: 24,
    createdAt: now,
  });

  const serviceIds = [
    { id: newId("svc"), name: "Haircut", durationMinutes: 30, priceCents: 80000 },
    { id: newId("svc"), name: "Hair color", durationMinutes: 90, priceCents: 250000 },
    { id: newId("svc"), name: "Manicure", durationMinutes: 45, priceCents: 120000 },
  ];

  await db.insert(services).values(
    serviceIds.map((s, i) => ({
      id: s.id,
      shopId,
      name: s.name,
      durationMinutes: s.durationMinutes,
      priceCents: s.priceCents,
      active: true,
      sortOrder: i,
    })),
  );

  await db.insert(workingHours).values(
    [1, 2, 3, 4, 5, 6].map((day) => ({
      id: newId("wh"),
      shopId,
      dayOfWeek: day,
      startTime: "09:00",
      endTime: "18:00",
    })),
  );

  console.log("Demo seeded:");
  console.log("  Login: demo@bookslot.mk / demo12345");
  console.log("  Booking: /book/demo-salon");
  console.log("  Embed: /embed/demo-salon");

  client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
