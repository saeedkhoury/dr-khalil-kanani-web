/**
 * The doctor's work as a CMS-managed collection (ADR 0010): the stored shape,
 * the lossless migration, and the one claims allowance its subject needs.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { assertTreatmentWorkShape, assertClinicPhotographyShape } from '../../src/lib/data-schema.ts';
import { blockingClaims, withoutBeforeAfterDescriptor } from '../../src/lib/claims.ts';
import { treatmentWork, treatmentWorkRecords } from '../../src/data/media.ts';

const ALT = { he: 'פרסום של המרפאה', ar: 'منشور للعيادة', en: 'Clinic post' };
const work = (over: Record<string, unknown> = {}) => ({
  id: 'work-01', file: 'work-01.jpg', category: 'treatment-work', width: 1254, height: 1254,
  status: 'published', provenance: 'owner-supplied', alt: { ...ALT }, ...over,
});
const problems = (records: unknown[]) => {
  try { assertTreatmentWorkShape(records, 't'); return ''; } catch (e) { return String((e as Error).message); }
};

describe('the stored shape', () => {
  test('a complete record, with or without a title, is valid', () => {
    assert.equal(problems([work(), work({ id: 'work-02', file: 'work-02.jpg', caption: { he: 'ציפויים', ar: 'قشور', en: 'Veneers' } })]), '');
  });
  test('refuses what the CMS must never write', () => {
    const cases: Array<[Record<string, unknown>, RegExp]> = [
      [{ category: 'reception' }, /"category" must be "treatment-work"/],
      [{ file: 'reception-01.jpg' }, /must start with "work-"/],
      [{ file: '../work-01.jpg' }, /bare filename/],
      [{ file: 'work-01.svg' }, /must end in/],
      [{ status: 'draft' }, /"status" is required/],
      [{ id: 'Work 01' }, /"id" must be lowercase/],
      [{ alt: { he: 'x', ar: '', en: 'x' } }, /"alt.ar" is required/],
      [{ caption: { he: 'x' } }, /"caption.ar" is required/],
      [{ frame: { x: 1, y: 1, zoom: 1 } }, /unknown field "frame"/],
      [{ sourcePostUrl: 'https://www.instagram.com/p/abc/' }, /only an instagram-post may carry/],
      [{ provenance: 'instagram-post', sourcePostUrl: 'https://evil.example/' }, /Instagram post URL/],
      [{ width: 0 }, /"width" must be a positive integer/],
    ];
    for (const [over, pattern] of cases) assert.match(problems([work(over)]), pattern, JSON.stringify(over));
  });
  test('ids and files are unique', () => {
    assert.match(problems([work(), work({ file: 'work-02.jpg' })]), /id "work-01" is used more than once/);
    assert.match(problems([work(), work({ id: 'work-02' })]), /"work-01.jpg" is registered more than once/);
  });
  test('the two galleries never share a file', () => {
    assert.throws(() => assertClinicPhotographyShape([{
      file: 'work-01.jpg', category: 'reception', width: 1, height: 1, status: 'published', alt: ALT,
    }], 't'), /doctor's-work file/);
  });
});

describe('the migration', () => {
  test('the stored file is valid and every record was published when migrated', () => {
    const raw = JSON.parse(readFileSync(new URL('../../src/data/treatment-work.json', import.meta.url), 'utf8'));
    assert.doesNotThrow(() => assertTreatmentWorkShape(raw));
    // What renders is exactly the published records, in stored order.
    assert.deepEqual(treatmentWork.map((a) => a.file), treatmentWorkRecords.filter((r) => r.status === 'published').map((r) => r.file));
  });
});

describe('the before/after descriptor allowance', () => {
  test('removes only the plain descriptor', () => {
    for (const text of ['labelled before and after', 'מסומנות לפני ואחרי', 'موسومة بقبل وبعد']) {
      assert.ok(blockingClaims(text).some((f) => f.rule === 'patient-identity'), `rule no longer fires on "${text}"`);
      assert.deepEqual(blockingClaims(withoutBeforeAfterDescriptor(text)), [], text);
    }
  });
  test('every other rule still applies to the same text', () => {
    for (const text of ['before and after — guaranteed results', 'patient testimonial, before & after', 'לפני ואחרי — מובטח']) {
      assert.notDeepEqual(blockingClaims(withoutBeforeAfterDescriptor(text)), [], text);
    }
  });
});
