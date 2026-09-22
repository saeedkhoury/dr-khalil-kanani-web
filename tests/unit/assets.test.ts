import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, copyFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync, spawnSync, type SpawnSyncReturns } from 'node:child_process';

/** Write the CMS manifest and stage it. */
function cms(root: string, records: unknown[]): void {
  writeFileSync(join(root, 'src/data/clinic-photography.json'), JSON.stringify(records, null, 2) + '\n');
  execFileSync('git', ['add', 'src/data/clinic-photography.json'], { cwd: root });
}

/** Stage an image file under the publishable directory. */
function image(root: string, name: string): void {
  writeFileSync(join(root, 'src/assets/images/' + name), 'asset guard fixture');
  execFileSync('git', ['add', 'src/assets/images/' + name], { cwd: root });
}

/** A valid CMS record, overridable per test. */
const record = (over: Record<string, unknown> = {}) => ({
  file: 'reception-01.jpg',
  category: 'reception',
  width: 2400,
  height: 1600,
  status: 'published',
  alt: { he: 'קבלה', ar: 'استقبال', en: 'Reception' },
  ...over,
});

function fixture(run: (root: string) => void): void {
  const root = mkdtempSync(join(tmpdir(), 'kanani-asset-test-'));
  try {
    for (const dir of ['scripts', 'src/data', 'src/assets/images']) mkdirSync(join(root, dir), { recursive: true });
    copyFileSync(new URL('../../scripts/check-assets.mjs', import.meta.url), join(root, 'scripts/check-assets.mjs'));
    writeFileSync(join(root, 'src/data/media.ts'), 'export const gallery = [];');
    // Deliberately not an image: only the Git path classification is under test.
    writeFileSync(join(root, 'src/assets/images/unreviewed.png'), 'asset guard fixture');
    execFileSync('git', ['init', '--quiet'], { cwd: root });
    execFileSync('git', ['add', 'src/data/media.ts', 'src/assets/images/unreviewed.png'], { cwd: root });
    run(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

// `encoding: 'utf8'` makes stdout a string, but spawnSync's overloads do not
// narrow through this wrapper — hence the explicit return type.
function guard(root: string, ci: boolean, bypass = false): SpawnSyncReturns<string> {
  return spawnSync(process.execPath, ['scripts/check-assets.mjs'], {
    cwd: root, encoding: 'utf8', env: { ...process.env, CI: String(ci), ASSETS_ALLOW: bypass ? '1' : '' },
  });
}

test('asset guard rejects unregistered staged media', () => fixture((root) => {
  assert.equal(guard(root, false).status, 1);
}));

test('asset guard cannot approve media using an unstaged manifest edit', () => fixture((root) => {
  writeFileSync(join(root, 'src/data/media.ts'), "export const gallery = [{ file: 'unreviewed.png' }];");
  assert.equal(guard(root, false).status, 1);
  execFileSync('git', ['add', 'src/data/media.ts'], { cwd: root });
  assert.equal(guard(root, false).status, 0);
}));

test('CI checks committed media even with a clean staging area and refuses bypass', () => fixture((root) => {
  execFileSync('git', ['-c', 'user.name=QA', '-c', 'user.email=qa@example.invalid',
    '-c', 'core.hooksPath=/dev/null', 'commit', '--quiet', '-m', 'test fixture'], { cwd: root });
  assert.equal(guard(root, false).status, 0);
  assert.equal(guard(root, true).status, 1);
  assert.equal(guard(root, true, true).status, 1);
}));


/* ────────────────────────────────────────────────────────────────────────────
   The six agreed regression cases for the JSON migration.

   The guard used to resolve registrations from src/data/media.ts alone. Moving
   clinic photography into JSON would have silently taken those images outside
   the check — the guard would keep passing while covering less. That is the
   most dangerous side effect of the migration, because this guard exists
   precisely because thirteen patient photographs were once committed
   unreviewed.
   ──────────────────────────────────────────────────────────────────────── */

test('A. a clinic photograph registered in the CMS JSON is accepted', () => fixture((root) => {
  image(root, 'reception-01.jpg');
  cms(root, [record()]);
  // The stock fixture also stages an unregistered file; register it too so
  // this test isolates case A.
  writeFileSync(join(root, 'src/data/media.ts'), "export const gallery = [{ file: 'unreviewed.png' }];");
  execFileSync('git', ['add', 'src/data/media.ts'], { cwd: root });
  const result = guard(root, false);
  assert.equal(result.status, 0, result.stdout);
}));

test('B. a developer-managed image registered in media.ts is accepted', () => fixture((root) => {
  writeFileSync(join(root, 'src/data/media.ts'), "export const gallery = [{ file: 'unreviewed.png' }];");
  execFileSync('git', ['add', 'src/data/media.ts'], { cwd: root });
  cms(root, []);
  assert.equal(guard(root, false).status, 0);
}));

test('C. an unregistered image is rejected even with a valid CMS manifest', () => fixture((root) => {
  // unreviewed.png is staged by the fixture and registered nowhere.
  cms(root, [record()]);
  image(root, 'reception-01.jpg');
  const result = guard(root, false);
  assert.equal(result.status, 1);
  assert.match(result.stdout, /unreviewed\.png/);
}));

test('D. a CMS record referencing a missing image is rejected in full mode', () => fixture((root) => {
  writeFileSync(join(root, 'src/data/media.ts'), "export const gallery = [{ file: 'unreviewed.png' }];");
  execFileSync('git', ['add', 'src/data/media.ts'], { cwd: root });
  // Registered, but no such file is ever staged.
  cms(root, [record({ file: 'reception-99.jpg' })]);
  execFileSync('git', ['-c', 'user.name=QA', '-c', 'user.email=qa@example.invalid',
    '-c', 'core.hooksPath=/dev/null', 'commit', '--quiet', '-m', 'fixture'], { cwd: root });
  const result = guard(root, true);
  assert.equal(result.status, 1);
  assert.match(result.stdout, /reception-99\.jpg/);
  assert.match(result.stdout, /no such image is tracked/);
}));

test('E. the same filename registered in both manifests is rejected', () => fixture((root) => {
  image(root, 'reception-01.jpg');
  writeFileSync(join(root, 'src/data/media.ts'),
    "export const gallery = [{ file: 'unreviewed.png' }, { file: 'reception-01.jpg' }];");
  execFileSync('git', ['add', 'src/data/media.ts'], { cwd: root });
  cms(root, [record()]);
  const result = guard(root, false);
  assert.equal(result.status, 1);
  assert.match(result.stdout, /registered twice/);
}));

test('F. a treatment-work category in the CMS JSON is rejected', () => fixture((root) => {
  // THE test. The CMS may only ever write clinic photography; treatment and
  // patient work is developer-managed and lives in media.ts.
  image(root, 'reception-01.jpg');
  writeFileSync(join(root, 'src/data/media.ts'), "export const gallery = [{ file: 'unreviewed.png' }];");
  execFileSync('git', ['add', 'src/data/media.ts'], { cwd: root });
  cms(root, [record({ category: 'treatment-work' })]);
  const result = guard(root, false);
  assert.equal(result.status, 1);
  assert.match(result.stdout, /not one the CMS may write/);
}));

test('a path-shaped registered name is rejected', () => fixture((root) => {
  writeFileSync(join(root, 'src/data/media.ts'), "export const gallery = [{ file: 'unreviewed.png' }];");
  execFileSync('git', ['add', 'src/data/media.ts'], { cwd: root });
  for (const bad of ['../../.github/workflows/deploy.yml', 'sub/dir.jpg', '..\\evil.jpg']) {
    cms(root, [record({ file: bad })]);
    const result = guard(root, false);
    assert.equal(result.status, 1, `accepted a path-shaped name: ${bad}`);
    assert.match(result.stdout, /bare filename/);
  }
}));

test('SVG is rejected in CMS-managed photography', () => fixture((root) => {
  // SVG can carry script, and no clinic photograph is a vector.
  writeFileSync(join(root, 'src/data/media.ts'), "export const gallery = [{ file: 'unreviewed.png' }];");
  execFileSync('git', ['add', 'src/data/media.ts'], { cwd: root });
  cms(root, [record({ file: 'reception-01.svg' })]);
  const result = guard(root, false);
  assert.equal(result.status, 1);
  assert.match(result.stdout, /SVG can carry script/);
}));

test('a malformed CMS manifest fails loudly rather than silently covering nothing', () => fixture((root) => {
  writeFileSync(join(root, 'src/data/media.ts'), "export const gallery = [{ file: 'unreviewed.png' }];");
  execFileSync('git', ['add', 'src/data/media.ts'], { cwd: root });
  writeFileSync(join(root, 'src/data/clinic-photography.json'), '{ not json');
  execFileSync('git', ['add', 'src/data/clinic-photography.json'], { cwd: root });
  const result = guard(root, false);
  assert.equal(result.status, 1);
  assert.match(result.stdout, /not valid JSON/);
}));
