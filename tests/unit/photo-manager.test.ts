/**
 * The photo manager's server side: framing, the whole-gallery save plan, image
 * staging and the ONE atomic commit a save becomes.
 *
 * These prove the exact requests that would reach GitHub without sending
 * them: which paths, which blobs, which parent, and that the branch is moved
 * fast-forward only.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { frameProblems, assertClinicPhotographyShape } from '../../src/lib/data-schema.ts';
import { planPhotoSave, type DesiredPhoto } from '../../workers/admin/src/media.ts';
import { inspectImage } from '../../workers/admin/src/image.ts';
import type { ClinicPhotographRecord } from '../../src/data/media-types.ts';
import { adminEnv, adminRequest, asContents, callAdmin, CONTENT_BRANCH, type Reply } from '../helpers/admin-api.ts';

const JPEG = new Uint8Array(readFileSync(new URL('../../src/assets/images/work-extraction-01.jpg', import.meta.url)));
const ALT = { he: 'חדר הטיפולים', ar: 'غرفة العلاج', en: 'Treatment room' };
const BLOB_A = 'a'.repeat(40);
const HEAD = '1'.repeat(40);
const TREE = '2'.repeat(40);
const NEW_TREE = '3'.repeat(40);
const NEW_COMMIT = '4'.repeat(40);
const GIT = 'https://api.github.com/repos/saeedkhoury/dr-khalil-kanani-web/git';

const photo = (file: string, status: 'published' | 'unpublished' = 'published'): ClinicPhotographRecord => ({
  file, category: 'reception', width: 2400, height: 1600, status, alt: { ...ALT },
});
const keep = (r: ClinicPhotographRecord, extra: Partial<DesiredPhoto> = {}): DesiredPhoto => ({
  file: r.file, status: r.status, alt: { ...r.alt }, ...extra,
});
const CURRENT = [photo('reception-01.jpg'), photo('reception-02.jpg'), photo('exterior-01.jpg', 'unpublished')];
const IMAGE = { blob: BLOB_A, width: 2400, height: 1600, extension: 'jpg' as const };

describe('framing', () => {
  test('accepts exactly three finite numbers in range, or nothing', () => {
    assert.deepEqual(frameProblems(undefined), []);
    assert.deepEqual(frameProblems({ x: 0, y: 100, zoom: 1 }), []);
    assert.deepEqual(frameProblems({ x: 37.5, y: 62.25, zoom: 3 }), []);
  });
  test('refuses anything that could become arbitrary CSS', () => {
    for (const bad of [
      null, 'center', [], { x: '50%', y: 50, zoom: 1 }, { x: 50, y: 50, zoom: 1, rotate: 5 },
      { x: -1, y: 50, zoom: 1 }, { x: 50, y: 101, zoom: 1 }, { x: 50, y: 50, zoom: 0.5 },
      { x: 50, y: 50, zoom: 3.01 }, { x: Number.NaN, y: 50, zoom: 1 }, { x: 50, y: 50 },
      { x: 50, y: 50, zoom: Infinity },
    ]) assert.notDeepEqual(frameProblems(bad), [], JSON.stringify(bad));
  });
  test('the build schema enforces the same rule', () => {
    assert.doesNotThrow(() => assertClinicPhotographyShape([{ ...photo('reception-01.jpg'), frame: { x: 20, y: 80, zoom: 1.5 } }], 't'));
    assert.throws(() => assertClinicPhotographyShape([{ ...photo('reception-01.jpg'), frame: { x: 20, y: 80, zoom: 9 } }], 't'));
  });
});

describe('planning a gallery save', () => {
  test('reorder, framing, words and visibility in one plan, records intact', () => {
    const plan = planPhotoSave(CURRENT, [
      keep(CURRENT[2], { status: 'published', frame: { x: 12.345, y: 70, zoom: 1.256 } }),
      keep(CURRENT[0], { alt: { ...ALT, en: 'Reception desk' } }),
      keep(CURRENT[1], { status: 'unpublished' }),
    ], [], undefined);
    assert.ok(plan.ok);
    assert.deepEqual(plan.records.map((r) => r.file), ['exterior-01.jpg', 'reception-01.jpg', 'reception-02.jpg']);
    assert.deepEqual(plan.records[0].frame, { x: 12.35, y: 70, zoom: 1.26 });
    assert.equal(plan.records[0].status, 'published');
    assert.equal(plan.records[1].alt.en, 'Reception desk');
    assert.equal(plan.records[2].status, 'unpublished');
    assert.equal(plan.records[0].category, CURRENT[2].category);
    assert.deepEqual(plan.puts, []);
    assert.deepEqual(plan.deletes, []);
    assert.equal(plan.unchanged, false);
  });
  test('an identical gallery is unchanged', () => {
    const plan = planPhotoSave(CURRENT, CURRENT.map((r) => keep(r)), [], undefined);
    assert.ok(plan.ok && plan.unchanged);
  });
  test('a new photograph gets a fresh name in its category and needs the confirmation', () => {
    const desired = [...CURRENT.map((r) => keep(r)), { category: 'reception', image: IMAGE, status: 'unpublished', alt: ALT } as DesiredPhoto];
    const refused = planPhotoSave(CURRENT, desired, ['reception-03.jpg'], undefined);
    assert.ok(!refused.ok && refused.issues.includes('confirmation_required'));
    const plan = planPhotoSave(CURRENT, desired, ['reception-03.jpg'], true);
    assert.ok(plan.ok);
    assert.equal(plan.records[3].file, 'reception-04.jpg');
    assert.deepEqual(plan.puts, [{ file: 'reception-04.jpg', blob: BLOB_A }]);
    assert.equal(plan.addsImages, true);
  });
  test('a replacement keeps name and position and must keep its format', () => {
    const ok = planPhotoSave(CURRENT, [keep(CURRENT[0], { image: { ...IMAGE, width: 3000, height: 2000 } }), keep(CURRENT[1]), keep(CURRENT[2])], [], true);
    assert.ok(ok.ok);
    assert.equal(ok.records[0].file, 'reception-01.jpg');
    assert.equal(ok.records[0].width, 3000);
    assert.deepEqual(ok.puts, [{ file: 'reception-01.jpg', blob: BLOB_A }]);
    const png = planPhotoSave(CURRENT, [keep(CURRENT[0], { image: { ...IMAGE, extension: 'png' } }), keep(CURRENT[1]), keep(CURRENT[2])], [], true);
    assert.ok(!png.ok && png.issues.includes('photo_0:format_must_match'));
  });
  test('a hidden photograph can be deleted; a published one cannot in the same step', () => {
    const hiddenGone = planPhotoSave(CURRENT, [keep(CURRENT[0]), keep(CURRENT[1])], [], undefined);
    assert.ok(hiddenGone.ok);
    assert.deepEqual(hiddenGone.deletes, ['exterior-01.jpg']);
    const publishedGone = planPhotoSave(CURRENT, [keep(CURRENT[1]), keep(CURRENT[2])], [], undefined);
    assert.ok(!publishedGone.ok);
    assert.deepEqual(publishedGone.issues, ['delete:reception-01.jpg:published_photo_delete']);
  });
  test('problems are reported per photo, and nothing is planned', () => {
    const plan = planPhotoSave(CURRENT, [
      keep(CURRENT[0], { alt: { he: '', ar: ALT.ar, en: ALT.en } }),
      keep(CURRENT[1], { frame: { x: 50, y: 50, zoom: 7 } }),
      keep(CURRENT[2], { status: 'live' }),
    ], [], undefined);
    assert.ok(!plan.ok);
    assert.deepEqual(plan.issues, ['photo_0:alt_he_required', 'photo_1:frame_invalid', 'photo_2:status_invalid']);
  });
  test('an unknown or duplicated file, or a treatment-work category, is refused', () => {
    const unknown = planPhotoSave(CURRENT, [...CURRENT.map((r) => keep(r)), { file: '../../package.json', status: 'unpublished', alt: ALT }], [], undefined);
    assert.ok(!unknown.ok && unknown.issues.includes('photo_3:photo_not_actionable'));
    const twice = planPhotoSave(CURRENT, [...CURRENT.map((r) => keep(r)), keep(CURRENT[0])], [], undefined);
    assert.ok(!twice.ok && twice.issues.includes('photo_3:photo_not_actionable'));
    const work = planPhotoSave(CURRENT, [...CURRENT.map((r) => keep(r)), { category: 'work', image: IMAGE, status: 'unpublished', alt: ALT } as DesiredPhoto], [], true);
    assert.ok(!work.ok && work.issues.includes('photo_3:category_not_allowed'));
  });
});

/* ── Through the Worker ─────────────────────────────────────────────────── */

