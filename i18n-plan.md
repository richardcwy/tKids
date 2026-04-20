# i18n plan — tKids multilingual site

**Scope:** internationalize the site to four locales (**zh-TW, en, ja, de**) with a key-value system the founder can edit and maintain directly — **no Astro or TypeScript knowledge required to change a string**.

**Companion to:** `v1.1.0420.md` § 3. This doc is the day-to-day operator's guide; v1.1.0420.md has the release-level scoping.

**Planned by:** Claude Opus 4.7 on 2026-04-20

---

## TL;DR for the founder

> **To change a translated string on the site:**
>
> 1. Open one file: `apps/web/src/i18n/{locale}.json` (where `locale` is one of `zh-TW`, `en`, `ja`, `de`)
> 2. Find the key (e.g. `"hero.slogan": "Ignite and shine!"`)
> 3. Edit the value between the quotes. Save.
> 4. `git commit` + `git push`. Change goes live at tkids.tw in ~60 seconds via the CI/CD pipeline.
>
> No code changes. No rebuild of anything except the site itself. If you break the JSON syntax, CI catches it and refuses to deploy — your live site is never in a broken state.

---

## Why this design

Three principles drove the shape:

1. **Edit-by-editor, not edit-by-tool.** You should be able to edit any string in VS Code / Sublime / TextMate / the GitHub web UI. No CMS login, no admin panel, no sync script.
2. **JSON, not code.** Translators (and you) don't write TypeScript. JSON is a universal format; every text editor has syntax highlighting for it; git diffs are readable.
3. **Catch mistakes at CI, not in production.** If `en.json` has a key `hero.slogan` that `ja.json` is missing, CI fails the PR. No silently-missing translations slip out.

Rejected alternatives (and why):
- **A CMS like Tolgee / Crowdin / Sanity** — overkill for ~150 strings. Adds a permanent dependency, monthly fee, and another login to babysit. Reconsider when tKids has >1000 strings or a dedicated translator headcount.
- **Astro content collections** — more flexible for long-form content, but heavier for simple string lookups. We'll use it for `/privacy` (long-form Markdown) only.
- **Google Sheets + a sync script** — nice for translator collaboration but adds a sync step that can silently fail. If the founder wants a sheet later, we can add a one-way export script.
- **Inline bilingual (current v1.0 approach)** — fine when we had 2 locales and hand-stitched copy. Breaks when we go to 4.

---

## File layout

```
apps/web/
  src/
    i18n/
      README.md              # short operator guide (this doc's TL;DR)
      zh-TW.json             # default / canonical (Mandarin — our primary audience)
      en.json                # source-of-truth for SCHEMA (what keys must exist)
      ja.json
      de.json
      _meta.json             # locale metadata (display names, font stack per locale, direction)
      schema.ts              # TypeScript types generated from en.json; the rest of the app uses these
    lib/
      i18n.ts                # ~60-line helper exposing t(), locale(), changeLocale(), etc.
    pages/
      index.astro            # zh-TW (default) — no prefix
      en/
        index.astro          # thin wrapper, same components, different t()
      ja/
        index.astro
      de/
        index.astro
      privacy.astro          # zh-TW
      en/privacy.astro
      ja/privacy.astro
      de/privacy.astro
```

The key insight: `pages/en/index.astro` is a **3-line file** that imports the same components as `pages/index.astro`. All the actual HTML, styling, and logic lives in components — the page files just pick the locale.

---

## File format — what a locale JSON looks like

