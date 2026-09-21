/**
 * Doctor profile.
 *
 * ⚠ CREDENTIALS ARE DELIBERATELY EMPTY.
 *
 * Discovery found NO verifiable qualifications for Dr. Khalil Kanani in any
 * public source — not a dental school, graduation year, licence number,
 * memberships or years in practice. Inventing any of them would be inventing
 * facts about a real physician.
 *
 * `credentials` must be filled by the owner before launch. Until then the
 * UI renders only what is verified and simply omits the credentials block.
 *
 * Note for whoever fills this in: Israeli dental advertising regulations
 * prohibit advertising that praises the dentist's skill or knowledge, and
 * prohibit specialist titles that are not lawfully recognised. Israel
 * recognises eight dental specialties and IMPLANTOLOGY IS NOT ONE OF THEM —
 * write "performs implants", never "implant specialist" / "מומחה להשתלות".
 * State facts (degree, institution, year), never evaluations.
 */

import type { Locale } from '../i18n/config';

export interface Credential {
  /** Factual line only: degree, institution, year, membership. */
  label: Record<Locale, string>;
  year?: string;
}

export const doctor = {
  /** Short factual introduction. Safe because it states only what is verified. */
  intro: {
    he: 'ד״ר חליל כנעאני מפעיל מרפאת שיניים ואסתטיקה בג׳דיידה-מכר. המרפאה נותנת מענה בעברית, בערבית ובאנגלית, ומטפלת במגוון טיפולי שיניים משמרים ואסתטיים.',
    ar: 'يدير د. خليل كنعاني عيادة أسنان وتجميل في الجديدة-المكر. تقدّم العيادة خدماتها بالعربية والعبرية والإنجليزية، وتشمل مجموعة من علاجات الأسنان الترميمية والتجميلية.',
    en: 'Dr. Khalil Kanani runs a dental and aesthetic clinic in Jadeidi-Makr. The clinic works in Hebrew, Arabic and English and covers a range of restorative and aesthetic dental treatments.',
  } satisfies Record<Locale, string>,

  /** How the clinic works. Operational description, not self-praise. */
  approach: {
    he: [
      'הסבר על הממצאים ועל האפשרויות לפני תחילת כל טיפול.',
      'תוכנית טיפול שנבנית לפי מצב השיניים והעדפות המטופל.',
      'שיחה בשפה שנוחה למטופל — עברית, ערבית או אנגלית.',
    ],
    ar: [
      'شرح للنتائج وللخيارات قبل بدء أي علاج.',
      'خطة علاج تُبنى وفق حالة الأسنان وتفضيلات المريض.',
      'حديث باللغة التي تريح المريض — العربية أو العبرية أو الإنجليزية.',
    ],
    en: [
      'An explanation of the findings and the options before any treatment begins.',
      'A treatment plan built around the condition of the teeth and the patient’s preferences.',
      'A conversation in whichever language the patient prefers — Hebrew, Arabic or English.',
    ],
  } satisfies Record<Locale, string[]>,

  /**
   * OWNER MUST SUPPLY. Example of the expected shape, intentionally empty:
   *
   *   { label: { he: 'בוגר רפואת שיניים, האוניברסיטה העברית', ar: '…', en: '…' }, year: '2014' }
   *
   * Do not populate with anything that has not been confirmed in writing.
   */
  credentials: [] as Credential[],

  /** Portrait. Owner must supply; no stock photo stands in for a real doctor. */
  portrait: null as string | null,
};

export function hasCredentials(): boolean {
  return doctor.credentials.length > 0;
}
