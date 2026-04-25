// One-time backfill: mark all existing users with valid age + consent as
// already onboarded so they don't get bounced to /onboarding when that
// surface ships. Existing users went through form signup, which means they
// already supplied birthYear + over13Consent at create time.
//
// Run after `bun run db:push` against whichever DB needs it:
//   bun run scripts/backfill-onboarded-at.ts
//
// Idempotent: only updates rows where onboarded_at IS NULL. Safe to re-run.

import "dotenv/config";
import { createClient } from "@libsql/client";

const url = process.env.DATABASE_URL;
const authToken = process.env.DATABASE_AUTH_TOKEN;

if (!url) {
  console.error("DATABASE_URL not set. Aborting.");
  process.exit(1);
}

const client = createClient({ url, authToken });

const result = await client.execute({
  sql: `UPDATE user
        SET onboarded_at = created_at
        WHERE onboarded_at IS NULL
          AND over_13_consent = 1
          AND birth_year IS NOT NULL`,
  args: [],
});

console.log(`Backfilled onboarded_at on ${result.rowsAffected} user row(s).`);
process.exit(0);
