/**
 * Locale routing and RTL behaviour.
 *
 * The requirement these protect: "changing language must preserve the user's
 * logical location". A switcher that dumps an Arabic reader on the Hebrew
 * homepage is the failure mode, and it is invisible until someone tries it.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  LOCALES,
  DEFAULT_LOCALE,
  LOCALE_META,
  isLocale,
  dirOf,
  isRtl,
  localizePath,
  stripLocale,
  alternatesFor,
} from '../../src/i18n/config.ts';
import { ui, useTranslations } from '../../src/i18n/ui.ts';

describe('locale definitions', () => {
  test('three locales, Hebrew is the default', () => {
    assert.deepEqual([...LOCALES], ['he', 'ar', 'en']);
    assert.equal(DEFAULT_LOCALE, 'he');
  });

  test('direction is correct per script', () => {
    assert.equal(dirOf('he'), 'rtl');
    assert.equal(dirOf('ar'), 'rtl');
    assert.equal(dirOf('en'), 'ltr');
    assert.equal(isRtl('ar'), true);
    assert.equal(isRtl('en'), false);
  });

  test('each language is labelled in its own script, never a flag', () => {
    assert.equal(LOCALE_META.he.label, 'עברית');
    assert.equal(LOCALE_META.ar.label, 'العربية');
    assert.equal(LOCALE_META.en.label, 'English');
    // Arabic has no flag and an Israeli flag for Hebrew is loaded in a mixed
    // region, so no label may be an emoji flag.
    for (const l of LOCALES) {
      assert.doesNotMatch(LOCALE_META[l].label, /[\u{1F1E6}-\u{1F1FF}]/u, `${l} uses a flag`);
    }
  });

  test('isLocale rejects anything else', () => {
    assert.equal(isLocale('he'), true);
    assert.equal(isLocale('de'), false);
    assert.equal(isLocale(undefined), false);
    assert.equal(isLocale('HE'), false);
  });
});

describe('localizePath', () => {
  test('always prefixes, including the default locale', () => {
    // Symmetry is what removes the root-vs-/he/ duplicate.
    assert.equal(localizePath('he'), '/he/');
    assert.equal(localizePath('ar'), '/ar/');
    assert.equal(localizePath('en'), '/en/');
  });

  test('builds nested paths with a trailing slash', () => {
    assert.equal(localizePath('ar', 'treatments/dental-implants'), '/ar/treatments/dental-implants/');
  });

  test('tolerates stray slashes in the input', () => {
    assert.equal(localizePath('he', '/faq/'), '/he/faq/');
    assert.equal(localizePath('he', 'faq'), '/he/faq/');
  });
});

describe('stripLocale', () => {
  test('removes the locale segment', () => {
    assert.equal(stripLocale('/ar/faq/'), 'faq');
    assert.equal(stripLocale('/he/treatments/veneers/'), 'treatments/veneers');
    assert.equal(stripLocale('/en/'), '');
  });

  test('leaves a path that has no locale prefix alone', () => {
    assert.equal(stripLocale('/faq/'), 'faq');
  });
});

describe('alternatesFor — the location-preserving switcher', () => {
  test('maps a deep page to the SAME page in every locale', () => {
    const alts = alternatesFor('/he/treatments/dental-implants/');
    assert.equal(alts.length, 3);
    assert.deepEqual(
      alts.map((a) => a.href).sort(),
      [
        '/ar/treatments/dental-implants/',
        '/en/treatments/dental-implants/',
        '/he/treatments/dental-implants/',
      ],
    );
  });

  test('never collapses a deep page to a homepage', () => {
    for (const path of ['/ar/faq/', '/en/privacy/', '/he/treatments/']) {
      for (const alt of alternatesFor(path)) {
        assert.notEqual(
          alt.href,
          `/${alt.locale}/`,
          `${path} collapsed to a homepage for ${alt.locale}`,
        );
      }
    }
  });

  test('includes a self-reference — hreflang clusters are ignored without it', () => {
    const alts = alternatesFor('/ar/faq/');
    assert.ok(alts.some((a) => a.locale === 'ar' && a.href === '/ar/faq/'));
  });

  test('carries the right direction for each alternate', () => {
    const alts = alternatesFor('/he/');
    assert.equal(alts.find((a) => a.locale === 'ar')!.meta.dir, 'rtl');
    assert.equal(alts.find((a) => a.locale === 'en')!.meta.dir, 'ltr');
  });
});

describe('UI strings', () => {
  test('no key exists in one locale but not another', () => {
    // Translation drift is silent: a missing Arabic key falls back to English
    // and looks like a design choice rather than a bug.
    const keys = Object.fromEntries(LOCALES.map((l) => [l, new Set(Object.keys(ui[l]))]));
    for (const locale of LOCALES) {
      for (const key of keys.en) {
        assert.ok(keys[locale].has(key), `${locale} is missing "${key}"`);
      }
      for (const key of keys[locale]) {
        assert.ok(keys.en.has(key), `${locale} has an orphan key "${key}"`);
      }
    }
  });

  test('no string is empty in any locale', () => {
    for (const locale of LOCALES) {
      for (const [key, value] of Object.entries(ui[locale])) {
        assert.ok(String(value).trim().length > 0, `${locale}.${key} is empty`);
      }
    }
  });

  test('translator falls back to English rather than showing a raw key', () => {
    const t = useTranslations('ar');
    assert.equal(t('nav.home'), 'الصفحة الرئيسية');
    // A key that does not exist anywhere returns the key itself, never blank.
    assert.equal(t('does.not.exist' as never), 'does.not.exist');
  });

  test('Hebrew and Arabic strings contain no Latin-script leakage in nav', () => {
    for (const key of ['nav.home', 'nav.about', 'nav.treatments', 'nav.contact'] as const) {
      assert.doesNotMatch(ui.he[key], /[A-Za-z]{3,}/, `he.${key} leaks Latin text`);
      assert.doesNotMatch(ui.ar[key], /[A-Za-z]{3,}/, `ar.${key} leaks Latin text`);
    }
  });
});
