/**
 * MEDIA TYPES — the content model, separated from the manifest that uses it.
 *
 * These live apart from `media.ts` for one reason: the future admin Worker
 * must be able to import the types WITHOUT importing the manifest, because
 * the manifest holds `treatmentWork` and the Worker must never be able to
 * reach it. Types are safe to share; data is not.
 *
 * See docs/specs/2026-09-22-admin-cms-plan.md.
 */

import type { Locale } from '../i18n/config';

/**
 * ── THE CONTENT MODEL ─────────────────────────────────────────────────────
 * Five slots, five vocabularies. They are deliberately DISJOINT so a mix-up
 * is a type error rather than a review failure:
 *
 *   heroImage          one landscape frame, the homepage hero
 *   portrait           one photograph of Dr. Kanani
 *   clinicPhotography  the building, rooms, equipment, team, atmosphere
 *   treatmentWork      treatment and result cases
 *   illustrations      original artwork, never presented as photography
 *
 * Treatment-result imagery is NOT clinic photography and must never stand in
 * for it. A result photograph answers "what can this clinic do"; a clinic
 * photograph answers "what is this place, and who will treat me". Using one
 * for the other is how a dental site ends up looking like a before/after ad.
 * The category unions below make that substitution impossible to express.
 */
export type ClinicPhotographyCategory =
  | 'exterior'
  | 'reception'
  | 'treatment-room'
  | 'equipment'
  | 'doctor-working'
  | 'team'
  | 'atmosphere';

export type TreatmentWorkCategory = 'treatment-work';
export type IllustrationCategory = 'illustration';
export type HeroCategory = 'hero';
export type PortraitCategory = 'portrait';

/** Every category the site knows. Prefer the specific unions above. */
export type MediaCategory =
  | ClinicPhotographyCategory
  | TreatmentWorkCategory
  | IllustrationCategory
  | HeroCategory
  | PortraitCategory;

/**
 * Generic over its category, which is what enforces the separation: a
 * TreatmentWorkPhotograph is not assignable to ClinicPhotograph, so it cannot
 * be pushed into `clinicPhotography` or passed where clinic photography is
 * expected. The guarantee is the type system's, not a reviewer's memory.
 */
export interface MediaAsset<C extends MediaCategory = MediaCategory> {
  /** Filename inside src/assets/images/. See docs/ASSETS.md for the convention. */
  file: string;
  category: C;
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
  /** Original clinic post, visually matched before publication. */
  sourcePostUrl?: string;
  /**
   * How this asset was approved. Recorded because the two routes carry
   * different evidence: an Instagram match can be re-checked against a public
   * post, an owner-supplied file cannot. Neither establishes patient consent.
   */
  provenance?: 'instagram-post' | 'owner-supplied';
}

export type ClinicPhotograph = MediaAsset<ClinicPhotographyCategory>;
export type TreatmentWorkPhotograph = MediaAsset<TreatmentWorkCategory>;
export type Illustration = MediaAsset<IllustrationCategory>;
export type HeroPhotograph = MediaAsset<HeroCategory>;
export type DoctorPortrait = MediaAsset<PortraitCategory>;

/**
 * Which collection a gallery renders. Passed EXPLICITLY by the caller — the
 * component must never infer it from what happens to be in an array, because
 * that is how treatment-result photographs would silently become the clinic
 * gallery the first time someone added one.
 */
export type GalleryKind = 'clinic' | 'work' | 'illustrations';
