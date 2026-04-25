// Server env (Node / Cloudflare Worker). Validation is LAZY — we don't run
// Zod at module load, because in the Cloudflare Worker build `process.env`
// gets inlined as `{}` by Vite. The Worker populates process.env from its
// bindings at *request time*, so we defer createEnv() until the first
// `env.X` access via a Proxy.
//
// dotenv is intentionally NOT imported here — it pulls in node:fs which
// isn't available in the Worker runtime. Dev-time env loading is handled
// by:
//   - Astro reads apps/web/.env automatically during `astro build`
//   - Alchemy binds the same values as Worker Secrets at deploy time
//   - Node-based scripts (scripts/backup-turso.ts, packages/infra/alchemy.run.ts)
//     load dotenv themselves
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

function buildEnv() {
  return createEnv({
    server: {
      // Database (libSQL local / Turso production)
      DATABASE_URL: z.string().min(1),
      DATABASE_AUTH_TOKEN: z.string().default(""),

      // Better-Auth
      BETTER_AUTH_SECRET: z.string().min(32),
      BETTER_AUTH_URL: z.url(),

      // Polar (imported eagerly by @polar-sh/better-auth; checkout deferred Phase 2)
      POLAR_ACCESS_TOKEN: z.string().min(1),
      POLAR_SUCCESS_URL: z.url().default("https://tkids.tw/dashboard"),

      // Resend (transactional email, mailing-list double-opt-in)
      RESEND_API_KEY: z.string().default(""),
      RESEND_FROM_EMAIL: z.string().default("no-reply@tkids.tw"),
      RESEND_REPLY_TO: z.string().default("hello@tkids.tw"),

      // Cloudflare Turnstile (bot protection on signup)
      TURNSTILE_SECRET_KEY: z.string().default(""),

      // Google OAuth (v1.3.x). Both default empty so dev environments without
      // Google credentials don't break — the auth config conditionally enables
      // the provider only when both values are present.
      GOOGLE_CLIENT_ID: z.string().default(""),
      GOOGLE_CLIENT_SECRET: z.string().default(""),

      // Observability sinks — both optional. If neither is set, errors
      // only go to console. Wire one or both as needed.
      SENTRY_DSN: z.string().default(""),
      DISCORD_ALERT_WEBHOOK: z.string().default(""),

      NODE_ENV: z
        .enum(["development", "production", "test"])
        .default("development"),
    },
    runtimeEnv: process.env,
    emptyStringAsUndefined: true,
  });
}

type Env = ReturnType<typeof buildEnv>;
let _env: Env | undefined;

// Lazy Proxy: first property access triggers createEnv(), by which time
// process.env has been populated by the runtime (Worker bindings, Node
// shell, CI secrets, etc). Subsequent accesses reuse the cached instance.
export const env = new Proxy({} as Env, {
  get(_t, prop: string) {
    if (!_env) _env = buildEnv();
    return (_env as unknown as Record<string, unknown>)[prop];
  },
});
