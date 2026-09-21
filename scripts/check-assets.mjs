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
 * Manual: npm run lint:assets (staged), npm run lint:assets -- --all (tracked)
 * CI always scans tracked files. Local reviewed exception: ASSETS_ALLOW=1.
 */

import { execFileSync } from 'node:child_process';
import { extname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const MANIFEST = 'src/data/media.ts';
const scanAll = process.env.CI === 'true' || process.argv.includes('--all');

const MEDIA_EXT = new Set([
  '.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif', '.tif', '.tiff',
  '.heic', '.heif', '.bmp', '.svg', '.ico', '.mp4', '.mov', '.webm', '.avi',
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

function candidateFiles() {
  // Argument array and NUL delimiters preserve filenames without shell parsing.
  const out = execFileSync(
    'git',
    scanAll ? ['ls-files', '-z'] : ['diff', '--cached', '--name-only', '-z', '--diff-filter=ACMR'],
    { encoding: 'utf8', cwd: ROOT },
  );
  return out.split('\0').filter(Boolean);
}

/** Every filename mentioned in the manifest's `file:` fields. */
function registeredFiles() {
  // Read the index, so an unstaged registration cannot approve a commit.
  const src = execFileSync('git', ['show', `:${MANIFEST}`], { encoding: 'utf8', cwd: ROOT });
  const names = [...src.matchAll(/\bfile:\s*['"]([^'"]+)['"]/g)].map((m) => m[1]);
  return new Set(names);
}

const media = candidateFiles().filter((f) => MEDIA_EXT.has(extname(f).toLowerCase()));

if (media.length === 0) {
  console.log(`${GRN}✓ asset guard: no media files ${scanAll ? 'tracked' : 'staged'}.${OFF}`);
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

if (process.env.ASSETS_ALLOW === '1' && process.env.CI !== 'true') {
  console.log(`${YEL}⚠ asset guard BYPASSED via ASSETS_ALLOW=1 for ${problems.length} file(s):${OFF}`);
  problems.forEach((p) => console.log(`    ${p.file}`));
  process.exit(0);
}

console.log(`\n${RED}✗ asset guard: ${problems.length} unreviewed media file(s) ${scanAll ? 'tracked' : 'staged'}.${OFF}\n`);
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
