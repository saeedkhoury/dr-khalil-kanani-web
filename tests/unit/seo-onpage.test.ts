/**
 * On-page search rules from the 2026-10-01 research (docs/SEARCH-INTENT-MAP.md).
 *
 * - Titles use the words people type: "רופא שיניים / طبيب أسنان / dentist"
 *   + the town — not only the clinic's tagline.
 * - The treatments description cannot go stale: it is built from the
 *   published treatments (it listed 6 of 8 for weeks).
 * - Every treatment is linked from related treatments: extraction and
 *   fillings were reachable only from the hub (4 internal links each).
 * - The about page is the doctor's profile page in structured data.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { seoTitle, treatmentsDescription, DESCRIPTION_MAX } from '../../src/lib/seo.ts';
import { getRelated, getTreatments } from '../../src/lib/content.ts';
import { buildGraph } from '../../src/lib/schema.ts';
import { clinic, LOCALES } from '../../src/data/clinic.ts';

type Node = Record<string, unknown>;

describe('the home title names the profession and the town', () => {
  test('in the grammar of each language, once', () => {
    assert.equal(seoTitle.home('he', 'ד״ר חליל כנעאני'), `ד״ר חליל כנעאני — רופא שיניים ב${clinic.address.locality.he}`);
    assert.equal(seoTitle.home('ar', 'د. خليل كنعاني'), `د. خليل كنعاني — طبيب أسنان في ${clinic.address.locality.ar}`);
    assert.equal(seoTitle.home('en', 'Dr. Khalil Kanani'), `Dr. Khalil Kanani — Dentist in ${clinic.address.locality.en}`);
  });

  test('short enough to show whole in results', () => {
    for (const [locale, name] of [['he', 'ד״ר חליל כנעאני'], ['ar', 'د. خليل كنعاني'], ['en', 'Dr. Khalil Kanani']] as const) {
      assert.ok(seoTitle.home(locale, name).length <= 60, seoTitle.home(locale, name));
    }
  });
});

describe('the treatments description lists what the site actually offers', () => {
  test('every published treatment, in the doctor\'s order, when it fits', async () => {
    for (const locale of LOCALES) {
      const names = (await getTreatments(locale)).map((t) => t.data.cardTitle);
      const text = treatmentsDescription(locale, names);
      assert.ok(text.length <= DESCRIPTION_MAX, `${locale}: ${text.length} chars`);
      assert.ok(text.includes(clinic.address.locality[locale]), `${locale}: names the town`);
      if (locale !== 'en') for (const name of names) assert.ok(text.includes(name), `${locale}: ${name}`);
    }
  });

  test('a new treatment appears without anyone editing copy', () => {
    assert.ok(treatmentsDescription('he', ['השתלות', 'כתרים']).includes('כתרים'));
  });

  test('a list too long to show falls back to a sentence, never a cut-off list', () => {
    const long = Array.from({ length: 30 }, (_, i) => `Treatment number ${i}`);
    const text = treatmentsDescription('en', long);
    assert.ok(text.length <= DESCRIPTION_MAX);
    assert.ok(!text.includes('Treatment number'));
  });
});

describe('related treatments link where a patient would go next', () => {
  test('every published treatment is linked from at least two others', async () => {
    for (const locale of LOCALES) {
      const all = await getTreatments(locale);
      const inbound = new Map(all.map((t) => [t.data.slug, 0]));
      for (const t of all) for (const r of await getRelated(locale, t.data.slug)) inbound.set(r.data.slug, (inbound.get(r.data.slug) ?? 0) + 1);
      for (const [slug, n] of inbound) assert.ok(n >= 2, `${locale}: ${slug} linked from ${n}`);
    }
  });

  test('clinically adjacent pairs, e.g. an emergency leads to root canal, extraction and fillings', async () => {
    const slugs = (await getRelated('he', 'emergency-dental')).map((t) => t.data.slug);
    assert.deepEqual(slugs, ['root-canal', 'tooth-extraction', 'dental-fillings']);
    assert.ok((await getRelated('he', 'tooth-extraction')).some((t) => t.data.slug === 'dental-implants'));
  });

  test('never itself, never more than asked, and a new treatment still gets three', async () => {
    for (const t of await getTreatments('en')) {
      const related = await getRelated('en', t.data.slug);
      assert.equal(related.length, 3);
      assert.ok(!related.some((r) => r.data.slug === t.data.slug));
    }
    assert.equal((await getRelated('en', 'a-treatment-added-later')).length, 3);
  });
});

describe('the about page is the doctor\'s profile page', () => {
  test('ProfilePage whose main entity is the dentist', () => {
    const graph = buildGraph({ origin: clinic.siteUrl, locale: 'he', pathname: '/he/about/', title: 't', description: 'd', pageType: 'ProfilePage' })['@graph'] as Node[];
    const page = graph.find((n) => String(n['@id']).endsWith('/he/about/#webpage'))!;
    assert.equal(page['@type'], 'ProfilePage');
    assert.deepEqual(page.mainEntity, { '@id': `${clinic.siteUrl}/#dentist` });
  });

  test('other pages stay WebPage', () => {
    const graph = buildGraph({ origin: clinic.siteUrl, locale: 'he', pathname: '/he/faq/', title: 't', description: 'd' })['@graph'] as Node[];
    assert.equal(graph.find((n) => String(n['@id']).endsWith('#webpage'))!['@type'], 'WebPage');
  });
});
