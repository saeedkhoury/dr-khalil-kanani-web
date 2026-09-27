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

export const seoTitle = {
  home: (locale: Locale, siteTitle: string) => inLocality(locale, siteTitle),
  treatments: (locale: Locale) => inLocality(locale, TREATMENTS_SUBJECT[locale]),
  treatment: (locale: Locale, title: string, override?: string) => override ?? inLocality(locale, title),
  contact: (locale: Locale) => CONTACT_SUBJECT[locale],
};
