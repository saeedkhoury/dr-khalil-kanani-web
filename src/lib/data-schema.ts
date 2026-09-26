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
import type { ClinicPhotographRecord, TreatmentWorkRecord } from '../data/media-types.ts';

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
 * Clinic-photography categories. `treatment-work` is deliberately absent:
 * treatment imagery is a separate collection (src/data/treatment-work.json,
 * ADR 0010) with its own rules, and a result photograph must never become
 * clinic photography. scripts/check-assets.mjs enforces the same list at
 * commit time — two gates, one rule.
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
  'feature', 'status', 'needsEnglishReview', 'frame',
]);

/** Limits of the stored framing; the editor and the Worker use the same ones. */
export const FRAME_LIMITS = { min: 0, max: 100, minZoom: 1, maxZoom: 3 } as const;

/**
 * Problems with a photo's framing, or none. Exactly three finite numbers in
 * range — no CSS, no units, nothing else — because these become inline style
 * on the public page.
 */
export function frameProblems(frame: unknown): string[] {
  if (frame === undefined) return [];
  if (frame === null || typeof frame !== 'object' || Array.isArray(frame)) return ['"frame" must be an object'];
  const f = frame as Record<string, unknown>;
  const problems: string[] = [];
  for (const key of Object.keys(f)) if (!['x', 'y', 'zoom'].includes(key)) problems.push(`"frame" has unknown field "${key}"`);
  for (const key of ['x', 'y'] as const) {
    const n = f[key];
    if (typeof n !== 'number' || !Number.isFinite(n) || n < FRAME_LIMITS.min || n > FRAME_LIMITS.max) problems.push(`"frame.${key}" must be a number from 0 to 100`);
  }
  const z = f.zoom;
  if (typeof z !== 'number' || !Number.isFinite(z) || z < FRAME_LIMITS.minZoom || z > FRAME_LIMITS.maxZoom) problems.push('"frame.zoom" must be a number from 1 to 3');
  return problems;
}

/** Every doctor's-work file starts with this; no clinic file may. */
export const WORK_PREFIX = 'work';

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
        `${at}: category ${JSON.stringify(category)} is not a clinic-photography category ` +
          `(${CMS_CATEGORIES.join(', ')}). Treatment work has its own collection.`,
      );
    }
    // The two galleries never share a file: deleting from one can then never
    // break the other.
    if (typeof file === 'string' && file.startsWith(`${WORK_PREFIX}-`)) {
      problems.push(`${at}: "${file}" is a doctor's-work file and cannot be clinic photography`);
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

    for (const problem of frameProblems(r.frame)) problems.push(`${at}: ${problem}`);

    if (needsEnglishReview !== undefined && typeof needsEnglishReview !== 'boolean') {
      problems.push(`${at}: "needsEnglishReview" must be true or false when present`);
    }
    if (status === 'published' && needsEnglishReview === true) {
      problems.push(`${at}: English alt text must be reviewed before publication`);
    }
  });

  if (problems.length > 0) throw new DataShapeError(source, problems);
  return value as ClinicPhotographRecord[];
}

/* -------------------------------------------------------------------------- */
/*  Doctor's work (treatment work)                                            */
/* -------------------------------------------------------------------------- */

const WORK_KEYS = new Set([
  'id', 'file', 'category', 'width', 'height', 'status',
  'provenance', 'sourcePostUrl', 'alt', 'caption',
]);
const PROVENANCES = ['instagram-post', 'owner-supplied'] as const;
const WORK_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const INSTAGRAM_POST = /^https:\/\/www\.instagram\.com\/p\/[A-Za-z0-9_-]+\/$/;

/** A localized text object: all three languages, none empty. */
function localizedProblems(value: unknown, name: string): string[] {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return [`"${name}" must be an object with he, ar and en`];
  const problems: string[] = [];
  for (const key of Object.keys(value)) if (!(LOCALES as readonly string[]).includes(key)) problems.push(`"${name}" has unknown language "${key}"`);
  for (const locale of LOCALES) {
    const text = (value as Record<string, unknown>)[locale];
    if (typeof text !== 'string' || text.trim() === '') problems.push(`"${name}.${locale}" is required and must not be empty`);
  }
  return problems;
}

