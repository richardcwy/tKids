import { env } from "@my-better-t-app/env/server";
import { Polar } from "@polar-sh/sdk";

// Lazy — we can't instantiate at module load because env isn't
// hydrated yet in the Cloudflare Worker (see middleware.ts). First
// access happens inside a request handler, by which time env is real.
let _polarClient: Polar | undefined;

function build() {
  _polarClient = new Polar({
    accessToken: env.POLAR_ACCESS_TOKEN,
    server: env.NODE_ENV === "production" ? "production" : "sandbox",
  });
  return _polarClient;
}

export const polarClient = new Proxy({} as Polar, {
  get(_t, prop: string | symbol) {
    const target = _polarClient ?? build();
    const v = (target as unknown as Record<string | symbol, unknown>)[prop];
    // Preserve `this` binding for methods.
    return typeof v === "function" ? v.bind(target) : v;
  },
});
