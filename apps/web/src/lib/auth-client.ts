import { polarClient } from "@polar-sh/better-auth";
import { createAuthClient } from "better-auth/client";

// Same-origin: Better-Auth mounted at /api/auth inside the Astro Worker.
// In the browser we default to the current origin; during SSR we skip baseURL
// and let relative URLs resolve per-request.
const baseURL =
  typeof window !== "undefined" ? window.location.origin : undefined;

export const authClient = createAuthClient({
  baseURL,
  basePath: "/api/auth",
  plugins: [polarClient()],
});
