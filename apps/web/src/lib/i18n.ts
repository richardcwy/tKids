// Tiny i18n helper. No framework. No dependencies.
//
// To change a translated string, edit apps/web/src/i18n/{locale}.json
// and commit. CI redeploys in ~60s.
// To add a new key, add to en.json first (the schema source), then
// mirror into zh-TW.json, ja.json, de.json.
//
// See i18n-plan.md at the repo root for the full operator guide.

import enRaw from "../i18n/en.json";
import zhTWRaw from "../i18n/zh-TW.json";
import jaRaw from "../i18n/ja.json";
import deRaw from "../i18n/de.json";
import metaRaw from "../i18n/_meta.json";

export const LOCALES = ["zh-TW", "en", "ja", "de"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "zh-TW";

type Dict = Record<string, unknown>;
const DICT: Record<Locale, Dict> = {
  "zh-TW": zhTWRaw as Dict,
  en: enRaw as Dict,
  ja: jaRaw as Dict,
  de: deRaw as Dict,
};

export type LocaleMeta = {
  label: string;
  localeName: string;
  localeNameNative: string;
  htmlLang: string;
  direction: "ltr" | "rtl";
  ogLocale: string;
  pathPrefix: string;
};

export const META = metaRaw as Record<Locale, LocaleMeta>;

/** Derive the locale from a URL pathname. `/en/foo` -> `en`; otherwise default. */
export function detectLocaleFromPath(pathname: string): Locale {
  for (const loc of LOCALES) {
    if (loc === DEFAULT_LOCALE) continue;
    const prefix = META[loc].pathPrefix;
    if (prefix && (pathname === prefix || pathname.startsWith(prefix + "/"))) {
      return loc;
    }
  }
  return DEFAULT_LOCALE;
}

/** Walk a dot-key into the nested dict. Returns undefined if any segment misses. */
function dig(dict: Dict, key: string): unknown {
  const parts = key.split(".");
  let cur: unknown = dict;
  for (const p of parts) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Dict)[p];
  }
  return cur;
}

/** Replace `{name}` placeholders. */
function interpolate(
  tpl: string,
  vars: Record<string, string | number> | undefined,
): string {
  if (!vars) return tpl;
  return tpl.replace(/\{(\w+)\}/g, (_, k) => {
    const v = vars[k];
    return v == null ? `{${k}}` : String(v);
  });
}

export type Translator = (
  key: string,
  vars?: Record<string, string | number>,
) => string;

/**
 * Build a translator for a locale. On missing keys it falls back to en, and
 * if still missing returns the key string itself — visible enough to notice
 * in dev, safe enough to not break prod.
 */
export function buildT(locale: Locale): Translator {
  const primary = DICT[locale];
  const fallback = DICT.en;
  return (key, vars) => {
    let v = dig(primary, key);
    if (typeof v !== "string") v = dig(fallback, key);
    if (typeof v !== "string") return key;
    return interpolate(v, vars);
  };
}

/**
 * Produce the current locale's tree of strings (the object, not a function).
 * Useful when passing whole sub-objects into components that read multiple keys.
 * Callers should be narrow about which sub-tree they access — typo doesn't autocomplete.
 */
export function dictFor(locale: Locale): Dict {
  return DICT[locale];
}

/**
 * For a given base path (e.g. `/`, `/signup`, `/privacy`) + current locale,
 * return the localized URL. Default locale has no prefix; others are prefixed.
 */
export function localizedPath(path: string, locale: Locale): string {
  const prefix = META[locale].pathPrefix;
  if (!prefix) return path;
  if (path === "/") return prefix + "/";
  return prefix + path;
}

/**
 * For a given non-prefixed "canonical" path + a target locale, build the href.
 * Handy for the language switcher.
 */
export function switchLocaleHref(currentPath: string, target: Locale): string {
  // Strip any existing locale prefix from the current path first.
  let stripped = currentPath;
  for (const loc of LOCALES) {
    const prefix = META[loc].pathPrefix;
    if (prefix && stripped.startsWith(prefix)) {
      stripped = stripped.slice(prefix.length) || "/";
      break;
    }
  }
  return localizedPath(stripped, target);
}

/**
 * Astro-facing convenience. Reads the locale from Astro's URL and returns
 * { locale, t, meta, switchHref }. All components use this in their
 * frontmatter.
 */
export function useI18n(astro: { url: URL }) {
  const locale = detectLocaleFromPath(astro.url.pathname);
  return {
    locale,
    t: buildT(locale),
    meta: META[locale],
    allLocales: LOCALES as readonly Locale[],
    allMeta: META,
    switchHref: (target: Locale) =>
      switchLocaleHref(astro.url.pathname, target),
  };
}
