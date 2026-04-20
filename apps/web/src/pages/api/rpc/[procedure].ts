import type { APIRoute } from "astro";
import { hydrateEnvFromLocals } from "../../../lib/hydrate-env";

export const prerender = false;

// See apps/web/src/lib/hydrate-env.ts for why we copy Worker bindings
// into process.env at the top of every request.
//
// Note on route shape: we use `[procedure].ts` (single dynamic segment)
// instead of `[...path].ts` (catch-all rest spread). The rest-spread
// variant was returning 500 with zero body in this Astro+Cloudflare
// build. Single-segment works and oRPC's procedures are all one level
// deep so this is not a functional limitation.
const handler: APIRoute = async ({
  request,
  clientAddress,
  url,
  locals,
}) => {
  hydrateEnvFromLocals(locals);

  // Dynamic imports inside the handler so any module-load crashes
  // (e.g. eager env reads in deeply-imported libs) produce a
  // readable 500 body instead of a zero-byte Worker crash.
  try {
    const [
      { appRouter },
      { createContext },
      { RPCHandler },
      { onError },
      { captureException },
    ] = await Promise.all([
      import("@my-better-t-app/api/routers/index"),
      import("@my-better-t-app/api/context"),
      import("@orpc/server/fetch"),
      import("@orpc/server"),
      import("../../../lib/observability"),
    ]);

    const rpcHandler = new RPCHandler(appRouter, {
      interceptors: [
        onError((error) => {
          captureException(error, {
            source: "orpc",
            tags: { layer: "rpc" },
          });
        }),
      ],
    });

    const ip =
      request.headers.get("cf-connecting-ip") ??
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      clientAddress ??
      "0.0.0.0";
    const userAgent = request.headers.get("user-agent") ?? "unknown";

    const ctx = await createContext({ request, ip, userAgent });
    const result = await rpcHandler.handle(request, {
      prefix: "/api/rpc",
      context: ctx,
    });
    if (result.matched) return result.response;
    return new Response("Not Found", { status: 404 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const stack = e instanceof Error ? e.stack?.slice(0, 1000) : undefined;
    return Response.json(
      {
        error: "internal_server_error",
        message: msg,
        stack,
        url: url.pathname,
      },
      { status: 500 },
    );
  }
};

export const GET = handler;
export const POST = handler;
export const OPTIONS = handler;
