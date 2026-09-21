/**
 * Locale configuration.
 *
 * Decisions encoded here (see docs/decisions/0002-i18n-url-strategy.md):
 *
 *  • Subdirectory routing for ALL locales, including the default: /he/, /ar/, /en/.
 *    `/` issues a redirect to /he/. Symmetry beats four saved characters — it
 *    removes the root-vs-/he/ duplicate and keeps one code path.
 *
 *  • hreflang uses LANGUAGE-ONLY codes (he, ar, en), never he-IL/ar-IL/en-IL.
 *    One country means the region subtag disambiguates nothing, and `en-IL`
 *    would wrongly exclude olim and family searching from abroad.
 *
 *  • Slugs are identical English strings across all locales. This makes the
 *    language switcher a pure `/{locale}/{samePath}` mapping, which is what
 *    satisfies "changing language must preserve the user's logical location".
 *    Hebrew/Arabic-script slugs would percent-encode into unshareable mojibake
 *    in WhatsApp — the dominant link-sharing channel in Israel.
 */

export const LOCALES = ['he', 'ar', 'en'] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'he';

export interface LocaleMeta {
  /** BCP-47 value for <html lang>. Language-only, per hreflang decision. */
  lang: Locale;
  dir: 'rtl' | 'ltr';
  /** Endonym — the language's name in its own script. Never use flag icons: */
  /** Arabic has no flag, and an Israeli flag for Hebrew is needlessly loaded */
  /** in a mixed region. */
  label: string;
  /** Font stack variable applied at :root for this locale. */
  fontKey: 'he' | 'ar' | 'en';
}

export const LOCALE_META: Record<Locale, LocaleMeta> = {
  he: { lang: 'he', dir: 'rtl', label: 'עברית', fontKey: 'he' },
  ar: { lang: 'ar', dir: 'rtl', label: 'العربية', fontKey: 'ar' },
  en: { lang: 'en', dir: 'ltr', label: 'English', fontKey: 'en' },
};

export function isLocale(value: string | undefined): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

export function dirOf(locale: Locale): 'rtl' | 'ltr' {
  return LOCALE_META[locale].dir;
}

export function isRtl(locale: Locale): boolean {
  return LOCALE_META[locale].dir === 'rtl';
}

/* -------------------------------------------------------------------------- */
/*  Path helpers                                                               */
/* -------------------------------------------------------------------------- */

/** Build a locale-prefixed path: ('ar', 'treatments/dental-implants') -> '/ar/treatments/dental-implants' */
export function localizePath(locale: Locale, path = ''): string {
  const base = (import.meta.env.BASE_URL || '/').replace(/\/+$/, '');
  const clean = path.replace(/^\/+|\/+$/g, '');
  const prefix = base ? `${base}/${locale}` : `/${locale}`;
  return clean ? `${prefix}/${clean}/` : `${prefix}/`;
}

/** Strip base and locale prefix from a pathname: '/ar/faq/' -> 'faq' */
export function stripLocale(pathname: string): string {
  const base = (import.meta.env.BASE_URL || '/').replace(/^\/+|\/+$/g, '');
  const parts = pathname.split('/').filter(Boolean);
  if (base && parts[0] === base) parts.shift();
  if (isLocale(parts[0])) parts.shift();
  return parts.join('/');
}

/**
 * The same page in every other locale — used by the language switcher so a
 * visitor stays exactly where they are instead of being dumped on a homepage.
 */
export function alternatesFor(pathname: string): Array<{ locale: Locale; href: string; meta: LocaleMeta }> {
  const rest = stripLocale(pathname);
  return LOCALES.map((locale) => ({
    locale,
    href: localizePath(locale, rest),
    meta: LOCALE_META[locale],
  }));
}
