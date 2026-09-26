/**
 * THE TWO MANAGED GALLERIES — one save planner, two rule sets.
 *
 *   clinic  clinic photography   src/data/clinic-photography.json
 *   work    the doctor's work    src/data/treatment-work.json   (ADR 0010)
 *
 * They stay separate collections: separate files, separate filename prefixes
 * (so they never share an image), separate rules. What they share is the
 * shape of a save — the doctor's whole arranged gallery, validated photo by
 * photo, written as ONE commit — so that logic exists once, here.
 *
 * The browser names a gallery by these two words only. Which file that means,
 * and what may be written into it, is decided here and in github.ts.
 */

import {
  CMS_CATEGORIES, WORK_PREFIX,
  assertClinicPhotographyShape, assertTreatmentWorkShape, frameProblems,
} from '../../../src/lib/data-schema.ts';
import { blockingClaims, withoutBeforeAfterDescriptor } from '../../../src/lib/claims.ts';
import type { ClinicPhotographRecord, PublicationStatus, TreatmentWorkRecord } from '../../../src/data/media-types.ts';
import { altIssues, nextFilename, type MediaIssue } from './media.ts';

export type GalleryId = 'clinic' | 'work';

/** Exactly the two names, nothing inferred. */
export function parseGallery(value: unknown): GalleryId | null {
  return value === 'clinic' || value === 'work' ? value : null;
}

/** An image the Worker has already fetched back from GitHub and inspected. */
export interface CheckedImage {
  blob: string;
  width: number;
  height: number;
  extension: 'jpg' | 'png';
}

export interface DesiredPhoto {
  /** An existing photograph, by its file name. Absent for a new one. */
  file?: string;
  /** A new clinic photograph: its category (the file name is allocated here). */
  category?: unknown;
  /** New bytes: for a new photograph, or replacing an existing one. */
  image?: CheckedImage;
  status: unknown;
  alt: { he?: unknown; ar?: unknown; en?: unknown };
  /** Doctor's work only: the optional title, all three languages or none. */
  caption?: { he?: unknown; ar?: unknown; en?: unknown };
  /** Clinic photography only. */
  frame?: unknown;
}

interface StoredRecord {
  file: string;
  width: number;
  height: number;
  status: PublicationStatus;
  alt: { he: string; ar: string; en: string };
}

export type SavePlan<R = ClinicPhotographRecord> =
  | { ok: true; records: R[]; puts: Array<{ file: string; blob: string }>; deletes: string[]; addsImages: boolean; unchanged: boolean }
  | { ok: false; issues: MediaIssue[] };

/** What differs between the galleries. */
interface GalleryRules<R extends StoredRecord> {
  /** A name for a new photograph, or an issue code. */
  allocate(photo: DesiredPhoto, used: Set<string>): { file: string } | { issue: string };
  create(photo: DesiredPhoto, file: string, image: CheckedImage): R;
  /** Validate and apply the photo's own fields; report issues through `at`. */
  apply(record: R, photo: DesiredPhoto, at: (issue: string) => void): void;
  assert(records: unknown): R[];
}

const trim3 = (t: { he?: unknown; ar?: unknown; en?: unknown }) =>
  ({ he: String(t.he).trim(), ar: String(t.ar).trim(), en: String(t.en).trim() });

/* ── Clinic photography ─────────────────────────────────────────────────── */

const CLINIC: GalleryRules<ClinicPhotographRecord> = {
  allocate(photo, used) {
    if (typeof photo.category !== 'string' || !(CMS_CATEGORIES as readonly string[]).includes(photo.category)) return { issue: 'category_not_allowed' };
    const file = nextFilename(photo.category, [...used], photo.image!.extension);
    return file === null ? { issue: 'category_full' } : { file };
  },
  create(photo, file, image) {
    return {
      file, category: photo.category as ClinicPhotographRecord['category'],
      width: image.width, height: image.height, status: 'unpublished', alt: { he: '', ar: '', en: '' },
    };
  },
  apply(record, photo, at) {
    const problems = altIssues(photo.alt?.he, photo.alt?.ar, photo.alt?.en);
    problems.forEach(at);
    if (problems.length === 0) {
      record.alt = trim3(photo.alt);
      // Written (or confirmed) English here is the review the flag asks for.
      delete record.needsEnglishReview;
    }
    if (frameProblems(photo.frame).length) { at('frame_invalid'); return; }
    if (photo.frame === undefined) delete record.frame;
    else {
      const f = photo.frame as { x: number; y: number; zoom: number };
      const r = (n: number) => Math.round(n * 100) / 100;
      record.frame = { x: r(f.x), y: r(f.y), zoom: r(f.zoom) };
    }
  },
  assert: (records) => assertClinicPhotographyShape(records, 'planned manifest'),
};

/* ── The doctor's work ──────────────────────────────────────────────────── */

/** An optional title: all three languages, or none; the claims rules apply. */
function captionIssues(caption: DesiredPhoto['caption']): MediaIssue[] {
  if (caption === undefined) return [];
  if (caption === null || typeof caption !== 'object') return ['caption_invalid'];
  const texts = (['he', 'ar', 'en'] as const).map((l) => [l, caption[l]] as const);
  const filled = texts.filter(([, t]) => typeof t === 'string' && t.trim() !== '');
  if (filled.length === 0) return [];
  const issues: MediaIssue[] = [];
  for (const [l, t] of texts) if (typeof t !== 'string' || t.trim() === '') issues.push(`caption_${l}_required`);
  for (const [l, t] of filled) {
    for (const finding of blockingClaims(withoutBeforeAfterDescriptor(String(t)))) {
      issues.push(`caption_${l}_claim_${finding.rule.replace(/-/g, '_')}`);
    }
  }
  return issues;
}

