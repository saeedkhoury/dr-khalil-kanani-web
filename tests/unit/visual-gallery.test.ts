/**
 * Gallery editing: reordering, replacement, multi-upload and the drag
 * affordance that drives them.
 *
 * Array order IS display order, so a reorder is a content change like any
 * other — validated, committed, and tracked by SHA. These prove the exact
 * request that would reach GitHub without sending it.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { reorderRecords, validateReplacement } from '../../workers/admin/src/media.ts';
import { VISUAL_CLIENT, VISUAL_STYLES } from '../../workers/admin/src/ui/visual.ts';
import { assertClinicPhotographyShape } from '../../src/lib/data-schema.ts';
import type { ClinicPhotographRecord } from '../../src/data/media-types.ts';
import {
  adminRequest, asCommit, asContents, callAdmin, decodeContent, REPO_CONTENTS, CONTENT_BRANCH,
} from '../helpers/admin-api.ts';

const JPEG = new Uint8Array(readFileSync(new URL('../../src/assets/images/work-extraction-01.jpg', import.meta.url)));
const PNG = new Uint8Array(readFileSync(new URL('../../src/assets/images/illustration-tooth-01.png', import.meta.url)));

const photo = (file: string, status: 'published' | 'unpublished' = 'published'): ClinicPhotographRecord => ({
  file, category: 'reception', width: 2400, height: 1600, status,
  alt: { he: 'קבלה', ar: 'استقبال', en: 'Reception' },
});

const THREE = [photo('reception-01.jpg'), photo('reception-02.jpg'), photo('exterior-01.jpg', 'unpublished')];
const stored = (r: unknown[]) => asContents(`${JSON.stringify(r, null, 2)}\n`, 'manifest-sha');

describe('reordering the gallery', () => {
  test('applies a permutation of exactly what is stored', () => {
    const next = reorderRecords(THREE, ['exterior-01.jpg', 'reception-01.jpg', 'reception-02.jpg']);
    assert.deepEqual(next?.map((r) => r.file), ['exterior-01.jpg', 'reception-01.jpg', 'reception-02.jpg']);
    // Records are carried intact — a reorder changes position, nothing else.
    assert.equal(next?.[0].status, 'unpublished');
    assert.doesNotThrow(() => assertClinicPhotographyShape(next, 'reordered'));
  });

  test('refuses a stale list rather than dropping or duplicating a photograph', () => {
    // Every one of these means the browser was working from an old gallery.
    assert.equal(reorderRecords(THREE, ['reception-01.jpg', 'reception-02.jpg']), null, 'missing one');
    assert.equal(reorderRecords(THREE, [...THREE.map((r) => r.file), 'extra-01.jpg']), null, 'extra one');
    assert.equal(reorderRecords(THREE, ['reception-01.jpg', 'reception-01.jpg', 'exterior-01.jpg']), null, 'duplicate');
    assert.equal(reorderRecords(THREE, ['reception-01.jpg', 'reception-02.jpg', 'nope-01.jpg']), null, 'unknown');
    assert.equal(reorderRecords(THREE, []), null, 'empty');
  });

  test('an unchanged order is accepted and is a no-op', () => {
    const next = reorderRecords(THREE, THREE.map((r) => r.file));
    assert.deepEqual(next, [...THREE]);
  });

  test('POST /api/photos/order writes the manifest and nothing else', async () => {
    const { response, calls } = await callAdmin(
      await adminRequest('/api/photos/order', {
        method: 'POST', body: { files: ['exterior-01.jpg', 'reception-01.jpg', 'reception-02.jpg'] },
      }),
      [stored(THREE), asCommit('order-commit')],
    );
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true, data: { sha: 'order-commit' } });
    assert.equal(calls.length, 2, 'read then one write');

    const put = calls[1];
    assert.equal(put.url, `${REPO_CONTENTS}/src/data/clinic-photography.json`);
    assert.equal(put.body?.branch, CONTENT_BRANCH);
    assert.notEqual(put.body?.branch, 'main');
    assert.equal(put.body?.sha, 'manifest-sha', 'uses the sha it read');
    assert.equal(put.body?.message, 'cms(media): reorder clinic photos\n\nChanged by: doctor@example.test\n');
    assert.deepEqual(
      (JSON.parse(decodeContent(put.body)) as ClinicPhotographRecord[]).map((r) => r.file),
      ['exterior-01.jpg', 'reception-01.jpg', 'reception-02.jpg'],
    );
  });

  test('a stale order is refused without writing', async () => {
    const { response, calls } = await callAdmin(
      await adminRequest('/api/photos/order', { method: 'POST', body: { files: ['reception-01.jpg'] } }),
      [stored(THREE), asCommit('x')],
    );
    assert.equal(response.status, 422);
    assert.deepEqual((await response.json() as { error: { issues: string[] } }).error.issues, ['order_stale']);
    assert.equal(calls.length, 1, 'only the manifest read');
  });

  test('a non-array or non-string payload never reaches GitHub', async () => {
    for (const files of ['nope', 42, null, [1, 2], [{}]]) {
      const { response, calls } = await callAdmin(
        await adminRequest('/api/photos/order', { method: 'POST', body: { files } }),
        [stored(THREE), asCommit('x')],
      );
      assert.equal(response.status, 422, JSON.stringify(files));
      assert.deepEqual(calls, []);
    }
  });

  test('a cross-origin reorder is refused', async () => {
    const { response, calls } = await callAdmin(
      await adminRequest('/api/photos/order', {
        method: 'POST', body: { files: [] }, origin: 'https://evil.test',
      }),
      [stored(THREE)],
    );
    assert.equal(response.status, 403);
    assert.deepEqual(calls, []);
  });
});

describe('replacing a photograph', () => {
  test('keeps identity and position, updates only the pixels', () => {
    const result = validateReplacement(THREE, 'reception-01.jpg', JPEG);
    assert.equal(result.ok, true);
    if (!result.ok) return;
    const replaced = result.records[0];
    assert.equal(replaced.file, 'reception-01.jpg', 'same slot');
    assert.equal(replaced.status, 'published', 'status preserved');
    assert.deepEqual(replaced.alt, THREE[0].alt, 'alt text preserved');
    assert.equal(replaced.width, 890, 'dimensions from the new bytes');
    assert.equal(replaced.height, 1600);
    assert.deepEqual(result.records.map((r) => r.file), THREE.map((r) => r.file), 'order preserved');
  });

  test('refuses a format that does not match the filename', () => {
    // PNG bytes at a .jpg path would be served with the wrong content type.
    const result = validateReplacement(THREE, 'reception-01.jpg', PNG);
    assert.equal(result.ok, false);
    assert.deepEqual(result.ok === false && result.issues, ['format_must_match']);
  });

  test('applies the same validation an upload gets', () => {
    const svg = new TextEncoder().encode('<svg onload="alert(1)"/>');
    assert.deepEqual(
      (validateReplacement(THREE, 'reception-01.jpg', svg) as { issues: string[] }).issues,
      ['unsupported_format'],
    );
    assert.deepEqual(
      (validateReplacement(THREE, 'reception-01.jpg', new Uint8Array(0)) as { issues: string[] }).issues,
      ['file_required'],
    );
    assert.deepEqual(
      (validateReplacement(THREE, 'nope-01.jpg', JPEG) as { issues: string[] }).issues,
      ['photo_not_actionable'],
    );
  });

  test('POST /api/photos/replace commits the image then the manifest', async () => {
    const { response, calls } = await callAdmin(
      await adminRequest('/api/photos/replace', {
        method: 'POST',
        body: { file: 'reception-01.jpg', contentBase64: Buffer.from(JPEG).toString('base64') },
      }),
      [stored(THREE), asContents('old-bytes', 'image-blob-sha'), asCommit('image-commit'), asCommit('manifest-commit')],
    );
    assert.equal(response.status, 200);
    assert.equal(calls.length, 4, 'manifest read, image read, image write, manifest write');

    const image = calls[2];
    assert.equal(image.url, `${REPO_CONTENTS}/src/assets/images/reception-01.jpg`);
    assert.equal(image.body?.sha, 'image-blob-sha', 'replaces a known blob, not blind');
    assert.equal(
      image.body?.message,
      'cms(media): replace clinic photo reception-01.jpg\n\nChanged by: doctor@example.test\nPatient-content confirmed: yes\n',
    );
    assert.deepEqual(Uint8Array.from(atob(String(image.body?.content)), (c) => c.charCodeAt(0)), JPEG);

    const manifest = JSON.parse(decodeContent(calls[3].body)) as ClinicPhotographRecord[];
    assert.equal(manifest[0].width, 890);
    assert.doesNotThrow(() => assertClinicPhotographyShape(manifest, 'committed'));
  });

  test('a mismatched format is refused before any write', async () => {
    const { response, calls } = await callAdmin(
      await adminRequest('/api/photos/replace', {
        method: 'POST',
        body: { file: 'reception-01.jpg', contentBase64: Buffer.from(PNG).toString('base64') },
      }),
      [stored(THREE), asCommit('x')],
    );
    assert.equal(response.status, 422);
    assert.equal(calls.length, 1);
  });

  test('a path-shaped file is refused without writing', async () => {
    for (const file of ['../../.github/workflows/deploy.yml', 'sub/dir.jpg']) {
      const { response, calls } = await callAdmin(
        await adminRequest('/api/photos/replace', {
          method: 'POST', body: { file, contentBase64: Buffer.from(JPEG).toString('base64') },
        }),
        [stored(THREE), asCommit('x')],
      );
      assert.equal(response.status, 422, file);
      assert.equal(calls.length, 1, file);
    }
  });
});

describe('serving a photograph to the editor', () => {
  test('GET /api/photo returns the bytes for an unpublished file', async () => {
    const { response, calls } = await callAdmin(
      await adminRequest('/api/photo?file=exterior-01.jpg'), [asContents('rawbytes', 'blob')],
    );
    assert.equal(response.status, 200);
    assert.match(response.headers.get('Content-Type') ?? '', /^image\/jpeg/);
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
    assert.match(calls[0].url, /\/contents\/src\/assets\/images\/exterior-01\.jpg\?ref=/);
  });

  test('png is served as png', async () => {
    const { response } = await callAdmin(
      await adminRequest('/api/photo?file=reception-01.png'), [asContents('x', 'blob')],
    );
    assert.match(response.headers.get('Content-Type') ?? '', /^image\/png/);
  });

  test('a path-shaped or missing file never reaches GitHub', async () => {
    for (const q of ['', '?file=', '?file=../../secrets.yml', '?file=sub/dir.jpg', '?file=x.svg']) {
      const { response, calls } = await callAdmin(
        await adminRequest(`/api/photo${q}`), [asContents('x', 'b')],
      );
      assert.equal(response.status, 400, q);
      assert.deepEqual(calls, [], q);
    }
  });

  test('it requires authentication like everything else', async () => {
    const { response, calls } = await callAdmin(
      new Request('https://admin.drkhalilkanani.test/api/photo?file=reception-01.jpg'),
      [asContents('x', 'b')],
    );
    assert.equal(response.status, 401);
    assert.deepEqual(calls, []);
  });
});

describe('the drag affordance', () => {
  test('reordering is by pointer events, so it works on a phone', () => {
    // HTML5 drag-and-drop never fires on touch, and the doctor reorders his
    // gallery on a phone.
    assert.match(VISUAL_CLIENT, /pointerdown/);
    assert.match(VISUAL_CLIENT, /pointermove/);
    assert.match(VISUAL_CLIENT, /pointerup/);
    assert.match(VISUAL_CLIENT, /setPointerCapture/);
    assert.doesNotMatch(VISUAL_CLIENT, /\bdragstart\b|\bdragover\b/);
  });

  test('every sortable list keeps its keyboard alternative', () => {
    // Dragging is unavailable to anyone on a keyboard or a screen reader, so
    // the buttons are the same feature offered a second way — not a fallback.
    const ups = VISUAL_CLIENT.match(/'למעלה'/g) ?? [];
    const downs = VISUAL_CLIENT.match(/'למטה'/g) ?? [];
    assert.ok(ups.length >= 2, `expected Up on several lists, found ${ups.length}`);
    assert.equal(ups.length, downs.length, 'every Up needs a Down');
    // The grip itself is hidden from assistive tech; the buttons carry the names.
    assert.match(VISUAL_CLIENT, /handle\.setAttribute\('aria-hidden','true'\)/);
  });

  test('the three orderable collections are all wired to it', () => {
    const wired = VISUAL_CLIENT.match(/sortable\(/g) ?? [];
    // definition + faq + services + photos
    assert.ok(wired.length >= 4, `sortable used ${wired.length} times`);
  });

  test('touch scrolling is not hijacked outside the grip', () => {
    assert.match(VISUAL_STYLES, /\.visual-sortable\{touch-action:pan-y\}/);
    assert.match(VISUAL_STYLES, /\.visual-grip\{[^}]*touch-action:none/);
  });
});

describe('edit mode, preview and unsaved work', () => {
  test('preview hides every control without a reload', () => {
    assert.match(VISUAL_STYLES, /html\[data-visual-preview\] \.visual-edit-control\{display:none!important\}/);
    assert.match(VISUAL_CLIENT, /data-visual-preview/);
    assert.match(VISUAL_CLIENT, /aria-pressed/);
  });

  test('closing with unsaved edits asks first', () => {
    assert.match(VISUAL_CLIENT, /if \(dirty && !confirm\(/);
    assert.match(VISUAL_CLIENT, /beforeunload/);
  });

  test('saving clears the unsaved flag', () => {
    assert.match(VISUAL_CLIENT, /dirty=false;tell\('נשמר ב-commit/);
  });

  test('publication status survives closing the dialog', () => {
    assert.match(VISUAL_CLIENT, /visual-bar-status/);
    assert.match(VISUAL_CLIENT, /barTell/);
  });

  test('a commit is never announced as published', () => {
    // "saved" and "published on the site" are different sentences.
    assert.match(VISUAL_CLIENT, /עדיין לא פורסם/);
    assert.match(VISUAL_CLIENT, /'פורסם באתר','published'/);
  });
});
