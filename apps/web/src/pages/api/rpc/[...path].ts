import { auth } from "@my-better-t-app/auth";
import { appRouter } from "@my-better-t-app/api/routers/index";
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

export const ALL: APIRoute = async ({ request }) => {
  const session = await auth.api.getSession({ headers: request.headers });

  const result = await rpcHandler.handle(request, {
    prefix: "/api/rpc",
    context: { session },
  });

  if (result.matched) {
    return result.response;
  }
  return new Response("Not Found", { status: 404 });
};
