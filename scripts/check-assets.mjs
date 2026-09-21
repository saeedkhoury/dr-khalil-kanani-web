#!/usr/bin/env node
/**
 * ASSET COMMIT GUARD
 *
 * Blocks any image or media file from being committed unless it has been
 * explicitly registered in `src/data/media.ts`.
 *
 * ── WHY ───────────────────────────────────────────────────────────────────
 * On 2026-09-21, thirteen images were swept into a commit by `git add -A`
 * without anyone opening them. Every one that was later inspected turned out
 * to be patient before/after photography — material Israeli dental
 * advertising regulations prohibit publishing. They reached the public
 * repository before being reviewed.
 *
 * Registering a file in the manifest requires naming its category and writing
 * alt text in three languages, which is not something you can do without
 * having looked at the image. That is the point: the guard does not detect
 * patient photography, it makes *skipping the look* impossible.
 *
 * Run automatically via .githooks/pre-commit, and in CI.
 * Manual: npm run lint:assets
 * Bypass (logged, use only for a reviewed exception): ASSETS_ALLOW=1
 */

import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { join, extname, basename } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const MANIFEST = join(ROOT, 'src/data/media.ts');

const MEDIA_EXT = new Set([
  '.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif', '.tif', '.tiff',
  '.heic', '.heif', '.bmp', '.mp4', '.mov', '.webm', '.avi',
]);

/** Files that are part of the design system, not clinic media. */
const ALLOWED_PATHS = [
  'public/favicon',
  'src/assets/brand/',
];

const RED = '\x1b[31m';
const YEL = '\x1b[33m';
const GRN = '\x1b[32m';
const DIM = '\x1b[2m';
const OFF = '\x1b[0m';

function stagedFiles() {
  try {
    // execFileSync with an argument array: no shell, so nothing here can be
    // interpreted as a shell metacharacter.
    const out = execFileSync(
      'git',
      ['diff', '--cached', '--name-only', '--diff-filter=ACMR'],
      { encoding: 'utf8' },
    );
    return out.split('\n').map((l) => l.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

/** Every filename mentioned in the manifest's `file:` fields. */
function registeredFiles() {
  if (!existsSync(MANIFEST)) return new Set();
  const src = readFileSync(MANIFEST, 'utf8');
  const names = [...src.matchAll(/\bfile:\s*['"]([^'"]+)['"]/g)].map((m) => m[1]);
  return new Set(names);
}

const staged = stagedFiles();
const media = staged.filter((f) => MEDIA_EXT.has(extname(f).toLowerCase()));

if (media.length === 0) {
  console.log(`${GRN}✓ asset guard: no media files staged.${OFF}`);
  process.exit(0);
}

const registered = registeredFiles();
const problems = [];

for (const file of media) {
  if (ALLOWED_PATHS.some((p) => file.startsWith(p))) continue;

  if (!file.startsWith('src/assets/images/')) {
    problems.push({ file, why: 'media must live in src/assets/images/ (see docs/ASSETS.md)' });
    continue;
  }
  if (!registered.has(basename(file))) {
    problems.push({ file, why: 'not registered in src/data/media.ts' });
  }
}

if (problems.length === 0) {
  console.log(`${GRN}✓ asset guard: ${media.length} media file(s), all registered.${OFF}`);
  process.exit(0);
}

if (process.env.ASSETS_ALLOW === '1') {
  console.log(`${YEL}⚠ asset guard BYPASSED via ASSETS_ALLOW=1 for ${problems.length} file(s):${OFF}`);
  problems.forEach((p) => console.log(`    ${p.file}`));
  process.exit(0);
}

console.log(`\n${RED}✗ asset guard: ${problems.length} unreviewed media file(s) staged.${OFF}\n`);
for (const p of problems) {
  console.log(`  ${RED}${p.file}${OFF}\n      ${p.why}`);
}
console.log(`
${DIM}Before committing a clinic image you must OPEN IT and classify it.

  1. Look at the file. If it shows a patient, any part of a patient, or a
     before/after comparison, it CANNOT be published — move it to
     .private-assets/ (gitignored) and stop.
  2. Otherwise rename it per docs/ASSETS.md and register it in
     src/data/media.ts with a category and alt text in he, ar and en.

This guard exists because thirteen patient before/after images reached the
public repo in one unreviewed \`git add -A\`.${OFF}
`);
process.exit(1);
