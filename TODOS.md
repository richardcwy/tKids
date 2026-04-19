# TODOS — tKids launch

Source: /office-hours + /plan-eng-review on 2026-04-18
Design doc: ~/.gstack/projects/tKids/richard-nobranch-design-20260418-111448.md
Test plan: ~/.gstack/projects/tKids/richard-main-eng-review-test-plan-20260418-123015.md
Hard deadline: EP "Ignite!" drops 2026-06-01 (44 days from 2026-04-18)

## P0 — Launch blockers

- [ ] **Restructure scaffold to single-domain (Option 1)**
  - Move API routes into `apps/web/src/pages/api/auth/[...all].ts` + `apps/web/src/pages/api/rpc/[...path].ts`
  - Flip Better-Auth cookies to `sameSite:"lax"` in `packages/auth/src/index.ts:33-39`
  - Update oRPC link in `apps/web/src/lib/orpc.ts` to `/rpc` same-origin (drop `credentials:"include"`)
  - Keep `apps/server/` as local-dev target; remove server deploy intent entirely
  - Delete CORS middleware

- [ ] **Alchemy infra expansion** (`packages/infra/alchemy.run.ts`)
  - R2 buckets: `tkids-audio` (public), `tkids-images` (public via Cloudflare Images), `tkids-backups` (private)
  - Queue: `tkids-subscribe-retry`
  - Custom domains: `t.kids`, `www.t.kids`
  - Bind all server secrets: DATABASE_URL, DATABASE_AUTH_TOKEN, BETTER_AUTH_SECRET, BETTER_AUTH_URL, POLAR_ACCESS_TOKEN, POLAR_SUCCESS_URL, RESEND_API_KEY, TURNSTILE_SECRET_KEY
  - **Smoke test this week:** `bun run deploy` to a throwaway `*.workers.dev` — verify all 8 secrets bind and Queue fires. If Alchemy wobbles, fall back to `wrangler.toml`.

- [ ] **Privacy Policy page live at `/privacy`**
  - Draft in week 1, not week 3. Use Termly template + tailor to tKids specifics.
  - Cover: data collected, purpose, retention, user rights (access/delete), cross-border transfer, contact email, CAN-SPAM physical address, date of last update.
  - Age gate: "You must be 13 or older to subscribe" — accepted risk, revisit legal posture post-launch.

- [ ] **COPPA-style age gate (over-13 checkbox)**
  - Add `birthYear` + `over13Consent` via Better-Auth `additionalFields` in `packages/auth/src/index.ts`
  - Reject in `databaseHooks.user.create.before` if computed age < 13 OR `over13Consent !== true`
  - Log to `subscribe_audit` table: `{user_id, ip_hash(sha256), ua_hash, ts, birth_year, over_13:true}`

- [ ] **Music licensing scope confirmed: TEASER-ONLY on R2**
  - 30-60 sec clip of "Ignite!" hosted on R2
  - Full EP served via Spotify/Apple/YouTube embeds post-release (they carry the license)
  - **Verify with distributor** (TuneCore/DistroKid/whichever) in writing: does the distribution contract permit a 30-sec self-hosted teaser clip pre-release?
  - If even the teaser is contested, fall back to Spotify's pre-save embed widget.

- [ ] **Resend sender reputation warming**
  - Set up DKIM/SPF/DMARC at Cloudflare DNS (Resend dashboard gives the exact records) at cutover-day-1
  - Send a throwaway "Thanks for subscribing" email to a small test list BEFORE launch so reputation isn't zero at 6/1
  - Verify deliverability to TW Gmail, Yahoo-JP, Hinet.net, seznam.cz specifically

- [ ] **DNS cutover target: 2026-05-15 (NOT 2026-05-25)**
  - 17 days of buffer for propagation + debugging
  - Pre-cutover checklist in design doc applies: disable DNSSEC 24h ahead, lower TTLs, inventory MX records
  - If Google Workspace or any MX exists on the domain, re-create at Cloudflare before nameserver change

- [ ] **Self-host fonts + fix CSP**
  - Download woff2 for Unbounded (800), DM Serif Display, Instrument Serif, JetBrains Mono, Noto Sans TC into `apps/web/public/fonts/`
  - Subset Noto Sans TC to ~30-40KB via `pyftsubset` (only glyphs used in copy)
  - `font-display: optional` on hero wordmark with metric-matched system fallback; `swap` on secondary
  - Add CSP header in Cloudflare Pages `_headers` (or Astro middleware)

- [ ] **Port tkids.html → Astro components**
  - `apps/web/src/pages/index.astro` replaces scaffold placeholder
  - Break into components: `Nav`, `Hero`, `Countdown`, `Marquee`, `Lineup`, `MemberCard`, `PlayerDock`, `Footer`
  - Keep all classes + animations + color vars; move inline `<style>` to component-scoped Astro styles
  - Replace Google Fonts link with self-hosted `@font-face`
  - Fix countdown: `new Date('2026-06-01T00:00:00+08:00').getTime()`
  - Add `@media (prefers-reduced-motion: reduce)` block disabling spotlights, stars, marquee, auras

- [ ] **Wavesurfer player with graceful degradation**
  - Dynamic import on first play tap (not Astro island)
  - Pre-computed peaks JSON via **local script** `bun run peaks` (ffmpeg + wavesurfer CLI) — committed to `apps/web/public/audio/*.peaks.json`
  - `preload="metadata"` on `<audio>` (NOT `none`; iOS refuses without double-tap)
  - Keyboard-accessible progress bar: `role="slider"`, aria-valuemin/max/now, arrow keys ±5s
  - Fallback: native `<audio>` element with CSS skin if wavesurfer fails to load

