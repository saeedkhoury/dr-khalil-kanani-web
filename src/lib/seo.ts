/**
 * Page titles for search results — developer-controlled (docs/SEO-SEARCH-MAP.md).
 *
 * The doctor edits visible headings in Edit Mode; the <title> patterns live
 * here so a content edit can never empty a title or drop the clinic's town
 * from it. The town comes from the single contact-facts source, so a title
 * cannot disagree with the address on the same page.
 *
 * One mention of the town per title, never a list of neighbouring places:
 * the clinic's location is a fact about it; nearby towns it "serves" are not
 * something this site knows.
 */
import { clinic } from '../data/clinic.ts';
import type { Locale } from '../i18n/config.ts';

/** "X in Jadeidi-Makr", in the grammar of each language. */
export function inLocality(locale: Locale, subject: string): string {
  const place = clinic.address.locality[locale];
  if (subject.includes(place)) return subject;
  return { he: `${subject} ב${place}`, ar: `${subject} في ${place}`, en: `${subject} in ${place}` }[locale];
}

/** The treatments index names the category a patient searches for. */
const TREATMENTS_SUBJECT: Record<Locale, string> = {
  he: 'טיפולי שיניים',
  ar: 'علاجات الأسنان',
  en: 'Dental treatments',
};

/** The contact page is also where the address and map are. */
export const CONTACT_SUBJECT: Record<Locale, string> = {
  he: 'צרו קשר ודרכי הגעה',
  ar: 'اتصلوا بنا وطريقة الوصول',
  en: 'Contact & directions',
};

/**
 * The profession, in the words people type: "רופא שיניים ג'דיידה מכר" and
 * "دكتور/طبيب اسنان جديده المكر" are what local searches ask for
 * (docs/SEARCH-INTENT-MAP.md, 2026-10-01). The clinic's tagline stays on the
 * page; the title answers the search.
 */
const PROFESSION: Record<Locale, string> = {
  he: 'רופא שיניים',
  ar: 'طبيب أسنان',
  en: 'Dentist',
};

export const seoTitle = {
  home: (locale: Locale, doctorName: string) => `${doctorName} — ${inLocality(locale, PROFESSION[locale])}`,
  treatments: (locale: Locale) => inLocality(locale, TREATMENTS_SUBJECT[locale]),
  treatment: (locale: Locale, title: string, override?: string) => override ?? inLocality(locale, title),
  contact: (locale: Locale) => CONTACT_SUBJECT[locale],
};

/** Longest meta description the site publishes (the CMS enforces the same). */
export const DESCRIPTION_MAX = 160;

/**
 * The treatments page description, built from the treatments the site
 * actually publishes — a hand-written list named 6 of 8 for weeks. If the
 * list no longer fits, a sentence without a list, never a cut-off one.
 */
export function treatmentsDescription(locale: Locale, names: string[]): string {
  const place = clinic.address.locality[locale];
  const items = locale === 'en' ? names.map((n) => n.toLowerCase()) : names;
  const list = new Intl.ListFormat(locale, { style: 'long', type: 'conjunction' }).format(items);
  const withList = {
    he: `הטיפולים הניתנים במרפאה ב${place}: ${list}.`,
    ar: `العلاجات المتوفرة في العيادة في ${place}: ${list}.`,
    en: `Treatments at the clinic in ${place}: ${list}.`,
  }[locale];
  if (names.length > 0 && withList.length <= DESCRIPTION_MAX) return withList;
  return {
    he: `מה כולל כל טיפול במרפאה ב${place}, למי הוא מתאים ואיך הוא מתבצע.`,
    ar: `ما يشمله كل علاج في العيادة في ${place}، ولمن يناسب، وكيف يتم.`,
    en: `What each treatment at the clinic in ${place} involves, who it may suit and how it works.`,
  }[locale];
}