/**
 * Validate the doctor's-work manifest (src/data/treatment-work.json) and
 * return it typed.
 *
 * Written by the CMS since ADR 0010, so it gets the checks a machine-written
 * file needs: a stable id and a bare, prefixed filename per record, both
 * unique; the whole artwork's dimensions; an explicit publication state; alt
 * text in all three languages. A title (caption) is optional, but never
 * partial. No framing: this gallery always shows the complete artwork.
 */
export function assertTreatmentWorkShape(
  value: unknown,
  source = 'src/data/treatment-work.json',
): TreatmentWorkRecord[] {
  const problems: string[] = [];
  if (!Array.isArray(value)) throw new DataShapeError(source, ['must be a JSON array']);
  const files = new Set<string>();
  const ids = new Set<string>();

  value.forEach((record, i) => {
    const at = `record ${i + 1}`;
    if (record === null || typeof record !== 'object' || Array.isArray(record)) {
      problems.push(`${at}: must be an object`);
      return;
    }
    for (const key of Object.keys(record)) if (!WORK_KEYS.has(key)) problems.push(`${at}: unknown field "${key}"`);
    const r = record as Record<string, unknown>;

    if (typeof r.id !== 'string' || !WORK_ID.test(r.id)) problems.push(`${at}: "id" must be lowercase letters, digits and hyphens`);
    else if (ids.has(r.id)) problems.push(`${at}: id "${r.id}" is used more than once`);
    else ids.add(r.id);

    const file = r.file;
    if (typeof file !== 'string' || file === '') {
      problems.push(`${at}: "file" is required and must be a non-empty string`);
    } else {
      if (file.includes('/') || file.includes('\\') || file.includes('..')) problems.push(`${at}: "file" must be a bare filename`);
      if (!PHOTO_EXT.some((ext) => file.toLowerCase().endsWith(ext))) problems.push(`${at}: "file" must end in ${PHOTO_EXT.join(', ')}`);
      if (!file.startsWith(`${WORK_PREFIX}-`)) problems.push(`${at}: "file" must start with "${WORK_PREFIX}-" — the two galleries never share a file`);
      if (files.has(file)) problems.push(`${at}: "${file}" is registered more than once`);
      files.add(file);
    }

    if (r.category !== 'treatment-work') problems.push(`${at}: "category" must be "treatment-work"`);
    if (!(STATUSES as readonly string[]).includes(r.status as string)) problems.push(`${at}: "status" is required and must be ${STATUSES.join(' or ')}`);
    for (const name of ['width', 'height'] as const) {
      const n = r[name];
      if (typeof n !== 'number' || !Number.isInteger(n) || n <= 0) problems.push(`${at}: "${name}" must be a positive integer`);
    }
    if (!(PROVENANCES as readonly string[]).includes(r.provenance as string)) problems.push(`${at}: "provenance" must be ${PROVENANCES.join(' or ')}`);
    // A source link is evidence only for a post that was matched to it.
    if (r.sourcePostUrl !== undefined) {
      if (r.provenance !== 'instagram-post') problems.push(`${at}: only an instagram-post may carry "sourcePostUrl"`);
      if (typeof r.sourcePostUrl !== 'string' || !INSTAGRAM_POST.test(r.sourcePostUrl)) problems.push(`${at}: "sourcePostUrl" must be an Instagram post URL`);
    }
    for (const problem of localizedProblems(r.alt, 'alt')) problems.push(`${at}: ${problem}`);
    if (r.caption !== undefined) for (const problem of localizedProblems(r.caption, 'caption')) problems.push(`${at}: ${problem}`);
  });

  if (problems.length > 0) throw new DataShapeError(source, problems);
  return value as TreatmentWorkRecord[];
}
