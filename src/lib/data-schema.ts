/**
 * RUNTIME SHAPE VALIDATION for the JSON data files the admin CMS writes.
 *
 * ── WHY THIS EXISTS ───────────────────────────────────────────────────────
 * Everything else in src/data/ is TypeScript, so `astro check` catches a bad
 * edit before it can render. JSON has no such guarantee: a hand-edit, a merge
 * resolved badly, or a CMS write that half-succeeded all produce a file that
 * parses fine and renders wrongly. Opening hours rendering wrongly means a
 * real patient arrives at a locked door.
 *
 * So the shape is asserted at build time instead, and the build fails loudly.
 *
 * ── ONE IMPLEMENTATION ────────────────────────────────────────────────────
 * These functions are the ONLY place the rules live. They are called from:
 *
 *   • astro.config.mjs   — the launch-gate integration, so every build checks
 *   • scripts/lint-data.mjs — `npm run lint:data`, so `npm run verify` and CI
 *                             report it as a named step rather than as an
 *                             opaque build failure
 *   • tests/unit/data-schema.test.ts
 *
 * CI and the build must never validate by different rules; that is how a
 * green pipeline starts disagreeing with what actually ships.
 */

/**
 * Sunday-first, per the Israeli working week. The order is SIGNIFICANT —
 * the renderer trusts array position and does not sort.
 */
export const DAY_ORDER = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
] as const;

export type Day = (typeof DAY_ORDER)[number];

export interface OpeningHoursRow {
  day: Day;
  /** "HH:MM", 24-hour, zero-padded. "" means not yet supplied. */
  opens: string;
  closes: string;
  closed: boolean;
}

const ROW_KEYS = new Set(['day', 'opens', 'closes', 'closed']);

/**
 * Zero-padded 24-hour time. Zero-padding is not cosmetic: it makes lexical
 * comparison equal chronological comparison, so `opens < closes` needs no
 * parsing. "24:00" is rejected — midnight is "00:00".
 */
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Thrown with every problem found, not just the first. */
export class DataShapeError extends Error {
  readonly problems: readonly string[];
  constructor(source: string, problems: readonly string[]) {
    super(
      `\n[data schema] ${source} has ${problems.length} problem(s):\n\n` +
        problems.map((p) => `  - ${p}`).join('\n') +
        `\n\nFix the file, or restore it from git. This data is published as\n` +
        `fact about a real clinic, so it fails the build rather than render.\n`,
    );
    this.name = 'DataShapeError';
    this.problems = problems;
  }
}

/**
 * Validate opening hours and return them typed.
 *
 * Throws DataShapeError listing every problem, so one run tells you
 * everything that is wrong rather than one thing at a time.
 */
export function assertHoursShape(value: unknown, source = 'src/data/hours.json'): OpeningHoursRow[] {
  const problems: string[] = [];

  if (!Array.isArray(value)) {
    throw new DataShapeError(source, ['must be a JSON array']);
  }
  if (value.length !== DAY_ORDER.length) {
    // Without exactly seven rows nothing below is meaningful, so stop here.
    throw new DataShapeError(source, [
      `must contain exactly ${DAY_ORDER.length} rows, one per day — found ${value.length}`,
    ]);
  }

  value.forEach((row, i) => {
    const expected = DAY_ORDER[i];
    const at = `row ${i + 1}`;

    if (row === null || typeof row !== 'object' || Array.isArray(row)) {
      problems.push(`${at}: must be an object`);
      return;
    }

    // Unknown keys are refused rather than ignored. This file is written by a
    // machine; a key nobody reads is a CMS bug that would otherwise sit
    // silently in the data until someone wondered why a setting did nothing.
    for (const key of Object.keys(row)) {
      if (!ROW_KEYS.has(key)) problems.push(`${at}: unknown field "${key}"`);
    }

    const { day, opens, closes, closed } = row as Record<string, unknown>;

    if (day !== expected) {
      problems.push(`${at}: expected "${expected}" (the week runs Sunday→Saturday) but found ${JSON.stringify(day)}`);
    }
    if (typeof closed !== 'boolean') {
      problems.push(`${at} (${expected}): "closed" must be true or false`);
    }
    if (typeof opens !== 'string' || typeof closes !== 'string') {
      problems.push(`${at} (${expected}): "opens" and "closes" must be strings`);
      return;
    }

    for (const [name, time] of [['opens', opens], ['closes', closes]] as const) {
      if (time !== '' && !TIME.test(time)) {
        problems.push(
          `${at} (${expected}): "${name}" must be zero-padded 24-hour "HH:MM" or "" — found ${JSON.stringify(time)}`,
        );
      }
    }

    if (closed === true) {
      if (opens !== '' || closes !== '') {
        problems.push(`${at} (${expected}): a closed day must have empty "opens" and "closes"`);
      }
      return;
    }

    // An open day is either NOT YET SUPPLIED (both empty — the state the site
    // ships in today, which hasHours() hides) or fully supplied. Exactly one
    // filled is a half-finished edit, and that is what this catches.
    if ((opens === '') !== (closes === '')) {
      problems.push(
        `${at} (${expected}): give both "opens" and "closes", or neither — found only ${opens === '' ? 'closes' : 'opens'}`,
      );
      return;
    }
    if (opens !== '' && TIME.test(opens) && TIME.test(closes) && opens >= closes) {
      problems.push(`${at} (${expected}): "opens" (${opens}) must be earlier than "closes" (${closes})`);
    }
  });

  if (problems.length > 0) throw new DataShapeError(source, problems);
  return value as OpeningHoursRow[];
}