- [ ] **iOS Safari de-risk spike — WEEK 1**
  - Build a minimal test page with wavesurfer + teaser AAC
  - Test on real iPhone running Safari 16+: play, pause, scrub, resume
  - Verify no crash on scrub past buffered range (Range requests from R2)
  - If it fails: commit to the native `<audio>` fallback before building the real player

- [ ] **Subscribe oRPC procedure + Cloudflare Queue fallback**
  - `packages/api/src/routers/index.ts` adds `subscribe` procedure
  - Zod schema: email, source, turnstileToken, honeypot, over13, birthYear
  - Turnstile server-side verification against `https://challenges.cloudflare.com/turnstile/v0/siteverify`
  - Rate limit via `rate_limits` Turso table (5/IP/60s)
  - On Resend 5xx/timeout: enqueue to `tkids-subscribe-retry`, respond 503 `queued:true`
  - Scheduled Worker drains queue every 5 min

- [ ] **SEO infrastructure**
  - `apps/web/src/components/SEO.astro` with title/description/OG/Twitter card/canonical/JSON-LD MusicGroup
  - `@astrojs/sitemap` integration
  - OG image: 1200×630 PNG generated from a design tool or Puppeteer script; committed to `apps/web/public/og/`
  - Validate OG rendering pre-launch: Twitter validator, Facebook debugger, paste into Discord + iMessage

- [ ] **Tests — 32 cases (18 unit, 14 E2E)**
  - `bun:test` for procedures, hooks, rate limit, countdown, Zod validation
  - Playwright (Chromium + WebKit) for signup flow, audio player, a11y, perf
  - Lighthouse CI gate: mobile perf ≥ 90, a11y ≥ 95
  - axe-core in CI: 0 violations

## P1 — Strongly recommended

- [ ] **Google Analytics 4 tracking** ⭐ newly requested
  - Integration already implemented (env-gated in `apps/web/src/components/GoogleAnalytics.astro`)
  - Action: create GA4 property → paste measurement ID `G-XXXXXXXXXX` into `apps/web/.env` as `PUBLIC_GA_MEASUREMENT_ID` + same key into GitHub repo Secrets for deploy
  - Site starts reporting page views + events automatically on next deploy
  - DNT is respected; `anonymize_ip=true` is the default

- [x] **Sentry Worker + error alerting to Discord webhook** *(done 2026-04-19)*
  - ~~Free tier Sentry DSN bound as Worker secret~~
  - ~~Capture 5xx + unhandled exceptions~~
  - ~~Discord webhook as a secondary sink so founder sees errors in the fan Discord's ops channel~~
  - Implemented as lightweight `apps/web/src/lib/observability.ts` (no SDK dep), wired into both API catch-all routes. Still need: create Sentry account + paste DSN into `SENTRY_DSN` env, and create Discord webhook URL + paste into `DISCORD_ALERT_WEBHOOK`

- [ ] **Uptime monitoring on `/api/health`**
  - Better Stack free tier pings every 60s
  - Page if down > 2 min

- [x] **Turso nightly backup** *(done 2026-04-19)*
  - ~~Scheduled Worker runs `turso db shell <dbname> .dump` daily~~
  - ~~Upload to R2 `tkids-backups` bucket~~
  - ~~Retain 30 days~~
  - Implemented as `scripts/backup-turso.ts` + cron workflow at `docs/backup-workflow.yml` (parked, needs `gh auth refresh -s workflow`). Still need: R2 S3 API tokens in GitHub repo Secrets as `R2_ACCESS_KEY_ID` + `R2_SECRET_ACCESS_KEY`

- [ ] **Hide `/dashboard` and `/login` from launch nav**
  - Keep routes working (for authenticated fans who know the URL)
  - Remove from any header nav; only signup page is linked

- [ ] **.kids TLD AUP read + lyric screen**
  - Read DotKids acceptable-use policy: https://nic.kids/policies
  - Screen EP lyrics for anything that might trigger child-safety complaint
  - Document compliance stance in repo README

- [ ] **Discord server with permanent invite + role setup**
  - If no server exists, spin up this week
  - Roles: `@T-community` (launch supporters), `@fan`, optionally `@member` for band members

## P2 — Nice-to-have / post-launch

- [ ] Polar KYC verification for a TW entity (if donations ever ship)
- [ ] TW accountant consultation about donation/subscription tax treatment
- [ ] Lawyer consultation on TW PDPA + US COPPA posture (calendar for mid-June, accepted risk pre-launch)
- [ ] Language toggle UI in nav (EN-only / zh-only / bilingual modes)
- [ ] Move rate limiting from Turso table to Cloudflare Rate Limiting rules or KV if sustained traffic exceeds ~10 RPS
- [ ] Session DB hit optimization: move `getSession` into `protectedProcedure` middleware only
- [ ] Cloudflare Images integration for dynamic image resizing when real portraits land
- [ ] `/journal` route and content collection for Approach C
- [ ] Per-member pages `/members/[slug]`

## Risks accepted by founder (2026-04-18)

1. **Privacy law: over-13 checkbox shipped without lawyer review.** PDPA guardian-consent requirement for TW under-18 fans is NOT implemented. Revisit post-launch. Calendar reminder for 2026-06-15.
2. **Music licensing: distributor confirmation is on the founder's action list** but no written clearance exists yet. If teaser clip permission is denied, fall back to Spotify pre-save embed.

---

*Every item above has a concrete file path or concrete action. When picking up a task, read the design doc + this file; implementation should not require re-deriving any of the reasoning.*
