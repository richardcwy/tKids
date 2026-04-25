import { sql } from "drizzle-orm";
import {
  sqliteTable,
  text,
  integer,
  index,
  primaryKey,
} from "drizzle-orm/sqlite-core";

// Append-only audit log of every signup attempt (accepted or rejected).
// Required for COPPA-style audit trail: who tried to sign up, when, from
// where, under which rule did we decide.
// IP + UA are stored as SHA-256 hashes (never the raw values) so we retain
// abuse-investigation capability without storing PII.
export const subscribeAudit = sqliteTable(
  "subscribe_audit",
  {
    id: text("id").primaryKey(),
    userId: text("user_id"), // null when the signup was rejected before user creation
    email: text("email"), // stored even on rejection so we can match duplicate-attempt patterns
    ipHash: text("ip_hash").notNull(),
    uaHash: text("ua_hash").notNull(),
    birthYear: integer("birth_year"),
    over13: integer("over_13", { mode: "boolean" }).default(false).notNull(),
    outcome: text("outcome", {
      enum: [
        "accepted",
        "under_age",
        "no_consent",
        "rate_limited",
        "turnstile_failed",
        "honeypot",
        "duplicate",
        "email_queued",
        "email_sent",
        "db_error",
        "oauth_signup",
        "onboarding_completed",
        "account_deleted",
      ],
    }).notNull(),
    source: text("source"), // 'hero' | 'ep' | 'footer' | form path
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
  },
  (table) => [
    index("subscribe_audit_email_idx").on(table.email),
    index("subscribe_audit_outcome_idx").on(table.outcome),
    index("subscribe_audit_created_at_idx").on(table.createdAt),
  ],
);

// Per-IP rate limiting for the subscribe endpoint.
// Window is a rolling 60-second bucket (floor(ts / 60_000) * 60_000).
// Composite PK on (ip_hash, window_start) = upsert-friendly counter.
export const rateLimits = sqliteTable(
  "rate_limits",
  {
    ipHash: text("ip_hash").notNull(),
    windowStart: integer("window_start", { mode: "timestamp_ms" }).notNull(),
    count: integer("count").default(0).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.ipHash, table.windowStart] }),
    index("rate_limits_window_idx").on(table.windowStart),
  ],
);

// Shipping addresses — schema lands now, surfaced when first merch product exists.
// Multiple per user; isDefault picks the one prefilled at checkout.
export const shippingAddress = sqliteTable(
  "shipping_address",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    recipient: text("recipient").notNull(),
    line1: text("line1").notNull(),
    line2: text("line2"),
    city: text("city").notNull(),
    region: text("region"),
    postal: text("postal"),
    country: text("country").notNull(), // ISO-3166-1 alpha-2
    phone: text("phone"),
    isDefault: integer("is_default", { mode: "boolean" })
      .default(false)
      .notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("shipping_address_user_idx").on(table.userId)],
);

// Comments — schema lands now, UI ships in a future v1.3.x.
// Held in 'pending' until moderator approves. 13-17 may read but never write
// (server-side enforced when the comment-write procedure ships).
export const comment = sqliteTable(
  "comment",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    targetType: text("target_type", {
      enum: ["song", "journal", "page"],
    }).notNull(),
    targetId: text("target_id").notNull(),
    body: text("body").notNull(),
    status: text("status", {
      enum: ["pending", "approved", "rejected", "reported"],
    })
      .default("pending")
      .notNull(),
    moderatedBy: text("moderated_by"),
    moderatedAt: integer("moderated_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
  },
  (table) => [
    index("comment_target_idx").on(
      table.targetType,
      table.targetId,
      table.status,
    ),
    index("comment_user_idx").on(table.userId),
    index("comment_status_created_idx").on(table.status, table.createdAt),
  ],
);
