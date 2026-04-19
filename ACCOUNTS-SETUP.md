# Accounts setup — tKids launch

Step-by-step for every external account the launch site needs. Follow top-to-bottom; each section notes exactly what value to paste into which `.env` key or GitHub repo Secret.

**Order matters.** Cloudflare first (other services hook into its DNS). Resend + GA can wait until after DNS cutover.

Estimated total time: **60–90 minutes** the first time, most of it waiting for DNS propagation.

---

## Master checklist

Tick these as you go.

| # | Service | Needed for | Time | Status |
|---|---------|-----------|------|--------|
| 1 | Cloudflare account | hosting + DNS + R2 + Turnstile + Web Analytics | 5 min | [ ] |
| 2 | Cloudflare: add `tkids.tw` site | custom domain | 2 min | [ ] |
| 3 | Cloudflare: API token | deploys | 3 min | [ ] |
| 4 | Cloudflare: Turnstile | bot gate on signup | 3 min | [ ] |
| 5 | Cloudflare: R2 API token | nightly DB backups | 3 min | [ ] |
| 6 | Turso account + DB | production database | 5 min | [ ] |
| 7 | GoDaddy: pre-cutover checks | safe DNS migration | 5 min | [ ] |
| 8 | GoDaddy → Cloudflare nameserver cut | **CUT BY 2026-05-15** | 3 min action, up to 48h propagation | [ ] |
| 9 | Resend account + domain | transactional email | 5 min + 1 day reputation warming | [ ] |
| 10 | Google Analytics 4 | traffic tracking | 5 min | [ ] |
| 11 | Discord server + webhook | fan community + ops alerts | 5 min | [ ] |
| 12 | Polar (deferred to Phase 2) | donations | skip for May | — |
| 13 | Sentry (optional) | error reporting | 5 min | [ ] |
| 14 | Better Stack (optional) | uptime monitor | 3 min | [ ] |
| 15 | GitHub repo secrets | CI + deploy + backup | 5 min | [ ] |

---

## 1. Cloudflare account

1. Go to https://dash.cloudflare.com/sign-up
2. Use the email you'll operationally own tKids with (not a personal throwaway).
3. Confirm email. Add 2FA with an authenticator app (**not SMS**). Save the recovery codes.

That's it for account creation. Everything else is inside the dashboard.

**What goes in `.env`:** nothing yet. Steps 2–5 below produce the real values.

---

## 2. Cloudflare: add `tkids.tw` as a site

1. Dashboard → **Websites** → **Add a site**.
2. Enter `tkids.tw` → **Continue**.
3. Pick the **Free** plan → **Continue**.
4. Cloudflare scans the existing DNS at GoDaddy and shows you what it found. **Review every record.** If there's an MX record (email hosting) or any CNAME pointing elsewhere, note them — they must survive the cutover.
5. At the bottom of the scan results, Cloudflare shows two assigned nameservers, e.g.
   ```
   ada.ns.cloudflare.com
   kip.ns.cloudflare.com
   ```
   **Copy these somewhere safe.** You'll paste them at GoDaddy in step 8.

**Don't change GoDaddy nameservers yet** — we do that in step 8 after prep work.

---

## 3. Cloudflare: API token for deploys

1. Dashboard → click your avatar (top right) → **My Profile** → **API Tokens**.
2. **Create Token** → template **"Edit Cloudflare Workers"**. That template includes what you need, plus add:
   - **Account Resources** → include your account
   - **Zone Resources** → include `tkids.tw`
   - Additional permissions (add these): `Account → Workers R2 Storage → Edit`, `Zone → DNS → Edit`
3. Create → **copy the token NOW** (shown once).

**What goes where:**
- `apps/web/.env` → not needed locally (Alchemy only uses it on deploy)
- GitHub repo Secrets (Settings → Secrets → Actions):
  - `CLOUDFLARE_API_TOKEN` = the token
  - `CLOUDFLARE_ACCOUNT_ID` = from Dashboard sidebar → your account name → right panel shows "Account ID"

