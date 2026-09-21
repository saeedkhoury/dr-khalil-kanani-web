/**
 * General clinic FAQ.
 *
 * Deliberately answers the questions patients actually have and that neither
 * reference site answers at all: languages, health funds, what a first visit
 * involves, and how pricing is handled.
 *
 * On pricing: Israeli dental advertising regulations prohibit publishing
 * tariffs or prices, so the answer explains the process rather than quoting
 * figures. That is both the lawful and the honest answer.
 *
 * On health funds: UNVERIFIED — the clinic's arrangements are unknown, so the
 * answer directs the patient to ask rather than claiming any affiliation.
 * Update once the owner confirms.
 *
 * Structured data note: no FAQPage JSON-LD is emitted. Google retired FAQ
 * rich results on 2026-05-07, so visible, well-structured Q&A is what now
 * serves both patients and AI extraction.
 */

import type { Locale } from '../i18n/config';

export interface FaqItem {
  q: Record<Locale, string>;
  a: Record<Locale, string>;
}

export const generalFaq: FaqItem[] = [
  {
    q: {
      he: 'באילו שפות אפשר לדבר במרפאה?',
      ar: 'بأي لغات يمكن التحدث في العيادة؟',
      en: 'Which languages can I be seen in?',
    },
    a: {
      he: 'עברית, ערבית ואנגלית. אפשר לבחור את השפה שנוחה לכם, גם בשיחת הטלפון וגם בפגישה עצמה.',
      ar: 'العربية والعبرية والإنجليزية. يمكنكم اختيار اللغة التي تريحكم، سواء في المكالمة الهاتفية أو في الزيارة نفسها.',
      en: 'Hebrew, Arabic and English. You can choose whichever language you are comfortable in, both on the phone and during the appointment.',
    },
  },
  {
    q: {
      he: 'איך קובעים תור?',
      ar: 'كيف نحجز موعدًا؟',
      en: 'How do I make an appointment?',
    },
    a: {
      he: 'הדרך המהירה היא טלפון או וואטסאפ. אפשר גם לשלוח בקשה דרך האתר ונחזור אליכם — אך אם מדובר בכאב או במצב דחוף, עדיף להתקשר.',
      ar: 'أسرع طريقة هي الهاتف أو الواتساب. يمكن أيضًا إرسال طلب عبر الموقع وسنعاود الاتصال بكم — لكن إذا كان الأمر يتعلق بألم أو حالة عاجلة، يُفضّل الاتصال.',
      en: 'The fastest way is by phone or WhatsApp. You can also send a request through this site and we will get back to you — but if it involves pain or an urgent situation, please call.',
    },
  },
  {
    q: {
      he: 'מה קורה בפגישה הראשונה?',
      ar: 'ماذا يحدث في الزيارة الأولى؟',
      en: 'What happens at a first visit?',
    },
    a: {
      he: 'בדיקה של השיניים והחניכיים, ובמידת הצורך צילום. לאחר מכן נסביר מה נמצא ומה האפשרויות, ונבנה יחד תוכנית טיפול.',
      ar: 'فحص للأسنان واللثة، وعند الحاجة صورة أشعة. بعد ذلك نشرح ما وُجد وما هي الخيارات، ونبني معًا خطة علاج.',
      en: 'An examination of the teeth and gums, and imaging if needed. We then explain what was found and what the options are, and build a treatment plan together.',
    },
  },
  {
    q: {
      he: 'האם המרפאה עובדת מול קופות החולים?',
      ar: 'هل تتعامل العيادة مع صناديق المرضى؟',
      en: 'Do you work with the health funds?',
    },
    a: {
      he: 'ההסדרים משתנים. מומלץ לברר בטלפון לפני קביעת התור, כדי שנוכל לתת תשובה מדויקת למקרה שלכם.',
      ar: 'الترتيبات تختلف. يُنصح بالاستفسار هاتفيًا قبل حجز الموعد، كي نتمكن من إعطائكم إجابة دقيقة لحالتكم.',
      en: 'Arrangements vary. Please check by phone before booking so we can give you an accurate answer for your situation.',
    },
  },
  {
    q: {
      he: 'כמה עולה טיפול?',
      ar: 'كم تكلفة العلاج؟',
      en: 'How much does treatment cost?',
    },
    a: {
      he: 'עלות הטיפול נקבעת רק לאחר בדיקה, מכיוון שהיא תלויה במצב הספציפי ובתוכנית הטיפול. נמסור הצעה מפורטת לפני תחילת הטיפול. על פי הכללים החלים על פרסום בתחום רפואת השיניים בישראל, אין אנו מפרסמים מחירונים באתר.',
      ar: 'تُحدَّد تكلفة العلاج فقط بعد الفحص، لأنها تعتمد على الحالة المحدّدة وعلى خطة العلاج. سنقدّم عرضًا مفصّلًا قبل بدء العلاج. ووفقًا للقواعد السارية على الإعلان في مجال طب الأسنان في إسرائيل، لا ننشر قوائم أسعار على الموقع.',
      en: 'The cost is determined only after an examination, because it depends on the specific situation and the treatment plan. We provide a detailed quote before treatment begins. Under the rules applying to dental advertising in Israel, we do not publish price lists on this site.',
    },
  },
  {
    q: {
      he: 'מה עושים במקרה של כאב פתאומי?',
      ar: 'ماذا نفعل في حالة ألم مفاجئ؟',
      en: 'What should I do if I get sudden pain?',
    },
    a: {
      he: 'להתקשר למרפאה ולתאר את המצב. אם הכאב חזק, יש נפיחות מתפשטת או חום — יש לפנות לגורם רפואי זמין או לחדר מיון, גם מחוץ לשעות הפעילות.',
      ar: 'الاتصال بالعيادة ووصف الحالة. إذا كان الألم شديدًا أو هناك انتفاخ يتسع أو حرارة — يجب التوجه إلى جهة طبية متاحة أو غرفة الطوارئ، حتى خارج ساعات العمل.',
      en: 'Call the clinic and describe the situation. If the pain is severe, swelling is spreading, or you have a fever, contact an available medical service or an emergency room — including outside opening hours.',
    },
  },
  {
    q: {
      he: 'האם אפשר להביא ילדים?',
      ar: 'هل يمكن إحضار الأطفال؟',
      en: 'Do you see children?',
    },
    a: {
      he: 'מומלץ לברר בטלפון לפני קביעת התור, כדי שנוכל לומר מה מתאים לגיל ולמצב הספציפי.',
      ar: 'يُنصح بالاستفسار هاتفيًا قبل حجز الموعد، كي نتمكن من توضيح ما يناسب العمر والحالة المحدّدة.',
      en: 'Please check by phone before booking, so we can tell you what is appropriate for the age and the specific situation.',
    },
  },
  {
    q: {
      he: 'אפשר לבטל או לשנות תור?',
      ar: 'هل يمكن إلغاء الموعد أو تغييره؟',
      en: 'Can I cancel or change an appointment?',
    },
    a: {
      he: 'כן. נבקש להודיע מראש ככל האפשר, כדי שנוכל לתת את התור למטופל אחר.',
      ar: 'نعم. نرجو الإبلاغ مسبقًا قدر الإمكان، كي نتمكن من إعطاء الموعد لمريض آخر.',
      en: 'Yes. Please let us know as far in advance as you can, so the slot can be offered to another patient.',
    },
  },
];
