import { appRouter } from "@my-better-t-app/api/routers/index";
import { createContext } from "@my-better-t-app/api/context";
import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import type { APIRoute } from "astro";

export const prerender = false;

const rpcHandler = new RPCHandler(appRouter, {
  interceptors: [
    onError((error) => {
      console.error("[rpc] error:", error);
    }),
  ],
});

export const ALL: APIRoute = async ({ request, clientAddress }) => {
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

  if (result.matched) {
    return result.response;
  }
  return new Response("Not Found", { status: 404 });
};