const manifest = (records: unknown[]) => asContents(`${JSON.stringify(records, null, 2)}\n`, 'manifest-sha');
const blobReply = (bytes: Uint8Array): Reply => ({ status: 200, body: { content: Buffer.from(bytes).toString('base64'), encoding: 'base64', size: bytes.length } });
const directory = (names: string[]): Reply => ({ status: 200, body: names.map((name) => ({ name, sha: 'f'.repeat(40), type: 'file' })) });
const commitChain: Reply[] = [
  { status: 200, body: { object: { sha: HEAD } } },
  { status: 200, body: { sha: 'manifest-sha' } },
  { status: 200, body: { tree: { sha: TREE } } },
  { status: 201, body: { sha: NEW_TREE } },
  { status: 201, body: { sha: NEW_COMMIT } },
  { status: 200, body: { object: { sha: NEW_COMMIT } } },
];

describe('POST /api/photos/stage', () => {
  test('checks the image and stores it as a blob only — no commit, no branch', async () => {
    assert.ok(Math.max(inspectImage(JPEG)!.width, inspectImage(JPEG)!.height) >= 1200);
    const { response, calls } = await callAdmin(
      await adminRequest('/api/photos/stage', { method: 'POST', body: { contentBase64: Buffer.from(JPEG).toString('base64'), confirmed: true } }),
      [{ status: 201, body: { sha: BLOB_A } }],
    );
    assert.equal(response.status, 200);
    const data = (await response.json()) as { data: { blob: string; extension: string } };
    assert.equal(data.data.blob, BLOB_A);
    assert.equal(data.data.extension, 'jpg');
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, `${GIT}/blobs`);
    assert.equal(calls[0].method, 'POST');
    assert.equal(calls[0].body?.encoding, 'base64');
  });
  test('refuses what is not a real image, before GitHub', async () => {
    const { response, calls } = await callAdmin(
      await adminRequest('/api/photos/stage', { method: 'POST', body: { contentBase64: Buffer.from('<svg/>').toString('base64'), confirmed: true } }),
      [],
    );
    assert.equal(response.status, 422);
    assert.deepEqual(calls, []);
  });
  test('without the no-patient confirmation nothing reaches GitHub, not even a blob', async () => {
    const { response, calls } = await callAdmin(
      await adminRequest('/api/photos/stage', { method: 'POST', body: { contentBase64: Buffer.from(JPEG).toString('base64') } }),
      [{ status: 201, body: { sha: BLOB_A } }],
    );
    assert.equal(response.status, 422);
    assert.deepEqual(((await response.json()) as { error: { issues: string[] } }).error.issues, ['confirmation_required']);
    assert.deepEqual(calls, []);
  });
  test('a cross-origin request is refused', async () => {
    const { response, calls } = await callAdmin(
      await adminRequest('/api/photos/stage', { method: 'POST', origin: 'https://evil.example', body: { contentBase64: 'AA==' } }),
      [],
    );
    assert.equal(response.status, 403);
    assert.deepEqual(calls, []);
  });
});

