// Sets a shop's plan after it has paid (there is no payment integration).
//
//   npx tsx --env-file=.env.local scripts/set-plan.ts <shop-slug> <free|pro>
//
// Uses DATABASE_URL (or TURSO_DATABASE_URL) like the app does, so check which
// database your env file points at before running it.

import { createClient } from "@libsql/client";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/libsql";
import { shops } from "../src/db/schema";
import { PLANS, isPlan } from "../src/lib/plans";

async function main() {
  const [slug, plan] = process.argv.slice(2);
  if (!slug || !isPlan(plan)) {
    console.error(`Usage: set-plan.ts <shop-slug> <${PLANS.join("|")}>`);
    process.exit(1);
  }

  const url =
    process.env.DATABASE_URL ??
    process.env.TURSO_DATABASE_URL ??
    "file:./data/bookslot.db";
  const authToken =
    process.env.DATABASE_AUTH_TOKEN ?? process.env.TURSO_AUTH_TOKEN;
  const client = createClient({ url, authToken });
  const db = drizzle(client);

  const [shop] = await db
    .select({ id: shops.id, plan: shops.plan })
    .from(shops)
    .where(eq(shops.slug, slug))
    .limit(1);

  if (!shop) {
    console.error(`No shop with slug "${slug}" in ${new URL(url).host || url}`);
    client.close();
    process.exit(1);
  }

  await db.update(shops).set({ plan }).where(eq(shops.id, shop.id));
  console.log(`${slug}: ${shop.plan} → ${plan}`);
  client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
