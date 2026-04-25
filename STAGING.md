# tKids — staging vs prod workflow

Two environments, fully isolated, controlled by `ALCHEMY_STAGE`.

| | Staging | Prod |
|---|---|---|
| Domain | `staging.tkids.tw` | `tkids.tw`, `www.tkids.tw` |
| Alchemy stage | `staging` | `richard` (legacy name kept for state continuity) |
| Worker name | `tkids-staging` | `tkids` |
| Turso DB | `tkids-staging` | (existing) |
| R2 buckets | `tkids-{audio,images,backups}-staging` | `tkids-{audio,images,backups}` |
| Queue | `tkids-subscribe-retry-staging` | `tkids-subscribe-retry` |
| Better-Auth secret | distinct (rotate independently) | distinct |
| Polar | reuses prod token; no real charges since `createCustomerOnSignUp: false` | live |

## Daily flow

1. Code → commit → push to `main`. Pushing does **not** auto-deploy.
2. `bun run deploy:staging` — pushes current branch to `staging.tkids.tw`.
3. Eyeball staging (visual + auth + flows).
4. If clean: `bun run deploy:prod` — pushes the same code to `tkids.tw`.
5. Bare `bun run deploy` errors out asking you to pick.

## First-time staging setup

Once-only. After this, just `bun run deploy:staging` works.

### 1. Create the staging Turso DB

```bash
turso db create tkids-staging --location nrt
turso db tokens create tkids-staging --expiration none
turso db show tkids-staging --url
```

Copy the URL and token.

### 2. Generate a fresh Better-Auth secret for staging

```bash
openssl rand -base64 32
```

Different from prod by design — forces re-login on cross-stage boundary.

### 3. Add the staging keys to `apps/web/.env`

Add alongside the existing prod keys:

```
STAGING_DATABASE_URL=libsql://tkids-staging-...turso.io
STAGING_DATABASE_AUTH_TOKEN=ey...
STAGING_BETTER_AUTH_SECRET=<paste from openssl above>
```

Optional (only needed when their respective surfaces ship to staging):

```
STAGING_RESEND_API_KEY=...        # if you want staging emails to actually send
STAGING_GOOGLE_CLIENT_ID=...      # when wiring OAuth
STAGING_GOOGLE_CLIENT_SECRET=...
```

Anything not prefixed with `STAGING_` falls back to the prod value, which is fine for things like `RESEND_FROM_EMAIL`, `POLAR_ACCESS_TOKEN` (Polar customer creation is disabled at signup, so staging can reuse).

### 4. First staging deploy

```bash
bun run deploy:staging
```

Alchemy will:
- Provision the `staging.tkids.tw` Cloudflare Worker
- Create the three `-staging` R2 buckets and the `-staging` queue
- Bind the `STAGING_*` env values to the Worker
- Auto-create the DNS record on Cloudflare for `staging.tkids.tw`

Wait ~30s for DNS propagation. Then:

### 5. Push the schema to the staging DB

```bash
bun run db:push:staging
bun run scripts/backfill-onboarded-at.ts   # set ALCHEMY_STAGE=staging if it's not already
ALCHEMY_STAGE=staging bun run scripts/backfill-onboarded-at.ts
```

Verify staging is up:

```bash
curl -I https://staging.tkids.tw
```

### 6. Add staging redirect URI to Google Cloud Console (when wiring OAuth)

In your existing OAuth client:
- Authorized JavaScript origin: `https://staging.tkids.tw`
- Authorized redirect URI: `https://staging.tkids.tw/api/auth/callback/google`

One OAuth client, two URIs.

## Promoting to prod

Once staging looks right:

```bash
# DB schema first (only when there's a schema change)
bun run db:push:prod

# then the Worker
bun run deploy:prod
```

If the prod schema diverges from staging because someone hot-fixed straight to prod, fix it: pull staging schema state to match, redeploy staging, then prod. Don't let prod and staging diverge silently.

## Rolling back

```bash
git revert <bad-commit>
bun run deploy:staging   # confirm rollback works
bun run deploy:prod
```

Resource state in Cloudflare doesn't change on revert; we're just shipping older code to the same Worker.

## Tearing down staging (if you ever need to)

```bash
ALCHEMY_STAGE=staging bun run destroy
```

Removes the `-staging` Worker, buckets, queue, and DNS record. Does NOT touch the Turso DB — drop that manually with `turso db destroy tkids-staging` if you mean to nuke it for real.

## Tip: claude-code protocol

When deploying, the assistant always says one of:
- 🟡 **deploying to STAGING**
- 🔴 **deploying to PROD (need your go-ahead)**

before running the command. So you always know which environment is about to move.
