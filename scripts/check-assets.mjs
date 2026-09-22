#!/usr/bin/env node
/**
 * ASSET COMMIT GUARD
 *
 * Blocks any image or media file from being committed unless it has been
 * explicitly registered — clinic photography in
 * `src/data/clinic-photography.json`, everything else in `src/data/media.ts`.
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
 * Manual: npm run lint:assets      — what this commit stages
 *         npm run lint:assets:full — every tracked asset (also `npm run verify`)
 * CI always scans tracked files. Local reviewed exception: ASSETS_ALLOW=1.
 */

import { execFileSync } from 'node:child_process';
import { extname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

/**
 * Two registration sources, deliberately different in mutability.
 *
 *   DEV_MANIFEST  developer-managed: treatmentWork, illustrations, hero,
 *                 portrait. Hand-edited, reviewed in a pull request.
 *   CMS_MANIFEST  written automatically by the admin CMS. Machine-generated,
 *                 so it needs checks a human author would not.
 *
 * Both are read from the git INDEX, so an unstaged registration can never
 * approve a staged image.
 */
const DEV_MANIFEST = 'src/data/media.ts';
const CMS_MANIFEST = 'src/data/clinic-photography.json';

/**
 * FULL mode   — the complete tracked asset state. Used by `npm run verify`
 *               and CI. Catches anything already committed.
 * STAGED mode — what this commit adds, checked against both manifests. Fast
 *               enough for a pre-commit hook.
 *
 * Both modes run the SAME validation below. The only difference is which
 * files are collected; there are not two implementations to drift apart.
 */
const scanAll =
  process.env.CI === 'true' ||
  process.argv.includes('--all') ||
  process.argv.includes('--full');

/** Categories the CMS is permitted to write. treatment-work is NOT among them. */
const CMS_CATEGORIES = new Set([
  'exterior', 'reception', 'treatment-room', 'equipment',
  'doctor-working', 'team', 'atmosphere',
]);

/** Extensions the CMS may register. SVG is excluded: it can carry script. */
const CMS_EXT = new Set(['.jpg', '.jpeg', '.png']);

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

/** Read a path from the git index. Returns null when it is not tracked yet. */
function readIndex(path) {
  try {
    // stdio 'pipe' on stderr: an untracked path is an expected, handled case,
    // and git's "fatal:" on stderr would otherwise look like a real failure in
    // CI logs.
    return execFileSync('git', ['show', `:${path}`], {
      encoding: 'utf8',
      cwd: ROOT,
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch {
    return null;
  }
}

/**
 * Every registered filename, from BOTH manifests, with the problems each
 * source can uniquely have.
 *
 * Returns { names, problems }. A missing CMS manifest is an empty list, not an
 * error — that is the state during the migration that introduces it.
 */
function registrations() {
  const names = new Set();
  const problems = [];
  const seen = new Map();

  const claim = (file, source) => {
    if (seen.has(file)) {
      problems.push({
        file,
        why: `registered twice — in ${seen.get(file)} and ${source}. Two records addressing one image make unpublishing appear to do nothing`,
      });
      return;
    }
    seen.set(file, source);
    names.add(file);
  };

  // ── Developer-managed manifest (TypeScript) ──
  const dev = readIndex(DEV_MANIFEST);
  if (dev !== null) {
    for (const m of dev.matchAll(/\bfile:\s*['"]([^'"]+)['"]/g)) claim(m[1], DEV_MANIFEST);
  }

  // ── CMS-managed manifest (JSON) ──
  const cmsRaw = readIndex(CMS_MANIFEST);
  if (cmsRaw !== null) {
    let cms;
    try {
      cms = JSON.parse(cmsRaw);
    } catch (error) {
      problems.push({ file: CMS_MANIFEST, why: `is not valid JSON: ${error.message}` });
      return { names, problems };
    }
    if (!Array.isArray(cms)) {
      problems.push({ file: CMS_MANIFEST, why: 'must be a JSON array' });
      return { names, problems };
    }
    for (const entry of cms) {
      const file = entry?.file;
      if (typeof file !== 'string' || file === '') {
        problems.push({ file: CMS_MANIFEST, why: 'a record has no "file" field' });
        continue;
      }
      // A registered name is a BARE FILENAME. Anything path-shaped is refused
      // before it can be joined to a directory.
      if (file.includes('/') || file.includes('\\') || file.includes('..')) {
        problems.push({ file, why: 'registered name must be a bare filename — no "/", "\\" or ".."' });
        continue;
      }
      if (!CMS_EXT.has(extname(file).toLowerCase())) {
        problems.push({
          file,
          why: `CMS photography must be ${[...CMS_EXT].join(', ')} — SVG can carry script and is never a photograph`,
        });
        continue;
      }
      if (!CMS_CATEGORIES.has(entry?.category)) {
        problems.push({
          file,
          why: `category "${entry?.category}" is not one the CMS may write. Treatment work is developer-managed and lives in ${DEV_MANIFEST}`,
        });
        continue;
      }
      claim(file, CMS_MANIFEST);
    }
  }

  return { names, problems };
}

/** Registered records whose image file is not tracked in the repository. */
function missingFiles(names) {
  const tracked = new Set(
    execFileSync('git', ['ls-files', '-z', 'src/assets/images'], { encoding: 'utf8', cwd: ROOT })
      .split('\0')
      .filter(Boolean)
      .map((f) => basename(f)),
  );
  return [...names].filter((n) => !tracked.has(n));
}

const media = candidateFiles().filter((f) => MEDIA_EXT.has(extname(f).toLowerCase()));

if (media.length === 0 && !scanAll) {
  // Staged mode with no media staged: nothing this commit could break.
  // Full mode continues, because a manifest can be wrong with no image staged.
  console.log(`${GRN}✓ asset guard: no media files staged.${OFF}`);
  process.exit(0);
}

const { names: registered, problems } = registrations();

for (const file of media) {
  if (ALLOWED_PATHS.some((p) => file.startsWith(p))) continue;

  if (!file.startsWith('src/assets/images/')) {
    problems.push({ file, why: 'media must live in src/assets/images/ (see docs/ASSETS.md)' });
    continue;
  }
  if (!registered.has(basename(file))) {
    problems.push({
      file,
      why: `not registered in ${DEV_MANIFEST} or ${CMS_MANIFEST}`,
    });
  }
}

// A record pointing at an image that does not exist. Only meaningful in full
// mode: mid-commit, staged mode legitimately sees a registration whose file is
// in the same commit, and git ls-files would not list it yet.
if (scanAll) {
  for (const orphan of missingFiles(registered)) {
    problems.push({
      file: orphan,
      why: 'registered, but no such image is tracked under src/assets/images/',
    });
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
  2. Otherwise rename it per docs/ASSETS.md and register it — clinic
     photography in src/data/clinic-photography.json, developer-managed
     media in src/data/media.ts — with a category and alt text in he, ar
     and en.

This guard exists because thirteen patient before/after images reached the
public repo in one unreviewed \`git add -A\`.${OFF}
`);
process.exit(1);