```json
{
  "$schema": "./schema.json",
  "meta": {
    "localeName": "English",
    "localeNameNative": "English",
    "direction": "ltr"
  },
  "nav": {
    "lineup": "lineup",
    "music": "music",
    "shop": "shop",
    "signIn": "sign in",
    "donate": "donate",
    "shareTooltip": "link copied",
    "shareLabel": "share tkids.tw"
  },
  "hero": {
    "sloganPrimary": "Ignite and shine!",
    "sloganSecondary": "Three kids. One collective.",
    "manifestoLine1": "The T-community found three talents among us...",
    "manifestoLine2": "...and now we're lifting them to the universe."
  },
  "crowdfund": {
    "raisedSuffix": "raised of",
    "goalSuffix": "goal",
    "supporters": "supporters",
    "daysLeft": "days left",
    "lastCall": "last call",
    "origin": "origin",
    "donateNow": "donate now",
    "goalAchieved": "goal hit · thank you · see you on drop day"
  },
  "lineup": {
    "sectionLabel": "the lineup",
    "sectionTitlePrefix": "three",
    "sectionTitleAccent": "kids",
    "sectionMini": "Ethan · Alan · Albert",
    "sectionMiniSub": "The three boys lighting up the universe",
    "members": {
      "ethan": { "role": "lead vocals", "roleNote": "team leader" },
      "alan":  { "role": "rap · producer", "roleNote": "" },
      "albert":{ "role": "dance · visuals", "roleNote": "" }
    },
    "ctaListen": "listen to \"Ignite!\""
  },
  "footer": {
    "copyright": "© {year} tKids · all rights reserved",
    "taglineGold": "ignite the universe",
    "youtubeLabel": "YouTube",
    "versionPrefix": "build"
  },
  "signup": {
    "title": "Join the fanclub",
    "titleSub": "Be the first to hear Ignite! when it drops.",
    "fieldName": "Name (optional)",
    "fieldEmail": "Email",
    "fieldPassword": "Password · min 8 chars",
    "fieldBirthYear": "Year you were born",
    "consentText": "I'm 13 or older and I've read the privacy policy.",
    "submit": "Notify me",
    "errorRateLimited": "Too many attempts. Try again in a minute.",
    "errorUnderAge": "Sorry, you need to be 13 or older to join.",
    "errorConsent": "Please confirm you're 13 or older.",
    "errorTurnstile": "We couldn't verify you're human. Refresh the challenge.",
    "errorGeneric": "Something went wrong. Please try again."
  },
  "welcomeEmail": {
    "subject": "Welcome to tKids — you're in",
    "greeting": "Hi {name},",
    "body": "You're officially on the list...",
    "closing": "— Team tKids"
  }
}
```

Notes on format:
- **Dots in keys are organizational**; they map to object nesting in the JSON above. You access `"hero.sloganPrimary"` from code as `t("hero.sloganPrimary")`.
- **`{placeholder}` interpolation** for dynamic values: `"{year}"`, `"{name}"`. Values get substituted at render time. Available placeholders per key are documented inline in `en.json` comments (see below).
- **No HTML in strings** — no `<b>` or `<a href="...">`. If a string needs styling or links, the component splits it at render time. This keeps translators focused on words, not markup.
- **Plurals** — for the very few places that need them (e.g. "1 supporter" vs "5 supporters"), we use ICU syntax: `"{count, plural, =1 {# supporter} other {# supporters}}"`. The `i18n.ts` helper has a built-in ICU-subset evaluator.

---

## How to change a value (the common case)

**Example: shorten the footer tagline in all 4 languages.**

1. Open `apps/web/src/i18n/zh-TW.json` in any editor.
2. `Cmd+F` search for `"taglineGold"`. You'll see `"taglineGold": "點亮宇宙"`.
3. Change the value (everything between the quotes on the right). Save.
4. Repeat for `en.json`, `ja.json`, `de.json`.
5. `git commit -m "copy: shorten footer tagline"` + `git push`. CI redeploys in ~60s.

**Shortcut for a single-language edit** (e.g., only zh-TW needs tweaking): edit just `zh-TW.json`. The CI check `scripts/check-i18n.ts` will NOT fail as long as the key still exists — it only fails if a key is missing. Same-value-different-across-locales is allowed.

**If you edit on GitHub directly** (fastest for a typo fix from your phone):
1. Open https://github.com/richardcwy/tKids/blob/main/apps/web/src/i18n/zh-TW.json
2. Click the pencil (✏️) icon
3. Edit → commit directly to `main` with a message → save
4. CI auto-runs, deploys. You'll see the change on tkids.tw in ~2 min.

---

## How to ADD a new key

This is the one operation that needs coordination across all 4 locale files, because CI validates every key in `en.json` exists in the other three.