const WORK: GalleryRules<TreatmentWorkRecord> = {
  allocate(photo, used) {
    const file = nextFilename(WORK_PREFIX, [...used], photo.image!.extension);
    return file === null ? { issue: 'category_full' } : { file };
  },
  create(_photo, file, image) {
    // Key order follows the stored file, so a save rewrites only what changed.
    return {
      id: file.replace(/\.[a-z]+$/, ''), file, category: 'treatment-work',
      width: image.width, height: image.height, status: 'unpublished',
      provenance: 'owner-supplied', alt: { he: '', ar: '', en: '' },
    };
  },
  apply(record, photo, at) {
    // The images are labelled before/after; saying so is description, not a
    // claim (ADR 0010). Every other rule still applies.
    const problems = altIssues(photo.alt?.he, photo.alt?.ar, photo.alt?.en, withoutBeforeAfterDescriptor);
    problems.forEach(at);
    if (problems.length === 0) record.alt = trim3(photo.alt);
    // This gallery always shows the whole artwork.
    if (photo.frame !== undefined) at('frame_not_allowed');
    const captionProblems = captionIssues(photo.caption);
    captionProblems.forEach(at);
    if (captionProblems.length === 0) {
      const c = photo.caption;
      const empty = c === undefined || (['he', 'ar', 'en'] as const).every((l) => typeof c[l] !== 'string' || String(c[l]).trim() === '');
      if (empty) delete record.caption;
      else record.caption = trim3(c!);
    }
  },
  assert: (records) => assertTreatmentWorkShape(records, 'planned doctor\'s work'),
};

export const GALLERY_RULES = { clinic: CLINIC, work: WORK } as const;

/* ── The shared planner ─────────────────────────────────────────────────── */

const serialise = (records: readonly unknown[]) => `${JSON.stringify(records, null, 2)}\n`;

/**
 * Turn the gallery the doctor arranged into the manifest to commit, the image
 * files to write and the files to remove — or say precisely what is wrong,
 * photo by photo (`photo_2:alt_en_required`).
 *
 * Shared rules: existing photos are named by file and keep their identity; a
 * published photo cannot be deleted in the same step (hide it first); a
 * replacement keeps its format; anything new or replaced needs the upload
 * confirmation; the result must satisfy the build's own schema.
 *
 * `protectedFiles` are referenced by the OTHER gallery: removing such a record
 * never deletes its file. (The filename prefixes make this impossible today;
 * the check keeps it impossible if that ever changes.)
 */
export function planGallerySave<R extends StoredRecord>(
  rules: GalleryRules<R>,
  current: readonly R[],
  desired: readonly DesiredPhoto[],
  taken: readonly string[],
  confirmed: unknown,
  protectedFiles: ReadonlySet<string> = new Set(),
): SavePlan<R> {
  const issues: MediaIssue[] = [];
  if (!Array.isArray(desired) || desired.length > 200) return { ok: false, issues: ['photos_invalid'] };
  const byFile = new Map(current.map((r) => [r.file, r]));
  const listed = new Set<string>();
  const used = new Set([...current.map((r) => r.file), ...taken]);
  const records: R[] = [];
  const puts: Array<{ file: string; blob: string }> = [];
  let addsImages = false;

  desired.forEach((photo, i) => {
    const at = (issue: string) => issues.push(`photo_${i}:${issue}`);
    if (photo === null || typeof photo !== 'object') { at('invalid'); return; }
    if (photo.status !== 'published' && photo.status !== 'unpublished') at('status_invalid');

    let record: R;
    if (typeof photo.file === 'string') {
      const existing = byFile.get(photo.file);
      if (!existing || listed.has(photo.file)) { at('photo_not_actionable'); return; }
      listed.add(photo.file);
      record = { ...existing };
      if (photo.image) {
        if (!photo.file.toLowerCase().endsWith(`.${photo.image.extension}`)) at('format_must_match');
        record.width = photo.image.width;
        record.height = photo.image.height;
        puts.push({ file: photo.file, blob: photo.image.blob });
        addsImages = true;
      }
    } else {
      if (!photo.image) { at('file_required'); return; }
      const allocated = rules.allocate(photo, used);
      if ('issue' in allocated) { at(allocated.issue); return; }
      used.add(allocated.file);
      record = rules.create(photo, allocated.file, photo.image);
      puts.push({ file: allocated.file, blob: photo.image.blob });
      addsImages = true;
    }
    rules.apply(record, photo, at);
    if (photo.status === 'published' || photo.status === 'unpublished') record.status = photo.status;
    records.push(record);
  });

  const removed = current.filter((r) => !listed.has(r.file));
  for (const r of removed) if (r.status === 'published') issues.push(`delete:${r.file}:published_photo_delete`);
  if (addsImages && confirmed !== true) issues.push('confirmation_required');
  if (issues.length > 0) return { ok: false, issues };
  try {
    rules.assert(records);
  } catch {
    return { ok: false, issues: ['content_invalid'] };
  }
  const deletes = removed.map((r) => r.file).filter((file) => !protectedFiles.has(file));
  const unchanged = !addsImages && removed.length === 0 && serialise(records) === serialise(current);
  return { ok: true, records, puts, deletes, addsImages, unchanged };
}

/** The clinic-photography planner, as the earlier API named it. */
export function planPhotoSave(
  current: readonly ClinicPhotographRecord[],
  desired: readonly DesiredPhoto[],
  taken: readonly string[],
  confirmed: unknown,
): SavePlan<ClinicPhotographRecord> {
  return planGallerySave(CLINIC, current, desired, taken, confirmed);
}
