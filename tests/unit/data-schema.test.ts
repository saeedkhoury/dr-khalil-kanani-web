import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  assertClinicPhotographyShape,
  assertHoursShape,
  CMS_CATEGORIES,
  DataShapeError,
  DAY_ORDER,
} from '../../src/lib/data-schema.ts';

/** A full valid week, overridable per day index. */
const week = (over: Record<number, Record<string, unknown>> = {}) =>
  DAY_ORDER.map((day, i) => ({
    day,
    opens: '08:00',
    closes: '17:00',
    closed: false,
    ...(over[i] ?? {}),
  }));

/** Assert the call fails, and return the problems for inspection. */
function problemsOf(value: unknown): readonly string[] {
  try {
    assertHoursShape(value, 'fixture');
  } catch (error) {
    assert.ok(error instanceof DataShapeError, `expected DataShapeError, got ${error}`);
    return error.problems;
  }
  assert.fail('expected the shape assertion to throw, but it passed');
}

test('accepts a fully specified week', () => {
  const valid = week({ 6: { opens: '', closes: '', closed: true } });
  assert.deepEqual(assertHoursShape(valid, 'fixture'), valid);
});

test('accepts the placeholder week the site ships with — no hours supplied yet', () => {
  // Every weekday open-but-empty. This is the CURRENT state of hours.json and
  // must stay valid: "not yet supplied" is not the same as malformed.
  const pending = DAY_ORDER.map((day) => ({
    day,
    opens: '',
    closes: '',
    closed: day === 'Saturday',
  }));
  assert.deepEqual(assertHoursShape(pending, 'fixture'), pending);
});

test('rejects anything that is not an array', () => {
  for (const bad of [null, 42, 'Sunday 9-5', { Sunday: '9-5' }]) {
    assert.match(problemsOf(bad).join('\n'), /must be a JSON array/);
  }
});

test('requires exactly seven rows', () => {
  assert.match(problemsOf(week().slice(0, 6)).join('\n'), /exactly 7 rows/);
  assert.match(problemsOf([...week(), week()[0]]).join('\n'), /exactly 7 rows/);
});

test('requires Sunday-to-Saturday order — the renderer trusts position', () => {
  const swapped = week();
  [swapped[1], swapped[2]] = [swapped[2], swapped[1]];
  const problems = problemsOf(swapped).join('\n');
  assert.match(problems, /expected "Monday"/);
  assert.match(problems, /expected "Tuesday"/);
});

test('rejects a duplicated day', () => {
  assert.match(problemsOf(week({ 2: { day: 'Monday' } })).join('\n'), /expected "Tuesday"/);
});

test('a closed day must carry no times', () => {
  const problems = problemsOf(week({ 6: { closed: true } })).join('\n');
  assert.match(problems, /closed day must have empty/);
});

test('an open day must have both times or neither, never one', () => {
  assert.match(problemsOf(week({ 0: { closes: '' } })).join('\n'), /found only opens/);
  assert.match(problemsOf(week({ 0: { opens: '' } })).join('\n'), /found only closes/);
});

test('rejects times that are not zero-padded 24-hour HH:MM', () => {
  // "9:00" and "0900" break lexical=chronological ordering; "24:00" is not a
  // time this clock has — midnight is "00:00".
  for (const bad of ['9:00', '0900', '24:00', '08:60', '8am', '08:00:00']) {
    assert.match(problemsOf(week({ 0: { opens: bad } })).join('\n'), /zero-padded 24-hour/, `accepted ${bad}`);
  }
});

test('rejects an opening time at or after the closing time', () => {
  assert.match(problemsOf(week({ 0: { opens: '17:00', closes: '09:00' } })).join('\n'), /must be earlier than/);
  assert.match(problemsOf(week({ 0: { opens: '09:00', closes: '09:00' } })).join('\n'), /must be earlier than/);
});

test('rejects an unknown field rather than ignoring it', () => {
  // A machine writes this file. A key nobody reads is a CMS bug, and silently
  // ignoring it means the bug lives in the data until someone wonders why a
  // setting does nothing.
  assert.match(problemsOf(week({ 3: { lunchBreak: '13:00' } })).join('\n'), /unknown field "lunchBreak"/);
});

test('reports every problem at once, not just the first', () => {
  const problems = problemsOf(week({ 0: { opens: '9:00' }, 3: { closes: '' }, 5: { extra: 1 } }));
  assert.ok(problems.length >= 3, `expected several problems, got ${problems.length}`);
});

/* ────────────────────────────────────────────────────────────────────────────
   Clinic photography — the manifest the admin CMS writes.
   ──────────────────────────────────────────────────────────────────────── */

/** A valid record, overridable per test. */
const photo = (over: Record<string, unknown> = {}) => ({
  file: 'reception-01.jpg',
  category: 'reception',
  width: 2400,
  height: 1600,
  status: 'published',
  alt: { he: 'אזור ההמתנה', ar: 'منطقة الانتظار', en: 'The waiting area' },
  ...over,
});

function photoProblems(value: unknown): readonly string[] {
  try {
    assertClinicPhotographyShape(value, 'fixture');
  } catch (error) {
    assert.ok(error instanceof DataShapeError, `expected DataShapeError, got ${error}`);
    return error.problems;
  }
  assert.fail('expected the shape assertion to throw, but it passed');
}

test('accepts an empty manifest — the state the site ships in', () => {
  assert.deepEqual(assertClinicPhotographyShape([], 'fixture'), []);
});

