// The commands that change a database from a laptop (`npm run db:migrate`, `npm run db:seed`, and
// `db:setup`, which runs both) only run on a local SQLite file (the default, file:./data/...) or
// on a remote database marked as a disposable dev database. Production (Turso) is never marked,
// so if DATABASE_URL ever points at it, they stop instead of changing it.
//
// Not guarded: `npm run build`, which migrates production by running scripts/migrate.ts directly,
// and scripts/set-plan.ts and scripts/seed-examples.ts, which are meant for production too.
//
// SQLite has no database comments, so the mark is a one-row table. To mark a dev database (never
// production), run this once against it, e.g. in the Turso shell:
//   CREATE TABLE _disposable (mark TEXT NOT NULL);
//   INSERT INTO _disposable VALUES ('bookslot:disposable');
import { createClient } from "@libsql/client";

export const DISPOSABLE_MARK = "bookslot:disposable";

/** The database the scripts use: the same rule as scripts/migrate.ts and scripts/seed.ts. */
export function databaseUrl(env: NodeJS.ProcessEnv = process.env): string {
  return env.DATABASE_URL ?? env.TURSO_DATABASE_URL ?? "file:./data/bookslot.db";
}

/** Throws unless the database is a local SQLite file or marked as disposable. Returns what it checked. */
export async function assertDisposableDatabase(env: NodeJS.ProcessEnv = process.env): Promise<string> {
  const url = databaseUrl(env);
  if (url.startsWith("file:") || url === ":memory:") return `a local SQLite file (${url})`;

  let host = url;
  try {
    host = new URL(url).hostname;
  } catch {
    // keep the raw string
  }
  const client = createClient({ url, authToken: env.DATABASE_AUTH_TOKEN ?? env.TURSO_AUTH_TOKEN });
  try {
    let mark: unknown = null;
    try {
      const result = await client.execute("SELECT mark FROM _disposable LIMIT 1");
      mark = result.rows[0]?.mark ?? null;
    } catch (error) {
      // No _disposable table means "not marked"; anything else (network, auth) is a real error.
      if (!/no such table/i.test(error instanceof Error ? error.message : String(error))) throw error;
    }
    if (mark !== DISPOSABLE_MARK) {
      throw new Error(
        `Refusing to touch ${host}: it isn't marked as a disposable dev database, and production never is.\n` +
          "Leave DATABASE_URL unset for the local SQLite file, or point it at bookslot-dev (see the README).",
      );
    }
    return host;
  } finally {
    client.close();
  }
}
