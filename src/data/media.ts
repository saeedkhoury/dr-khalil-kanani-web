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
  | 'illustration'
  | 'treatment-work';

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
  /** Original clinic post, visually matched before publication. */
  sourcePostUrl?: string;
}

/**
 * Owner-directed treatment gallery. The original local files were opened and
 * matched visually to the clinic's Instagram posts on 2026-09-21.
 */
export const gallery: MediaAsset[] = [
  {
    file: 'work-veneers-01.jpg', category: 'treatment-work', width: 1254, height: 1254,
    sourcePostUrl: 'https://www.instagram.com/p/DdJ042BMJUu/',
    alt: {
      he: 'פרסום של המרפאה עם שתי תמונות של השיניים הקדמיות, מסומנות לפני ואחרי',
      ar: 'منشور للعيادة يعرض صورتين للأسنان الأمامية مع علامتي قبل وبعد',
      en: 'Clinic post with two photographs of front teeth labelled before and after',
    },
    caption: { he: 'ציפויי שיניים', ar: 'قشور الأسنان', en: 'Veneers' },
  },
  {
    file: 'work-cleaning-01.jpg', category: 'treatment-work', width: 1254, height: 1254,
    sourcePostUrl: 'https://www.instagram.com/p/DdWvC8csM-6/',
    alt: {
      he: 'פרסום של המרפאה עם שתי תמונות של השיניים והחניכיים, מסומנות לפני ואחרי ניקוי',
      ar: 'منشور للعيادة يعرض صورتين للأسنان واللثة مع علامتي قبل التنظيف وبعده',
      en: 'Clinic post with two photographs of teeth and gums labelled before and after cleaning',
    },
    caption: { he: 'ניקוי אבנית', ar: 'تنظيف الجير', en: 'Dental cleaning' },
  },
  {
    file: 'work-cleaning-02.jpg', category: 'treatment-work', width: 1290, height: 1380,
    sourcePostUrl: 'https://www.instagram.com/p/Da8QjY7MiIP/',
    alt: {
      he: 'פרסום של המרפאה עם ארבע תמונות של שיניים בזוויות שונות, מסומנות לפני ואחרי',
      ar: 'منشور للعيادة يعرض أربع صور للأسنان من زوايا مختلفة مع علامتي قبل وبعد',
      en: 'Clinic post with four photographs of teeth from different angles labelled before and after',
    },
    caption: { he: 'ניקוי שיניים', ar: 'تنظيف الأسنان', en: 'Teeth cleaning' },
  },
];

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
