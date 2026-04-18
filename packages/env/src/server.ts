import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    // Database (libSQL local / Turso production)
    DATABASE_URL: z.string().min(1),
    DATABASE_AUTH_TOKEN: z.string().default(""),

    // Better-Auth
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.url(),

    // Polar (imported eagerly by @polar-sh/better-auth; checkout deferred Phase 2)
    POLAR_ACCESS_TOKEN: z.string().min(1),
    POLAR_SUCCESS_URL: z.url().default("https://t.kids/dashboard"),

    // Resend (transactional email, mailing-list double-opt-in)
    RESEND_API_KEY: z.string().default(""),
    RESEND_FROM_EMAIL: z.string().default("no-reply@t.kids"),
    RESEND_REPLY_TO: z.string().default("hello@t.kids"),

    // Cloudflare Turnstile (bot protection on signup)
    TURNSTILE_SECRET_KEY: z.string().default(""),

    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
