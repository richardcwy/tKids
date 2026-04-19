# Enabling CI / CD + nightly backup

The CI workflow lives at `docs/ci-workflow.yml` instead of
`.github/workflows/ci.yml` because the gh CLI token used to seed this
repo doesn't have the `workflow` OAuth scope. Pushing to
`.github/workflows/` requires that scope.

## One-time enable (≈ 30 seconds)

```bash
# 1. Refresh your gh token to add the workflow scope (opens a browser).
gh auth refresh -h github.com -s workflow

# 2. Move BOTH workflows into the active path and push.
mkdir -p .github/workflows
mv docs/ci-workflow.yml .github/workflows/ci.yml
mv docs/backup-workflow.yml .github/workflows/backup.yml
git add .github/workflows/ docs/CI-SETUP.md
git commit -m "ci: enable test + build + deploy + nightly backup workflows"
git push
```

That's it. The workflow runs on every push and PR.

## What the workflow does

**`test` job** (every push + PR):

1. Cache + install bun deps
2. `bun test` — 15 unit tests (~1s)
3. Seed a stub `apps/web/.alchemy/local/wrangler.jsonc`
4. `bun run build` — Astro + sitemap (~10s)

**`deploy` job** (push to `main` only, gated):

- Skips with a warning if `CLOUDFLARE_API_TOKEN` repo secret is empty.
- Otherwise: install + build + `bun run deploy` (Alchemy → Cloudflare).

## Repo secrets to add (Settings → Secrets → Actions)

For the deploy job to actually run, add these secrets:

| Secret | What |
| --- | --- |
| `CLOUDFLARE_API_TOKEN` | Workers Scripts:Edit + R2:Edit + DNS:Edit + Account:Read |
| `CLOUDFLARE_ACCOUNT_ID` | From the Cloudflare dashboard sidebar |
| `DATABASE_URL` | Turso `libsql://...` URL |
| `DATABASE_AUTH_TOKEN` | Turso JWT |
| `BETTER_AUTH_SECRET` | 32+ char random string (`openssl rand -base64 48`) |
| `BETTER_AUTH_URL` | `https://t.kids` |
| `POLAR_ACCESS_TOKEN` | Polar production access token |
| `POLAR_SUCCESS_URL` | `https://t.kids/dashboard` |
| `RESEND_API_KEY` | From resend.com dashboard |
| `TURNSTILE_SECRET_KEY` | From Cloudflare Turnstile |
| `PUBLIC_SERVER_URL` | `https://t.kids` |
| `PUBLIC_TURNSTILE_SITE_KEY` | From Cloudflare Turnstile (public) |
| `SENTRY_DSN` | Optional. Error reporting to Sentry. |
| `DISCORD_ALERT_WEBHOOK` | Optional. Errors pinged to a Discord channel. |

## Backup-specific secrets (for nightly R2 dump)

| Secret | What |
| --- | --- |
| `R2_ACCESS_KEY_ID` | From Cloudflare R2 → Manage API tokens |
| `R2_SECRET_ACCESS_KEY` | Same place |

R2 S3 credentials are separate from the Workers API token. Create them
at Cloudflare → R2 → Manage API tokens, scope them to "Object
Read & Write" on the `tkids-backups` bucket.

## Running the backup locally

```bash
# Just dump to stdout:
BACKUP_STDOUT=1 bun run backup > dump.sql

# Dump + write gzipped local copy:
bun run backup

# Dump + upload to R2:
R2_ACCOUNT_ID=... R2_ACCESS_KEY_ID=... R2_SECRET_ACCESS_KEY=... bun run backup
```