---

## 4. Cloudflare: Turnstile (bot gate on signup form)

1. Dashboard → **Turnstile** (sidebar).
2. **Add site** → name `tKids signup`, hostname `tkids.tw`, widget mode **Managed** (recommended, invisible challenge for most users).
3. Cloudflare gives you two keys: **Site Key** (public, safe to embed) and **Secret Key** (server-only).

**What goes where:**
- `apps/web/.env`:
  ```
  PUBLIC_TURNSTILE_SITE_KEY=0x4AAAAAAA...   # the site key
  TURNSTILE_SECRET_KEY=0x4AAAAAAA...        # the secret key
  ```
- GitHub repo Secrets with the same names.

The site currently uses Cloudflare's "always passes" test key `1x00000000000000000000AA` in dev. Signup will silently succeed without real verification until you swap these in.

---

## 5. Cloudflare: R2 S3 API token (for nightly backups)

R2 has a separate credential system from the Workers API token.

1. Dashboard → **R2 Object Storage** (sidebar).
2. If it's your first time, enable R2 (free tier included).
3. **Manage R2 API Tokens** → **Create API Token**.
4. Name `tkids backup writer`. Permission: **Object Read & Write**. Bucket: `tkids-backups` (you can create the bucket now, or wait — Alchemy creates it on first deploy).
5. Copy the **Access Key ID** and **Secret Access Key**.

**What goes where (GitHub repo Secrets only — backups run in CI, not locally):**
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- (`R2_ACCOUNT_ID` is the same as `CLOUDFLARE_ACCOUNT_ID`; the backup workflow reuses it.)

---

## 6. Turso account + production database

1. Go to https://turso.tech/ → **Sign up** (GitHub OAuth is easiest).
2. Install the CLI: `curl -sSfL https://get.tur.so/install.sh | bash` (or `brew install tursodatabase/tap/turso`).
3. Login: `turso auth signup` → browser opens, authorize.
4. Create the DB:
   ```bash
   turso db create tkids-prod --location nrt   # Tokyo — closest to Taipei/JP audience
   ```
   (Full region list: `turso db locations`. Pick `nrt` for TW/JP, `lax` for US-west, `fra` for EU.)
5. Get the connection URL:
   ```bash
   turso db show tkids-prod --url      # prints libsql://tkids-prod-<you>.turso.io
   ```
6. Create an auth token:
   ```bash
   turso db tokens create tkids-prod   # prints a JWT
   ```
7. Push the schema:
   ```bash
   cd "/Users/richard/Claude Projects/tKids/my-better-t-app"
   # Put the values below in apps/web/.env first (next block), then:
   bun run db:push
   ```

**What goes where:**
- `apps/web/.env`:
  ```
  DATABASE_URL=libsql://tkids-prod-<you>.turso.io
  DATABASE_AUTH_TOKEN=<the JWT>
  ```
- GitHub repo Secrets with the same names.

Free tier: 9 GB storage + 1 billion row reads/month. More than you'll ever need for a 50-500-fan launch.

---

## 7. GoDaddy: pre-cutover checks (do this BEFORE step 8, wait 24h between)

1. Log in to https://godaddy.com/ → **My Products** → find `tkids.tw`.
2. **2FA check**: Account Settings → Login & PIN → ensure 2FA is on (authenticator app, not SMS). If not, turn it on — GoDaddy lockouts during cutover are painful.
3. **Domain lock check**: in the domain's settings → Domain Lock. Should be **ON** for security, but you'll need to temporarily unlock if the registrar pushes back on nameserver changes. Usually nameserver edits work with the lock on.
4. **DNSSEC check**: in the domain's settings → DNS → DNSSEC. If DNSSEC is **ON**, turn it **OFF** and save. This is critical — leaving DNSSEC on while switching nameservers can make the domain go dark for up to 24 hours.
5. **Lower TTLs**: in the DNS management page, find every record (A, AAAA, CNAME, MX, TXT). Change each one's TTL to **300 seconds** (5 minutes). Save. This limits the propagation window on cutover day.
6. **Inventory MX/email records**: if the domain has any `@` MX records or `_dmarc`/`_domainkey` TXT records (i.e. you use tkids.tw for email via Google Workspace / ProtonMail / other), **write them all down**. Every byte matters — we'll recreate them at Cloudflare before the cutover.

