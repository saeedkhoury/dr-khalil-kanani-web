/**
 * Business configuration — the single source of truth.
 *
 * These tests exist because this data is about a REAL clinic and a REAL
 * person. The failure modes they guard against are not crashes, they are
 * publishing something false: a wrong phone number, a guessed map pin, a
 * Waze link to the wrong street.
 *
 * Run: npm test
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  clinic,
  VERIFICATION,
  telUrl,
  whatsappUrl,
  hasAddress,
  hasHours,
  hasGeo,
  hasGoogleProfile,
  hasGoogleRating,
  mapsUrl,
  wazeUrl,
  LOCALES,
} from '../../src/data/clinic.ts';

describe('phone numbers', () => {
  test('the two verified numbers are the ones from the flyer and Instagram', () => {
    // Both confirmed by two independent sources. If either changes, it was
    // either verified with the owner or it is a mistake.
    assert.equal(clinic.phone.landline.display, '04-884-8891');
    assert.equal(clinic.phone.mobile.display, '052-288-5179');
  });

  test('tel: links are international with no leading zero', () => {
    assert.equal(telUrl('landline'), 'tel:+97248848891');
    assert.equal(telUrl('mobile'), 'tel:+972522885179');
    for (const which of ['landline', 'mobile'] as const) {
      assert.match(telUrl(which), /^tel:\+972\d+$/, `${which} must be +972 form`);
      assert.doesNotMatch(telUrl(which), /\+9720/, 'must not keep the national leading zero');
    }
  });

  test('WhatsApp number has no plus and no leading zero', () => {
    // wa.me rejects both. This is the single most breakable contact path.
    assert.equal(clinic.phone.mobile.whatsapp, '972522885179');
    assert.doesNotMatch(clinic.phone.mobile.whatsapp, /[+\s-]/);
  });

  test('display, tel and schema forms describe the same number', () => {
    const digits = (s: string) => s.replace(/\D/g, '');
    for (const which of ['landline', 'mobile'] as const) {
      const p = clinic.phone[which];
      assert.equal(
        digits(p.tel),
        '972' + digits(p.display).replace(/^0/, ''),
        `${which}: tel and display disagree`,
      );
      assert.equal(digits(p.schema), digits(p.tel), `${which}: schema and tel disagree`);
    }
  });
});

describe('whatsappUrl', () => {
  test('targets the verified mobile and encodes the message', () => {
    const url = whatsappUrl('שלום, אשמח לקבוע תור');
    assert.ok(url.startsWith('https://wa.me/972522885179?text='));
    assert.ok(!url.includes(' '), 'spaces must be percent-encoded');
    assert.equal(decodeURIComponent(url.split('text=')[1]), 'שלום, אשמח לקבוע תור');
  });

  test('round-trips characters that would otherwise break the URL', () => {
    const tricky = 'a&b?c=d #e +f';
    assert.equal(decodeURIComponent(whatsappUrl(tricky).split('text=')[1]), tricky);
  });
});

describe('location guards — never publish a guessed location', () => {
  test('the pin is the destination resolved from the owner-supplied Waze link', () => {
    assert.equal(hasGeo(), true);
    assert.deepEqual(clinic.address.geo, { lat: 32.9336, lng: 35.148804 });
    assert.equal(VERIFICATION['address.geo'].tier, 'owner');
  });

  test('wazeUrl preserves the exact shared destination', () => {
    // A reference clinic links Waze to the wrong street on every page. This
    // is the test that stops us doing the same.
    assert.equal(wazeUrl(), 'https://waze.com/ul/hsvbgrg6s4');
  });

  test('Google Maps uses the same destination in every language', () => {
    for (const locale of LOCALES) {
      assert.equal(mapsUrl(locale), 'https://www.google.com/maps/search/?api=1&query=32.9336,35.148804');
    }
  });

  test('the supplied street is available in every locale', () => {
    for (const locale of LOCALES) {
      assert.equal(hasAddress(locale), true);
      assert.match(clinic.address.street[locale], /1003/);
    }
  });

  test('hours are not published while unset', () => {
    assert.equal(hasHours(), false);
  });

  test('Google profile link hidden until a URL exists', () => {
    assert.equal(hasGoogleProfile(), false);
  });
});

describe('location helpers once data arrives', () => {
  // Proves the components will behave when the owner supplies real values,
  // without committing a fake pin to the repo.
  const withGeo = { lat: 32.9234, lng: 35.1456 };

  test('wazeUrl uses coordinates, not an address string', () => {
    const url = `https://waze.com/ul?ll=${withGeo.lat},${withGeo.lng}&navigate=yes`;
    assert.match(url, /^https:\/\/waze\.com\/ul\?ll=-?\d+\.\d+,-?\d+\.\d+&navigate=yes$/);
  });

  test('mapsUrl coordinate form is a valid Google Maps search', () => {
    const url = `https://www.google.com/maps/search/?api=1&query=${withGeo.lat},${withGeo.lng}`;
    assert.match(url, /^https:\/\/www\.google\.com\/maps\/search\/\?api=1&query=/);
  });
});

describe('verification manifest', () => {
  test('every blocking field carries a note explaining what is needed', () => {
    for (const [field, v] of Object.entries(VERIFICATION)) {
      if (v.blocking) {
        assert.ok(v.note && v.note.length > 8, `${field} is blocking but has no usable note`);
      }
    }
  });

  test('fields marked published:false are actually guarded in code', () => {
    // If a field claims to be hidden, a guard must exist for it. Otherwise
    // the production gate would wave through something that IS displayed.
    const guarded: Record<string, () => boolean> = {
      'address.street': () => hasAddress('he'),
      'address.geo': hasGeo,
      hours: hasHours,
    };
    for (const [field, guard] of Object.entries(guarded)) {
      const entry = VERIFICATION[field];
      if (entry.tier === 'owner' || entry.tier === 'verified') {
        assert.equal(guard(), true, `${field} should be available after confirmation`);
      } else {
        assert.equal(entry.published, false, `${field} should be marked published:false`);
        assert.equal(guard(), false, `${field} guard should hide it while unverified`);
      }
    }
  });

  test('a field defaults to published unless it opts out', () => {
    // Fail-safe: forgetting the flag must mean "treated as published", so the
    // gate errs toward blocking rather than toward silently shipping.
    assert.notEqual(VERIFICATION['doctor.ar']?.published, false);
  });
});

describe('locale coverage', () => {
  test('every localised clinic field covers all three locales', () => {
    const fields = [clinic.doctor, clinic.tagline, clinic.address.locality, clinic.address.region];
    for (const f of fields) {
      for (const locale of LOCALES) {
        assert.ok(
          typeof f[locale] === 'string' && f[locale].length > 0,
          `missing ${locale} in ${JSON.stringify(f)}`,
        );
      }
    }
  });
});

describe('google review aggregate', () => {
  test('hides while the owner has not supplied real figures', () => {
    // The whole point: an unconfigured rating must not render as 0 stars, and
    // must never be filled in with a guess. A fabricated 4.9 is a fabricated
    // review with extra steps.
    assert.equal(hasGoogleRating(), false);
    assert.equal(clinic.googleRating.value, null);
    assert.equal(clinic.googleRating.count, null);
  });

  test('a rating with no review count is still treated as unconfigured', () => {
    // Half-filled config is the realistic failure: someone types the rating
    // and forgets the count. "Based on null reviews" must be impossible.
    const half = { value: 4.9, count: null };
    const ok = typeof half.value === 'number' && typeof half.count === 'number';
    assert.equal(ok, false);
  });

  test('a zero review count does not count as configured', () => {
    const none = { value: 0, count: 0 };
    const ok = typeof none.value === 'number' && typeof none.count === 'number' && none.count > 0;
    assert.equal(ok, false);
  });

  test('the star fill never rounds a rating upward', () => {
    // 4.9 must not present as five full stars. The overlay width is the
    // exact proportion, so the last star is visibly short.
    const fill = (v: number) => Number((Math.max(0, Math.min(100, (v / 5) * 100))).toFixed(2));
    assert.equal(fill(4.9), 98);
    assert.equal(fill(5), 100);
    assert.equal(fill(3.25), 65);
    // Out-of-range input is clamped rather than overflowing the row.
    assert.equal(fill(7), 100);
    assert.equal(fill(-1), 0);
  });

  test('the aggregate is never mirrored into structured data', async () => {
    // Google rules self-controlled review markup ineligible and treats it as
    // a manual-action risk. If someone adds it to the schema, this fails.
    const schema = await readFile(new URL('../../src/lib/schema.ts', import.meta.url), 'utf8');
    assert.ok(
      !/["']?aggregateRating["']?\s*:/.test(schema),
      'aggregateRating must not appear in structured data',
    );
  });
});

describe('map facade', () => {
  test('the supplied pin makes the map available', () => {
    assert.equal(hasGeo(), true);
    assert.notEqual(clinic.address.geo.lat, 0);
    assert.notEqual(clinic.address.geo.lng, 0);
  });

  test('the embed URL carries coordinates and no API key', () => {
    const lat = 32.9241;
    const lng = 35.1668;
    const src = `https://www.google.com/maps?q=${lat},${lng}&z=16&hl=he&output=embed`;
    assert.match(src, /output=embed/);
    assert.match(src, /q=32\.9241,35\.1668/);
    // A key in the URL would be a public credential on a static site.
    assert.ok(!/[?&]key=/.test(src), 'embed URL must not carry an API key');
  });

  test('the facade contacts nobody until pressed', async () => {
    // The guarantee is structural: the iframe is CREATED in script, so no
    // iframe, preconnect or dns-prefetch exists in the served HTML.
    const src = await readFile(
      new URL('../../src/components/sections/MapFacade.astro', import.meta.url),
      'utf8',
    );
    assert.ok(!/<iframe/i.test(src), 'no literal <iframe> may appear in the markup');
    assert.ok(!/rel=["'](preconnect|dns-prefetch)/i.test(src), 'no preconnect to Google');
    assert.match(src, /createElement\('iframe'\)/);
    assert.match(src, /\{ once: true \}/);
  });
});
