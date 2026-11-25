// Runs first in `npm run db:migrate` (and so in `db:setup`); see db-guard.ts.
import { assertDisposableDatabase } from "./db-guard";

assertDisposableDatabase().then(
  (where) => console.log(`Dev database: ${where}`),
  (error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  },
);
