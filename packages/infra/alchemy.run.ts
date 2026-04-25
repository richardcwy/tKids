import alchemy from "alchemy";
import { Astro, R2Bucket, Queue } from "alchemy/cloudflare";
import { config } from "dotenv";

config({ path: "./.env" });
config({ path: "../../apps/web/.env" });

// ------------------------------------------------------------------
// Stage routing
// ------------------------------------------------------------------
// `ALCHEMY_STAGE` decides which environment this deploy targets.
//   "staging" → staging.tkids.tw, isolated buckets/queue/DB
//   "richard" / "prod" → tkids.tw + www.tkids.tw (live)
// Default is "richard" so a bare `bun run deploy` keeps existing prod
// state intact, but the package.json scripts force an explicit choice
// (deploy:staging / deploy:prod). See v1.3.0425-staging-runbook.md.
const STAGE = process.env.ALCHEMY_STAGE ?? "richard";
const IS_STAGING = STAGE === "staging";
const IS_PROD = STAGE === "richard" || STAGE === "prod";

if (!IS_STAGING && !IS_PROD) {
  throw new Error(
    `Unknown ALCHEMY_STAGE "${STAGE}". Expected "staging" or "richard"/"prod".`,
  );
}

const STAGE_TAG = IS_STAGING ? "STAGING" : "PROD";
const URL_BASE = IS_STAGING ? "https://staging.tkids.tw" : "https://tkids.tw";
const DOMAINS = IS_STAGING
  ? ["staging.tkids.tw"]
  : ["tkids.tw", "www.tkids.tw"];

// Resource-name suffix. Prod keeps the existing names so Alchemy state
// continues to track the same physical resources. Staging gets fresh
// "-staging" suffixed resources on its first deploy.
const sfx = (name: string) => (IS_STAGING ? `${name}-staging` : name);

// stageEnv("X") looks at STAGING_X first when staging, then falls back
// to X. So you can keep prod credentials in DATABASE_URL and add staging
// credentials in STAGING_DATABASE_URL alongside in the same .env file.
function stageEnv(key: string, fallback?: string): string | undefined {
  if (IS_STAGING) {
    const v = process.env[`STAGING_${key}`];
    if (v) return v;
  }
  return process.env[key] ?? fallback;
}

console.log(`\n[${STAGE_TAG}] deploying to ${URL_BASE}\n`);

const app = await alchemy("tkids");

// ------------------------------------------------------------------
// R2 buckets — separate per stage so staging writes never reach prod
// ------------------------------------------------------------------
export const audioBucket = await R2Bucket(sfx("tkids-audio"), {
  name: sfx("tkids-audio"),
});

export const imagesBucket = await R2Bucket(sfx("tkids-images"), {
  name: sfx("tkids-images"),
});

export const backupsBucket = await R2Bucket(sfx("tkids-backups"), {
  name: sfx("tkids-backups"),
});

// ------------------------------------------------------------------
// Queue: subscriber retry on Resend outage (per stage)
// ------------------------------------------------------------------
export const subscribeRetryQueue = await Queue(sfx("tkids-subscribe-retry"), {
  name: sfx("tkids-subscribe-retry"),
});

// ------------------------------------------------------------------
// Web Worker
// ------------------------------------------------------------------
export const web = await Astro("web", {
  cwd: "../../apps/web",
  entrypoint: "dist/server/entry.mjs",
  assets: "dist/client",

  domains: DOMAINS,

  bindings: {
    PUBLIC_SERVER_URL: stageEnv("PUBLIC_SERVER_URL", URL_BASE) ?? URL_BASE,
    PUBLIC_TURNSTILE_SITE_KEY:
      stageEnv("PUBLIC_TURNSTILE_SITE_KEY", "1x00000000000000000000AA") ??
      "1x00000000000000000000AA",
    PUBLIC_GA_MEASUREMENT_ID: stageEnv("PUBLIC_GA_MEASUREMENT_ID", "") ?? "",

    DATABASE_URL: alchemy.secret(stageEnv("DATABASE_URL")!),
    DATABASE_AUTH_TOKEN: alchemy.secret(stageEnv("DATABASE_AUTH_TOKEN")!),
    BETTER_AUTH_SECRET: alchemy.secret(stageEnv("BETTER_AUTH_SECRET")!),
    BETTER_AUTH_URL: stageEnv("BETTER_AUTH_URL", URL_BASE) ?? URL_BASE,
    POLAR_ACCESS_TOKEN: alchemy.secret(stageEnv("POLAR_ACCESS_TOKEN")!),
    POLAR_SUCCESS_URL:
      stageEnv("POLAR_SUCCESS_URL", `${URL_BASE}/dashboard`) ??
      `${URL_BASE}/dashboard`,
    RESEND_API_KEY: alchemy.secret(stageEnv("RESEND_API_KEY", "") ?? ""),
    RESEND_FROM_EMAIL:
      stageEnv("RESEND_FROM_EMAIL", "no-reply@tkids.tw") ??
      "no-reply@tkids.tw",
    RESEND_REPLY_TO:
      stageEnv("RESEND_REPLY_TO", "hello@tkids.tw") ?? "hello@tkids.tw",
    TURNSTILE_SECRET_KEY: alchemy.secret(
      stageEnv("TURNSTILE_SECRET_KEY", "") ?? "",
    ),

    // Google OAuth — empty by default; packages/auth skips wiring
    // socialProviders.google when either value is empty, so dormant
    // bindings are safe to ship.
    GOOGLE_CLIENT_ID: stageEnv("GOOGLE_CLIENT_ID", "") ?? "",
    GOOGLE_CLIENT_SECRET: alchemy.secret(
      stageEnv("GOOGLE_CLIENT_SECRET", "") ?? "",
    ),

    SENTRY_DSN: alchemy.secret(stageEnv("SENTRY_DSN", "") ?? ""),
    DISCORD_ALERT_WEBHOOK: alchemy.secret(
      stageEnv("DISCORD_ALERT_WEBHOOK", "") ?? "",
    ),

    NODE_ENV: stageEnv("NODE_ENV", "production") ?? "production",

    AUDIO: audioBucket,
    IMAGES: imagesBucket,
    BACKUPS: backupsBucket,
    SUBSCRIBE_RETRY_QUEUE: subscribeRetryQueue,
  },

  compatibilityDate: "2026-04-01",
  compatibilityFlags: ["nodejs_compat"],
});

console.log(`\n[${STAGE_TAG}] deployed`);
console.log(`Web             -> ${web.url}`);
console.log(`Audio bucket    -> ${sfx("tkids-audio")}`);
console.log(`Images bucket   -> ${sfx("tkids-images")}`);
console.log(`Backups bucket  -> ${sfx("tkids-backups")}`);
console.log(`Retry queue     -> ${sfx("tkids-subscribe-retry")}`);

await app.finalize();
