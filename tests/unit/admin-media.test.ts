/**
 * Clinic photography: image inspection, upload validation, filenames, record
 * mutation, and the API routes.
 *
 * The photograph path is the one with a legal dimension to it, so the
 * confirmation gate and the category boundary get the most attention here.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { inspectImage } from '../../workers/admin/src/image.ts';
import {
  addRecord, nextFilename, parseRecords, removeRecord, serialiseRecords, setStatus,
  validateUpload, MAX_IMAGE_BYTES, MIN_LONG_EDGE,
} from '../../workers/admin/src/media.ts';
import { pathFor } from '../../workers/admin/src/github.ts';
import { CMS_CATEGORIES, assertClinicPhotographyShape } from '../../src/lib/data-schema.ts';
import type { ClinicPhotographRecord } from '../../src/data/media-types.ts';

/* ── fixtures built from real images already in the repository ── */
const real = (name: string) => new Uint8Array(readFileSync(new URL(`../../src/assets/images/${name}`, import.meta.url)));
const JPEG = real('work-extraction-01.jpg');   // 890x1600
const PNG = real('illustration-tooth-01.png'); // 1536x1024
const TINY_PNG = new Uint8Array(Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAAAAAA6mKC9AAAAD0lEQVR4nGP4jwYYRrYAAID5/wEokJxdAAAAAElFTkSuQmCC',
  'base64',
)); // Complete 16x16 grayscale PNG, including IDAT and IEND.

const upload = (over: Record<string, unknown> = {}) => ({
  category: 'reception',
  bytes: JPEG,
  altHe: 'אזור ההמתנה במרפאה',
  altAr: 'منطقة الانتظار في العيادة',
  confirmed: true,
  ...over,
});

const issuesOf = (over: Record<string, unknown> = {}, existing: string[] = []): string[] => {
  const result = validateUpload(upload(over) as never, existing);
  assert.equal(result.ok, false, 'expected the upload to be refused');
  return result.ok === false ? result.issues : [];
};

describe('image inspection reads the bytes, not the name', () => {
  test('identifies real JPEG and PNG files from the repository', () => {
    assert.deepEqual(inspectImage(JPEG), { format: 'jpeg', width: 890, height: 1600, extension: 'jpg' });
    assert.deepEqual(inspectImage(PNG), { format: 'png', width: 1536, height: 1024, extension: 'png' });
  });

  test('refuses everything that is not a JPEG or PNG', () => {
    const enc = (s: string) => new TextEncoder().encode(s);
    for (const [label, bytes] of [
      ['SVG', enc('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>')],
      ['HTML', enc('<!doctype html><html><body>hi</body></html>')],
      ['script', enc('#!/bin/sh\nrm -rf /')],
      ['GIF', new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 1, 0, 1, 0])],
      ['WebP', new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50])],
      ['PDF', enc('%PDF-1.7')],
      ['empty', new Uint8Array(0)],
    ] as Array<[string, Uint8Array]>) {
      assert.equal(inspectImage(bytes), null, `accepted ${label}`);
    }
  });

  test('a JPEG magic number with no frame header is refused', () => {
    // Truncated or hand-crafted: the signature alone is not enough.
    assert.equal(inspectImage(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10])), null);
  });

  test('a PNG signature without IHDR is refused', () => {
    const fake = new Uint8Array(32);
    fake.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
    assert.equal(inspectImage(fake), null);
  });

  test('PNG requires complete, bounded chunks, valid CRCs, image data and a final IEND', () => {
    const headerOnly = PNG.subarray(0, 24);
    const ihdrOnly = PNG.subarray(0, 33);
    const truncatedChunk = PNG.subarray(0, 38);
    const oversizedChunk = PNG.slice();
    new DataView(oversizedChunk.buffer).setUint32(33, 0xffffffff, false);
    const missingIend = PNG.subarray(0, PNG.length - 12);
    const corruptCrc = PNG.slice();
    corruptCrc[29] ^= 0xff;
    const noIdat = TINY_PNG.slice();
    noIdat.set(new TextEncoder().encode('tEXt'), 37);
    for (const [label, bytes] of [
      ['header only', headerOnly], ['IHDR only', ihdrOnly],
      ['truncated chunk', truncatedChunk], ['oversized chunk', oversizedChunk],
      ['missing IEND', missingIend], ['bad CRC', corruptCrc], ['missing IDAT', noIdat],
    ] as const) {
      assert.equal(inspectImage(bytes), null, label);
    }
    assert.deepEqual(inspectImage(TINY_PNG), { format: 'png', width: 16, height: 16, extension: 'png' });
  });

  test('JPEG requires bounded segments, scan data and final EOI', () => {
    const badSegmentLength = JPEG.slice();
    badSegmentLength[4] = 0xff;
    badSegmentLength[5] = 0xff;
    const afterFrame = JPEG.subarray(0, JPEG.length - 2);
    for (const [label, bytes] of [
      ['SOI only', JPEG.subarray(0, 2)],
      ['header only', JPEG.subarray(0, 40)],
      ['truncated segment', JPEG.subarray(0, 10)],
      ['bad segment length', badSegmentLength],
      ['missing EOI', afterFrame],
      ['trailing garbage', Uint8Array.from([...JPEG, 1])],
    ] as const) {
      assert.equal(inspectImage(bytes), null, label);
    }
  });

  test('an SVG renamed .jpg is still refused', () => {
    // The extension is the uploader's claim; the bytes are the control.
    const svg = new TextEncoder().encode('<?xml version="1.0"?><svg onload="alert(1)"/>');
    assert.equal(inspectImage(svg), null);
  });
});

