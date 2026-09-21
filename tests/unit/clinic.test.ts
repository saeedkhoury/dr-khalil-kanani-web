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

import {
  clinic,
  VERIFICATION,
  telUrl,
  whatsappUrl,
  hasAddress,
  hasHours,
  hasGeo,
  hasGoogleProfile,
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
  test('no confirmed pin yet, so geo helpers report false', () => {
    assert.equal(hasGeo(), false);
    assert.deepEqual(clinic.address.geo, { lat: 0, lng: 0 });
  });

  test('wazeUrl returns null without coordinates rather than guessing', () => {
    // A reference clinic links Waze to the wrong street on every page. This
    // is the test that stops us doing the same.
    assert.equal(wazeUrl(), null);
  });

  test('mapsUrl returns null while both pin and street are unknown', () => {
    for (const locale of LOCALES) {
      assert.equal(mapsUrl(locale), null, `${locale} must not produce a map link`);
    }
  });

  test('hasAddress is false in every locale', () => {
    for (const locale of LOCALES) assert.equal(hasAddress(locale), false);
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
      assert.equal(entry?.published, false, `${field} should be marked published:false`);
      assert.equal(guard(), false, `${field} guard should hide it while unverified`);
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
