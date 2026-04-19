// @ts-check
import tailwindcss from "@tailwindcss/vite";
import alchemy from "alchemy/cloudflare/astro";
import sitemap from "@astrojs/sitemap";
import { defineConfig, envField } from "astro/config";

// https://astro.build/config
export default defineConfig({
  site: "https://t.kids",
  output: "server",
  adapter: alchemy(),
  integrations: [sitemap()],
  env: {
    schema: {
      // Same-origin: defaults to the Astro dev server. In production, Alchemy
      // sets this to https://t.kids when binding the Worker's custom domain.
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
  },
});