describe('POST /api/photos/save', () => {
  const save = async (body: unknown, replies: Reply[], env = adminEnv) =>
    callAdmin(await adminRequest('/api/photos/save', { method: 'POST', body }), replies, env);

  test('a new photograph plus a reorder is ONE commit, fast-forward only', async () => {
    const photos = [
      { file: 'reception-02.jpg', status: 'published', alt: ALT, frame: { x: 30, y: 40, zoom: 1.2 } },
      { file: 'reception-01.jpg', status: 'published', alt: ALT },
      { file: 'exterior-01.jpg', status: 'unpublished', alt: ALT },
      { category: 'reception', image: { blob: BLOB_A }, status: 'unpublished', alt: ALT },
    ];
    const { response, calls } = await save({ sha: 'manifest-sha', photos, confirmed: true }, [
      manifest(CURRENT), blobReply(JPEG), directory(['reception-01.jpg', 'reception-02.jpg', 'exterior-01.jpg']), ...commitChain,
    ]);
    assert.equal(response.status, 200, await response.clone().text());
    assert.deepEqual(((await response.json()) as { data: unknown }).data, { sha: NEW_COMMIT });

    const tree = calls.find((c) => c.url === `${GIT}/trees`)!;
    assert.equal(tree.body?.base_tree, TREE);
    const entries = tree.body?.tree as Array<Record<string, unknown>>;
    assert.deepEqual(entries.map((e) => e.path), ['src/data/clinic-photography.json', 'src/assets/images/reception-03.jpg']);
    assert.equal(entries[1].sha, BLOB_A);
    const written = JSON.parse(String(entries[0].content)) as ClinicPhotographRecord[];
    assert.deepEqual(written.map((r) => r.file), ['reception-02.jpg', 'reception-01.jpg', 'exterior-01.jpg', 'reception-03.jpg']);
    assert.deepEqual(written[0].frame, { x: 30, y: 40, zoom: 1.2 });

    const commit = calls.find((c) => c.url === `${GIT}/commits` && c.method === 'POST')!;
    assert.deepEqual(commit.body?.parents, [HEAD]);
    assert.match(String(commit.body?.message), /^cms\(media\): update clinic photos\n\nChanged by: CMS admin\nPatient-content confirmed: yes\n$/);
    assert.doesNotMatch(String(commit.body?.message), /@/);

    const move = calls.at(-1)!;
    assert.equal(move.method, 'PATCH');
    assert.equal(move.url, `${GIT}/refs/heads/${CONTENT_BRANCH}`);
    assert.deepEqual(move.body, { sha: NEW_COMMIT, force: false });
    // Nothing touched main, and nothing wrote through another path.
    assert.ok(calls.every((c) => !c.url.includes('/main')));
  });

  test('a stale manifest is a conflict and nothing is written', async () => {
    const { response, calls } = await save({ sha: 'old-sha', photos: [] }, [manifest(CURRENT)]);
    assert.equal(response.status, 409);
    assert.ok(calls.every((c) => c.method === 'GET'));
  });

  test('someone else committing meanwhile is a conflict, never a forced update', async () => {
    const photos = CURRENT.map((r) => ({ file: r.file, status: r.status, alt: r.alt })).reverse();
    photos[0].status = 'published';
    const { response, calls } = await save({ sha: 'manifest-sha', photos }, [
      manifest(CURRENT), directory([]), ...commitChain.slice(0, 5), { status: 422, body: { message: 'Update is not a fast forward' } },
    ]);
    assert.equal(response.status, 409);
    assert.equal(calls.at(-1)?.method, 'PATCH');
  });

  test('the manifest changed at the head commit: conflict before any tree is built', async () => {
    const photos = CURRENT.map((r) => ({ file: r.file, status: r.status, alt: r.alt })).reverse();
    const { response, calls } = await save({ sha: 'manifest-sha', photos }, [
      manifest(CURRENT), directory([]), commitChain[0], { status: 200, body: { sha: 'someone-elses' } },
    ]);
    assert.equal(response.status, 409);
    assert.ok(calls.every((c) => c.method === 'GET'));
  });

  test('a staged blob is fetched back and inspected; a non-image is refused', async () => {
    const photos = [...CURRENT.map((r) => ({ file: r.file, status: r.status, alt: r.alt })), { category: 'reception', image: { blob: BLOB_A }, status: 'unpublished', alt: ALT }];
    const { response, calls } = await save({ sha: 'manifest-sha', photos, confirmed: true }, [
      manifest(CURRENT), blobReply(new TextEncoder().encode('<html>not an image</html>')),
    ]);
    assert.equal(response.status, 422);
    assert.deepEqual(((await response.json()) as { error: { issues: string[] } }).error.issues, ['photo_3:unsupported_format']);
    assert.ok(calls.every((c) => c.method === 'GET'));
  });

  test('a blob that is not a git object name never reaches a URL', async () => {
    const photos = [{ category: 'reception', image: { blob: '../../refs/heads/main' }, status: 'unpublished', alt: ALT }];
    const { response, calls } = await save({ sha: 'manifest-sha', photos: [...CURRENT.map((r) => ({ file: r.file, status: r.status, alt: r.alt })), ...photos], confirmed: true }, [manifest(CURRENT)]);
    assert.equal(response.status, 422);
    assert.equal(calls.length, 1);
  });

  test('deleting a published photograph is refused, with the reason', async () => {
    const photos = CURRENT.slice(1).map((r) => ({ file: r.file, status: r.status, alt: r.alt }));
    const { response, calls } = await save({ sha: 'manifest-sha', photos }, [manifest(CURRENT), directory([])]);
    assert.equal(response.status, 422);
    assert.deepEqual(((await response.json()) as { error: { issues: string[] } }).error.issues, ['delete:reception-01.jpg:published_photo_delete']);
    assert.ok(calls.every((c) => c.method === 'GET'));
  });

  test('deleting a hidden photograph removes its file in the same commit', async () => {
    const photos = CURRENT.slice(0, 2).map((r) => ({ file: r.file, status: r.status, alt: r.alt }));
    const { response, calls } = await save({ sha: 'manifest-sha', photos }, [manifest(CURRENT), directory([]), ...commitChain]);
    assert.equal(response.status, 200);
    const entries = calls.find((c) => c.url === `${GIT}/trees`)!.body?.tree as Array<Record<string, unknown>>;
    assert.deepEqual(entries[1], { path: 'src/assets/images/exterior-01.jpg', mode: '100644', type: 'blob', sha: null });
  });

  test('an unchanged gallery commits nothing', async () => {
    const photos = CURRENT.map((r) => ({ file: r.file, status: r.status, alt: r.alt }));
    const { response, calls } = await save({ sha: 'manifest-sha', photos }, [manifest(CURRENT), directory([])]);
    assert.deepEqual(((await response.json()) as { data: unknown }).data, { sha: null, unchanged: true });
    assert.ok(calls.every((c) => c.method === 'GET'));
  });

  test('more than twenty new images in one save is refused before any read of them', async () => {
    const photos = Array.from({ length: 21 }, () => ({ category: 'reception', image: { blob: BLOB_A }, status: 'unpublished', alt: ALT }));
    const { response, calls } = await save({ sha: 'manifest-sha', photos, confirmed: true }, [manifest(CURRENT)]);
    assert.equal(response.status, 422);
    assert.equal(calls.length, 1);
  });

  test('cross-origin saves are refused', async () => {
    const { response, calls } = await callAdmin(
      await adminRequest('/api/photos/save', { method: 'POST', origin: 'https://evil.example', body: { sha: 'x', photos: [] } }),
      [],
    );
    assert.equal(response.status, 403);
    assert.deepEqual(calls, []);
  });
});
