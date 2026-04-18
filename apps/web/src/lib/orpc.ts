import type { AppRouterClient } from "@my-better-t-app/api/routers/index";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";

// Same-origin: API colocated in the Astro Worker at /api/rpc.
// Cookies ride automatically with sameSite:"lax" — no credentials flag needed.
export const link = new RPCLink({
  url: "/api/rpc",
});

export const orpc: AppRouterClient = createORPCClient(link);
