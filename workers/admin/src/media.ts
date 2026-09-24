/**
 * CLINIC PHOTOGRAPHY — validation, filename generation and record mutation.
 *
 * ── WHAT THE CMS MAY NEVER DO ─────────────────────────────────────────────
 * Create anything outside ClinicPhotographyCategory. treatment-work is not a
 * category this module can produce, and that is enforced three ways: the
 * allow-list below, the shared build schema, and — structurally — the fact
 * that treatmentWork lives inline in media.ts, which is not on the Worker's
 * path allow-list. The Worker cannot write that file at all.
 *
 * ── FILENAMES ARE GENERATED HERE ──────────────────────────────────────────
 * The client never sends, sees, or influences a repository path. It sends a
 * category and bytes; this module decides what the file is called, using the
 * real format from the image's own header rather than the uploader's claim.
 */

import { CMS_CATEGORIES, assertClinicPhotographyShape } from '../../../src/lib/data-schema.ts';
import { blockingClaims } from '../../../src/lib/claims.ts';
import type { ClinicPhotographRecord } from '../../../src/data/media-types.ts';
import { inspectImage, type ImageInfo } from './image.ts';

/** 8 MB. A clinic photograph from any phone is well under this. */
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

/**
 * The long edge must be at least this. Below it the image cannot fill a
 * hero or a grid tile on a modern display without visible softness, and a
 * blurry clinic is worse than no photograph.
 */
export const MIN_LONG_EDGE = 1200;

export type MediaIssue = string;

export interface UploadRequest {
  category: unknown;
  /** Raw file bytes, already base64-decoded by the route. */
  bytes: Uint8Array;
  altHe: unknown;
  altAr: unknown;
  altEn: unknown;
  /** The patient-content confirmation. Must be exactly true. */
  confirmed: unknown;
}

export type UploadValidation =
  | { ok: true; record: ClinicPhotographRecord; image: ImageInfo }
  | { ok: false; issues: MediaIssue[] };

const isFilledString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim() !== '';

/**
 * The lowest free two-digit index for a category.
 *
 * Gaps are REUSED. Deleting `reception-02` and adding a photograph should
 * produce `reception-02` again rather than climbing forever — the index is a
 * slot, not an audit trail, and git already records history.
 */
export function nextFilename(
  category: string,
  taken: readonly string[],
  extension: 'jpg' | 'png',
): string | null {
  const used = new Set(
    taken
      .map((file) => new RegExp(`^${category}-(\\d{2})\\.(?:jpg|jpeg|png)$`).exec(file)?.[1])
      .filter((index): index is string => index !== undefined),
  );
  for (let i = 1; i <= 99; i += 1) {
    const index = String(i).padStart(2, '0');
    if (!used.has(index)) return `${category}-${index}.${extension}`;
  }
  // 99 photographs in one category is not a state to handle silently.
  return null;
}

/**
 * Validate an upload and build the record that would be stored.
 *
 * Every check that matters runs on the BYTES, not on what the client said
 * about them.
 */
export function validateUpload(request: UploadRequest, existing: readonly string[]): UploadValidation {
  const issues: MediaIssue[] = [];

  // ── The confirmation gates everything else ──
  // Not a formality: it is the moment the doctor is asked whether the image
  // shows a patient. It is checked server-side because a client-side gate
  // only stops the honest path.
  if (request.confirmed !== true) issues.push('confirmation_required');

  if (typeof request.category !== 'string' || !(CMS_CATEGORIES as readonly string[]).includes(request.category)) {
    issues.push('category_not_allowed');
  }

  if (!isFilledString(request.altHe)) issues.push('alt_he_required');
  if (!isFilledString(request.altAr)) issues.push('alt_ar_required');
  if (!isFilledString(request.altEn)) issues.push('alt_en_required');
  else if (!/[A-Za-z]/.test(request.altEn) || /[\u0590-\u05ff\u0600-\u06ff]/.test(request.altEn)) issues.push('alt_en_not_english');

  // ── The same rules CI enforces, applied before a commit exists ──
  //
  // CI is still the authoritative control: it runs on whatever actually
  // reaches the repository, including a hand edit this Worker never saw. But
  // learning about a prohibited claim three minutes later as "checks_failed",
  // with the photograph already committed, is a bad way to find out. This
  // tells the doctor at the moment he presses save.
  //
  // It imports the SAME rule list rather than restating it. A second copy
  // would drift, and a drifted copy reports "checked" while checking
  // something else.
  for (const [locale, text] of [['he', request.altHe], ['ar', request.altAr], ['en', request.altEn]] as const) {
    if (!isFilledString(text)) continue;
    for (const finding of blockingClaims(text)) {
      issues.push(`alt_${locale}_claim_${finding.rule.replace(/-/g, '_')}`);
    }
  }

  if (request.bytes.length === 0) issues.push('file_required');
  else if (request.bytes.length > MAX_IMAGE_BYTES) issues.push('file_too_large');

  // ── THE control: what the bytes actually are ──
  const image = request.bytes.length > 0 ? inspectImage(request.bytes) : null;
  if (request.bytes.length > 0 && image === null) {
    // Covers SVG, GIF, WebP, HTML, a renamed script, and a truncated JPEG.
    issues.push('unsupported_format');
  } else if (image !== null && Math.max(image.width, image.height) < MIN_LONG_EDGE) {
    issues.push('image_too_small');
  }

  if (issues.length > 0 || image === null) {
    return { ok: false, issues: issues.length > 0 ? issues : ['unsupported_format'] };
  }

  const category = request.category as string;
  const file = nextFilename(category, existing, image.extension);
  if (file === null) return { ok: false, issues: ['category_full'] };

  const he = (request.altHe as string).trim();
  const ar = (request.altAr as string).trim();
  const en = (request.altEn as string).trim();

  const record: ClinicPhotographRecord = {
    file,
    category: category as ClinicPhotographRecord['category'],
    width: image.width,
    height: image.height,
    status: 'unpublished',
    alt: { he, ar, en },
  };

  return { ok: true, record, image };
}

