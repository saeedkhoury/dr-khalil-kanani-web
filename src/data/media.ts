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
import { assertClinicPhotographyShape } from '../lib/data-schema.ts';

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
  Illustration,
  HeroPhotograph,
  DoctorPortrait,
  GalleryKind,
} from './media-types';


/**
 * TREATMENT AND RESULT CASES — a category of its own.
 *
 * Owner-directed. The original local files were opened and matched visually
 * to the clinic's Instagram posts on 2026-09-21. Each entry is individually
 * approved; see docs/decisions/0009-owner-directed-instagram-gallery.md.
 *
 * These are NOT clinic photography and must never be used as the hero, the
 * doctor portrait, or the clinic gallery. The type prevents it.
 *
 * Adding an entry here requires the owner's explicit, per-image instruction.
 */
export const treatmentWork: TreatmentWorkPhotograph[] = [
  {
    file: 'work-veneers-01.jpg', category: 'treatment-work', width: 1254, height: 1254,
    sourcePostUrl: 'https://www.instagram.com/p/DdJ042BMJUu/',
    alt: {
      he: 'פרסום של המרפאה עם שתי תמונות של השיניים הקדמיות, מסומנות לפני ואחרי',
      ar: 'منشور للعيادة يعرض صورتين للأسنان الأمامية مع علامتي قبل وبعد',
      en: 'Clinic post with two photographs of front teeth labelled before and after',
    },
    provenance: 'instagram-post',
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
    provenance: 'instagram-post',
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
    provenance: 'instagram-post',
    caption: { he: 'ניקוי שיניים', ar: 'تنظيف الأسنان', en: 'Teeth cleaning' },
  },
  {
    file: 'work-restoration-01.jpg', category: 'treatment-work', width: 1279, height: 1600,
    provenance: 'owner-supplied',
    alt: {
      he: 'שתי תמונות של השיניים הקדמיות העליונות, מסומנות לפני ואחרי',
      ar: 'صورتان للأسنان الأمامية العلوية، موسومتان بقبل وبعد',
      en: 'Two photographs of the upper front teeth, labelled before and after',
    },
  },
  {
    file: 'work-restoration-02.jpg', category: 'treatment-work', width: 900, height: 1600,
    provenance: 'owner-supplied',
    alt: {
      he: 'שלוש תמונות של שיניים טוחנות מזוויות שונות, מסומנות לפני ואחרי',
      ar: 'ثلاث صور للأضراس من زوايا مختلفة، موسومة بقبل وبعد',
      en: 'Three photographs of molar teeth from different angles, labelled before and after',
    },
  },
  {
    file: 'work-restoration-03.jpg', category: 'treatment-work', width: 1279, height: 1600,
    provenance: 'owner-supplied',
    alt: {
      he: 'שתי תמונות של השיניים העליונות, מסומנות לפני ואחרי',
      ar: 'صورتان للأسنان العلوية، موسومتان بقبل وبعد',
      en: 'Two photographs of the upper teeth, labelled before and after',
    },
  },
  {
    file: 'work-restoration-04.jpg', category: 'treatment-work', width: 900, height: 1600,
    provenance: 'owner-supplied',
    alt: {
      he: 'פרסום של המרפאה עם שתי תמונות של השיניים הקדמיות, מסומנות לפני ואחרי',
      ar: 'منشور للعيادة يعرض صورتين للأسنان الأمامية، موسومتين بقبل وبعد',
      en: 'Clinic post with two photographs of the front teeth, labelled before and after',
    },
  },
  {
    file: 'work-cleaning-03.jpg', category: 'treatment-work', width: 1254, height: 1254,
    provenance: 'owner-supplied',
    alt: {
      he: 'פרסום של המרפאה עם שתי תמונות של השיניים והחניכיים, מסומנות לפני ואחרי',
      ar: 'منشور للعيادة يعرض صورتين للأسنان واللثة، موسومتين بقبل وبعد',
      en: 'Clinic post with two photographs of the teeth and gums, labelled before and after',
    },
    caption: { he: 'ניקוי אבנית', ar: 'تنظيف الجير', en: 'Dental cleaning' },
  },
  {
    file: 'work-veneers-02.jpg', category: 'treatment-work', width: 1254, height: 1254,
    provenance: 'owner-supplied',
    alt: {
      he: 'פרסום של המרפאה עם שתי תמונות של השיניים הקדמיות, מסומנות לפני ואחרי',
      ar: 'منشور للعيادة يعرض صورتين للأسنان الأمامية، موسومتين بقبل وبعد',
      en: 'Clinic post with two photographs of the front teeth, labelled before and after',
    },
    caption: { he: 'ציפויי שיניים', ar: 'قشور الأسنان', en: 'Veneers' },
  },
  {
    file: 'work-whitening-01.jpg', category: 'treatment-work', width: 1254, height: 1254,
    provenance: 'owner-supplied',
    alt: {
      he: 'פרסום של המרפאה בכותרת "הלבנת שיניים וניקוי אבנית", ובו שתי תמונות מסומנות לפני ואחרי',
      ar: 'منشور للعيادة بعنوان "تبييض الأسنان وإزالة الجير"، يعرض صورتين موسومتين بقبل وبعد',
      en: 'Clinic post headed "teeth whitening and tartar cleaning", with two photographs labelled before and after',
    },
    caption: { he: 'הלבנה וניקוי אבנית', ar: 'تبييض وتنظيف الجير', en: 'Whitening and tartar cleaning' },
  },
  {
    file: 'work-extraction-01.jpg', category: 'treatment-work', width: 890, height: 1600,
    provenance: 'owner-supplied',
    alt: {
      he: 'פרסום של המרפאה ובו תצלום של שן שנעקרה, מוחזקת בכפפה',
      ar: 'منشور للعيادة يعرض صورة لسن مخلوع مُمسَك بقفاز',
      en: 'Clinic post showing a photograph of an extracted tooth held in a gloved hand',
    },
    caption: { he: 'עקירת שן', ar: 'خلع سن', en: 'Tooth extraction' },
  },
  {
    file: 'work-extraction-02.jpg', category: 'treatment-work', width: 900, height: 1600,
    provenance: 'owner-supplied',
    alt: {
      he: 'פרסום של המרפאה ובו תצלום של שן שנעקרה, מונחת על פד גזה',
      ar: 'منشور للعيادة يعرض صورة لسن مخلوع موضوع على شاش',
      en: 'Clinic post showing a photograph of an extracted tooth resting on gauze',
    },
    caption: { he: 'עקירת שן', ar: 'خلع سن', en: 'Tooth extraction' },
  },
];

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
