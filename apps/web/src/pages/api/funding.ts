import type { APIRoute } from "astro";

export const prerender = false;

// v1.1.0420-beta1: MOCK funding data. Bypasses oRPC for this single
// read-only endpoint because the nested dynamic route
// /api/rpc/[procedure].ts is returning zero-byte 500s for POST in the
// current Astro+Cloudflare build (cause TBD — tracked in TODOs).
// Real donation wiring in beta2 will either fix the oRPC route or keep
// this single-file pattern — both are fine shapes.
export const GET: APIRoute = async () => {
  return Response.json(
    {
      raisedUsd: 1847,
      goalUsd: 3000,
      supporterCount: 128,
      deadlineIso: "2026-06-01T00:00:00+08:00",
      percentage: 62,
      mock: true,
    },
    { headers: { "Cache-Control": "public, max-age=30" } },
  );
};