describe('upload validation', () => {
  test('accepts a well-formed upload', () => {
    const result = validateUpload(upload() as never, []);
    assert.equal(result.ok, true);
    assert.equal(result.ok && result.record.file, 'reception-01.jpg');
    assert.equal(result.ok && result.record.width, 890);
    assert.equal(result.ok && result.record.height, 1600);
  });

  test('the patient-content confirmation is required server-side', () => {
    // A client-side gate only stops the honest path.
    for (const bad of [false, undefined, null, 'yes', 1, 'true']) {
      assert.ok(issuesOf({ confirmed: bad }).includes('confirmation_required'), `accepted ${bad}`);
    }
  });

  test('both descriptions are required', () => {
    assert.ok(issuesOf({ altHe: '' }).includes('alt_he_required'));
    assert.ok(issuesOf({ altHe: '   ' }).includes('alt_he_required'));
    assert.ok(issuesOf({ altAr: '' }).includes('alt_ar_required'));
    assert.ok(issuesOf({ altAr: undefined }).includes('alt_ar_required'));
  });

  test('English alt is seeded from Arabic and flagged for review', () => {
    const result = validateUpload(upload() as never, []);
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.record.alt.en, result.record.alt.ar);
    assert.equal(result.record.needsEnglishReview, true);
    // An empty alt is never correct for a meaningful image; the flag is the
    // remediation path, not the absence of one.
    assert.notEqual(result.record.alt.en.trim(), '');
  });

  test('a file that is too large is refused', () => {
    const huge = new Uint8Array(MAX_IMAGE_BYTES + 1);
    huge.set(JPEG.subarray(0, 100), 0);
    assert.ok(issuesOf({ bytes: huge }).includes('file_too_large'));
  });

  test('an image below the long-edge minimum is refused', () => {
    assert.equal(inspectImage(TINY_PNG)?.width, 16);
    assert.ok(issuesOf({ bytes: TINY_PNG }).includes('image_too_small'));
  });

  test('the long edge is what counts, not both edges', () => {
    // A tall portrait 890x1600 passes on its height alone.
    assert.ok(Math.min(890, 1600) < MIN_LONG_EDGE);
    assert.equal(validateUpload(upload() as never, []).ok, true);
  });

  test('every issue is a stable machine key', () => {
    for (const issue of issuesOf({ confirmed: false, altHe: '', category: 'nope' })) {
      assert.match(issue, /^[a-z0-9_]+$/, `"${issue}" is not a machine key`);
    }
  });
});