**Example: add a new "Newsletter" section heading.**

1. Decide the key name using the `section.purpose` convention. E.g., `newsletter.title`.
2. Add it to `en.json` FIRST (English is our schema source):
   ```json
   "newsletter": {
     "title": "Monthly studio updates"
   }
   ```
3. Add the same key to `zh-TW.json`, `ja.json`, `de.json` with the translation. If you don't know the translation yet, add the English value as a placeholder — CI allows that because non-empty is all it checks. Then mark the key in `docs/i18n-todo.md` for a translator pass later.
4. Use in a component: `<h2>{t("newsletter.title")}</h2>`. TypeScript autocompletes the key because `schema.ts` is generated from `en.json`.
5. `git commit` + `git push`.

**If you forget a locale**: CI's `bun run check:i18n` job fails the PR with:
```
[i18n] missing keys in ja.json:
  - newsletter.title
```
You can't merge until you fix it. Can't ship a broken locale.

---

## How to ADD a new locale

Say you want to add Korean (`ko`) later.

1. Copy `en.json` → `ko.json`.
2. Translate each value. Keep keys identical.
3. Add `ko` to `apps/web/astro.config.mjs` → `i18n.locales`.
4. Add `ko` to `_meta.json` with `localeName: "Korean"`, `localeNameNative: "한국어"`, `direction: "ltr"`.
5. Create `pages/ko/` directory mirroring `pages/en/` (copy + change the locale prop).
6. Add `Noto Sans KR` to `apps/web/src/styles/fonts.css` if Korean needs its own font.
7. Wire the language switcher: `Nav.astro`'s locale picker auto-renders all locales from `_meta.json` — no code change.
8. Commit. CI will catch any missing keys.

Time budget for adding a locale: ~1 hour of glue + however long translation takes.

---

## Translation workflow

Four practical options, pick one based on how much help you want:

### Option A — Claude drafts, you review
For each new key: "Translate this into ja and de, keep the playful / branded tone." Claude gives drafts. You paste into the JSON files and eyeball for obvious wrong-tone issues. Cost: $0 + your time.

**Good for:** Marketing copy, nav labels, error messages, short strings.

**Bad for:** Privacy policy, legal disclaimers, COPPA-adjacent language — mistranslation here has real exposure.

### Option B — Claude drafts, native speaker reviews
Same as A, but send the draft JSON to a friend / freelancer who speaks the target language natively before merging. Budget $20-40/hour of review; ~1 hour for a full site pass.

**Good for:** Everything except legal. Recommended default.

### Option C — Professional translator
Services like Gengo, ProZ, Rev provide human translation with turnaround in 24-48 hours. Cost: roughly $0.10-0.20 per word, so a full site pass (~500 words) is $50-100 per language.

**Good for:** Privacy policy only. Recommended for `privacy.json` specifically.

### Option D — Auto-translate (Google Translate / DeepL API)
Can be wired as a build-time fallback for missing keys. I recommend **against** this for a branded creator site — machine translation has a robotic flavor that undercuts the "made with care" brand posture. But the infrastructure can be there as a safety net.

**Recommendation**: start with **Option B** for app copy (nav, hero, crowdfund, signup) and **Option C** for `/privacy`. Don't cut corners on legal.

---

## Routing behavior

### URL structure
- `tkids.tw/` → zh-TW (default, no prefix)
- `tkids.tw/en/` → English
- `tkids.tw/ja/` → Japanese
- `tkids.tw/de/` → German

### Auto-detection on first visit
When a visitor lands on `tkids.tw/` fresh (no `tkids_locale` cookie), we check `Accept-Language` header:
- If their top preference matches one of our 4 locales → 302 redirect to that locale
- Otherwise → stay on `/` (zh-TW)

Once they land, we set a cookie `tkids_locale=<chosen>` so subsequent visits honor their choice. The language switcher in the nav flips this cookie.

### Explicit override
`?locale=en` forces a locale for a single pageview. Used for: testing, sharing "this is the English version of the page" links.

