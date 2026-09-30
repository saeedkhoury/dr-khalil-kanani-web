/**
 * The CMS must never commit what the deploy will refuse.
 *
 * 2026-09-26, production: a doctor's-work save contained an invisible
 * RIGHT-TO-LEFT MARK (U+200F) — iPhone Hebrew/Arabic keyboards insert these.
 * The Worker accepted and committed it; the deploy's mixed-script linter
 * refused it; the change sat on main unpublished, and every later save would
 * have failed with it until someone who reads CI logs removed it.
 *
 * The rule now exists once (src/lib/text-hygiene.ts) and runs in both places:
 * the linter, and readJson — the single door every CMS write comes through.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { cleanInvisibles, cleanJsonText, forbiddenScriptIn, SUSPECT_INVISIBLES } from '../../src/lib/text-hygiene.ts';
import { adminRequest, asContents, callAdmin, decodeContent } from '../helpers/admin-api.ts';

const SERVICES_TEXT = readFileSync(new URL('../../src/data/services.json', import.meta.url), 'utf8');
const SERVICES = JSON.parse(SERVICES_TEXT) as Array<{ locales: Record<string, Record<string, string>> }>;
const BLOB = 'a'.repeat(40);
const RLM = '\u200F';

describe('the shared rule', () => {
  test('removes every invisible the linter refuses, and nothing else', () => {
    const all = [...SUSPECT_INVISIBLES.keys()].map((c) => String.fromCodePoint(c)).join('');
    assert.equal(cleanInvisibles(`ש${all}ן`), 'שן');
    assert.equal(cleanInvisibles('Tooth 1003 — ג׳דיידה-מכר'), 'Tooth 1003 — ג׳דיידה-מכר');
  });

  test('finds a look-alike letter from another alphabet, and says which', () => {
    // Cyrillic "к" inside an Arabic word — the real case from authoring.
    assert.deepEqual(forbiddenScriptIn('يمкن'), { script: 'Cyrillic', char: 'к' });
    assert.equal(forbiddenScriptIn('يمكن שלום Hello'), null);
  });
});

describe('image data is not text: the rule never walks a photo upload', () => {
  // 2026-09-30, staging: a 5.6 MB iPhone photo travels as ~7.7 MB of base64.
  // Scanning and copying it for invisible marks pushed the Worker over its
  // resource limit (exceededResources) on the second upload of a batch.
  test('contentBase64 is passed through untouched — the same string, not a copy', () => {
    const base64 = 'A'.repeat(8 * 1024 * 1024);
    const body = { contentBase64: base64, confirmed: true, alt: `x${'\u200F'}` };
    const started = performance.now();
    const cleaned = cleanJsonText(body);
    const elapsed = performance.now() - started;
    assert.ok(cleaned.ok);
    const value = cleaned.value as typeof body;
    assert.equal(value.contentBase64, base64, 'identical string');
    assert.equal(value.alt, 'x', 'text beside it is still cleaned');
    assert.ok(elapsed < 50, `took ${elapsed.toFixed(1)} ms — the image must not be scanned`);
  });
});

describe('a save carrying an invisible mark is cleaned, not refused, and never reaches the repository', () => {
  test('treatment text with U+200F commits without it', async () => {
    const changed = structuredClone(SERVICES);
    changed[0].locales.he.summary = `${RLM}${changed[0].locales.he.summary}${RLM} בדיקה`;
    const { response, calls } = await callAdmin(
      await adminRequest('/api/content/services', { method: 'PUT', body: { value: changed, sha: BLOB } }),
      [asContents(SERVICES_TEXT, BLOB), { status: 200, body: { commit: { sha: 'c1' }, content: { sha: 'b'.repeat(40) } } }],
    );
    assert.equal(response.status, 200);
    const put = calls.find((c) => c.method === 'PUT');
    assert.ok(put, 'the cleaned change is committed');
    const written = decodeContent(put!.body);
    assert.ok(!written.includes(RLM), 'no invisible mark in the committed file');
    assert.ok(written.includes('בדיקה'));
  });
});

describe('a look-alike letter is refused, nothing is written, and the reason is a stable key', () => {
  test('Cyrillic inside Arabic text', async () => {
    const changed = structuredClone(SERVICES);
    changed[0].locales.ar.summary = 'يمкن';
    const { response, calls } = await callAdmin(
      await adminRequest('/api/content/services', { method: 'PUT', body: { value: changed, sha: BLOB } }),
      [asContents(SERVICES_TEXT, BLOB)],
    );
    assert.equal(response.status, 422);
    const body = await response.json() as { error: { code: string; issues: string[] } };
    assert.deepEqual(body.error, { code: 'INVALID', issues: ['mixed_script'] });
    assert.equal(calls.filter((c) => c.method !== 'GET').length, 0, 'nothing is written');
  });
});
