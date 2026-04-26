// One-time backfill: mark all existing users with valid age + consent as
// already onboarded so they don't get bounced to /onboarding when that
// surface ships. Existing users went through form signup, which means they
// already supplied birthYear + over13Consent at create time.
//
// Run after `bun run db:push` against whichever DB needs it:
//   bun run scripts/backfill-onboarded-at.ts
//
// Idempotent: only updates rows where onboarded_at IS NULL. Safe to re-run.

import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import { createClient } from "@libsql/client";

// Match drizzle.config.ts + alchemy.run.ts — env lives in apps/web/.env.
// Use fileURLToPath so paths with spaces in them (e.g. "Claude Projects")
// don't get URL-encoded.
config({
  path: fileURLToPath(new URL("../apps/web/.env", import.meta.url)),
});

// Stage routing matches alchemy.run.ts and drizzle.config.ts.
const STAGE = process.env.ALCHEMY_STAGE ?? "prod";
const IS_STAGING = STAGE === "staging";

const url = IS_STAGING
  ? process.env.STAGING_DATABASE_URL
  : process.env.DATABASE_URL;
const authToken = IS_STAGING
  ? process.env.STAGING_DATABASE_AUTH_TOKEN
  : process.env.DATABASE_AUTH_TOKEN;

if (!url) {
  console.error(
    `${IS_STAGING ? "STAGING_DATABASE_URL" : "DATABASE_URL"} not set. Aborting.`,
  );
  process.exit(1);
}

console.log(`[backfill] targeting ${IS_STAGING ? "STAGING" : "PROD"} DB`);

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