describe('the CMS can never create treatment-work — enforced three ways', () => {
  test('1. structurally: the Worker cannot address media.ts at all', () => {
    // treatmentWork lives inline in src/data/media.ts, which is not a target
    // the path allow-list can express.
    for (const kind of ['media', 'treatmentWork', 'treatment-work']) {
      assert.equal(pathFor({ kind } as never), null);
    }
    // And the only writable manifest is the clinic one.
    assert.equal(pathFor({ kind: 'photography' }), 'src/data/clinic-photography.json');
  });

  test('2. by validation: the category is refused before any record is built', () => {
    assert.ok(issuesOf({ category: 'treatment-work' }).includes('category_not_allowed'));
    for (const bad of ['illustration', 'hero', 'portrait', 'patient', '', null, 7]) {
      assert.ok(issuesOf({ category: bad }).includes('category_not_allowed'), `accepted ${bad}`);
    }
  });

  test('3. by the shared build schema: a forged record would not survive it', () => {
    const forged = [{
      file: 'treatment-work-01.jpg', category: 'treatment-work',
      width: 2400, height: 1600, status: 'published',
      alt: { he: 'x', ar: 'x', en: 'x' },
    }];
    assert.throws(() => assertClinicPhotographyShape(forged, 'forged'), /not one the CMS may write/);
  });

  test('every permitted category is accepted, and only those', () => {
    for (const category of CMS_CATEGORIES) {
      const result = validateUpload(upload({ category }) as never, []);
      assert.equal(result.ok, true, `refused permitted category ${category}`);
    }
    assert.equal(CMS_CATEGORIES.includes('treatment-work' as never), false);
  });
});

describe('filenames are generated, never supplied', () => {
  test('uses the lowest free index for the category', () => {
    assert.equal(nextFilename('reception', [], 'jpg'), 'reception-01.jpg');
    assert.equal(nextFilename('reception', ['reception-01.jpg'], 'jpg'), 'reception-02.jpg');
    assert.equal(nextFilename('reception', ['reception-01.jpg', 'reception-02.jpg'], 'jpg'), 'reception-03.jpg');
  });

  test('reuses a gap left by a deletion', () => {
    // The index is a slot, not an audit trail — git already records history.
    assert.equal(nextFilename('reception', ['reception-01.jpg', 'reception-03.jpg'], 'jpg'), 'reception-02.jpg');
  });

  test('indexes are per category', () => {
    assert.equal(nextFilename('exterior', ['reception-01.jpg'], 'jpg'), 'exterior-01.jpg');
  });

  test('a hyphenated category still yields a valid path', () => {
    const file = nextFilename('treatment-room', [], 'jpg');
    assert.equal(file, 'treatment-room-01.jpg');
    assert.equal(pathFor({ kind: 'image', file: file! }), 'src/assets/images/treatment-room-01.jpg');
  });

  test('the extension comes from the bytes, not the claim', () => {
    const result = validateUpload(upload({ bytes: PNG }) as never, []);
    assert.equal(result.ok && result.record.file, 'reception-01.png');
  });

  test('every generated name passes the repository path allow-list', () => {
    for (const category of CMS_CATEGORIES) {
      for (const ext of ['jpg', 'png'] as const) {
        const file = nextFilename(category, [], ext)!;
        assert.ok(pathFor({ kind: 'image', file }), `${file} was refused by the allow-list`);
      }
    }
  });

  test('a full category is refused rather than overflowing', () => {
    const full = Array.from({ length: 99 }, (_, i) => `reception-${String(i + 1).padStart(2, '0')}.jpg`);
    assert.equal(nextFilename('reception', full, 'jpg'), null);
    assert.deepEqual(issuesOf({}, full), ['category_full']);
  });
});