test('accepts a valid published record', () => {
  const records = [photo()];
  assert.deepEqual(assertClinicPhotographyShape(records, 'fixture'), records);
});

test('accepts both publication states', () => {
  for (const status of ['published', 'unpublished']) {
    assert.doesNotThrow(() => assertClinicPhotographyShape([photo({ status })], 'fixture'));
  }
});

test('status is required and constrained — an absent state is ambiguous', () => {
  const { status: _omitted, ...withoutStatus } = photo();
  assert.match(photoProblems([withoutStatus]).join('\n'), /"status" is required/);
  assert.match(photoProblems([photo({ status: 'draft' })]).join('\n'), /"status" is required/);
  assert.match(photoProblems([photo({ status: true })]).join('\n'), /"status" is required/);
});

test('rejects treatment-work — the CMS may never publish patient imagery', () => {
  // THE test. Treatment and patient photography is developer-managed and
  // legally constrained; the CMS writes clinic photography and nothing else.
  const problems = photoProblems([photo({ category: 'treatment-work' })]).join('\n');
  assert.match(problems, /not one the CMS may write/);
  assert.match(problems, /treatment-work/);
});

test('rejects any category outside the clinic-photography union', () => {
  for (const bad of ['hero', 'portrait', 'illustration', 'patient', '', null]) {
    assert.match(photoProblems([photo({ category: bad })]).join('\n'), /not one the CMS may write/, `accepted ${bad}`);
  }
});

test('accepts every category the CMS is allowed to write', () => {
  for (const category of CMS_CATEGORIES) {
    assert.doesNotThrow(
      () => assertClinicPhotographyShape([photo({ category })], 'fixture'),
      `rejected permitted category ${category}`,
    );
  }
});

test('requires non-empty alt text in all three locales', () => {
  for (const locale of ['he', 'ar', 'en']) {
    const alt = { he: 'א', ar: 'ب', en: 'c', [locale]: '   ' };
    assert.match(photoProblems([photo({ alt })]).join('\n'), new RegExp(`"alt\\.${locale}"`));
  }
  assert.match(photoProblems([photo({ alt: 'a string' })]).join('\n'), /must be an object with he, ar and en/);
});

test('needsEnglishReview is optional — absent is the normal end state', () => {
  assert.doesNotThrow(() => assertClinicPhotographyShape([photo()], 'fixture'));
  assert.doesNotThrow(() => assertClinicPhotographyShape([photo({ needsEnglishReview: true })], 'fixture'));
  assert.doesNotThrow(() => assertClinicPhotographyShape([photo({ needsEnglishReview: false })], 'fixture'));
  assert.match(photoProblems([photo({ needsEnglishReview: 'yes' })]).join('\n'), /must be true or false/);
});

test('rejects a path-shaped or non-photographic file name', () => {
  for (const bad of ['../../.github/workflows/deploy.yml', 'sub/dir.jpg', '..\\evil.jpg']) {
    assert.match(photoProblems([photo({ file: bad })]).join('\n'), /bare filename/, `accepted ${bad}`);
  }
  for (const bad of ['reception-01.svg', 'reception-01.webp', 'reception-01']) {
    assert.match(photoProblems([photo({ file: bad })]).join('\n'), /must end in/, `accepted ${bad}`);
  }
});

test('rejects the same file registered twice — file IS the identity', () => {
  // Two records naming one image would make unpublishing appear to do nothing.
  const problems = photoProblems([photo(), photo({ status: 'unpublished' })]).join('\n');
  assert.match(problems, /registered more than once/);
});

test('requires positive integer dimensions so the grid can reserve space', () => {
  for (const bad of [0, -1, 1.5, '2400', null]) {
    assert.match(photoProblems([photo({ width: bad })]).join('\n'), /"width" must be a positive integer/, `accepted ${bad}`);
  }
});

test('rejects an unknown field rather than ignoring it', () => {
  assert.match(photoProblems([photo({ sortIndex: 3 })]).join('\n'), /unknown field "sortIndex"/);
});

test('rejects anything that is not an array', () => {
  assert.match(photoProblems({ 'reception-01.jpg': {} }).join('\n'), /must be a JSON array/);
});

/* ────────────────────────────────────────────────────────────────────────────
   M-3: the data gate must run in CI.

   Relying on the build to throw on import is not a substitute: it reports a
   malformed manifest as a stack trace from inside `astro build`, which is
   exactly what a named step exists to avoid.
   ──────────────────────────────────────────────────────────────────────── */

test('both workflows run lint:data before the expensive steps', async () => {
  const { readFile } = await import('node:fs/promises');
  for (const workflow of ['deploy.yml', 'preview.yml']) {
    const yaml = await readFile(new URL(`../../.github/workflows/${workflow}`, import.meta.url), 'utf8');
    assert.match(yaml, /npm run lint:data/, `${workflow} does not run lint:data`);
    // Cheapest gate first: a CMS commit is likeliest to fail this one, and
    // there is no value in type-checking or building before it.
    const data = yaml.indexOf('npm run lint:data');
    for (const later of ['npm run check', 'npm test', 'npm run build']) {
      const at = yaml.indexOf(later);
      if (at !== -1) assert.ok(data < at, `${workflow}: lint:data must precede ${later}`);
    }
  }
});

test('lint:data is part of npm run verify', async () => {
  const { readFile } = await import('node:fs/promises');
  const pkg = JSON.parse(await readFile(new URL('../../package.json', import.meta.url), 'utf8'));
  assert.match(pkg.scripts.verify, /lint:data/);
});
