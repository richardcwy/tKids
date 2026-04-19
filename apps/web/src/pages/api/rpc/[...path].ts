import { appRouter } from "@my-better-t-app/api/routers/index";
import { createContext } from "@my-better-t-app/api/context";
import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import type { APIRoute } from "astro";

import { captureException } from "../../../lib/observability";

export const prerender = false;

const rpcHandler = new RPCHandler(appRouter, {
  interceptors: [
    onError((error) => {
      captureException(error, { source: "orpc", tags: { layer: "rpc" } });
    }),
  ],
});

export const ALL: APIRoute = async ({ request, clientAddress, url }) => {
  const ip =
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    clientAddress ??
    "0.0.0.0";
  const userAgent = request.headers.get("user-agent") ?? "unknown";

  try {
    const ctx = await createContext({ request, ip, userAgent });
    const result = await rpcHandler.handle(request, {
      prefix: "/api/rpc",
      context: ctx,
    });
    if (result.matched) return result.response;
    return new Response("Not Found", { status: 404 });
  } catch (e) {
    captureException(e, {
      source: "rpc-route",
      tags: { method: request.method, path: url.pathname },
    });
    return Response.json(
      { error: "internal_server_error" },
      { status: 500 },
    );
  }
};
