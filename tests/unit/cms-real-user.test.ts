/**
 * Failures found by using the deployed admin as the doctor would, each pinned
 * so it cannot come back:
 *
 * - saving again in the same dialog was refused (stale blob SHA);
 * - "save" with nothing changed made a commit and said "saved";
 * - a validation failure said only "content_invalid";
 * - a new treatment could not be saved until thirty fields in three languages
 *   were complete;
 * - a photograph's descriptions could not be edited after upload.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { describeRecord } from '../../workers/admin/src/media.ts';
import { servicesSchema, faqSchema } from '../../src/lib/managed-schema.ts';
import type { ClinicPhotographRecord } from '../../src/data/media-types.ts';
import { adminRequest, asCommit, asContents, callAdmin, decodeContent } from '../helpers/admin-api.ts';

const SERVICES_TEXT = readFileSync(new URL('../../src/data/services.json', import.meta.url), 'utf8');
const SERVICES = JSON.parse(SERVICES_TEXT) as Array<Record<string, unknown> & { locales: Record<string, Record<string, unknown>> }>;
const WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  .map((day, i) => ({ day, opens: i < 5 ? '09:00' : '', closes: i < 5 ? '17:00' : '', closed: i >= 5 }));
const HOURS_TEXT = `${JSON.stringify(WEEK, null, 2)}\n`;
const BLOB = 'a'.repeat(40);

const photo = (over: Partial<ClinicPhotographRecord> = {}): ClinicPhotographRecord => ({
  file: 'reception-01.jpg', category: 'reception', width: 2400, height: 1600, status: 'unpublished',
  alt: { he: 'קבלה', ar: 'استقبال', en: 'Reception' }, ...over,
});

describe('saving twice in one sitting', () => {
  test('a content save returns the new blob, so the next save is not a conflict', async () => {
    const changed = structuredClone(SERVICES);
    changed[0].locales.he.summary = `${changed[0].locales.he.summary} `.trim() + '.';
    const { response } = await callAdmin(
      await adminRequest('/api/content/services', { method: 'PUT', body: { value: changed, sha: BLOB } }),
      [asContents(SERVICES_TEXT, BLOB), { status: 200, body: { commit: { sha: 'c1' }, content: { sha: 'b'.repeat(40) } } }],
    );
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true, data: { sha: 'c1', blob: 'b'.repeat(40) } });
  });
});

describe('nothing changed means no commit', () => {
  test('content', async () => {
    const { response, calls } = await callAdmin(
      await adminRequest('/api/content/services', { method: 'PUT', body: { value: SERVICES, sha: BLOB } }),
      [asContents(SERVICES_TEXT, BLOB), asCommit('should-not-happen')],
    );
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true, data: { sha: null, blob: BLOB, unchanged: true } });
    assert.equal(calls.filter((c) => c.method === 'PUT').length, 0);
  });

  test('hours', async () => {
    const { response, calls } = await callAdmin(
      await adminRequest('/api/hours', { method: 'PUT', body: { rows: JSON.parse(HOURS_TEXT), sha: BLOB } }),
      [asContents(HOURS_TEXT, BLOB), asCommit('should-not-happen')],
    );
    assert.equal(response.status, 200);
    assert.equal((await response.json() as { data: { unchanged: boolean } }).data.unchanged, true);
    assert.equal(calls.filter((c) => c.method === 'PUT').length, 0);
  });

  test('photo order', async () => {
    const records = [photo(), photo({ file: 'reception-02.jpg' })];
    const { response, calls } = await callAdmin(
      await adminRequest('/api/photos/order', { method: 'POST', body: { files: ['reception-01.jpg', 'reception-02.jpg'] } }),
      [asContents(`${JSON.stringify(records, null, 2)}\n`, BLOB), asCommit('should-not-happen')],
    );
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true, data: { sha: null, unchanged: true } });
    assert.equal(calls.filter((c) => c.method === 'PUT').length, 0);
  });
});

describe('a validation failure says where', () => {
  test('the path names the item, the language and the field', async () => {
    const broken = structuredClone(SERVICES);
    broken[2].locales.en.title = '';
    const { response, calls } = await callAdmin(
      await adminRequest('/api/content/services', { method: 'PUT', body: { value: broken, sha: BLOB } }),
      [asContents(SERVICES_TEXT, BLOB), asCommit('should-not-happen')],
    );
    assert.equal(response.status, 422);
    const body = await response.json() as { error: { issues: string[] } };
    assert.ok(body.error.issues.includes('2.locales.en.title:too_small'), body.error.issues.join(', '));
    assert.equal(calls.filter((c) => c.method === 'PUT').length, 0);
  });

  test('issue paths are schema paths, never text the caller sent', async () => {
    const broken = structuredClone(SERVICES) as unknown[];
    broken.push({ '<img src=x onerror=alert(1)>': 1 });
    const { response } = await callAdmin(
      await adminRequest('/api/content/services', { method: 'PUT', body: { value: broken, sha: BLOB } }),
      [asContents(SERVICES_TEXT, BLOB)],
    );
    const body = await response.json() as { error: { issues: string[] } };
    for (const issue of body.error.issues) assert.match(issue, /^[A-Za-z0-9_.-]*:[a-z_]+$/, issue);
  });
});

describe('drafts', () => {
  const draft = () => ({
    id: 'service-new', slug: 'service-new', status: 'unpublished', tier: 2, order: 8, icon: 'aesthetic',
    locales: Object.fromEntries(['he', 'ar', 'en'].map((l) => [l, {
      title: l === 'he' ? 'טיפול חדש' : '', cardTitle: '', summary: '', candidacy: [], process: [], expect: [], faq: [], seoDescription: '',
    }])),
  });

  test('an unpublished treatment may be saved with only its Hebrew title', () => {
    assert.doesNotThrow(() => servicesSchema.parse([...SERVICES, draft()]));
  });

  test('the same item cannot be published until it is complete', () => {
    assert.throws(() => servicesSchema.parse([...SERVICES, { ...draft(), status: 'published' }]));
  });

  test('drafts keep the length limits', () => {
    const long = draft();
    long.locales.he.title = 'x'.repeat(121);
    assert.throws(() => servicesSchema.parse([...SERVICES, long]));
  });

  test('an FAQ draft may lack translations; a published one may not', () => {
    const q = { id: 'faq-new', order: 9, q: { he: 'שאלה', ar: '', en: '' }, a: { he: '', ar: '', en: '' } };
    assert.doesNotThrow(() => faqSchema.parse([{ ...q, status: 'unpublished' }]));
    assert.throws(() => faqSchema.parse([{ ...q, status: 'published' }]));
  });
});

describe('editing a photograph’s descriptions', () => {
  test('rewrites the three descriptions and clears the English-review flag', () => {
    const result = describeRecord([photo({ needsEnglishReview: true })], 'reception-01.jpg', {
      altHe: 'דלפק הקבלה', altAr: 'مكتب الاستقبال', altEn: 'The reception desk',
    });
    assert.equal(result.ok && !result.unchanged, true);
    const [record] = result.ok && !result.unchanged ? result.records : [];
    assert.deepEqual(record.alt, { he: 'דלפק הקבלה', ar: 'مكتب الاستقبال', en: 'The reception desk' });
    assert.equal('needsEnglishReview' in record, false);
  });

  test('applies the upload rules', () => {
    const result = describeRecord([photo()], 'reception-01.jpg', { altHe: '', altAr: 'x', altEn: 'שלום' });
    assert.equal(result.ok, false);
    assert.deepEqual(result.ok === false && result.issues.sort(), ['alt_en_not_english', 'alt_he_required']);
  });

  test('POST /api/photos/describe commits the manifest with a fixed message', async () => {
    const { response, calls } = await callAdmin(
      await adminRequest('/api/photos/describe', {
        method: 'POST', body: { file: 'reception-01.jpg', altHe: 'דלפק', altAr: 'مكتب', altEn: 'Desk' },
      }),
      [asContents(`${JSON.stringify([photo()], null, 2)}\n`, BLOB), asCommit('describe-commit')],
    );
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true, data: { sha: 'describe-commit', file: 'reception-01.jpg' } });
    assert.equal(calls[1].body?.message, 'cms(media): describe clinic photo reception-01.jpg\n\nChanged by: CMS admin\n');
    assert.equal(calls[1].body?.sha, BLOB);
    const written = JSON.parse(decodeContent(calls[1].body)) as ClinicPhotographRecord[];
    assert.deepEqual(written[0].alt, { he: 'דלפק', ar: 'مكتب', en: 'Desk' });
  });

  test('an unknown photograph is refused without writing', async () => {
    const { response, calls } = await callAdmin(
      await adminRequest('/api/photos/describe', {
        method: 'POST', body: { file: 'nope-01.jpg', altHe: 'א', altAr: 'ب', altEn: 'c' },
      }),
      [asContents(`${JSON.stringify([photo()], null, 2)}\n`, BLOB), asCommit('x')],
    );
    assert.equal(response.status, 422);
    assert.equal(calls.length, 1);
  });

  test('describing requires the admin origin', async () => {
    const { response, calls } = await callAdmin(
      await adminRequest('/api/photos/describe', {
        method: 'POST', origin: 'https://evil.example', body: { file: 'reception-01.jpg', altHe: 'א', altAr: 'ب', altEn: 'c' },
      }),
      [asCommit('x')],
    );
    assert.equal(response.status, 403);
    assert.deepEqual(calls, []);
  });
});
