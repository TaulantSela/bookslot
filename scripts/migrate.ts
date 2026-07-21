import { mkdirSync, existsSync } from "fs";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";

async function main() {
  if (!existsSync("./data")) {
    mkdirSync("./data", { recursive: true });
  }

  const url = process.env.DATABASE_URL ?? "file:./data/bookslot.db";
  const client = createClient({ url });
  const db = drizzle(client);

  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("Database migrated:", url);
  client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
