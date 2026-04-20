// Cloudflare Worker bindings live on `Astro.locals.runtime.env`, not on
// `process.env`. Modules that read via process.env (our env package,
// better-auth, polar sdk) need this hydration step once per request.
//
// Why not middleware? Astro middleware in the @astrojs/cloudflare build
// currently breaks module loading (every route 500s). Call this at the
// top of each API route handler as a drop-in replacement.
//
// It's a no-op when already hydrated, so repeated calls are safe.

type AstroLocals = { runtime?: { env?: Record<string, unknown> } };

export function hydrateEnvFromLocals(locals: unknown): void {
  const runtimeEnv = (locals as AstroLocals)?.runtime?.env;
  if (!runtimeEnv) return;
  if (typeof process === "undefined" || !process.env) return;
  for (const [key, val] of Object.entries(runtimeEnv)) {
    if (typeof val === "string" && !process.env[key]) {
      process.env[key] = val;
    }
  }
}
