import { auth } from "@my-better-t-app/auth";
import type { APIRoute } from "astro";

import { captureException } from "../../../lib/observability";
import { hydrateEnvFromLocals } from "../../../lib/hydrate-env";

export const prerender = false;

export const ALL: APIRoute = async ({ request, url, locals }) => {
  hydrateEnvFromLocals(locals);
  try {
    return await auth.handler(request);
  } catch (e) {
    captureException(e, {
      source: "auth-route",
      tags: { method: request.method, path: url.pathname },
    });
    return Response.json(
      { error: "internal_server_error" },
      { status: 500 },
    );
  }
};
