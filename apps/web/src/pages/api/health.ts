import type { APIRoute } from "astro";

export const prerender = false;

// Plain GET endpoint for uptime monitors (Better Stack, UptimeRobot, etc).
// No DB hit, no auth lookup — just confirms the Worker is responding.
// Uptime monitor target: https://t.kids/api/health (60s pings, page if
// down > 2 min).
export const GET: APIRoute = () => {
  return Response.json(
    { ok: true, ts: Date.now() },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
};