describe('record mutation', () => {
  const record = (file: string, status: 'published' | 'unpublished' = 'published'): ClinicPhotographRecord => ({
    file, category: 'reception', width: 2400, height: 1600, status,
    alt: { he: 'א', ar: 'ب', en: 'c' },
  });

  test('adding appends, because array order is display order', () => {
    const result = addRecord([record('reception-01.jpg')], record('reception-02.jpg'));
    assert.deepEqual(result?.map((r) => r.file), ['reception-01.jpg', 'reception-02.jpg']);
  });

  test('adding a duplicate filename is refused', () => {
    assert.equal(addRecord([record('reception-01.jpg')], record('reception-01.jpg')), null);
  });

  test('unpublishing keeps the record so it can be reversed', () => {
    const result = setStatus([record('reception-01.jpg')], 'reception-01.jpg', 'unpublished');
    assert.equal(result?.length, 1);
    assert.equal(result?.[0].status, 'unpublished');
  });

  test('status changes do not mutate the input', () => {
    const before = [record('reception-01.jpg')];
    setStatus(before, 'reception-01.jpg', 'unpublished');
    assert.equal(before[0].status, 'published', 'the original array was mutated');
  });

  test('an unknown file is refused', () => {
    assert.equal(setStatus([record('reception-01.jpg')], 'nope.jpg', 'unpublished'), null);
    assert.equal(removeRecord([record('reception-01.jpg')], 'nope.jpg'), null);
  });

  test('a published photograph cannot be deleted', () => {
    // Delete is reachable only from the unpublished state, so a photograph
    // can never be destroyed in a single click.
    assert.equal(removeRecord([record('reception-01.jpg', 'published')], 'reception-01.jpg'), null);
  });

  test('an unpublished photograph can be deleted', () => {
    const result = removeRecord([record('reception-01.jpg', 'unpublished')], 'reception-01.jpg');
    assert.deepEqual(result, []);
  });

  test('zero published photographs is valid', () => {
    // The gallery hides itself when empty; no minimum is enforced.
    const result = setStatus([record('reception-01.jpg')], 'reception-01.jpg', 'unpublished');
    assert.doesNotThrow(() => assertClinicPhotographyShape(result, 'after'));
    assert.equal(result?.filter((r) => r.status === 'published').length, 0);
  });

  test('serialised records round-trip and satisfy the build schema', () => {
    const records = [record('reception-01.jpg'), record('exterior-01.jpg', 'unpublished')];
    const text = serialiseRecords(records);
    assert.ok(text.endsWith('\n'));
    assert.deepEqual(parseRecords(text), records);
    assert.doesNotThrow(() => assertClinicPhotographyShape(JSON.parse(text), 'committed'));
  });

  test('parseRecords refuses a manifest the build would reject', () => {
    assert.equal(parseRecords('{ not json'), null);
    assert.equal(parseRecords('[{"file":"x.jpg"}]'), null);
    assert.equal(parseRecords('[]')?.length, 0);
  });
});

/* ────────────────────────────────────────────────────────────────────────────
   The API routes.

   These prove the EXACT requests that would reach GitHub — repository,
   branch, allowed path, expected SHA, encoded content and sanitised commit
   message — without sending any of them.
   ──────────────────────────────────────────────────────────────────────── */

import {
  adminEnv, adminRequest, asCommit, asContents, callAdmin, decodeContent,
  CONTENT_BRANCH, FAKE_GITHUB_TOKEN, REPO_CONTENTS,
} from '../helpers/admin-api.ts';
import type { Env } from '../../workers/admin/src/http.ts';

const stored = (records: unknown[]) => `${JSON.stringify(records, null, 2)}\n`;

const EXISTING: ClinicPhotographRecord[] = [{
  file: 'reception-01.jpg', category: 'reception', width: 2400, height: 1600,
  status: 'published', alt: { he: 'קבלה', ar: 'استقبال', en: 'Reception' },
}];

const manifestRead = (records: unknown[] = EXISTING, sha = 'manifest-sha-1') =>
  asContents(stored(records), sha);

