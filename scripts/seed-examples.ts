// Seeds the two businesses used by examples/: a barbershop on the Free plan
// and a dental clinic on the Pro plan. Safe to run more than once.
//
//   npx tsx --env-file=.env.local scripts/seed-examples.ts
//
// Check which database your env file points at first.
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { eq } from "drizzle-orm";
import { services, shops, users, workingHours } from "../src/db/schema";
import { hashPassword } from "../src/lib/auth";
import { newId } from "../src/lib/id";

type ExampleShop = {
  owner: { email: string; name: string };
  shop: {
    slug: string;
    name: string;
    description: string;
    primaryColor: string;
    phone: string;
    address: string;
    plan: "free" | "pro";
    embedDomains: string[] | null;
  };
  services: { id: string; name: string; durationMinutes: number; price: number }[];
  days: number[];
  hours: [string, string];
};

const EXAMPLES: ExampleShop[] = [
  {
    owner: { email: "barber@example.com", name: "Arbër Rexhepi" },
    shop: {
      slug: "lakeside-barbers",
      name: "Lakeside Barbers",
      description: "Classic cuts and hot-towel shaves",
      primaryColor: "#b45309",
      phone: "+389 70 111 222",
      address: "Struga, North Macedonia",
      plan: "free",
      embedDomains: null,
    },
    services: [
      { id: "svc_lakeside_haircut", name: "Haircut", durationMinutes: 30, price: 600 },
      { id: "svc_lakeside_beard", name: "Beard trim", durationMinutes: 20, price: 300 },
      { id: "svc_lakeside_combo", name: "Haircut + beard", durationMinutes: 45, price: 800 },
    ],
    days: [2, 3, 4, 5, 6],
    hours: ["09:00", "19:00"],
  },
  {
    owner: { email: "dental@example.com", name: "Dr. Besa Osmani" },
    shop: {
      slug: "bright-smile-dental",
      name: "Bright Smile Dental",
      description: "Family dentistry",
      primaryColor: "#0d9488",
      phone: "+389 70 333 444",
      address: "Struga, North Macedonia",
      plan: "pro",
      // Only the example site may embed this widget.
      embedDomains: ["localhost:3001"],
    },
    services: [
      { id: "svc_brightsmile_checkup", name: "Check-up & cleaning", durationMinutes: 45, price: 1500 },
      { id: "svc_brightsmile_consult", name: "Consultation", durationMinutes: 30, price: 800 },
      { id: "svc_brightsmile_whitening", name: "Teeth whitening", durationMinutes: 60, price: 6000 },
    ],
    days: [1, 2, 3, 4, 5],
    hours: ["08:00", "16:00"],
  },
];

async function main() {
  const url =
    process.env.DATABASE_URL ??
    process.env.TURSO_DATABASE_URL ??
    "file:./data/bookslot.db";
  const authToken =
    process.env.DATABASE_AUTH_TOKEN ?? process.env.TURSO_AUTH_TOKEN;
  const client = createClient({ url, authToken });
  const db = drizzle(client);
  console.log(`Seeding examples into ${url.split("?")[0]}`);

  for (const example of EXAMPLES) {
    const existing = await db
      .select({ id: shops.id })
      .from(shops)
      .where(eq(shops.slug, example.shop.slug));
    if (existing.length > 0) {
      console.log(`  ${example.shop.slug}: already there`);
      continue;
    }

    const now = new Date();
    const userId = newId("usr");
    const shopId = newId("shop");
    await db.insert(users).values({
      id: userId,
      email: example.owner.email,
      passwordHash: await hashPassword("demo12345"),
      name: example.owner.name,
      createdAt: now,
    });
    await db.insert(shops).values({
      id: shopId,
      userId,
      timezone: "Europe/Skopje",
      reminderHoursBefore: 24,
      createdAt: now,
      ...example.shop,
    });
    await db.insert(services).values(
      example.services.map((s, i) => ({
        id: s.id,
        shopId,
        name: s.name,
        durationMinutes: s.durationMinutes,
        priceCents: s.price * 100,
        active: true,
        sortOrder: i,
      })),
    );
    await db.insert(workingHours).values(
      example.days.map((day) => ({
        id: newId("wh"),
        shopId,
        dayOfWeek: day,
        startTime: example.hours[0],
        endTime: example.hours[1],
      })),
    );
    console.log(
      `  ${example.shop.slug}: ${example.shop.plan} plan, login ${example.owner.email} / demo12345`,
    );
  }

  client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
