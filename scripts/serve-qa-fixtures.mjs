// Build synthetic data only in an OS temporary copy, never in src/ or dist/.
// This server binds to loopback and its output must never be deployed.
import { cpSync, mkdtempSync, readFileSync, writeFileSync, symlinkSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawn } from 'node:child_process';

const root = fileURLToPath(new URL('..', import.meta.url));
const fixture = mkdtempSync(join(tmpdir(), 'kanani-browser-fixtures-'));
let server;
let cleaned = false;
function cleanup() {
  if (cleaned) return;
  cleaned = true;
  server?.kill();
  rmSync(fixture, { recursive: true, force: true });
}
process.on('exit', cleanup);
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => { cleanup(); process.exit(0); });

for (const path of ['src', 'public', 'astro.config.mjs', 'tsconfig.json', 'package.json']) {
  cpSync(join(root, path), join(fixture, path), { recursive: true });
}
symlinkSync(join(root, 'node_modules'), join(fixture, 'node_modules'), 'dir');

// Reuse the existing vector brand mark; no patient or stock photographs.
mkdirSync(join(fixture, 'src/assets/images'), { recursive: true });
cpSync(join(root, 'public/favicon.svg'), join(fixture, 'src/assets/images/qa-mark.svg'));
writeFileSync(join(fixture, 'src/lib/images.ts'), `
import mark from '../assets/images/qa-mark.svg';
import type { ImageMetadata } from 'astro';
export function resolveImage(_file: string): ImageMetadata { return mark; }
export function availableImages(): string[] { return ['qa-mark.svg']; }
`);
/**
 * Replace exactly once, or abort.
 *
 * These substitutions used to fail silently: a rename in src/ left the regex
 * unmatched, the fixture served the REAL manifest, and the only symptom was a
 * confusing count assertion in a browser test. A fixture that quietly serves
 * production data is worse than one that crashes.
 */
function substitute(source, pattern, replacement, what) {
  const matches = source.match(pattern);
  if (!matches) {
    throw new Error(
      `[qa-fixtures] ${what}: pattern did not match.\n` +
      `  ${pattern}\n` +
      `  The source it targets has probably been renamed. Update this script ` +
      `rather than letting the fixture serve real data.`,
    );
  }
  return source.replace(pattern, replacement);
}

const mediaPath = join(fixture, 'src/data/media.ts');
// The homepage renders the 'work' gallery, so the fixtures must live in
// treatmentWork. Under the split manifest a clinic-photography category would
// type-check but never render, which is exactly the silent mismatch the
// explicit `kind` prop exists to prevent.
const assets = [1, 2].map((number) => ({
  file: 'qa-mark.svg', category: 'treatment-work', width: 288, height: 285,
  alt: { he: `סמל בדיקה ${number}`, ar: `رمز اختبار ${number}`, en: `Test mark ${number}` },
  caption: { he: `סמל בדיקה ${number}`, ar: `رمز اختبار ${number}`, en: `Test mark ${number}` },
}));
writeFileSync(mediaPath, substitute(
  readFileSync(mediaPath, 'utf8'),
  /export const treatmentWork: TreatmentWorkPhotograph\[\] = \[[\s\S]*?\n\];/,
  `export const treatmentWork: TreatmentWorkPhotograph[] = ${JSON.stringify(assets)};`,
  'treatmentWork collection',
));
/**
 * The JSON manifests are OVERWRITTEN, not copied.
 *
 * Same reason treatmentWork is substituted above: these files are copied from
 * src/, so once the owner adds real clinic photographs the fixture would serve
 * them — real images of a real clinic, in a build whose whole premise is that
 * it contains no real content. The fixture must declare its own data.
 *
 * Writing JSON is also why this no longer needs a regex. A pattern that stops
 * matching after a rename is the failure this script already had once; there
 * is nothing to mismatch in a file that is simply replaced.
 */
writeFileSync(
  join(fixture, 'src/data/clinic-photography.json'),
  // Empty on purpose. The homepage renders the 'work' gallery, fixtured
  // above; a populated clinic gallery here would assert nothing and would
  // only add a second source for the tile count.
  JSON.stringify([], null, 2) + '\n',
);

writeFileSync(
  join(fixture, 'src/data/hours.json'),
  // Populated, unlike production — the point of this fixture build is to
  // render the states the real site cannot yet reach, the way it already
  // fixtures a rating and a Google profile. hasHours() turns the block on.
  JSON.stringify(
    ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day) => ({
      day,
      opens: day === 'Saturday' ? '' : '09:00',
      closes: day === 'Saturday' ? '' : '17:00',
      closed: day === 'Saturday',
    })),
    null,
    2,
  ) + '\n',
);

const clinicPath = join(fixture, 'src/data/clinic.ts');
const clinicSource = readFileSync(clinicPath, 'utf8');
let clinicFixture = substitute(clinicSource, /geo: \{ lat: [\d.-]+, lng: [\d.-]+ \}/, 'geo: { lat: 1, lng: 1 }', 'map pin');
clinicFixture = substitute(clinicFixture, /googleBusiness: ''/, "googleBusiness: 'https://example.invalid/qa-profile'", 'Google profile URL');
clinicFixture = substitute(clinicFixture, /value: null as number \| null/, 'value: 4.5 as number | null', 'rating value');
clinicFixture = substitute(clinicFixture, /count: null as number \| null/, 'count: 12 as number | null', 'review count');
writeFileSync(clinicPath, clinicFixture);

const astro = join(root, 'node_modules/astro/bin/astro.mjs');
execFileSync(process.execPath, [astro, 'build'], {
  cwd: fixture, stdio: 'inherit',
  env: { ...process.env, ASTRO_SITE: 'https://qa.invalid', VERIFY_RELAX: '1' },
});
server = spawn(process.execPath, [astro, 'preview', '--host', '127.0.0.1', '--port', '4331', '--ignore-lock'], {
  cwd: fixture, stdio: 'inherit',
});
server.on('exit', (code) => process.exit(code ?? 1));
