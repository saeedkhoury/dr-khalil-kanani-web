import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assertHoursShape, DataShapeError, DAY_ORDER } from '../../src/lib/data-schema.ts';

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
