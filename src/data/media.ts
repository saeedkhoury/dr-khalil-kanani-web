/**
 * MEDIA MANIFEST — the single registry of every image the site may publish.
 *
 * This file does two jobs:
 *
 *   1. It is the data source for the clinic gallery. Adding, removing or
 *      reordering images is an edit here — never a component change.
 *   2. It is the allowlist enforced by `scripts/check-assets.mjs` at commit
 *      time. An image file that is not registered here cannot be committed.
 *
 * ── WHY THE ALLOWLIST EXISTS ──────────────────────────────────────────────
 * On 2026-09-21 thirteen images were added to `src/assets/images/` and swept
 * into a commit by `git add -A` without being looked at. All of the sampled
 * ones were patient before/after photography — material that Israeli dental
 * advertising regulations prohibit publishing. They reached the public repo
 * (though never the site) before anyone inspected them.
 *
 * Registering an asset here is an explicit statement that someone opened the
 * file, looked at it, and classified it. That is the control.
 *
 * ── WHAT MAY NEVER BE REGISTERED ──────────────────────────────────────────
 * No image containing a patient, any part of a patient, or a before/after
 * treatment comparison. Not with consent, not cropped, not anonymised.
 * See docs/decisions/0006-no-before-after-gallery.md.
 */

import type { Locale } from '../i18n/config';

export type MediaCategory =
  | 'exterior'
  | 'reception'
  | 'treatment-room'
  | 'equipment'
  | 'doctor'
  | 'team'
  | 'atmosphere';

export interface MediaAsset {
  /** Filename inside src/assets/images/. See docs/ASSETS.md for the convention. */
  file: string;
  category: MediaCategory;
  /**
   * Required, per locale. Describes what is actually shown — these are
   * meaningful images, never decorative, so an empty alt is never correct.
   */
  alt: Record<Locale, string>;
  /** Optional visible caption. */
  caption?: Record<Locale, string>;
  /** Intrinsic dimensions. Required so the grid can reserve space (CLS). */
  width: number;
  height: number;
  /** Given more weight in the editorial grid. Aim for one or two. */
  feature?: boolean;
}

/**
 * OWNER ACTION REQUIRED — this is empty on purpose.
 *
 * No clinic photography exists yet. The gallery reads this array and hides
 * itself entirely while it is empty, rather than rendering placeholders that
 * could be mistaken for the real clinic.
 *
 * To populate: drop files into src/assets/images/ following docs/ASSETS.md,
 * then add one entry each below. No component needs to change.
 */
export const gallery: MediaAsset[] = [];

/**
 * Doctor portrait. Separate from the gallery because it has one specific
 * home in DoctorIntro and a different aspect ratio.
 * OWNER ACTION REQUIRED.
 */
export const portrait: MediaAsset | null = null;

export function hasGallery(): boolean {
  return gallery.length > 0;
}

export function hasPortrait(): boolean {
  return portrait !== null;
}

/** Gallery entries for one category, preserving manifest order. */
export function galleryByCategory(category: MediaCategory): MediaAsset[] {
  return gallery.filter((a) => a.category === category);
}
