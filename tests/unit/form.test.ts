/**
 * Form input validation and the media manifest.
 *
 * The phone regex is the gate on the site's only conversion path. If it
 * wrongly rejects a real Israeli number, a patient cannot reach the clinic.
 * If it wrongly accepts, the dentist gets an unreachable lead.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { IL_PHONE, normalisePhone, isValidIsraeliPhone } from '../../src/lib/phone.ts';
import { CONTACT_METHODS, DAYPARTS } from '../../src/lib/form-options.ts';
import { gallery, portrait, hasGallery, hasPortrait } from '../../src/data/media.ts';

describe('normalisePhone', () => {
  test('strips the separators people actually type', () => {
    assert.equal(normalisePhone('052-288-5179'), '0522885179');
    assert.equal(normalisePhone('052 288 5179'), '0522885179');
    assert.equal(normalisePhone('(052) 288-5179'), '0522885179');
    assert.equal(normalisePhone('04-884.8891'), '048848891');
  });

  test('keeps the leading plus for international form', () => {
    assert.equal(normalisePhone('+972 52 288 5179'), '+972522885179');
  });
});

describe('Israeli phone validation', () => {
  const valid = [
    '0522885179',      // mobile 05X
    '052-288-5179',    // mobile with separators
    '+972522885179',   // international mobile
    '048848891',       // landline 04
    '04-884-8891',     // landline with separators
    '+97248848891',    // international landline
    '021234567',       // Jerusalem 02
    '031234567',       // Tel Aviv 03
    '086241234',       // 08
    '097654321',       // 09
    '0771234567',      // VoIP 07X
    '0512885179',      // 051 IS an allocated Israeli mobile prefix
  ];

  const invalid = [
    '',
    '12345',
    '05228851',        // mobile one digit short
    '05228851799',     // mobile one digit long
    '+1234567890',     // not Israeli
    'not a phone',
    '00000000000',
    '0022885179',      // 00 is not a valid area code
  ];

  for (const n of valid) {
    test(`accepts ${n}`, () => {
      assert.equal(isValidIsraeliPhone(n), true, `${n} should be valid`);
    });
  }

  for (const n of invalid) {
    test(`rejects ${JSON.stringify(n)}`, () => {
      assert.equal(isValidIsraeliPhone(n), false, `${n} should be invalid`);
    });
  }

  test('the exported regex expects an already-normalised string', () => {
    // The raw pattern must not be applied to user input directly — that is
    // what normalisePhone is for, and forgetting it is an easy mistake.
    assert.equal(IL_PHONE.test('052-288-5179'), false);
    assert.equal(IL_PHONE.test(normalisePhone('052-288-5179')), true);
  });

  test('the clinic’s own numbers validate', () => {
    // If this ever fails, the site is rejecting the clinic's real numbers.
    assert.equal(isValidIsraeliPhone('04-884-8891'), true);
    assert.equal(isValidIsraeliPhone('052-288-5179'), true);
  });
});

describe('form options', () => {
  test('contact methods match what the WhatsApp message can express', () => {
    assert.deepEqual([...CONTACT_METHODS], ['phone', 'whatsapp']);
  });

  test('dayparts include a flexible option so the field is never forced', () => {
    assert.ok(DAYPARTS.includes('any'));
    assert.deepEqual([...DAYPARTS], ['morning', 'afternoon', 'evening', 'any']);
  });

  test('no option label hints at clinical detail', () => {
    // A field inviting symptoms would turn an enquiry into especially
    // sensitive medical information under Amendment 13.
    const clinical = /pain|symptom|diagnos|כאב|תסמין|ألم|عرض/i;
    for (const v of [...CONTACT_METHODS, ...DAYPARTS]) {
      assert.doesNotMatch(v, clinical, `option "${v}" is clinical`);
    }
  });
});

describe('media manifest', () => {
  test('is empty — no clinic photography has been supplied and approved', () => {
    // This test is expected to CHANGE when real photos arrive. It exists so
    // that populating the gallery is a deliberate act with a visible diff.
    assert.equal(gallery.length, 0);
    assert.equal(hasGallery(), false);
    assert.equal(portrait, null);
    assert.equal(hasPortrait(), false);
  });

  test('every registered asset would carry alt text in all three locales', () => {
    for (const asset of gallery) {
      for (const locale of ['he', 'ar', 'en'] as const) {
        assert.ok(
          asset.alt?.[locale]?.trim().length > 0,
          `${asset.file} is missing ${locale} alt text`,
        );
      }
      assert.ok(asset.width > 0 && asset.height > 0, `${asset.file} needs intrinsic dimensions`);
    }
  });

  test('no asset may be categorised as patient material', () => {
    // The category union has no patient/before-after member by design; this
    // asserts nobody widened it.
    const allowed = [
      'exterior', 'reception', 'treatment-room', 'equipment', 'doctor', 'team', 'atmosphere',
    ];
    for (const asset of gallery) {
      assert.ok(allowed.includes(asset.category), `${asset.file}: illegal category`);
    }
  });
});
