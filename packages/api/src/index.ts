import { ORPCError, os } from "@orpc/server";

import type { Context } from "./context";

export const o = os.$context<Context>();

export const publicProcedure = o;

const requireAuth = o.middleware(async ({ context, next }) => {
  if (!context.session?.user) {
    throw new ORPCError("UNAUTHORIZED");
  }
  return next({
    context: {
      session: context.session,
    },
  });
});

export const protectedProcedure = publicProcedure.use(requireAuth);

// Identity-required actions (donate / comment / purchase / settings writes)
// must use this. Auth alone isn't enough — the user also needs onboardedAt
// set, meaning they've passed the age/consent gate.
const requireOnboarded = o.middleware(async ({ context, next }) => {
  if (!context.session?.user) {
    throw new ORPCError("UNAUTHORIZED");
  }
  const u = context.session.user as { onboardedAt?: Date | string | null };
  if (!u.onboardedAt) {
    throw new ORPCError("ONBOARDING_REQUIRED", {
      message: "Complete onboarding to perform this action.",
    });
  }
  return next({
    context: {
      session: context.session,
    },
  });
});

export const onboardedProcedure = publicProcedure.use(requireOnboarded);
