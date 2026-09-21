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
const mediaPath = join(fixture, 'src/data/media.ts');
const assets = [1, 2].map((number) => ({
  file: 'qa-mark.svg', category: 'atmosphere', width: 288, height: 285,
  alt: { he: `סמל בדיקה ${number}`, ar: `رمز اختبار ${number}`, en: `Test mark ${number}` },
  caption: { he: `סמל בדיקה ${number}`, ar: `رمز اختبار ${number}`, en: `Test mark ${number}` },
}));
writeFileSync(mediaPath, readFileSync(mediaPath, 'utf8').replace(
  'export const gallery: MediaAsset[] = [];', `export const gallery: MediaAsset[] = ${JSON.stringify(assets)};`,
));
const clinicPath = join(fixture, 'src/data/clinic.ts');
const clinicSource = readFileSync(clinicPath, 'utf8');
writeFileSync(clinicPath, clinicSource
  .replace('geo: { lat: 0, lng: 0 }', 'geo: { lat: 1, lng: 1 }')
  .replace("googleBusiness: ''", "googleBusiness: 'https://example.invalid/qa-profile'")
  .replace('value: null as number | null', 'value: 4.5 as number | null')
  .replace('count: null as number | null', 'count: 12 as number | null'));

const astro = join(root, 'node_modules/astro/bin/astro.mjs');
execFileSync(process.execPath, [astro, 'build'], {
  cwd: fixture, stdio: 'inherit',
  env: { ...process.env, ASTRO_SITE: 'https://qa.invalid', VERIFY_RELAX: '1' },
});
server = spawn(process.execPath, [astro, 'preview', '--host', '127.0.0.1', '--port', '4331', '--ignore-lock'], {
  cwd: fixture, stdio: 'inherit',
});
server.on('exit', (code) => process.exit(code ?? 1));
