import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, copyFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';

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

function guard(root: string, ci: boolean, bypass = false): ReturnType<typeof spawnSync> {
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