**Now wait 24 hours.** This lets DNSSEC DS records expire from caches worldwide. Skipping this step is the single biggest way to break email or the site during cutover.

---

## 8. GoDaddy → Cloudflare nameserver cut (target: 2026-05-15, 17 days before launch)

Preconditions from step 7 must all be done and 24h have elapsed.

1. Back in Cloudflare → **DNS** for `tkids.tw` → **verify all records from step 7.6 exist**. If Cloudflare's scan missed any, add them manually now. For MX records especially: **if email is broken after cutover and you missed an MX, email routing dies until you fix it.**
2. Deploy a placeholder Worker first (so the domain has somewhere to land):
   ```bash
   cd "/Users/richard/Claude Projects/tKids/my-better-t-app"
   bun run deploy   # Alchemy creates the Worker, R2 buckets, and binds tkids.tw
   ```
   First run will print `Web -> https://tkids-web.<account>.workers.dev`. Good.
3. GoDaddy → domain → **DNS / Nameservers** → **I'll use my own nameservers** → paste the two Cloudflare nameservers from step 2.5 → Save.
4. Within ~15 minutes, Cloudflare's dashboard shows status **Active** for `tkids.tw`. Within ~1 hour, most of the world sees the new records. Up to 48h worst case.
5. Cloudflare → **SSL/TLS** for `tkids.tw` → set to **Full (strict)**. Enable **Always Use HTTPS** and **Automatic HTTPS Rewrites**.
6. Cloudflare → **DNSSEC** for `tkids.tw` → **Enable**. Copy the generated DS record. Go back to GoDaddy and... actually wait, since GoDaddy no longer has authority, DNSSEC at Cloudflare needs the registrar to publish the DS record *at GoDaddy*. Follow Cloudflare's DNSSEC enable flow — it prints the DS parameters you add at GoDaddy → Domain → DNSSEC → Add DS Record.

**Smoke test after cutover:**
```bash
curl -I https://tkids.tw
dig tkids.tw NS       # should return Cloudflare nameservers
```
Both should succeed. Open the domain in Chrome, Safari iOS, Firefox — zero cert warnings.

**Rollback**: if anything breaks catastrophically, GoDaddy → domain → DNS → Nameservers → **revert to parked/GoDaddy nameservers** (you'll see GoDaddy's defaults in the dropdown). Propagation back can take up to 48h, which is exactly why the cutover happens 17 days before launch and not the week of.

---

## 9. Resend (transactional + welcome email)

1. https://resend.com/ → **Sign up** (GitHub OAuth is fine).
2. **Domains** → **Add Domain** → enter `tkids.tw`.
3. Resend shows you **DKIM + SPF + DMARC DNS records** to add. Copy each one.
4. Switch to Cloudflare → **DNS** for `tkids.tw` → add each record exactly as shown (CNAME or TXT, with the exact name Resend specifies).
5. Wait 5-30 min for DNS propagation. Back on Resend → **Verify domain**.
6. Once verified, **API Keys** → **Create API Key** → scope **Sending access** → copy the key.

**What goes where:**
- `apps/web/.env`:
  ```
  RESEND_API_KEY=re_...
  RESEND_FROM_EMAIL=no-reply@tkids.tw     # must be on the verified domain
  RESEND_REPLY_TO=hello@tkids.tw          # replies come here; does NOT need to exist as a real inbox yet
  ```
- GitHub repo Secrets with the same names.

### Warm the sender reputation BEFORE launch day