### SEO
`<link rel="alternate" hreflang="{locale}" href="...">` tags emitted automatically in every page's `<head>` (SEO.astro reads from `_meta.json`). Google understands we have 4 language variants and ranks each appropriately in local search.

---

## Font strategy per locale

| Locale | Display / body | Subtitle (if CJK) | Font weight to preload |
|---|---|---|---|
| zh-TW | Unbounded (Latin) + Noto Sans TC | — | Noto Sans TC 400 (already loaded) |
| en | Unbounded + DM Serif Display + JetBrains Mono | — | Unbounded 800 (already preloaded) |
| ja | Unbounded (Latin) + Noto Sans JP | — | Noto Sans JP 400 (NEW — add to fontsource imports) |
| de | Unbounded + DM Serif Display | — | Unbounded 800 (shared with en) |

Only Japanese needs a new font; all others reuse what v1.0 already ships. Estimated weight increase for ja visitors: ~60 KB (Noto Sans JP, chinese-japanese subset, weight 400).

Preload rule in `SEO.astro`: emit the right `<link rel="preload" as="font">` per locale, not all of them globally.

---

## The `i18n.ts` helper (what the code uses)

For reference — you don't need to edit this file, but understanding it makes the rest of the plan clearer.

```ts
// apps/web/src/lib/i18n.ts (sketch — actual implementation ~60 lines)
import enStrings from "../i18n/en.json";
import zhTWStrings from "../i18n/zh-TW.json";
import jaStrings from "../i18n/ja.json";
import deStrings from "../i18n/de.json";
import meta from "../i18n/_meta.json";

const DICT = {
  "zh-TW": zhTWStrings,
  "en": enStrings,
  "ja": jaStrings,
  "de": deStrings,
} as const;

export type Locale = keyof typeof DICT;

export function detectLocale(astro: { url: URL; request: Request }): Locale {
  const path = astro.url.pathname;
  if (path.startsWith("/en/")) return "en";
  if (path.startsWith("/ja/")) return "ja";
  if (path.startsWith("/de/")) return "de";
  return "zh-TW";
}

export function useI18n(astro: { url: URL; request: Request }) {
  const locale = detectLocale(astro);
  const dict = DICT[locale];
  return {
    locale,
    t: (key: string, vars?: Record<string, string | number>) => {
      // dot-walk into dict, fallback to en if missing, interpolate {placeholders}
      const segs = key.split(".");
      let v: any = dict;
      for (const s of segs) v = v?.[s];
      if (v == null) {
        // fallback to en
        v = key.split(".").reduce((acc: any, s) => acc?.[s], DICT.en);
      }
      if (typeof v !== "string") return key;
      return v.replace(/\{(\w+)\}/g, (_, k) => String(vars?.[k] ?? `{${k}}`));
    },
    allLocales: Object.keys(DICT) as Locale[],
    meta,
  };
}
```

Per-component usage:
```astro
---
import { useI18n } from "../lib/i18n";
const { t, locale } = useI18n(Astro);
---
<h1>{t("hero.sloganPrimary")}</h1>
<p lang={locale === "zh-TW" ? "zh-TW" : undefined}>
  {t("hero.sloganSecondary")}
</p>
```

---

## CI guardrails

Two checks enforce correctness. Both run on every PR and block merge on failure.

### Check 1: key parity
`scripts/check-i18n.ts` (already planned; will ship in v1.1.0420-beta1):
```
Reads en.json (source of truth).
For every key in en.json, verify the same key exists in zh-TW.json, ja.json, de.json.
Exit 1 if any missing. List them.
```

### Check 2: no raw strings in components
A simple regex-based lint that greps `.astro`/`.ts`/`.tsx` components for quoted text > 3 characters that isn't either:
- Passed to `t(...)`
- In a comment
- In an attribute like `class="..."`
- In an allowlist (like `"JetBrains Mono"` or brand names)

If a bare string slips into a component (`<h1>Hello</h1>` instead of `<h1>{t("greeting.hello")}</h1>`), the lint fails. This is what keeps the translations actually covering everything.

Both checks wire into the existing `.github/workflows/ci.yml` as extra steps.

---

## Migration from v1.0 inline bilingual to v1.1 i18n

