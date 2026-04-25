import dotenv from "dotenv";
import { defineConfig } from "drizzle-kit";

dotenv.config({
  path: "../../apps/web/.env",
});

// Stage routing — same convention as packages/infra/alchemy.run.ts.
//   ALCHEMY_STAGE=staging  → STAGING_DATABASE_URL / STAGING_DATABASE_AUTH_TOKEN
//   ALCHEMY_STAGE=prod (or unset, or "richard") → DATABASE_URL / DATABASE_AUTH_TOKEN
const STAGE = process.env.ALCHEMY_STAGE ?? "prod";
const IS_STAGING = STAGE === "staging";

const url = IS_STAGING
  ? process.env.STAGING_DATABASE_URL
  : process.env.DATABASE_URL;

const authToken = IS_STAGING
  ? process.env.STAGING_DATABASE_AUTH_TOKEN
  : process.env.DATABASE_AUTH_TOKEN;

console.log(
  `[drizzle] targeting ${IS_STAGING ? "STAGING" : "PROD"} DB${
    url ? ` (${url.slice(0, 30)}...)` : " (no URL set)"
  }`,
);

export default defineConfig({
  schema: "./src/schema",
  out: "./src/migrations",
  dialect: "turso",
  dbCredentials: {
    url: url || "",
    authToken,
  },
});
