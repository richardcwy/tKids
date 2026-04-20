// @ts-check
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import tailwindcss from "@tailwindcss/vite";
import alchemy from "alchemy/cloudflare/astro";
import sitemap from "@astrojs/sitemap";
import { defineConfig, envField } from "astro/config";

// Read version + git SHA at build time so Footer can render them.
// VERSION is at the repo root (two levels up from apps/web).
const TKIDS_VERSION = readFileSync("../../VERSION", "utf8").trim();
let TKIDS_COMMIT = "unknown";
try {
  TKIDS_COMMIT = execSync("git rev-parse --short HEAD").toString().trim();
} catch {
  /* CI without git, or shallow clone — fall back to "unknown" */
}
const TKIDS_BUILD_DATE = new Date()
  .toISOString()
  .slice(0, 10)
  .replace(/-/g, ".");

// https://astro.build/config
export default defineConfig({
  site: "https://tkids.tw",
  output: "server",
  adapter: alchemy(),
  integrations: [sitemap()],
  env: {
    schema: {
      // Same-origin: defaults to the Astro dev server. In production, Alchemy
      // sets this to https://tkids.tw when binding the Worker's custom domain.
      PUBLIC_SERVER_URL: envField.string({
        access: "public",
        context: "client",
        default: "http://localhost:4321",
      }),
      // Cloudflare Turnstile public site key (not a secret — safe client-side).
      PUBLIC_TURNSTILE_SITE_KEY: envField.string({
        access: "public",
        context: "client",
        default: "1x00000000000000000000AA", // Turnstile "always passes" test key
      }),
      // Google Analytics 4 measurement ID, e.g. G-XXXXXXXXXX. Leave
      // empty to disable GA entirely (recommended in dev).
      PUBLIC_GA_MEASUREMENT_ID: envField.string({
        access: "public",
        context: "client",
        default: "",
        optional: true,
      }),
    },
  },
  vite: {
    plugins: [tailwindcss()],
    define: {
      __TKIDS_VERSION__: JSON.stringify(TKIDS_VERSION),
      __TKIDS_COMMIT__: JSON.stringify(TKIDS_COMMIT),
      __TKIDS_BUILD_DATE__: JSON.stringify(TKIDS_BUILD_DATE),
    },
  },
});
