#!/usr/bin/env node
/**
 * CONTENT INDEPENDENCE CHECK — can an ordinary Edit Mode save block a deploy?
 *
 * Every CMS save runs the whole deploy gate (unit tests, Playwright, audits).
 * A test that pins today's content turns the doctor's next ordinary edit into
 * a failed deploy he cannot understand or fix: it happened three times in
 * September 2026 (a hidden photo, an invisible mark, a pinned phone number).
 *
 * This applies the edits a clinic realistically makes — add, hide, reorder,
 * fill in hours, change a phone, add a credential — to a COPY of the
 * repository, then runs the gate there. Any failure is a content pin.
 *
 *   node scripts/check-content-independence.mjs          # unit + audits
 *   node scripts/check-content-independence.mjs --e2e    # + Playwright
 *
 * Run before releasing test changes; it is too slow for every deploy.
 */

import { cpSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync, execSync } from 'node:child_process';

const root = new URL('..', import.meta.url).pathname;
const withE2e = process.argv.includes('--e2e');
const copy = mkdtempSync(join(tmpdir(), 'kanani-content-mutations-'));
const cleanup = () => rmSync(copy, { recursive: true, force: true });
process.on('exit', cleanup);

for (const path of ['src', 'public', 'scripts', 'tests', 'workers', '.github', 'astro.config.mjs', 'tsconfig.json', 'package.json', 'playwright.config.ts']) {
  cpSync(join(root, path), join(copy, path), { recursive: true, filter: (p) => !p.includes('/node_modules') && !p.includes('/dist') });
}
symlinkSync(join(root, 'node_modules'), join(copy, 'node_modules'), 'dir');
// Some tests read the tracked-file list (e.g. "no personal address is
// committed"); give the copy a repository of its own.
execFileSync('git', ['init', '-q'], { cwd: copy });
execFileSync('git', ['add', '-A'], { cwd: copy });

const data = (file) => join(copy, 'src/data', file);
const read = (file) => JSON.parse(readFileSync(data(file), 'utf8'));
const write = (file, value) => writeFileSync(data(file), `${JSON.stringify(value, null, 2)}\n`);

// 1. Treatments: add one (published), hide the first, reorder.
const services = read('services.json');
const added = structuredClone(services.find((s) => s.status === 'published'));
added.id = 'mutation-crowns'; added.slug = 'mutation-crowns'; added.order = 0;
for (const l of ['he', 'ar', 'en']) added.locales[l].title = `${added.locales[l].title} 2`;
services[0].status = 'unpublished';
services.reverse();
services.push(added);
write('services.json', services);

// 2. Doctor: a credential. 3. Contact: another landline.
const doctor = read('doctor-profile.json');
doctor.credentials = [...doctor.credentials, { label: { he: 'תואר בדיקה', ar: 'شهادة اختبار', en: 'Test degree' }, year: '2001' }];
write('doctor-profile.json', doctor);
const contact = read('contact-facts.json');
contact.landline = '04-999-1234';
contact.googleBusiness = 'https://maps.app.goo.gl/mutationTest1';
write('contact-facts.json', contact);

// 4. Hours: the owner fills them in (today they are empty).
write('hours.json', [
  { day: 'Sunday', opens: '', closes: '', closed: true },
  { day: 'Monday', opens: '12:00', closes: '19:00', closed: false },
  { day: 'Tuesday', opens: '12:00', closes: '19:00', closed: false },
  { day: 'Wednesday', opens: '', closes: '', closed: true },
  { day: 'Thursday', opens: '12:00', closes: '19:00', closed: false },
  { day: 'Friday', opens: '12:00', closes: '19:00', closed: false },
  { day: 'Saturday', opens: '12:00', closes: '19:00', closed: false },
]);

// 5. Doctor's work: hide the first photo, reverse the order.
const work = read('treatment-work.json');
work[0].status = 'unpublished';
work.reverse();
write('treatment-work.json', work);

// 6. FAQ: reverse the order.
const faq = read('general-faq.json');
faq.reverse();
faq.forEach((item, i) => { item.order = i; });
write('general-faq.json', faq);

const run = (label, command, env = {}) => {
  process.stdout.write(`\n── ${label}\n`);
  try {
    execSync(command, { cwd: copy, stdio: 'inherit', env: { ...process.env, ...env } });
    return true;
  } catch {
    return false;
  }
};

const results = {
  'lint:data': run('lint:data', 'npm run -s lint:data'),
  'lint:claims': run('lint:claims', 'npm run -s lint:claims'),
  'lint:scripts': run('lint:scripts', 'npm run -s lint:scripts'),
  unit: run('unit tests', 'npm test --silent'),
  build: run('production build', 'npm run -s build', { NODE_ENV: 'production', ASTRO_SITE: 'https://www.drkhalilkanani.com', ASTRO_BASE: '/', ACK_UNVERIFIED: 'doctor.ar,doctor.en,tagline.ar' }),
};
results.a11y = results.build && run('a11y audit', 'npm run -s lint:a11y');
results.seo = results.build && run('SEO crawl', 'npm run -s lint:seo');
if (withE2e) results.e2e = results.build && run('Playwright', 'npx playwright test --retries=0 --reporter=line');

console.log('\n══ Content independence ══');
for (const [k, v] of Object.entries(results)) console.log(`${v ? '✓' : '✗'} ${k}`);
process.exit(Object.values(results).every(Boolean) ? 0 : 1);