We have ~150 user-visible strings currently hardcoded in Astro components. Migration in three passes:

**Pass 1 (1 hr): extract zh-TW + en from components.**
- Read every .astro under `apps/web/src/components/` and `apps/web/src/pages/`.
- For every hardcoded string > 3 chars, produce a suggested key + English value + zh-TW value.
- Write both to `en.json` and `zh-TW.json`.
- Replace the hardcoded string with `{t("key")}` in the component.

This can be mostly mechanical — a script that parses Astro files, finds quoted text, and emits a diff. Human review each suggested key name.

**Pass 2 (few hours, depends on volume): draft ja + de.**
- Copy `en.json` → `ja.json` + `de.json`.
- For each value, ask Claude: "translate to ja keeping the playful branded tone". Review each draft. Commit.
- Flag privacy/legal copy for human translator review before ship.

**Pass 3 (30 min): wire the switcher.**
- Add language picker to `Nav.astro` (dropdown or 4-letter chips).
- Wire `Accept-Language` detection middleware in `apps/web/src/middleware.ts`.
- Add `hreflang` alternates to `SEO.astro`.

Total migration effort: ~6 hours CC + translation cost of your choice.

---

## What the founder can do RIGHT NOW (no code help needed)

Even before any of this is implemented, you can start filling out translations if you want:

1. Read this file and decide on the translation workflow (Option A/B/C above).
2. If you have a native-speaker friend in JP or DE, line them up.
3. If not, budget ~$100/language for Gengo/ProZ translation of `/privacy`.
4. Sit tight on other copy until we port v1.1 so the final string set is known.

---

## Questions for you (blocks starting implementation)

- **Q1: Default locale on `/`?** I've proposed `zh-TW` because the T-community is Mandarin-speaking and the brand is Taiwan-origin. Alternative: English at `/` with `/zh/` for Mandarin (more SEO-friendly for global discoverability). Recommend zh-TW default.

- **Q2: URL strategy for the default locale?**
  - **A**: `tkids.tw/` = zh-TW, `tkids.tw/en/` = English (my recommendation — cleaner domain root for the primary audience).
  - **B**: `tkids.tw/zh/`, `tkids.tw/en/`, etc. — every locale prefixed. Treats all 4 as equal citizens. Slightly more complex but cleaner globally.
  
  → Recommend A.

- **Q3: Translation workflow?** (B recommended for app copy + C for privacy.)

- **Q4: Which locale gets priority 1?** We can ship zh-TW + en on day-1 of the beta and add ja + de in a following sub-release. Recommend shipping all 4 together so language-switcher UI is complete the moment it goes live — but ja/de can have "placeholder = English" keys to start, with CI flagging them as translation-pending in a separate file.

- **Q5: Per-locale privacy policy — Markdown collection or big JSON?** For long-form content, I recommend Astro's content collections (`src/content/privacy/{locale}.md`). More comfortable for a translator than a 3000-char JSON value.

Answer these and I'll start implementation. If you accept all my recommendations (A1 zh-TW default / A2 prefix-free for default / A3 B + C for privacy / A4 ship all 4 / A5 content collection for privacy), just say "go with all recommendations".

---

## Effort summary

| Phase | Effort | Output |
|---|---|---|
| Migration (extract hardcoded strings) | ~1 hr CC | `en.json` + `zh-TW.json` populated, components migrated |
| Locale routing + switcher | ~1 hr CC | `/`, `/en/`, `/ja/`, `/de/` all work; nav has switcher |
| CI guardrails (key parity + string lint) | ~30 min CC | PRs blocked on missing keys |
| Japanese + German drafts | Claude drafts: ~15 min; human review: variable | `ja.json` + `de.json` ready |
| Privacy policy professional translation | 48hr turnaround, ~$100/lang | Legally-reviewed privacy for 4 languages |
| **Total engineering** | **~3 hrs CC** | |
| **Total translation cost** | **~$200-400** | privacy policy professionally done |

Ships as v1.1.0420 final.

---

*This file is the operator's guide. Edit it as the system evolves. When you add a workflow tweak (e.g., a Google Sheets sync script), note it here.*
