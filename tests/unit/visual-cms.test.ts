import { test } from 'node:test';
import assert from 'node:assert/strict';
import services from '../../src/data/services.json' with { type: 'json' };
import copy from '../../src/data/managed-copy.json' with { type: 'json' };
import doctor from '../../src/data/doctor-profile.json' with { type: 'json' };
import contact from '../../src/data/contact-facts.json' with { type: 'json' };
import { parseManaged, servicesSchema, managedCopySchema, doctorProfileSchema, contactFactsSchema } from '../../src/lib/managed-schema.ts';
import { getTreatmentSlugs, getTreatments } from '../../src/lib/content.ts';
import { pathFor } from '../../workers/admin/src/github.ts';
import { VISUAL_CLIENT } from '../../workers/admin/src/ui/visual.ts';
import { adminEnv, adminRequest, asCommit, asContents, callAdmin, decodeContent, ADMIN_ORIGIN } from '../helpers/admin-api.ts';

const SHA = 'a'.repeat(40);
const COMMIT = 'b'.repeat(40);

test('migration has 8 stable service URLs and three complete locales', async () => {
  assert.equal(parseManaged(servicesSchema, services, 'services').length, 8);
  assert.equal((await getTreatmentSlugs()).length, 8);
  for (const locale of ['he', 'ar', 'en'] as const) {
    assert.deepEqual((await getTreatments(locale)).map(item => item.data.slug), await getTreatmentSlugs());
  }
  assert.equal(Object.keys(parseManaged(managedCopySchema, copy, 'copy')).length, 29);
  assert.equal(parseManaged(doctorProfileSchema, doctor, 'doctor').credentials.length, 0);
  assert.equal(parseManaged(contactFactsSchema, contact, 'contact').landline, '04-884-8891');
});

test('Worker write targets are fixed and cannot address source, treatment work or workflows', () => {
  assert.equal(pathFor({ kind: 'services' }), 'src/data/services.json');
  assert.equal(pathFor({ kind: 'contactFacts' }), 'src/data/contact-facts.json');
  assert.equal(pathFor({ kind: 'image', file: '../.github/workflows/deploy.yml' }), null);
  assert.equal(pathFor({ kind: 'treatmentWork' } as never), null);
});

test('visual editor never evaluates or injects owner text as HTML', () => {
  assert.doesNotThrow(() => new Function(VISUAL_CLIENT));
  // Comments stripped, so the rule is checked against CODE. A comment
  // explaining why innerHTML is banned must not be read as a use of it.
  const code = VISUAL_CLIENT
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
  assert.doesNotMatch(code, /innerHTML|outerHTML|insertAdjacentHTML|document\.write|eval\(/);
  assert.match(code, /textContent/);
  // Owner text reaches the DOM only as text or as a form value.
  assert.doesNotMatch(code, /\.srcdoc|dangerouslySet/);
});

test('managed service GET reads only the fixed repository file', async () => {
  const { response, calls } = await callAdmin(await adminRequest('/api/content/services'), [asContents(JSON.stringify(services), SHA)]);
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).data.value, services);
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /\/contents\/src\/data\/services\.json\?ref=/);
});

test('managed service save commits with blob SHA, then reports commit SHA', async () => {
  const next = structuredClone(services);
  next[0].locales.en.title = 'Emergency dental care and advice';
  const { response, calls } = await callAdmin(await adminRequest('/api/content/services', { method: 'PUT', body: { value: next, sha: SHA } }), [asContents(JSON.stringify(services), SHA), asCommit(COMMIT)]);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).data.sha, COMMIT);
  assert.equal(calls.length, 2);
  assert.equal(calls[1].method, 'PUT');
  assert.equal(calls[1].body?.sha, SHA);
  assert.equal(JSON.parse(decodeContent(calls[1].body))[0].locales.en.title, 'Emergency dental care and advice');
  assert.equal(calls[1].body?.branch, adminEnv.CONTENT_BRANCH);
});

test('stale, cross-origin, invalid and claim-bearing edits make no GitHub mutation', async () => {
  const scenarios = [
    { body: { value: services, sha: 'c'.repeat(40) }, code: 409 },
    { body: { value: [{ ...services[0], status: 'published' }], sha: SHA }, code: 422 },
    { body: { value: services.map((item, i) => i ? item : { ...item, slug: 'new-url' }), sha: SHA }, code: 422 },
    { body: { value: services.map((item, i) => i ? item : { ...item, locales: { ...item.locales, en: { ...item.locales.en, summary: 'Guaranteed painless treatment' } } }), sha: SHA }, code: 422 },
  ];
  for (const scenario of scenarios) {
    const { response, calls } = await callAdmin(await adminRequest('/api/content/services', { method: 'PUT', body: scenario.body }), [asContents(JSON.stringify(services), SHA)]);
    assert.equal(response.status, scenario.code);
    assert.equal(calls.length, 1, 'a rejected edit mutated GitHub');
  }
  const wrong = await callAdmin(await adminRequest('/api/content/services', { method: 'PUT', origin: 'https://evil.example', body: { value: services, sha: SHA } }), []);
  assert.equal(wrong.response.status, 403);
  assert.equal(wrong.calls.length, 0);
});

