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
          required: true,
          input: true,
        },
        over13Consent: {
          type: "boolean",
          required: true,
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
      },
    },
    databaseHooks: {
      user: {
        create: {
          before: async (user) => {
            // additionalFields extend the base user type at runtime
            const u = user as typeof user & {
              birthYear?: number;
              over13Consent?: boolean;
            };

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

            return {
              data: {
                ...u,
                subscribedAt: new Date(),
              },
            };
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
    plugins: [
      polar({
        client: polarClient,
        createCustomerOnSignUp: true,
        enableCustomerPortal: true,
        // Checkout products deferred to Phase 2 (donations/patrons).
        use: [],
      }),
    ],
  });
}

export const auth = createAuth();
