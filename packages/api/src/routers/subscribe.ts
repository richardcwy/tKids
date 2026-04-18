import { db } from "@my-better-t-app/db";
import { subscribeAudit, user } from "@my-better-t-app/db/schema";
import { auth } from "@my-better-t-app/auth";
import { ORPCError } from "@orpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { publicProcedure } from "../index";
import { isAgeOk } from "../lib/age";
import { sha256 } from "../lib/hash";
import { verifyTurnstile } from "../lib/turnstile";
import { checkRateLimit } from "../lib/rate-limit";
import { sendWelcomeEmail } from "../lib/resend";

// Minimum birth year for the age gate — computed at module load.
// Age check = currentYear - birthYear >= 13. Simple, year-only, no PII.
const CURRENT_YEAR = new Date().getUTCFullYear();
const MIN_BIRTH_YEAR = 1900;

export const subscribeInput = z.object({
  email: z
    .string()
    .email()
    .toLowerCase()
    .max(254, { message: "email_too_long" }),
  name: z.string().min(1).max(80).optional().default(""),
  password: z
    .string()
    .min(8, { message: "password_too_short" })
    .max(128, { message: "password_too_long" }),
  birthYear: z.number().int().min(MIN_BIRTH_YEAR).max(CURRENT_YEAR),
  over13Consent: z.literal(true, { message: "consent_required" }),
  source: z
    .enum(["hero", "ep", "footer", "signup", "join"])
    .optional()
    .default("signup"),
  turnstileToken: z.string().min(1, { message: "missing_turnstile" }),
  // Honeypot: visible to bots, invisible to humans. Must be empty.
  honeypot: z.string().max(0, { message: "honeypot_tripped" }).optional().default(""),
});

export const subscribeOutput = z.object({
  ok: z.boolean(),
  state: z.enum([
    "pending_verification",
    "already_subscribed",
    "queued_for_retry",
  ]),
});

export const subscribe = publicProcedure
  .input(subscribeInput)
  .output(subscribeOutput)
  .handler(async ({ input, context }) => {
    const ipHash = await sha256(context.ip);
    const uaHash = await sha256(context.userAgent);

    // Honeypot — silently respond success to the bot but never create an account.
    if (input.honeypot !== "") {
      await audit({
        email: input.email,
        ipHash,
        uaHash,
        outcome: "honeypot",
        source: input.source,
      });
      return { ok: true, state: "pending_verification" as const };
    }

    // Rate limit
    const rl = await checkRateLimit(ipHash);
    if (!rl.allowed) {
      await audit({
        email: input.email,
        ipHash,
        uaHash,
        outcome: "rate_limited",
        source: input.source,
      });
      throw new ORPCError("TOO_MANY_REQUESTS", {
        message: "rate_limited",
        data: { retryAfterSeconds: rl.retryAfterSeconds },
      });
    }

    // Turnstile
    const ts = await verifyTurnstile(input.turnstileToken, context.ip);
    if (!ts.ok) {
      await audit({
        email: input.email,
        ipHash,
        uaHash,
        outcome: "turnstile_failed",
        source: input.source,
      });
      throw new ORPCError("BAD_REQUEST", {
        message: ts.reason ?? "turnstile_failed",
      });
    }

    // Server-side age check (redundant with Better-Auth databaseHook but
    // we log the attempt at this layer for audit clarity).
    if (!isAgeOk(input.birthYear, CURRENT_YEAR)) {
      await audit({
        email: input.email,
        ipHash,
        uaHash,
        birthYear: input.birthYear,
        outcome: "under_age",
        source: input.source,
      });
      throw new ORPCError("BAD_REQUEST", { message: "under_age" });
    }

    // Duplicate check
    const existing = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, input.email))
      .limit(1);
    if (existing.length > 0) {
      await audit({
        userId: existing[0]!.id,
        email: input.email,
        ipHash,
        uaHash,
        birthYear: input.birthYear,
        over13: true,
        outcome: "duplicate",
        source: input.source,
      });
      return { ok: true, state: "already_subscribed" as const };
    }

    // Create account via Better-Auth (triggers the age-gate databaseHook too).
    let createdUserId: string;
    try {
      const result = await auth.api.signUpEmail({
        body: {
          email: input.email,
          password: input.password,
          name: input.name || input.email.split("@")[0]!,
          autoSignIn: false,
          // additionalFields (declared on the auth config):
          birthYear: input.birthYear,
          over13Consent: input.over13Consent,
          source: input.source,
        } as unknown as Parameters<typeof auth.api.signUpEmail>[0]["body"],
      });
      createdUserId = result.user.id;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const outcome = msg.includes("UNDER_AGE")
        ? "under_age"
        : msg.includes("CONSENT_REQUIRED")
          ? "no_consent"
          : "db_error";
      await audit({
        email: input.email,
        ipHash,
        uaHash,
        birthYear: input.birthYear,
        over13: input.over13Consent,
        outcome,
        source: input.source,
      });
      if (outcome === "under_age")
        throw new ORPCError("BAD_REQUEST", { message: "under_age" });
      if (outcome === "no_consent")
        throw new ORPCError("BAD_REQUEST", { message: "consent_required" });
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "signup_failed",
      });
    }

    await audit({
      userId: createdUserId,
      email: input.email,
      ipHash,
      uaHash,
      birthYear: input.birthYear,
      over13: true,
      outcome: "accepted",
      source: input.source,
    });

    // Welcome email (Resend). On failure: audit-log as queued (TODO: push to
    // Cloudflare Queue when the binding is wired).
    try {
      await sendWelcomeEmail({ to: input.email, name: input.name });
      await audit({
        userId: createdUserId,
        email: input.email,
        ipHash,
        uaHash,
        outcome: "email_sent",
        source: input.source,
      });
      return { ok: true, state: "pending_verification" as const };
    } catch (e) {
      console.error("[subscribe] resend failed:", e);
      await audit({
        userId: createdUserId,
        email: input.email,
        ipHash,
        uaHash,
        outcome: "email_queued",
        source: input.source,
      });
      return { ok: true, state: "queued_for_retry" as const };
    }
  });

async function audit(row: {
  userId?: string;
  email?: string;
  ipHash: string;
  uaHash: string;
  birthYear?: number;
  over13?: boolean;
  outcome: (typeof subscribeAudit.$inferInsert)["outcome"];
  source?: string;
}) {
  try {
    await db.insert(subscribeAudit).values({
      id: crypto.randomUUID(),
      userId: row.userId,
      email: row.email,
      ipHash: row.ipHash,
      uaHash: row.uaHash,
      birthYear: row.birthYear,
      over13: row.over13 ?? false,
      outcome: row.outcome,
      source: row.source,
    });
  } catch (e) {
    // Audit failures shouldn't mask the real error to the user.
    console.error("[subscribe] audit insert failed:", e);
  }
}