const uploadBody = (over: Record<string, unknown> = {}) => ({
  category: 'exterior',
  contentBase64: Buffer.from(JPEG).toString('base64'),
  altHe: 'חזית המרפאה',
  altAr: 'واجهة العيادة',
  confirmed: true,
  ...over,
});

describe('GET /api/photos', () => {
  test('returns the records and the manifest sha', async () => {
    const { response, calls } = await callAdmin(await adminRequest('/api/photos'), [manifestRead()]);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true, data: { records: EXISTING, sha: 'manifest-sha-1' } });
    assert.equal(calls[0].url, `${REPO_CONTENTS}/src/data/clinic-photography.json?ref=${CONTENT_BRANCH}`);
  });
});

describe('POST /api/photos — the exact requests that would be sent', () => {
  test('commits the image first, then the manifest referencing it', async () => {
    const { response, calls } = await callAdmin(
      await adminRequest('/api/photos', { method: 'POST', body: uploadBody() }),
      [manifestRead(), { status: 200, body: [] }, asCommit('image-commit'), asCommit('manifest-commit')],
    );

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      ok: true, data: { sha: 'manifest-commit', file: 'exterior-01.jpg' },
    });
    assert.equal(calls.length, 4, 'expected manifest read, inventory read, image write, manifest write');

    const [, inventory, image, manifest] = calls;
    assert.equal(inventory.url, `${REPO_CONTENTS}/src/assets/images?ref=${CONTENT_BRANCH}`);

    // ── the image ──
    assert.equal(image.method, 'PUT');
    assert.equal(image.url, `${REPO_CONTENTS}/src/assets/images/exterior-01.jpg`);
    assert.equal(image.body?.branch, CONTENT_BRANCH);
    assert.notEqual(image.body?.branch, 'main');
    assert.equal(image.body?.sha, undefined, 'a new file is created, not replaced');
    assert.equal(
      image.body?.message,
      'cms(media): add clinic photo exterior-01.jpg\n\nChanged by: doctor@example.test\nPatient-content confirmed: yes\n',
    );
    // The bytes committed are the bytes uploaded, unaltered.
    assert.deepEqual(
      Uint8Array.from(atob(String(image.body?.content)), (c) => c.charCodeAt(0)),
      JPEG,
    );

    // ── the manifest ──
    assert.equal(manifest.url, `${REPO_CONTENTS}/src/data/clinic-photography.json`);
    assert.equal(manifest.body?.sha, 'manifest-sha-1', 'uses the sha it read');
    const written = JSON.parse(decodeContent(manifest.body)) as ClinicPhotographRecord[];
    assert.equal(written.length, 2);
    assert.deepEqual(written[1], {
      file: 'exterior-01.jpg', category: 'exterior', width: 890, height: 1600,
      status: 'published', needsEnglishReview: true,
      alt: { he: 'חזית המרפאה', ar: 'واجهة العيادة', en: 'واجهة العيادة' },
    });
    // And the committed manifest satisfies the build's own schema.
    assert.doesNotThrow(() => assertClinicPhotographyShape(written, 'committed'));
  });

  test('the image is never retried — an append is not idempotent', async () => {
    const { response, calls } = await callAdmin(
      await adminRequest('/api/photos', { method: 'POST', body: uploadBody() }),
      [manifestRead(), { status: 200, body: [] }, { status: 409, body: {} }, asCommit('x')],
    );
    assert.equal(response.status, 409);
    assert.equal(calls.length, 3, 'a retry could double-add the photograph');
  });

  test('the confirmation is required at the route, not just the form', async () => {
    for (const confirmed of [false, undefined, 'yes', 1]) {
      const { response, calls } = await callAdmin(
        await adminRequest('/api/photos', { method: 'POST', body: uploadBody({ confirmed }) }),
        [manifestRead(), asCommit('a'), asCommit('b')],
      );
      assert.equal(response.status, 422, `accepted confirmed=${confirmed}`);
      const body = await response.json() as { error: { issues: string[] } };
      assert.ok(body.error.issues.includes('confirmation_required'));
      assert.equal(calls.length, 1, 'nothing may be committed without the confirmation');
    }
  });

  test('a treatment-work category never reaches GitHub', async () => {
    const { response, calls } = await callAdmin(
      await adminRequest('/api/photos', { method: 'POST', body: uploadBody({ category: 'treatment-work' }) }),
      [manifestRead(), asCommit('a'), asCommit('b')],
    );
    assert.equal(response.status, 422);
    const body = await response.json() as { error: { issues: string[] } };
    assert.ok(body.error.issues.includes('category_not_allowed'));
    assert.equal(calls.length, 1, 'only the manifest read; nothing was written');
  });

  test('an SVG renamed as an upload never reaches GitHub', async () => {
    const svg = Buffer.from('<svg onload="alert(1)"/>').toString('base64');
    const { response, calls } = await callAdmin(
      await adminRequest('/api/photos', { method: 'POST', body: uploadBody({ contentBase64: svg }) }),
      [manifestRead(), asCommit('a')],
    );
    assert.equal(response.status, 422);
    assert.equal(calls.length, 1);
  });

  test('malformed, oversized and undersized images never create GitHub mutations', async () => {
    const cases = [
      ['header-only PNG', PNG.subarray(0, 24)],
      ['truncated JPEG', JPEG.subarray(0, 400)],
      ['oversized JPEG', new Uint8Array(MAX_IMAGE_BYTES + 1)],
      ['undersized PNG', TINY_PNG],
    ] as const;
    for (const [label, bytes] of cases) {
      const { response, calls } = await callAdmin(
        await adminRequest('/api/photos', { method: 'POST', body: uploadBody({ contentBase64: Buffer.from(bytes).toString('base64') }) }),
        [manifestRead()],
      );
      assert.equal(response.status, 422, label);
      assert.ok(calls.every((call) => call.method === 'GET'), `${label} created a mutation`);
    }
  });

  test('content that is not base64 is refused before anything else', async () => {
    const { response, calls } = await callAdmin(
      await adminRequest('/api/photos', { method: 'POST', body: uploadBody({ contentBase64: 'not base64!!' }) }),
      [manifestRead()],
    );
    assert.equal(response.status, 422);
    assert.deepEqual(calls, [], 'a malformed body must not even read the manifest');
  });

  test('a cross-origin upload is refused', async () => {
    const { response, calls } = await callAdmin(
      await adminRequest('/api/photos', { method: 'POST', body: uploadBody(), origin: 'https://evil.test' }),
      [manifestRead()],
    );
    assert.equal(response.status, 403);
    assert.deepEqual(calls, []);
  });

  test('the filename avoids collisions with what is already stored', async () => {
    const { calls } = await callAdmin(
      await adminRequest('/api/photos', { method: 'POST', body: uploadBody({ category: 'reception' }) }),
      [manifestRead(), { status: 200, body: [] }, asCommit('a'), asCommit('b')],
    );
    assert.equal(calls[2].url, `${REPO_CONTENTS}/src/assets/images/reception-02.jpg`);
  });
});