test('owner facts require explicit confirmation before a CHANGE is written', async () => {
  const changedDoctor = { ...doctor, intro: { ...doctor.intro, he: `${doctor.intro.he} ` + 'עדכון' } };
  const changedContact = { ...contact, email: contact.email === 'clinic@example.test' ? '' : 'clinic@example.test' };
  for (const [path, stored, value] of [['doctor', doctor, changedDoctor], ['contact', contact, changedContact]] as const) {
    const { response, calls } = await callAdmin(await adminRequest('/api/content/' + path, { method: 'PUT', body: { value, sha: SHA } }), [asContents(JSON.stringify(stored), SHA)]);
    assert.equal(response.status, 422, path);
    assert.deepEqual((await response.json() as { error: { issues: string[] } }).error.issues, ['owner_confirmation_required']);
    assert.equal(calls.length, 1, `${path}: nothing written`);
  }
});

test('saving unchanged facts needs no confirmation and writes nothing', async () => {
  for (const [path, value] of [['doctor', doctor], ['contact', contact]] as const) {
    const { response, calls } = await callAdmin(await adminRequest('/api/content/' + path, { method: 'PUT', body: { value, sha: SHA } }), [asContents(JSON.stringify(value), SHA)]);
    assert.equal(response.status, 200, path);
    assert.equal((await response.json() as { data: { unchanged: boolean } }).data.unchanged, true);
    assert.equal(calls.length, 1);
  }
});

test('static admin assets are authenticated before fetch and carry private headers', async () => {
  let fetched = 0;
  const env = { ...adminEnv, ASSETS: { fetch: async () => { fetched++; return new Response('<html><script>window.test=1</script></html>', { headers: { 'Content-Type': 'text/html' } }); } } };
  const denied = await callAdmin(new Request(ADMIN_ORIGIN + '/he/'), [], env);
  assert.equal(denied.response.status, 401);
  assert.equal(fetched, 0);
  const allowed = await callAdmin(await adminRequest('/he/'), [], env);
  assert.equal(allowed.response.status, 200);
  assert.equal(fetched, 1);
  assert.equal(allowed.response.headers.get('Cache-Control'), 'no-store');
  assert.equal(allowed.response.headers.get('X-Robots-Tag'), 'noindex, noarchive');
  assert.match(allowed.response.headers.get('Content-Security-Policy') || '', /sha256-/);
  assert.doesNotMatch(allowed.response.headers.get('Content-Security-Policy') || '', /script-src[^;]*unsafe-inline/);
});

test('edit controls name their section in every locale and never fall back to a bare "Edit"', async () => {
  const { readFile } = await import('node:fs/promises');
  const source = await readFile(new URL('../../src/components/editor/EditControl.astro', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /aria-label=/, 'the visible label must be the accessible name');
  assert.match(source, /throw new Error\(`EditControl: no label/);
  for (const key of ["'copy:hero'", "'copy:trust'", "'copy:contact'", 'services:', "'services:item'", 'doctor:', 'faq:', 'photos:', 'hours:', 'contact:']) {
    const line = source.split('\n').find((row) => row.trimStart().startsWith(key));
    assert.ok(line, `missing label row ${key}`);
    for (const locale of ['he:', 'ar:', 'en:']) assert.ok(line.includes(locale), `${key} lacks ${locale}`);
    assert.doesNotMatch(line, /'(עריכה|تعديل|Edit)'/, `${key} uses a generic label`);
  }
});

test('dialog loading is announced in words, decorated silently, and still under reduced motion', async () => {
  const { VISUAL_CLIENT, VISUAL_STYLES } = await import('../../workers/admin/src/ui/visual.ts');
  assert.match(VISUAL_CLIENT, /setAttribute\('aria-busy','true'\)/);
  assert.match(VISUAL_CLIENT, /sk\.setAttribute\('aria-hidden','true'\)/);
  assert.match(VISUAL_CLIENT, /removeAttribute\('aria-busy'\)/);
  assert.match(VISUAL_STYLES, /prefers-reduced-motion:reduce\)\{\.visual-loading::before,\.visual-skeleton span\{animation:none\}/);
});
