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

import { LOCALES } from '../i18n/config.ts';
import type { ClinicPhotographRecord } from '../data/media-types.ts';

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

/* -------------------------------------------------------------------------- */
/*  Clinic photography                                                         */
/* -------------------------------------------------------------------------- */

/**
 * The only categories the CMS may write. `treatment-work` is deliberately
 * absent and must stay that way: treatment and patient imagery is
 * developer-managed, reviewed in a pull request, and Israeli dental
 * advertising regulations make publishing it a legal matter rather than an
 * editorial one. scripts/check-assets.mjs enforces the same list at commit
 * time — two gates, one rule.
 */
export const CMS_CATEGORIES = [
  'exterior', 'reception', 'treatment-room', 'equipment',
  'doctor-working', 'team', 'atmosphere',
] as const;

const STATUSES = ['published', 'unpublished'] as const;

/** SVG is excluded: it can carry script, and no photograph is a vector. */
const PHOTO_EXT = ['.jpg', '.jpeg', '.png'] as const;

const RECORD_KEYS = new Set([
  'file', 'category', 'alt', 'caption', 'width', 'height',
  'feature', 'status', 'needsEnglishReview',
]);

/** Validate the CMS photography manifest and return it typed. */
export function assertClinicPhotographyShape(
  value: unknown,
  source = 'src/data/clinic-photography.json',
): ClinicPhotographRecord[] {
  const problems: string[] = [];

  if (!Array.isArray(value)) throw new DataShapeError(source, ['must be a JSON array']);

  const seen = new Set<string>();

  value.forEach((record, i) => {
    const at = `record ${i + 1}`;

    if (record === null || typeof record !== 'object' || Array.isArray(record)) {
      problems.push(`${at}: must be an object`);
      return;
    }
    for (const key of Object.keys(record)) {
      if (!RECORD_KEYS.has(key)) problems.push(`${at}: unknown field "${key}"`);
    }

    const r = record as Record<string, unknown>;
    const { file, category, status, alt, width, height, needsEnglishReview } = r;

    // ── file: a bare filename, and the record's stable identity ──
    if (typeof file !== 'string' || file === '') {
      problems.push(`${at}: "file" is required and must be a non-empty string`);
    } else {
      if (file.includes('/') || file.includes('\\') || file.includes('..')) {
        problems.push(`${at}: "file" must be a bare filename — no "/", "\\" or ".."`);
      }
      if (!PHOTO_EXT.some((ext) => file.toLowerCase().endsWith(ext))) {
        problems.push(`${at}: "file" must end in ${PHOTO_EXT.join(', ')} — SVG can carry script`);
      }
      // `file` IS the identity; there is no separate id. Two records naming
      // one image make unpublishing appear to do nothing.
      if (seen.has(file)) problems.push(`${at}: "${file}" is registered more than once`);
      seen.add(file);
    }

    if (!(CMS_CATEGORIES as readonly string[]).includes(category as string)) {
      problems.push(
        `${at}: category ${JSON.stringify(category)} is not one the CMS may write ` +
          `(${CMS_CATEGORIES.join(', ')}). Treatment work is developer-managed.`,
      );
    }

    // Required, not defaulted: an absent state is ambiguous, and guessing
    // "published" would publish something nobody chose to publish.
    if (!(STATUSES as readonly string[]).includes(status as string)) {
      problems.push(`${at}: "status" is required and must be ${STATUSES.join(' or ')}`);
    }

    for (const [name, n] of [['width', width], ['height', height]] as const) {
      if (typeof n !== 'number' || !Number.isInteger(n) || n <= 0) {
        problems.push(`${at}: "${name}" must be a positive integer — the grid reserves space with it (CLS)`);
      }
    }

    // These images are meaningful, never decorative, so an empty alt is never
    // correct in any locale.
    if (alt === null || typeof alt !== 'object' || Array.isArray(alt)) {
      problems.push(`${at}: "alt" must be an object with he, ar and en`);
    } else {
      for (const locale of LOCALES) {
        const text = (alt as Record<string, unknown>)[locale];
        if (typeof text !== 'string' || text.trim() === '') {
          problems.push(`${at}: "alt.${locale}" is required and must not be empty`);
        }
      }
    }

    if (needsEnglishReview !== undefined && typeof needsEnglishReview !== 'boolean') {
      problems.push(`${at}: "needsEnglishReview" must be true or false when present`);
    }
  });

  if (problems.length > 0) throw new DataShapeError(source, problems);
  return value as ClinicPhotographRecord[];
}