describe('publish / unpublish / delete', () => {
  const unpublished: ClinicPhotographRecord[] = [{ ...EXISTING[0], status: 'unpublished' }];

  test('unpublish flips the status and keeps the record', async () => {
    const { response, calls } = await callAdmin(
      await adminRequest('/api/photos/unpublish', { method: 'POST', body: { file: 'reception-01.jpg' } }),
      [manifestRead(), asCommit('commit-1')],
    );
    assert.equal(response.status, 200);
    const written = JSON.parse(decodeContent(calls[1].body)) as ClinicPhotographRecord[];
    assert.equal(written.length, 1, 'the record stays so it can be reversed');
    assert.equal(written[0].status, 'unpublished');
    assert.equal(
      calls[1].body?.message,
      'cms(media): unpublish clinic photo reception-01.jpg\n\nChanged by: doctor@example.test\n',
    );
  });

  test('publish flips it back', async () => {
    const { calls } = await callAdmin(
      await adminRequest('/api/photos/publish', { method: 'POST', body: { file: 'reception-01.jpg' } }),
      [manifestRead(unpublished), asCommit('c')],
    );
    const written = JSON.parse(decodeContent(calls[1].body)) as ClinicPhotographRecord[];
    assert.equal(written[0].status, 'published');
  });

  test('a published photograph cannot be deleted', async () => {
    // Delete is reachable only from the unpublished state.
    const { response, calls } = await callAdmin(
      await adminRequest('/api/photos/delete', { method: 'POST', body: { file: 'reception-01.jpg' } }),
      [manifestRead(), asCommit('c')],
    );
    assert.equal(response.status, 422);
    const body = await response.json() as { error: { issues: string[] } };
    assert.deepEqual(body.error.issues, ['photo_not_actionable']);
    assert.equal(calls.length, 1, 'nothing was written');
  });

  test('deleting removes the record first, then the file', async () => {
    const { response, calls } = await callAdmin(
      await adminRequest('/api/photos/delete', { method: 'POST', body: { file: 'reception-01.jpg' } }),
      [
        manifestRead(unpublished),
        asCommit('manifest-commit'),
        asContents('binary', 'image-blob-sha'),
        asCommit('image-commit'),
      ],
    );
    assert.equal(response.status, 200);
    assert.equal(calls.length, 4);

    // The reference goes first: an orphan file renders nothing, but a manifest
    // pointing at a deleted file breaks the build for everyone.
    const written = JSON.parse(decodeContent(calls[1].body)) as unknown[];
    assert.deepEqual(written, []);
    assert.equal(calls[3].method, 'DELETE');
    assert.equal(calls[3].url, `${REPO_CONTENTS}/src/assets/images/reception-01.jpg`);
    assert.equal(calls[3].body?.sha, 'image-blob-sha');
    assert.equal(calls[3].body?.branch, CONTENT_BRANCH);
    assert.equal(
      calls[3].body?.message,
      'cms(media): delete clinic photo reception-01.jpg\n\nChanged by: doctor@example.test\n',
    );
  });

  test('a failed file delete still reports the record removal', async () => {
    // The part that matters — the site no longer references it — succeeded.
    const { response } = await callAdmin(
      await adminRequest('/api/photos/delete', { method: 'POST', body: { file: 'reception-01.jpg' } }),
      [manifestRead(unpublished), asCommit('manifest-commit'), { status: 500, body: {} }],
    );
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true, data: { sha: 'manifest-commit', file: 'reception-01.jpg' } });
  });

  test('an unknown file is refused without writing', async () => {
    const { response, calls } = await callAdmin(
      await adminRequest('/api/photos/publish', { method: 'POST', body: { file: 'nope-01.jpg' } }),
      [manifestRead(), asCommit('c')],
    );
    assert.equal(response.status, 422);
    assert.equal(calls.length, 1);
  });

  test('a path-shaped file name is refused without writing', async () => {
    for (const file of ['../../.github/workflows/deploy.yml', 'sub/dir.jpg', '..\\evil.jpg']) {
      const { response, calls } = await callAdmin(
        await adminRequest('/api/photos/delete', { method: 'POST', body: { file } }),
        [manifestRead(), asCommit('c')],
      );
      assert.equal(response.status, 422, `accepted ${file}`);
      assert.equal(calls.length, 1, `${file} caused a write`);
    }
  });

  test('GET is not allowed on the action routes', async () => {
    for (const path of ['/api/photos/publish', '/api/photos/unpublish', '/api/photos/delete']) {
      const { response, calls } = await callAdmin(await adminRequest(path), [manifestRead()]);
      assert.equal(response.status, 405, path);
      assert.deepEqual(calls, []);
    }
  });

  test('the GitHub token never appears in any media response', async () => {
    const cases: Array<[string, unknown]> = [
      ['/api/photos', undefined],
      ['/api/photos/publish', { file: 'reception-01.jpg' }],
    ];
    for (const [path, body] of cases) {
      const { response } = await callAdmin(
        await adminRequest(path, body === undefined ? {} : { method: 'POST', body }),
        [{ status: 401, body: { message: `bad credentials ${FAKE_GITHUB_TOKEN}` } }],
      );
      assert.ok(!(await response.text()).includes(FAKE_GITHUB_TOKEN), path);
    }
  });

  test('an unconfigured deployment refuses every mutation', async () => {
    for (const missing of [{ GITHUB_TOKEN: undefined }, { CONTENT_BRANCH: undefined }]) {
      const { response, calls } = await callAdmin(
        await adminRequest('/api/photos/publish', { method: 'POST', body: { file: 'reception-01.jpg' } }),
        [manifestRead()],
        { ...adminEnv, ...missing } as Env,
      );
      assert.equal(response.status, 503);
      assert.deepEqual(calls, []);
    }
  });
});