/* -------------------------------------------------------------------------- */
/*  Record mutation — always wholesale, never in place                         */
/* -------------------------------------------------------------------------- */

/** Parse the repository manifest, refusing anything the build would reject. */
export function parseRecords(text: string): ClinicPhotographRecord[] | null {
  try {
    return assertClinicPhotographyShape(JSON.parse(text), 'repository clinic-photography.json');
  } catch {
    return null;
  }
}

export function serialiseRecords(records: readonly ClinicPhotographRecord[]): string {
  return `${JSON.stringify(records, null, 2)}\n`;
}

/** Append a record. New photographs go last; array order is display order. */
export function addRecord(
  records: readonly ClinicPhotographRecord[],
  record: ClinicPhotographRecord,
): ClinicPhotographRecord[] | null {
  // `file` is the identity. Two records naming one image would make
  // unpublishing appear to do nothing.
  if (records.some((r) => r.file === record.file)) return null;
  return [...records, record];
}

/**
 * Change a record's publication state.
 *
 * Unpublishing keeps the record and the file — it must be reversible, and
 * only a deliberate delete removes anything.
 */
export function setStatus(
  records: readonly ClinicPhotographRecord[],
  file: string,
  status: 'published' | 'unpublished',
): ClinicPhotographRecord[] | null {
  if (!records.some((r) => r.file === file)) return null;
  if (status === 'published' && records.some((r) => r.file === file && r.needsEnglishReview === true)) return null;
  return records.map((r) => (r.file === file ? { ...r, status } : r));
}

/**
 * Remove a record entirely.
 *
 * Only ever reachable from the unpublished state, so a photograph cannot be
 * destroyed in a single click.
 */
export function removeRecord(
  records: readonly ClinicPhotographRecord[],
  file: string,
): ClinicPhotographRecord[] | null {
  const target = records.find((r) => r.file === file);
  if (target === undefined) return null;
  if (target.status !== 'unpublished') return null;
  return records.filter((r) => r.file !== file);
}

/**
 * Reorder the manifest to match a caller-supplied sequence of filenames.
 *
 * Array order IS display order, so this is how the gallery is sorted. The
 * caller sends IDENTIFIERS, never paths or indices into a file — and the
 * sequence must be a permutation of exactly what is stored. A name that is
 * missing, unknown or repeated means the browser was working from a stale
 * list, and silently dropping or duplicating a photograph is worse than
 * refusing: the doctor would see a gallery he did not arrange.
 */
export function reorderRecords(
  records: readonly ClinicPhotographRecord[],
  order: readonly string[],
): ClinicPhotographRecord[] | null {
  if (order.length !== records.length) return null;
  if (new Set(order).size !== order.length) return null;

  const byFile = new Map(records.map((record) => [record.file, record]));
  const next: ClinicPhotographRecord[] = [];
  for (const file of order) {
    const record = byFile.get(file);
    if (record === undefined) return null;
    next.push(record);
    byFile.delete(file);
  }
  // Belt and braces: length and uniqueness already guarantee this is empty.
  return byFile.size === 0 ? next : null;
}

/**
 * Swap the bytes behind an existing photograph, keeping its identity.
 *
 * The filename, category, status, alt text and position all stay — only the
 * pixels and the intrinsic dimensions change. That is what "replace" means to
 * the doctor: the same picture slot, a better photograph.
 *
 * The new bytes are validated exactly as an upload is, because they are one.
 * The replacement must also be the SAME FORMAT: the filename carries the
 * extension, and a PNG living at `.jpg` would be served with the wrong type.
 */
export type ReplaceValidation =
  | { ok: true; records: ClinicPhotographRecord[]; image: ImageInfo }
  | { ok: false; issues: MediaIssue[] };

export function validateReplacement(
  records: readonly ClinicPhotographRecord[],
  file: string,
  bytes: Uint8Array,
): ReplaceValidation {
  const existing = records.find((record) => record.file === file);
  if (existing === undefined) return { ok: false, issues: ['photo_not_actionable'] };

  if (bytes.length === 0) return { ok: false, issues: ['file_required'] };
  if (bytes.length > MAX_IMAGE_BYTES) return { ok: false, issues: ['file_too_large'] };

  const image = inspectImage(bytes);
  if (image === null) return { ok: false, issues: ['unsupported_format'] };
  if (Math.max(image.width, image.height) < MIN_LONG_EDGE) {
    return { ok: false, issues: ['image_too_small'] };
  }
  if (!file.toLowerCase().endsWith(`.${image.extension}`)) {
    // Serving PNG bytes from a .jpg path is a content-type mismatch that the
    // build would not catch and a browser would have to guess about.
    return { ok: false, issues: ['format_must_match'] };
  }

  return {
    ok: true,
    image,
    records: records.map((record) =>
      record.file === file ? { ...record, width: image.width, height: image.height } : record,
    ),
  };
}
