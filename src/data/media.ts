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
  | 'atmosphere'
  | 'illustration';

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
 * No clinic photography exists yet. While this is empty, the picture section
 * uses the explicitly labelled illustrations below.
 *
 * To populate: drop files into src/assets/images/ following docs/ASSETS.md,
 * then add one entry each below. No component needs to change.
 */
export const gallery: MediaAsset[] = [];

/** Original AI-generated artwork, visually reviewed on 2026-09-21.
 * Inanimate objects only; never presented as clinic or patient photography.
 * Generation prompts and review record: docs/ILLUSTRATIONS.md.
 */
export const illustrations: MediaAsset[] = [
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
 * Hero image. One landscape photograph — the clinic, or the dentist at work.
 * Carries the most weight of any asset on the site.
 *
 * While null, the hero renders a typographic composition instead. That is a
 * deliberate design, not a placeholder: see Hero.astro.
 * OWNER ACTION REQUIRED.
 */
export const heroImage: MediaAsset | null = null;

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

export function hasHeroImage(): boolean {
  return heroImage !== null;
}

/** Gallery entries for one category, preserving manifest order. */
export function galleryByCategory(category: MediaCategory): MediaAsset[] {
  return gallery.filter((a) => a.category === category);
}
