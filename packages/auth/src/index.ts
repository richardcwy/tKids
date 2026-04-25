import { createDb } from "@my-better-t-app/db";
import * as schema from "@my-better-t-app/db/schema/auth";
import { env } from "@my-better-t-app/env/server";
import { polar } from "@polar-sh/better-auth";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

import { polarClient } from "./lib/payments";

export function createAuth() {
  const db = createDb();

  return betterAuth({
    database: drizzleAdapter(db, {
      provider: "sqlite",
      schema: schema,
    }),
    // Same-origin launch: the only trusted origin is the Worker itself.
    trustedOrigins: [env.BETTER_AUTH_URL],
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
    },
    user: {
      additionalFields: {
        birthYear: {
          type: "number",
          required: false,
          input: true,
        },
        over13Consent: {
          type: "boolean",
          required: false,
          input: true,
        },
        source: {
          type: "string",
          required: false,
          input: true,
          defaultValue: "unknown",
        },
        subscribedAt: {
          type: "date",
          required: false,
          input: false,
        },
        unsubscribedAt: {
          type: "date",
          required: false,
          input: false,
        },
        onboardedAt: {
          type: "date",
          required: false,
          input: false,
        },
      },
    },
    databaseHooks: {
      user: {
        create: {
          before: async (user) => {
            const u = user as typeof user & {
              birthYear?: number | null;
              over13Consent?: boolean;
            };

            // Form signup carries explicit consent + birthYear inline. When
            // both are present we validate hard: under-13 is rejected, missing
            // consent is rejected, and the user is marked onboarded.
            //
            // OAuth signup carries neither field. We let creation succeed with
            // onboardedAt = null; the onboarding flow (v1.3.1+) collects age +
            // consent and flips the flag. Action endpoints check onboardedAt
            // before allowing identity-required behavior (donate/comment/etc).
            const hasFormFields =
              u.over13Consent !== undefined && u.birthYear !== undefined;

            if (hasFormFields) {
              if (u.over13Consent !== true) {
                throw new Error(
                  "CONSENT_REQUIRED: You must confirm you are 13 or older to subscribe.",
                );
              }
              const currentYear = new Date().getUTCFullYear();
              const age = currentYear - Number(u.birthYear);
              if (!Number.isFinite(age) || age < 13) {
                throw new Error(
                  "UNDER_AGE: You must be 13 or older to subscribe.",
                );
              }
              const now = new Date();
              return {
                data: {
                  ...u,
                  subscribedAt: now,
                  onboardedAt: now,
                },
              };
            }

            // OAuth path: no form fields, soft-create as pending-onboarding.
            return { data: u };
          },
        },
      },
    },
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    advanced: {
      defaultCookieAttributes: {
        // Same-origin default. CSRF-safe; cookies ride first-party requests.
        sameSite: "lax",
        secure: env.NODE_ENV === "production",
        httpOnly: true,
      },
    },
    socialProviders:
      env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
        ? {
            google: {
              clientId: env.GOOGLE_CLIENT_ID,
              clientSecret: env.GOOGLE_CLIENT_SECRET,
              prompt: "select_account",
            },
          }
        : undefined,
    plugins: [
      polar({
        client: polarClient,
        // Defer Polar customer creation until onboarding completes (Phase B).
        // OAuth users land with onboardedAt = null and shouldn't yet have a
        // Polar customer record minted on their behalf.
        createCustomerOnSignUp: false,
        enableCustomerPortal: true,
        use: [],
      }),
    ],
  });
}

// Lazy — can't instantiate at module load because env is empty at cold
// boot in the Cloudflare Worker. The middleware (apps/web/src/middleware.ts)
// populates process.env on each request, so first access inside a route
// handler sees real values.
type Auth = ReturnType<typeof createAuth>;
let _auth: Auth | undefined;

export const auth = new Proxy({} as Auth, {
  get(_t, prop: string | symbol) {
    if (!_auth) _auth = createAuth();
    const v = (_auth as unknown as Record<string | symbol, unknown>)[prop];
    return typeof v === "function" ? v.bind(_auth) : v;
  },
});
