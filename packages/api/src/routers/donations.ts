import { z } from "zod";
import { publicProcedure } from "../index";

// ─────────────────────────────────────────────────────────────────────────────
// MOCK STATE — v1.1.0420-beta1 (UI proof of concept).
//
// Real wiring lands in v1.1.0420-beta2 once the payment provider is chosen
// (Polar vs. Ko-fi — see v1.1.0420.md §0 open decisions D1 / D4).
//
// When you swap to real data, keep the same output shape so FundingTracker
// doesn't need a re-render. Only the handler body changes: instead of
// returning constants, it will query Turso `donations` + `funding_config`
// and aggregate, or hit Polar's API + cache for 30s.
// ─────────────────────────────────────────────────────────────────────────────

const MOCK_FUNDING = {
  raisedUsd: 1847,
  goalUsd: 3000,
  supporterCount: 128,
  /** Taipei time — same deadline as the EP release date, now labeled "last call". */
  deadlineIso: "2026-06-01T00:00:00+08:00",
  /** TODO(beta2): drop this and compute on the client from raised/goal. */
  percentage: 62,
  /** Flag so the UI (and automated tests) can detect mock mode. */
  mock: true,
};

export const getFundingState = publicProcedure
  .output(
    z.object({
      raisedUsd: z.number().int().nonnegative(),
      goalUsd: z.number().int().positive(),
      supporterCount: z.number().int().nonnegative(),
      deadlineIso: z.string(),
      percentage: z.number().min(0).max(100),
      mock: z.boolean(),
    }),
  )
  .handler(async () => {
    // TODO(beta2): replace with the real aggregation + Polar/Ko-fi integration.
    return MOCK_FUNDING;
  });
