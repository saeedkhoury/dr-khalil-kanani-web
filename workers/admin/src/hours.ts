/**
 * OPENING HOURS — validation and serialisation for the admin API.
 *
 * ── TWO RULE SETS, AND WHY ────────────────────────────────────────────────
 * The build's schema (src/lib/data-schema.ts) accepts an open day with no
 * times, because "not yet supplied" is the state the site legitimately ships
 * in and hasHours() hides the block.
 *
 * The admin API is STRICTER: if the doctor says a day is open, he must say
 * when. A half-filled row saved from the panel would be an accident, not a
 * state anyone chose — he was looking at the form when he did it.
 *
 * ── NO DRIFT ──────────────────────────────────────────────────────────────
 * The final gate is the BUILD'S OWN validator, imported rather than
 * reimplemented. That guarantees the Worker cannot commit hours the build
 * would then reject — which would fail the publication and leave the doctor
 * with a change that silently never went live.
 */

import { assertHoursShape, DAY_ORDER, DataShapeError, type OpeningHoursRow } from '../../../src/lib/data-schema.ts';

/** Zero-padded 24-hour. Lexical order is chronological order. */
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

const ROW_KEYS = new Set(['day', 'opens', 'closes', 'closed']);

/**
 * Stable keys, never sentences. The Hebrew lives in the UI so there is one
 * place it can be wrong, and the Worker carries no display text.
 */
export type HoursIssue = string;

export type HoursValidation =
  | { ok: true; rows: OpeningHoursRow[] }
  | { ok: false; issues: HoursIssue[] };

/**
 * Validate a payload from the panel and return rows ready to serialise.
 *
 * Closed days are NORMALISED rather than rejected: the form disables the time
 * inputs when a day is marked closed, and whatever they last held is
 * meaningless. Blanking them is what the doctor intended by ticking the box.
 */
export function validateHoursPayload(value: unknown): HoursValidation {
  const issues: HoursIssue[] = [];

  if (!Array.isArray(value)) return { ok: false, issues: ['not_an_array'] };
  if (value.length !== DAY_ORDER.length) return { ok: false, issues: ['wrong_row_count'] };

  const rows: OpeningHoursRow[] = [];

  value.forEach((raw, i) => {
    const expected = DAY_ORDER[i];
    const at = `row_${i}`;

    if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
      issues.push(`${at}_not_an_object`);
      return;
    }
    for (const key of Object.keys(raw)) {
      if (!ROW_KEYS.has(key)) issues.push(`${at}_unknown_field_${key}`);
    }

    const { day, opens, closes, closed } = raw as Record<string, unknown>;

    // Day order is structural: the panel renders seven fixed rows, so a
    // mismatch is a malformed payload rather than something to report per
    // field.
    if (day !== expected) {
      issues.push(`${at}_wrong_day`);
      return;
    }
    if (typeof closed !== 'boolean') {
      issues.push(`${at}_closed_not_boolean`);
      return;
    }

    if (closed) {
      rows.push({ day: expected, opens: '', closes: '', closed: true });
      return;
    }

    if (typeof opens !== 'string' || typeof closes !== 'string') {
      issues.push(`${at}_times_not_strings`);
      return;
    }

    const from = opens.trim();
    const to = closes.trim();

    // THE ADMIN-ONLY RULE. An open day must say when.
    if (from === '' || to === '') {
      issues.push(`${at}_times_required`);
      return;
    }
    if (!TIME.test(from) || !TIME.test(to)) {
      issues.push(`${at}_time_malformed`);
      return;
    }
    if (from >= to) {
      issues.push(`${at}_opens_after_closes`);
      return;
    }

    rows.push({ day: expected, opens: from, closes: to, closed: false });
  });

  if (issues.length > 0) return { ok: false, issues };

  // FINAL GATE: the build's own validator. If this throws, the Worker was
  // about to commit something `npm run build` would reject.
  try {
    assertHoursShape(rows, 'admin payload');
  } catch (error) {
    return {
      ok: false,
      issues: error instanceof DataShapeError ? ['build_schema_rejected'] : ['build_schema_rejected'],
    };
  }

  return { ok: true, rows };
}

/**
 * Exactly the formatting the repository already uses, so a CMS commit's diff
 * shows the lines that changed and nothing else.
 */
export function serialiseHours(rows: readonly OpeningHoursRow[]): string {
  return `${JSON.stringify(rows, null, 2)}\n`;
}

/** Parse what the repository currently holds, for GET and for rendering. */
export function parseHours(text: string): OpeningHoursRow[] | null {
  try {
    return assertHoursShape(JSON.parse(text), 'repository hours.json');
  } catch {
    return null;
  }
}