A brand-new domain sending 500 emails on 2026-06-01 looks spammy to Gmail/Yahoo/Hinet. Warm it first:
1. ~2 weeks before launch, subscribe yourself + 5 friends to the fanclub form.
2. Send them a tiny "thanks for being early" test email (you can send this via Resend's dashboard or just by signing up — the welcome email goes out automatically).
3. Ask them to reply or mark "Not spam" in Gmail. This is the reputation signal you need.
4. On launch day, deliverability will be dramatically better.

Free tier: 100 emails/day, 3000/month. Enough for launch. Upgrade to $20/mo around launch week if you expect > 100/day.

---

## 10. Google Analytics 4

The GA integration is already in the code — it only activates when the measurement ID is set.

1. https://analytics.google.com/ → **Start measuring**.
2. Account name: `tKids`. Keep all the benchmarking toggles as default.
3. Property name: `tkids.tw website`. Reporting time zone: **Taipei (GMT+8)**. Currency: **USD** or **TWD** (either is fine).
4. Business details: **Entertainment** → **Small (1-10 employees)**.
5. Business objectives: pick **Get baseline reports** + **Examine user behavior**.
6. Data stream: **Web** → URL `https://tkids.tw` → name `tKids Web`.
7. **Copy the Measurement ID** — format `G-XXXXXXXXXX`.

**What goes where:**
- `apps/web/.env`:
  ```
  PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
  ```
- GitHub repo Secrets: same name.

The tracking fires automatically on next deploy. `anonymize_ip=true` and Do Not Track respect are built in — no cookie banner required for basic page-view analytics (verify with your lawyer if the posture changes post-launch).

If you also want **Cloudflare Web Analytics** (cookieless, independent second source): Dashboard → **Web Analytics** → **Add a site** → pick `tkids.tw`. It auto-enables; nothing to paste anywhere. Coexisting with GA4 is fine.

---

## 11. Discord server + webhook

Two uses: (a) fans hang out here post-signup, (b) errors from the Worker ping a private channel so you see them on your phone.

### Server
1. Open Discord → **+** icon → **Create My Own** → **For a club or community**.
2. Name: `tKids Fanclub`. Upload a square version of your wordmark as the server icon.
3. Create channels:
   - `#welcome` (rules, pinned EP info)
   - `#general` (the T-community hangs out)
   - `#ep-ignite` (release-day countdown chat)
   - `#fan-art`
   - `#ops` — **private**, for you and maybe one trusted collaborator; ops alerts go here
4. **Roles**: `@T-community` (launch supporters), `@fan` (default), `@member` (Ethan/Alan/Albert themselves, if they want Discord presence).
5. **Invite link**: Server Settings → Invites → **Create Invite** → edit → **Never expire**. Copy the `https://discord.gg/XXXX` URL. This is what the `/join` CTA on the site should eventually link to — currently the Footer links to `#`.

### Webhook for ops alerts (in `#ops`)
1. Right-click `#ops` channel → **Edit Channel** → **Integrations** → **Webhooks** → **New Webhook**.
2. Name `tkids.tw alerts`. Avatar optional. **Copy Webhook URL**.

**What goes where:**
- `apps/web/.env`:
  ```
  DISCORD_ALERT_WEBHOOK=https://discord.com/api/webhooks/...
  ```
- GitHub repo Secrets: same name.

Once pasted, any unhandled exception in the Worker pings `#ops` with the error + stack frame. Test it by visiting `/api/rpc/nonexistent` post-deploy; you should see an alert land.

---

## 12. Polar (donations) — DEFERRED to Phase 2

Don't set this up for launch. The engineering review decision was: ship the Poster clean on 2026-06-01, layer donations later. Polar integration code is scaffolded (`packages/auth/src/lib/payments.ts`) but the checkout UI is hidden.

When you're ready (post-launch):
1. https://polar.sh/ → Sign up. They require a **Merchant of Record** onboarding (tax ID, bank account). TW sole proprietors sometimes get rejected — verify eligibility before depending on it. Fallback: a Ko-fi link works fine as a "buy me a coffee" placeholder with zero KYC.
2. Create a product (e.g. "Supporter · 月間贊助" at NT$99/month, or a one-time "Fuel the EP" at NT$200).
3. **Settings → General → Access Token** → copy.
4. Paste into `apps/web/.env`:
   ```
   POLAR_ACCESS_TOKEN=polar_...
   POLAR_SUCCESS_URL=https://tkids.tw/dashboard
   ```

---

## 13. Sentry (optional but recommended)

The observability library already supports this — just needs the DSN.

1. https://sentry.io/ → **Try for free** → GitHub OAuth.
2. Create a project → platform **JavaScript (generic)** (NOT the Cloudflare Workers template; we use plain fetch envelopes).
3. Copy the DSN — format `https://<key>@<host>.ingest.sentry.io/<project_id>`.

**What goes where:**
- `apps/web/.env` + GitHub repo Secrets: `SENTRY_DSN=https://...`

Free tier: 5k errors/month. Plenty. When you hit that, Sentry drops events silently; no email storm.

---

## 14. Better Stack (optional, for uptime monitoring)

1. https://betterstack.com/ → free tier covers 10 monitors.
2. **Create monitor** → URL `https://tkids.tw/api/health` → check every **60 seconds** → alert policy **Email + SMS if down > 2 min**.
3. Optional: add a second monitor for `https://tkids.tw/` so you notice if the Worker 500s entirely.

Nothing to paste into `.env` — Better Stack pings your URL from its side.

Alternative: **UptimeRobot** (https://uptimerobot.com/) — free tier, simpler, less pretty dashboard. Same setup.

---

## 15. GitHub repo secrets — put it all together

All values above that say "GitHub repo Secrets" go in the same place: **github.com/richardcwy/tKids → Settings → Secrets and variables → Actions → New repository secret**.

**Complete list (14 secrets for full CI+deploy+backup pipeline):**

Deploy essentials:
- [ ] `CLOUDFLARE_API_TOKEN`
- [ ] `CLOUDFLARE_ACCOUNT_ID`
- [ ] `DATABASE_URL`
- [ ] `DATABASE_AUTH_TOKEN`
- [ ] `BETTER_AUTH_SECRET` (generate with `openssl rand -base64 48`)
- [ ] `BETTER_AUTH_URL` = `https://tkids.tw`
- [ ] `POLAR_ACCESS_TOKEN` (can be the sandbox token for now)
- [ ] `POLAR_SUCCESS_URL` = `https://tkids.tw/dashboard`
- [ ] `RESEND_API_KEY`
- [ ] `TURNSTILE_SECRET_KEY`
- [ ] `PUBLIC_SERVER_URL` = `https://tkids.tw`
- [ ] `PUBLIC_TURNSTILE_SITE_KEY`

Tracking + ops (add when you set up each service):
- [ ] `PUBLIC_GA_MEASUREMENT_ID`
- [ ] `SENTRY_DSN`
- [ ] `DISCORD_ALERT_WEBHOOK`

Backup-only:
- [ ] `R2_ACCESS_KEY_ID`
- [ ] `R2_SECRET_ACCESS_KEY`

---

## Final sanity check

Once you've worked through the list, run this from the repo root:

```bash
cd "/Users/richard/Claude Projects/tKids/my-better-t-app"

# Secrets present locally?
grep -c '=' apps/web/.env
# Should be ~15 lines of key=value, no blanks.

# DB reachable?
bun run db:studio
# Should open a browser-based UI on Turso.

# Can we deploy?
bun run deploy
# Should create the Worker at https://tkids-web.<account>.workers.dev
# (or update the one bound to tkids.tw once DNS cuts over).

# Can we send an email?
# Visit the deployed signup form, sign up as yourself. Welcome email should arrive within 30s.
```

If all four green, you're shippable. Actually shipping = `git push origin main` (if the GitHub Actions workflows are enabled) or `bun run deploy` from your laptop.
