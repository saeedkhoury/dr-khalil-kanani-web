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
 * Selected clinic Instagram treatment posts are included under the owner's
 * explicit instruction on 2026-09-21. This is a scoped publishing direction,
 * not a statement that patient consent or legal review has been verified.
 * See docs/decisions/0009-owner-directed-instagram-gallery.md.
 *
 * Treatment-result imagery lives in its own collection and is not a substitute
 * for clinic photography. See THE CONTENT MODEL below.
 */

import clinicPhotographyData from './clinic-photography.json' with { type: 'json' };
import treatmentWorkData from './treatment-work.json' with { type: 'json' };
import { assertClinicPhotographyShape, assertTreatmentWorkShape } from '../lib/data-schema.ts';

import type {
  ClinicPhotograph,
  ClinicPhotographRecord,
  ClinicPhotographyCategory,
  DoctorPortrait,
  GalleryKind,
  HeroPhotograph,
  Illustration,
  MediaAsset,
  TreatmentWorkPhotograph,
  TreatmentWorkRecord,
} from './media-types';

export type {
  ClinicPhotographRecord,
  PublicationStatus,
  ClinicPhotographyCategory,
  TreatmentWorkCategory,
  IllustrationCategory,
  HeroCategory,
  PortraitCategory,
  MediaCategory,
  MediaAsset,
  ClinicPhotograph,
  TreatmentWorkPhotograph,
  TreatmentWorkRecord,
  Illustration,
  HeroPhotograph,
  DoctorPortrait,
  GalleryKind,
} from './media-types';


/**
 * TREATMENT AND RESULT CASES — the doctor's work, a category of its own.
 *
 * Owner-directed. The original files were opened and matched visually to the
 * clinic's Instagram posts on 2026-09-21 (docs/decisions/0009-owner-directed-
 * instagram-gallery.md). Since 2026-09-25 the owner manages this collection in
 * Edit Mode (ADR 0010), so it is stored as data — src/data/treatment-work.json
 * — and validated on import like clinic photography. Neither route
 * establishes patient consent or regulatory compliance; that item stays open.
 *
 * These are NOT clinic photography and must never be used as the hero, the
 * doctor portrait, or the clinic gallery. The types prevent it, and the two
 * collections never share a file (data-schema.ts).
 */
export const treatmentWorkRecords: TreatmentWorkRecord[] =
  assertTreatmentWorkShape(treatmentWorkData);

/** The PUBLISHED subset, as plain assets — what the site renders. */
export const treatmentWork: TreatmentWorkPhotograph[] = treatmentWorkRecords
  .filter((record) => record.status === 'published')
  .map(({ id: _id, status: _status, ...asset }) => asset);

/** Original AI-generated artwork, visually reviewed on 2026-09-21.
 * Inanimate objects only; never presented as clinic or patient photography.
 * Generation prompts and review record: docs/ILLUSTRATIONS.md.
 */
export const illustrations: Illustration[] = [
  {
    file: 'illustration-tooth-01.png',
    category: 'illustration',
    width: 1536, height: 1024, feature: true,
    alt: {
      he: 'איור של פסל שן מחרסינה ומראה דנטלית על במה כחולה',
      ar: 'رسم توضيحي لمجسّم سن خزفي ومرآة أسنان على قاعدة زرقاء',
      en: 'Illustration of a porcelain tooth sculpture and dental mirror on a blue plinth',
    },
    caption: { he: 'שן ומראה — איור', ar: 'سن ومرآة — رسم توضيحي', en: 'Tooth & mirror — illustration' },
  },
  {
    file: 'illustration-aligner-01.png',
    category: 'illustration',
    width: 1536, height: 1024,
    alt: {
      he: 'איור של דגם קשתית שקופה בגוון כחול מעל בסיס לבן',
      ar: 'رسم توضيحي لنموذج قالب تقويم شفاف باللون الأزرق فوق قاعدة بيضاء',
      en: 'Illustration of a transparent blue aligner model above a white plinth',
    },
    caption: { he: 'קשתית שקופה — איור', ar: 'قالب تقويم شفاف — رسم توضيحي', en: 'Clear aligner — illustration' },
  },
  {
    file: 'illustration-care-01.png',
    category: 'illustration',
    width: 1536, height: 1024,
    alt: {
      he: 'איור של מברשת שיניים כחולה וחוט דנטלי על משטחי חרסינה',
      ar: 'رسم توضيحي لفرشاة أسنان زرقاء وخيط أسنان على أسطح خزفية',
      en: 'Illustration of a blue toothbrush and dental floss on porcelain surfaces',
    },
    caption: { he: 'מברשת וחוט — איור', ar: 'فرشاة وخيط — رسم توضيحي', en: 'Brush & floss — illustration' },
  },
];

/**
 * CLINIC PHOTOGRAPHY — the building, the rooms, the equipment, the people.
 *
 * The one collection the owner manages himself, so it is the one collection
 * stored as data rather than code. Validated on import: JSON has no
 * compile-time shape, and this file will be written by a machine.
 *
 * Empty until real photographs exist. The gallery renders nothing while it is,
 * rather than borrowing treatment-result images to fill the space: a result
 * photograph cannot tell a patient what the waiting room looks like.
 *
 * What is needed, and at what resolution, is in docs/ASSETS.md.
 * OWNER ACTION REQUIRED.
 */
export const clinicPhotographyRecords: ClinicPhotographRecord[] =
  assertClinicPhotographyShape(clinicPhotographyData);

/**
 * The PUBLISHED subset — what the site actually renders.
 *
 * Unpublishing is reversible, so an unpublished record stays in the file and
 * is filtered out here instead of being deleted. Every existing consumer reads
 * this export and therefore cannot accidentally render a photograph the owner
 * took down; reaching an unpublished one requires asking for the records
 * explicitly.
 */
export const clinicPhotography: ClinicPhotograph[] = clinicPhotographyRecords.filter(
  (record) => record.status === 'published',
);

/**
 * Hero image. One landscape photograph — the clinic, or the dentist at work.
 * Carries the most weight of any asset on the site.
 *
 * While null, the hero renders a typographic composition instead. That is a
 * deliberate design, not a placeholder: see Hero.astro.
 * OWNER ACTION REQUIRED.
 */
export const heroImage: HeroPhotograph | null = null;

/**
 * Doctor portrait. Its own slot, not a member of any collection: it has one
 * specific home in DoctorIntro, a different aspect ratio to everything else,
 * and it is the image search engines may surface for the practice.
 * OWNER ACTION REQUIRED.
 */
export const portrait: DoctorPortrait | null = null;

/** The collection behind each gallery kind. */
const COLLECTIONS = {
  clinic: clinicPhotography,
  work: treatmentWork,
  illustrations,
} as const satisfies Record<GalleryKind, readonly MediaAsset[]>;

/**
 * The ONLY way a component obtains gallery contents. Callers name the kind;
 * they never reach into a collection directly and never infer one.
 */
export function galleryFor(kind: GalleryKind): readonly MediaAsset[] {
  return COLLECTIONS[kind];
}

export function hasClinicPhotography(): boolean {
  return clinicPhotography.length > 0;
}

export function hasTreatmentWork(): boolean {
  return treatmentWork.length > 0;
}

export function hasPortrait(): boolean {
  return portrait !== null;
}

export function hasHeroImage(): boolean {
  return heroImage !== null;
}

/** Clinic photographs of one category, preserving manifest order. */
export function clinicPhotographyByCategory(
  category: ClinicPhotographyCategory,
): ClinicPhotograph[] {
  return clinicPhotography.filter((asset) => asset.category === category);
}
