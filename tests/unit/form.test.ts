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
import { blockingClaims, withoutBeforeAfterDescriptor } from '../../src/lib/claims.ts';
import {
  treatmentWork,
  treatmentWorkRecords,
  clinicPhotography,
  clinicPhotographyRecords,
  illustrations,
  portrait,
  heroImage,
  galleryFor,
  hasTreatmentWork,
  hasClinicPhotography,
  hasPortrait,
  hasHeroImage,
} from '../../src/data/media.ts';

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
  test('the doctor\'s work is the published subset of its records, with no invented portrait', () => {
    // Since ADR 0010 the owner edits this collection, so the test states what
    // must stay true after any edit — not how many images there are today.
    assert.deepEqual(
      treatmentWork.map((a) => a.file),
      treatmentWorkRecords.filter((r) => r.status === 'published').map((r) => r.file),
    );
    assert.equal(hasTreatmentWork(), treatmentWork.length > 0);
    // No duplicate filenames or ids, which is how a skipped duplicate would resurface.
    const files = treatmentWorkRecords.map((a) => a.file);
    assert.equal(new Set(files).size, files.length, 'duplicate file registered');
    const ids = treatmentWorkRecords.map((a) => a.id);
    assert.equal(new Set(ids).size, ids.length, 'duplicate id');
    // Rendered assets carry no CMS bookkeeping.
    for (const asset of treatmentWork) assert.ok(!('status' in asset) && !('id' in asset), `${asset.file} leaks CMS fields`);
    assert.equal(portrait, null);
    assert.equal(hasPortrait(), false);
  });

  test('hero is unset and clinic photography borrows nothing — nothing is invented', () => {
    // Treatment-result images must never be borrowed to fill these. How many
    // clinic photographs exist is the owner's business (the CMS writes them);
    // that none of them is a treatment case is this test's.
    assert.equal(heroImage, null);
    assert.equal(hasHeroImage(), false);
    assert.equal(hasClinicPhotography(), clinicPhotography.length > 0);
    const workFiles = new Set(treatmentWorkRecords.map((r) => r.file));
    for (const asset of clinicPhotographyRecords) assert.ok(!workFiles.has(asset.file), `${asset.file} is in both collections`);
  });

  test('clinicPhotography is the published subset of the records', () => {
    // Unpublishing is reversible: the record stays in the manifest and is
    // filtered out on read. Every consumer reads this export, so a photograph
    // the owner took down cannot reach a page by accident.
    assert.deepEqual(
      clinicPhotography,
      clinicPhotographyRecords.filter((r) => r.status === 'published'),
    );
    for (const asset of clinicPhotography) {
      const record = clinicPhotographyRecords.find((r) => r.file === asset.file);
      assert.equal(record?.status, 'published', `${asset.file} is rendered but not published`);
    }
  });

  test('the collections are disjoint by category', () => {
    // The type system prevents the mistake at compile time; this catches a
    // cast or a JSON import that slips past it at runtime.
    const CLINIC = new Set([
      'exterior', 'reception', 'treatment-room', 'equipment',
      'doctor-working', 'team', 'atmosphere',
    ]);
    for (const asset of treatmentWork) {
      assert.equal(asset.category, 'treatment-work', `${asset.file} is not a treatment case`);
      assert.ok(!CLINIC.has(asset.category), `${asset.file} leaked into clinic categories`);
    }
    for (const asset of clinicPhotography) {
      assert.ok(CLINIC.has(asset.category), `${asset.file} is not a clinic category`);
    }
    for (const asset of illustrations) {
      assert.equal(asset.category, 'illustration');
    }
  });

  test('galleryFor returns the named collection and nothing else', () => {
    // The whole point of the explicit API: asking for the clinic gallery can
    // never hand back treatment-result photographs.
    assert.deepEqual(galleryFor('work'), treatmentWork);
    assert.deepEqual(galleryFor('clinic'), clinicPhotography);
    assert.deepEqual(galleryFor('illustrations'), illustrations);

    const clinic = galleryFor('clinic');
    assert.ok(
      !clinic.some((a) => a.category === 'treatment-work'),
      'a treatment case reached the clinic gallery',
    );
  });

  test('the gallery component cannot infer its kind from contents', async () => {
    // Regression guard for the design decision itself. If someone reinstates
    // inference, treatment images silently become clinic photography again.
    const { readFile } = await import('node:fs/promises');
    const src = await readFile(
      new URL('../../src/components/sections/ClinicGallery.astro', import.meta.url),
      'utf8',
    );
    assert.match(src, /kind: GalleryKind/, 'kind must be a required prop');
    assert.match(src, /const assets = galleryFor\(kind\)/);
    assert.ok(
      !/\.some\(\s*\(?\s*asset\s*\)?\s*=>\s*asset\.category/.test(src),
      'gallery kind must not be inferred from asset categories',
    );
  });

  test('every registered asset would carry alt text in all three locales', () => {
    for (const asset of [...treatmentWork, ...clinicPhotography, ...illustrations]) {
      for (const locale of ['he', 'ar', 'en'] as const) {
        assert.ok(
          asset.alt?.[locale]?.trim().length > 0,
          `${asset.file} is missing ${locale} alt text`,
        );
      }
      assert.ok(asset.width > 0 && asset.height > 0, `${asset.file} needs intrinsic dimensions`);
    }
  });

  test('every treatment photo records how it was approved', () => {
    // Two approval routes with different evidence behind them. An Instagram
    // match can be re-checked against a public post; an owner-supplied file
    // cannot, so it is recorded as such rather than implied to be verified.
    // NEITHER route establishes patient consent or legal review — see
    // docs/decisions/0009-owner-directed-instagram-gallery.md.
    const instagramSourced = new Map([
      ['work-veneers-01.jpg', 'https://www.instagram.com/p/DdJ042BMJUu/'],
      ['work-cleaning-01.jpg', 'https://www.instagram.com/p/DdWvC8csM-6/'],
      ['work-cleaning-02.jpg', 'https://www.instagram.com/p/Da8QjY7MiIP/'],
    ]);
    for (const asset of treatmentWork) {
      assert.equal(asset.category, 'treatment-work');
      assert.ok(
        asset.provenance === 'instagram-post' || asset.provenance === 'owner-supplied',
        `${asset.file}: must record its approval route`,
      );
      if (asset.provenance === 'instagram-post') {
        assert.ok(instagramSourced.has(asset.file), `${asset.file}: claims an Instagram source but is not in the reviewed set`);
        assert.equal(asset.sourcePostUrl, instagramSourced.get(asset.file));
      } else {
        // An owner-supplied file must NOT claim a source post it never had.
        assert.equal(asset.sourcePostUrl, undefined, `${asset.file}: owner-supplied assets carry no source post`);
      }
    }
  });

  test('doctor\'s-work text passes the same claims gate the Worker applies', () => {
    // The images carry marketing text in their pixels, including outcome
    // claims. Those must not become site copy. The Worker refuses a save that
    // breaks these rules, so CI checks exactly the same thing — a stricter
    // private rule here would let the CMS commit what CI then rejects,
    // blocking the public deploy.
    for (const asset of treatmentWorkRecords) {
      for (const text of [...Object.values(asset.alt), ...Object.values(asset.caption ?? {})]) {
        assert.deepEqual(blockingClaims(withoutBeforeAfterDescriptor(text)), [], `${asset.file}: "${text}"`);
      }
    }
  });
});