for (const [field, claim, issue] of [
  ['altHe', 'מובטח', 'alt_he_claim_guarantee'],
  ['altAr', 'مضمون', 'alt_ar_claim_guarantee'],
  ['altHe', 'guaranteed', 'alt_he_claim_guarantee'],
] as const) {
  test(`claims rejected before any commit: ${field} ${claim}`, async () => {
    const { response, calls } = await callAdmin(
      await adminRequest('/api/photos', { method: 'POST', body: uploadBody({ [field]: claim }) }),
      [manifestRead()],
    );
    assert.equal(response.status, 422);
    assert.ok((await response.json() as { error: { issues: string[] } }).error.issues.includes(issue));
    assert.ok(calls.every((call) => call.method === 'GET'));
  });
}

describe('repository-aware filename allocation [M-1]', () => {
  for (const [names, expected] of [
    [[], 'reception-02.jpg'],
    [['reception-02.jpg'], 'reception-03.jpg'],
    [['reception-02.png', 'reception-03.jpeg', 'reception-04.jpg'], 'reception-05.jpg'],
  ] as [string[], string][]) {
    test(`manifest and orphan slots allocate ${expected}`, async () => {
      const { response, calls } = await callAdmin(
        await adminRequest('/api/photos', { method: 'POST', body: uploadBody({ category: 'reception' }) }),
        [manifestRead(), { status: 200, body: names.map((name) => ({ name })) }, asCommit('a'), asCommit('b')],
      );
      assert.equal(response.status, 200);
      assert.equal(calls[2].url, `${REPO_CONTENTS}/src/assets/images/${expected}`);
      assert.equal(calls[2].body?.sha, undefined, 'must create, never overwrite an orphan');
      assert.equal(calls.filter((c) => c.method === 'DELETE').length, 0);
    });
  }
  test('99 occupied slots fail without any write', async () => {
    const names = Array.from({ length: 99 }, (_, i) => ({ name: `reception-${String(i + 1).padStart(2, '0')}.jpg` }));
    const { response, calls } = await callAdmin(
      await adminRequest('/api/photos', { method: 'POST', body: uploadBody({ category: 'reception' }) }),
      [manifestRead(), { status: 200, body: names }],
    );
    assert.equal(response.status, 422);
    assert.ok(calls.every((c) => c.method === 'GET'));
  });
  test('truncated, malformed and unavailable inventory fails closed', async () => {
    for (const reply of [
      { status: 200, body: Array.from({ length: 1000 }, () => ({ name: 'x' })) },
      { status: 200, body: [{}] }, { status: 200, body: {} }, { status: 503, body: {} },
    ]) {
      const { response, calls } = await callAdmin(
        await adminRequest('/api/photos', { method: 'POST', body: uploadBody() }),
        [manifestRead(), reply],
      );
      assert.equal(response.status, 502);
      assert.ok(calls.every((c) => c.method === 'GET'));
    }
  });
});
