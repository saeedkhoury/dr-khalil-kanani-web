/**
 * Search foundations that must hold no matter what the CMS writes.
 *
 * The live site's structured data named example.invalid for weeks because
 * the graph read a placeholder origin instead of the page's own; these tests
 * pin the fix and the rules around it. The full crawl of the built site is
 * `npm run lint:seo` (scripts/audit-seo.mjs), run in CI before every deploy.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { buildGraph, LOGO_PATH, serializeGraph } from '../../src/lib/schema.ts';
import { inLocality, seoTitle } from '../../src/lib/seo.ts';
import { clinic, confirmedDoctorNames, GOOGLE_BUSINESS_PROFILE, LOCALES, VERIFICATION } from '../../src/data/clinic.ts';

const ORIGIN = 'https://www.drkhalilkanani.com';
type Node = Record<string, unknown>;
const graphOf = (locale: (typeof LOCALES)[number], origin = ORIGIN) =>
  buildGraph({ origin, locale, pathname: `/${locale}/treatments/dental-implants/`, title: 't', description: 'd' })['@graph'] as Node[];
const urlsIn = (value: unknown): string[] => JSON.stringify(value).match(/https?:\/\/[^"\s]+/g) ?? [];

describe('structured data', () => {
  test('every URL and @id is on the origin it was given — nothing else', () => {
    for (const locale of LOCALES) {
      for (const url of urlsIn(graphOf(locale))) {
        const host = new URL(url).hostname;
        // schema.org appears once opening hours exist (dayOfWeek values).
        assert.ok(['www.drkhalilkanani.com', 'www.google.com', 'www.instagram.com', 'schema.org', 'www.facebook.com', 'facebook.com', 'maps.app.goo.gl'].includes(host), `${locale}: ${url}`);
      }
    }
    assert.ok(urlsIn(graphOf('he', 'https://preview.invalid')).some((u) => u.startsWith('https://preview.invalid/')));
  });

  test('the production origin is the real domain, not a placeholder', () => {
    assert.equal(clinic.siteUrl, ORIGIN);
  });

  test('the clinic is ONE entity: same @id and url in every language', () => {
    const clinics = LOCALES.map((l) => graphOf(l).find((n) => n['@type'] === 'Dentist')!);
    assert.equal(new Set(clinics.map((c) => c['@id'])).size, 1);
    assert.equal(new Set(clinics.map((c) => c.url)).size, 1);
  });

  test('the clinic carries the Business Profile name exactly; the descriptive form is an alternate', () => {
    const dentist = graphOf('he').find((n) => n['@type'] === 'Dentist')!;
    assert.equal(dentist.name, clinic.doctor.he);
    assert.equal((dentist.alternateName as string[])[0], `${clinic.doctor.he} — ${clinic.tagline.he}`);
  });

  // 2026-10-01: "Dr Khalil Kanani" in Google showed a Beirut doctor's panel.
  // The Business Profile is named in Hebrew only; every language version must
  // say that the clinic and the doctor answer to each CONFIRMED spelling.
  test('clinic and doctor carry every confirmed spelling of the name in every language', () => {
    for (const locale of LOCALES) {
      const graph = graphOf(locale);
      for (const type of ['Dentist', 'Person']) {
        const node = graph.find((n) => n['@type'] === type)!;
        const names = [node.name, ...((node.alternateName as string[]) ?? [])];
        for (const confirmed of confirmedDoctorNames()) assert.ok(names.includes(confirmed), `${locale} ${type}: ${confirmed}`);
        assert.equal(new Set(names).size, names.length, `${locale} ${type}: duplicate names`);
      }
    }
  });

  test('a spelling still awaiting the owner is never repeated as an alternate name', () => {
    const pending = (['he', 'ar', 'en'] as const).filter((l) => !['verified', 'owner'].includes(VERIFICATION[`doctor.${l}`].tier));
    for (const l of pending) {
      for (const locale of LOCALES.filter((x) => x !== l)) {
        for (const type of ['Dentist', 'Person']) {
          const node = graphOf(locale).find((n) => n['@type'] === type)!;
          assert.ok(!((node.alternateName as string[]) ?? []).includes(clinic.doctor[l]), `${locale} ${type} repeats unconfirmed ${l}`);
        }
      }
    }
  });

  test('the clinic points at its own Google Business Profile, the same in every language', () => {
    for (const locale of LOCALES) {
      const dentist = graphOf(locale).find((n) => n['@type'] === 'Dentist')!;
      assert.ok((dentist.sameAs as string[]).includes(GOOGLE_BUSINESS_PROFILE), locale);
      assert.equal(dentist.hasMap, GOOGLE_BUSINESS_PROFILE, locale);
    }
  });

  test('the clinic is located in Israel', () => {
    for (const locale of LOCALES) {
      const dentist = graphOf(locale).find((n) => n['@type'] === 'Dentist')!;
      assert.equal((dentist.address as Node).addressCountry, 'IL');
    }
  });

  test('languages sit on properties schema.org defines for them', () => {
    const dentist = graphOf('ar').find((n) => n['@type'] === 'Dentist')!;
    assert.equal('availableLanguage' in dentist, false, 'not a Dentist property');
    assert.deepEqual(dentist.knowsLanguage, ['he', 'ar', 'en']);
    assert.deepEqual((dentist.contactPoint as Node).availableLanguage, ['he', 'ar', 'en']);
    assert.equal((dentist.contactPoint as Node).telephone, dentist.telephone);
  });

  test('the logo is a raster image Google accepts (≥112px, not SVG)', () => {
    const dentist = graphOf('en').find((n) => n['@type'] === 'Dentist')!;
    const logo = dentist.logo as Node;
    assert.equal(logo.url, `${ORIGIN}${LOGO_PATH}`);
    assert.ok(!String(logo.url).endsWith('.svg'));
    assert.ok(Number(logo.width) >= 112 && Number(logo.height) >= 112);
  });

  test('never self-serving reviews, ratings, prices or FAQ markup', () => {
    for (const locale of LOCALES) {
      const text = JSON.stringify(graphOf(locale));
      for (const banned of ['aggregateRating', '"review"', 'priceRange', 'FAQPage', 'Review']) {
        assert.ok(!text.includes(banned), `${locale}: ${banned}`);
      }
    }
  });

  test('the clinic lists exactly the treatments it publishes, and a treatment page is about its own', () => {
    const services = [{ slug: 'dental-implants', name: 'Dental implants' }, { slug: 'veneers', name: 'Veneers' }];
    const graph = buildGraph({ origin: ORIGIN, locale: 'en', pathname: '/en/treatments/veneers/', title: 't', description: 'd', services })['@graph'] as Node[];
    const dentist = graph.find((n) => n['@type'] === 'Dentist')!;
    const offered = ((dentist.hasOfferCatalog as Node).itemListElement as Node[]).map((o) => o.itemOffered as Node);
    assert.deepEqual(offered.map((o) => o.name), ['Dental implants', 'Veneers']);
    assert.equal(offered[1]['@id'], `${ORIGIN}/en/treatments/veneers/#service`);
    assert.deepEqual(offered[1].provider, { '@id': `${ORIGIN}/#clinic` });
    const page = graph.find((n) => n['@type'] === 'WebPage')!;
    assert.deepEqual(page.mainEntity, { '@id': `${ORIGIN}/en/treatments/veneers/#service` });
    const home = buildGraph({ origin: ORIGIN, locale: 'en', pathname: '/en/', title: 't', description: 'd', services })['@graph'] as Node[];
    assert.equal('mainEntity' in home.find((n) => n['@type'] === 'WebPage')!, false);
  });

  test('official profiles: only confirmed https links, never an empty or guessed one', () => {
    const dentist = graphOf('he').find((n) => n['@type'] === 'Dentist')!;
    const sameAs = dentist.sameAs as string[];
    assert.ok(sameAs.includes(clinic.social.instagram));
    for (const url of sameAs) assert.match(url, /^https:\/\/\S+$/);
    assert.equal(sameAs.includes(''), false);
  });

  test('CMS text cannot close the JSON-LD <script> element', () => {
    const graph = buildGraph({ origin: ORIGIN, locale: 'en', pathname: '/en/', title: '</script><script>alert(1)</script>', description: 'd' });
    const out = serializeGraph(graph);
    assert.ok(!out.includes('</script'), out);
    assert.deepEqual(JSON.parse(out), graph, 'still the same data to a JSON parser');
  });

  test('opening hours are emitted only when the owner has supplied them', () => {
    const dentist = graphOf('he').find((n) => n['@type'] === 'Dentist')!;
    const hasHours = clinic.hours.some((h) => !h.closed && h.opens && h.closes);
    assert.equal('openingHoursSpecification' in dentist, hasHours);
  });
});

describe('page titles', () => {
  test('name the clinic’s town once, in each language’s grammar', () => {
    assert.equal(inLocality('he', 'השתלות שיניים'), `השתלות שיניים ב${clinic.address.locality.he}`);
    assert.equal(inLocality('ar', 'زراعة الأسنان'), `زراعة الأسنان في ${clinic.address.locality.ar}`);
    assert.equal(inLocality('en', 'Dental implants'), `Dental implants in ${clinic.address.locality.en}`);
    const once = inLocality('en', inLocality('en', 'Veneers'));
    assert.equal(once.split(clinic.address.locality.en).length - 1, 1);
  });

  test('an owner-written SEO title wins over the pattern', () => {
    assert.equal(seoTitle.treatment('en', 'Veneers', 'Custom title'), 'Custom title');
    assert.equal(seoTitle.treatment('en', 'Veneers'), `Veneers in ${clinic.address.locality.en}`);
  });

  test('stay within what search results show (≈60 characters) for every language', () => {
    for (const locale of LOCALES) {
      for (const title of [seoTitle.treatments(locale), seoTitle.contact(locale)]) {
        assert.ok(title.length <= 60, `${locale}: ${title} (${title.length})`);
      }
    }
  });
});
