import alchemy from "alchemy";
import { Astro, R2Bucket, Queue } from "alchemy/cloudflare";
import { config } from "dotenv";

config({ path: "./.env" });
config({ path: "../../apps/web/.env" });

// tKids infrastructure — single Astro Worker at tkids.tw with everything
// it needs colocated.
//
// After `bun run deploy` from the repo root, the outputs below print:
//   Web   -> https://tkids.tw
//   Audio -> R2 bucket tkids-audio
//   Queue -> tkids-subscribe-retry
//
// Secrets (DATABASE_URL, BETTER_AUTH_SECRET, RESEND_API_KEY, ...) are read
// from apps/web/.env at deploy time and bound as Worker secrets. They
// are NOT committed — the .env is gitignored.
const app = await alchemy("tkids");

// ------------------------------------------------------------------
// R2 buckets
// ------------------------------------------------------------------
// Public bucket: serves the 30-60s teaser AAC + pre-computed peaks JSON.
// After first deploy, enable public access in the Cloudflare dashboard
// or add the `allowPublicAccess` flag once the Alchemy R2 API stabilizes.
export const audioBucket = await R2Bucket("tkids-audio", {
  name: "tkids-audio",
});

// Image originals (portraits, OG cards). Served via Cloudflare Images.
export const imagesBucket = await R2Bucket("tkids-images", {
  name: "tkids-images",
});

// Nightly Turso dumps, long-term archives. Private.
export const backupsBucket = await R2Bucket("tkids-backups", {
  name: "tkids-backups",
});

// ------------------------------------------------------------------
// Queue: subscriber retry on Resend outage
// ------------------------------------------------------------------
export const subscribeRetryQueue = await Queue("tkids-subscribe-retry", {
  name: "tkids-subscribe-retry",
});

// ------------------------------------------------------------------
// Web Worker (Astro + colocated API via catch-all routes)
// ------------------------------------------------------------------
export const web = await Astro("web", {
  cwd: "../../apps/web",
  entrypoint: "dist/server/entry.mjs",
  assets: "dist/client",

  // Custom domains — nameservers for tkids.tw must be pointed at Cloudflare
  // first. See TODOS.md for the DNS cutover runbook.
  domains: ["tkids.tw", "www.tkids.tw"],

  bindings: {
    // Public (readable client-side via astro:env/client):
    PUBLIC_SERVER_URL: alchemy.env.PUBLIC_SERVER_URL ?? "https://tkids.tw",
    PUBLIC_TURNSTILE_SITE_KEY:
      alchemy.env.PUBLIC_TURNSTILE_SITE_KEY ?? "1x00000000000000000000AA",

    // Server secrets — values come from apps/web/.env at deploy time.
    DATABASE_URL: alchemy.secret(alchemy.env.DATABASE_URL!),
    DATABASE_AUTH_TOKEN: alchemy.secret(alchemy.env.DATABASE_AUTH_TOKEN!),
    BETTER_AUTH_SECRET: alchemy.secret(alchemy.env.BETTER_AUTH_SECRET!),
    BETTER_AUTH_URL: alchemy.env.BETTER_AUTH_URL ?? "https://tkids.tw",
    POLAR_ACCESS_TOKEN: alchemy.secret(alchemy.env.POLAR_ACCESS_TOKEN!),
    POLAR_SUCCESS_URL:
      alchemy.env.POLAR_SUCCESS_URL ?? "https://tkids.tw/dashboard",
    RESEND_API_KEY: alchemy.secret(alchemy.env.RESEND_API_KEY!),
    RESEND_FROM_EMAIL: alchemy.env.RESEND_FROM_EMAIL ?? "no-reply@tkids.tw",
    RESEND_REPLY_TO: alchemy.env.RESEND_REPLY_TO ?? "hello@tkids.tw",
    TURNSTILE_SECRET_KEY: alchemy.secret(alchemy.env.TURNSTILE_SECRET_KEY!),

    // Observability — both optional. If neither set, errors only console.error.
    SENTRY_DSN: alchemy.secret(alchemy.env.SENTRY_DSN ?? ""),
    DISCORD_ALERT_WEBHOOK: alchemy.secret(
      alchemy.env.DISCORD_ALERT_WEBHOOK ?? "",
    ),

    NODE_ENV: alchemy.env.NODE_ENV ?? "production",

    // Resource bindings — accessible in the Worker as env.AUDIO etc.
    AUDIO: audioBucket,
    IMAGES: imagesBucket,
    BACKUPS: backupsBucket,
    SUBSCRIBE_RETRY_QUEUE: subscribeRetryQueue,
  },

  // Needed for: better-auth (node:async_hooks), dotenv (node:fs/path/os),
  // and the libSQL driver's node compat path.
  compatibilityDate: "2026-04-01",
  compatibilityFlags: ["nodejs_compat"],
});

console.log(`Web             -> ${web.url}`);
console.log(`Audio bucket    -> tkids-audio`);
console.log(`Images bucket   -> tkids-images`);
console.log(`Backups bucket  -> tkids-backups`);
console.log(`Retry queue     -> tkids-subscribe-retry`);

await app.finalize();
