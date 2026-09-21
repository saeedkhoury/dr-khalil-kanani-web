/**
 * Accessibility statement and privacy policy content.
 *
 * ⚠ DRAFT — REQUIRES ISRAELI LEGAL REVIEW BEFORE LAUNCH.
 *   These texts are written to cover the elements the regulations require.
 *   They are not legal advice and must be reviewed by an Israeli lawyer.
 *
 * ACCESSIBILITY — reg. 35ה of the Equal Rights for Persons with Disabilities
 * (Service Accessibility) Regulations, 2013 requires a prominent statement
 * containing: the accommodations implemented, a channel for reporting an
 * accessibility failure, and reference to the remediation process (60 days
 * from notice). A רכז נגישות (accessibility coordinator) must be appointed
 * only by service providers with 25+ employees, so this clinic does NOT
 * declare one — declaring a coordinator that has not been appointed would
 * be an inaccurate statement. A named human contact is given instead.
 *
 * The conformance target is Israeli Standard IS 5568, whose normative base
 * is WCAG 2.0 level AA. Note the Israeli national deviations: 2.4.10
 * (Section Headings) is REQUIRED at AA — stricter than WCAG — while 1.2.4
 * and 1.2.5 are not required and 3.1.2 is disapplied. This site is built to
 * WCAG 2.1 AA, a safe superset.
 *
 * No accessibility overlay widget is used. Overlays do not confer legal
 * compliance, and the US FTC fined one vendor $1M in April 2025 over claims
 * that its widget produced compliance, finding the widget itself introduced
 * barriers. Conformance here is built into the markup.
 *
 * PRIVACY — the Protection of Privacy Law, 1981 as amended by Amendment 13
 * (in force 14 Aug 2025) requires notice at the point of collection covering:
 * whether provision is obligatory, the consequence of refusing, the purpose,
 * recipients, the controller's contact details, and the right to access and
 * correct. Those points are also rendered inline beside the form itself.
 */

import type { Locale } from '../i18n/config';

export interface LegalSection {
  heading: Record<Locale, string>;
  body: Record<Locale, string[]>;
}

/** Owner must supply a real name, phone and email for accessibility enquiries. */
export const ACCESSIBILITY_CONTACT = {
  name: '',
  phone: '',
  email: '',
};

export const LAST_UPDATED = '2026-09-20';

export const accessibilityStatement: LegalSection[] = [
  {
    heading: {
      he: 'מחויבות לנגישות',
      ar: 'الالتزام بإمكانية الوصول',
      en: 'Our commitment to accessibility',
    },
    body: {
      he: [
        'המרפאה רואה חשיבות במתן שירות נגיש לכלל הציבור, לרבות אנשים עם מוגבלות.',
        'אתר זה נבנה בהתאם לתקן הישראלי ת״י 5568 ברמת AA, המבוסס על הנחיות הנגישות לתכני אינטרנט (WCAG), ובהתאם לתקנות שוויון זכויות לאנשים עם מוגבלות (התאמות נגישות לשירות), התשע״ג-2013.',
      ],
      ar: [
        'تولي العيادة أهمية لتقديم خدمة متاحة لعموم الجمهور، بمن فيهم الأشخاص ذوو الإعاقة.',
        'بُني هذا الموقع وفقًا للمعيار الإسرائيلي ת״י 5568 بمستوى AA، المستند إلى إرشادات إتاحة محتوى الويب (WCAG)، ووفقًا لأنظمة المساواة في حقوق الأشخاص ذوي الإعاقة (تعديلات إتاحة الخدمة) لعام 2013.',
      ],
      en: [
        'The clinic considers it important to provide an accessible service to the public, including people with disabilities.',
        'This site was built in accordance with Israeli Standard IS 5568 at level AA, which is based on the Web Content Accessibility Guidelines (WCAG), and with the Equal Rights for Persons with Disabilities (Service Accessibility) Regulations, 2013.',
      ],
    },
  },
  {
    heading: {
      he: 'התאמות הנגישות שבוצעו באתר',
      ar: 'تعديلات إتاحة الوصول المطبّقة في الموقع',
      en: 'Accessibility measures implemented on this site',
    },
    body: {
      he: [
        'מבנה סמנטי ותקין של כותרות בכל עמוד, המאפשר ניווט באמצעות קורא מסך.',
        'ניווט מלא באמצעות מקלדת, כולל סימון ברור של הפוקוס וקישור לדילוג לתוכן הראשי.',
        'יחסי ניגודיות של 4.5:1 לפחות עבור טקסט רגיל, ו-3:1 עבור רכיבי ממשק.',
        'תוויות מפורשות לכל שדה בטופס, והודעות שגיאה המקושרות לשדה ומוקראות על ידי טכנולוגיה מסייעת.',
        'טקסט חלופי לתמונות בעלות משמעות, וסימון תמונות דקורטיביות ככאלה.',
        'כיווניות תקינה של הדף בעברית, בערבית ובאנגלית, לרבות בידוד מספרי טלפון.',
        'התאמה לצפייה במכשירים ניידים ובמסכים בגדלים שונים, ללא גלילה אופקית.',
        'כיבוד הגדרת המערכת להפחתת אנימציות (prefers-reduced-motion).',
        'האתר אינו עושה שימוש בקבצי PDF; כל התוכן מוגש כדפי HTML נגישים.',
      ],
      ar: [
        'بنية دلالية وسليمة للعناوين في كل صفحة، تتيح التصفح عبر قارئ الشاشة.',
        'تصفّح كامل بواسطة لوحة المفاتيح، بما في ذلك إبراز واضح للتركيز ورابط للتخطي إلى المحتوى الرئيسي.',
        'نسب تباين لا تقل عن 4.5:1 للنص العادي، و3:1 لعناصر الواجهة.',
        'تسميات صريحة لكل حقل في النموذج، ورسائل خطأ مرتبطة بالحقل وتُقرأ بواسطة التقنيات المساعدة.',
        'نص بديل للصور ذات المعنى، ووسم الصور الزخرفية بهذه الصفة.',
        'اتجاه سليم للصفحة بالعبرية والعربية والإنجليزية، بما في ذلك عزل أرقام الهواتف.',
        'ملاءمة للعرض على الأجهزة المحمولة وعلى شاشات بأحجام مختلفة، دون تمرير أفقي.',
        'احترام إعداد النظام لتقليل الحركة (prefers-reduced-motion).',
        'لا يستخدم الموقع ملفات PDF؛ كل المحتوى يُقدَّم كصفحات HTML متاحة.',
      ],
      en: [
        'A semantic, correctly ordered heading structure on every page, allowing screen-reader navigation.',
        'Full keyboard navigation, including a clearly visible focus indicator and a skip-to-content link.',
        'Contrast ratios of at least 4.5:1 for normal text and 3:1 for user-interface components.',
        'Explicit labels on every form field, with error messages tied to their field and announced by assistive technology.',
        'Alternative text for meaningful images, with decorative images marked as such.',
        'Correct text direction in Hebrew, Arabic and English, including isolation of phone numbers.',
        'Support for mobile devices and a range of screen sizes, with no horizontal scrolling.',
        'Respect for the system reduced-motion setting (prefers-reduced-motion).',
        'The site uses no PDF files; all content is delivered as accessible HTML pages.',
      ],
    },
  },
  {
    heading: {
      he: 'מגבלות ידועות',
      ar: 'قيود معروفة',
      en: 'Known limitations',
    },
    body: {
      he: [
        'תוכן המסופק על ידי צד שלישי, ככל שישולב בעתיד, עשוי שלא להיות נגיש במלואו.',
        'אנו פועלים לשיפור מתמיד של נגישות האתר. אם נתקלתם ברכיב שאינו נגיש, נשמח לדעת.',
      ],
      ar: [
        'المحتوى الذي يقدّمه طرف ثالث، إذا أُدمج مستقبلًا، قد لا يكون متاحًا بالكامل.',
        'نعمل على تحسين إتاحة الموقع باستمرار. إذا واجهتم عنصرًا غير متاح، يسرّنا أن نعرف.',
      ],
      en: [
        'Third-party content, should any be integrated in future, may not be fully accessible.',
        'We work to improve the accessibility of this site continuously. If you encounter an element that is not accessible, we would like to know.',
      ],
    },
  },
  {
    heading: {
      he: 'פנייה בנושא נגישות',
      ar: 'التواصل بشأن إمكانية الوصول',
      en: 'Contacting us about accessibility',
    },
    body: {
      he: [
        'אם נתקלתם בבעיית נגישות באתר, או שאתם זקוקים להתאמת נגישות לצורך קבלת שירות במרפאה, אנא צרו קשר ונטפל בפנייה.',
        'בהתאם לתקנות, פנייה בדבר ליקוי נגישות תטופל בתוך 60 ימים ממועד קבלתה.',
      ],
      ar: [
        'إذا واجهتم مشكلة في إتاحة الموقع، أو كنتم بحاجة إلى تعديل لإتاحة الوصول لتلقي الخدمة في العيادة، يُرجى التواصل معنا وسنعالج الطلب.',
        'وفقًا للأنظمة، تُعالَج الشكوى المتعلقة بخلل في إمكانية الوصول خلال 60 يومًا من تاريخ تلقّيها.',
      ],
      en: [
        'If you encounter an accessibility problem on this site, or you need an accessibility accommodation in order to receive service at the clinic, please contact us and we will address it.',
        'In accordance with the regulations, a report of an accessibility failure will be handled within 60 days of receipt.',
      ],
    },
  },
];

export const privacyPolicy: LegalSection[] = [
  {
    heading: { he: 'כללי', ar: 'عام', en: 'General' },
    body: {
      he: [
        'מדיניות זו מסבירה איזה מידע נאסף באתר, למה הוא נאסף, ומה הזכויות שלכם לגביו.',
        'המידע נאסף ומעובד בהתאם לחוק הגנת הפרטיות, התשמ״א-1981 והתקנות מכוחו.',
      ],
      ar: [
        'توضّح هذه السياسة ما هي المعلومات التي تُجمع في الموقع، ولماذا تُجمع، وما هي حقوقكم بشأنها.',
        'تُجمع المعلومات وتُعالج وفقًا لقانون حماية الخصوصية لعام 1981 والأنظمة الصادرة بموجبه.',
      ],
      en: [
        'This policy explains what information is collected on this site, why it is collected, and what rights you have in relation to it.',
        'Information is collected and processed in accordance with the Protection of Privacy Law, 1981 and the regulations made under it.',
      ],
    },
  },
  {
    heading: {
      he: 'איזה מידע נאסף',
      ar: 'ما هي المعلومات التي تُجمع',
      en: 'What information is collected',
    },
    body: {
      he: [
        'בטופס בקשת התור נאספים: שם מלא, מספר טלפון, אופן יצירת הקשר המועדף, ובאופן אופציונלי הטיפול שמעניין אתכם, שעות נוחות והערה חופשית.',
        'איננו מבקשים ואיננו נדרשים למספר תעודת זהות, לתאריך לידה, לפרטי קופת חולים או למידע רפואי. אנו מבקשים במפורש שלא לכלול פרטים רפואיים בשדה ההערה — נדבר על הטיפול בטלפון.',
        'האתר אינו עושה שימוש בכלי אנליטיקה מבוססי עוגיות ואינו מפעיל פיקסלים פרסומיים.',
      ],
      ar: [
        'في نموذج طلب الموعد تُجمع: الاسم الكامل، رقم الهاتف، طريقة التواصل المفضّلة، واختياريًا العلاج الذي يهمكم، الأوقات المناسبة وملاحظة حرة.',
        'لا نطلب ولا نحتاج إلى رقم الهوية أو تاريخ الميلاد أو تفاصيل صندوق المرضى أو معلومات طبية. ونطلب صراحةً عدم تضمين تفاصيل طبية في حقل الملاحظة — سنتحدث عن العلاج هاتفيًا.',
        'لا يستخدم الموقع أدوات تحليلات قائمة على ملفات تعريف الارتباط ولا يشغّل بكسلات إعلانية.',
      ],
      en: [
        'The appointment request form collects: full name, phone number, preferred contact method, and optionally the treatment you are interested in, convenient times, and a free-text note.',
        'We do not ask for and do not need an ID number, date of birth, health fund details or medical information. We explicitly ask that you do not include medical details in the note field — we will discuss treatment by phone.',
        'The site uses no cookie-based analytics and runs no advertising pixels.',
      ],
    },
  },
  {
    heading: {
      he: 'מסירת המידע ומטרת השימוש',
      ar: 'تقديم المعلومات والغرض من استخدامها',
      en: 'Providing the information and how it is used',
    },
    body: {
      he: [
        'מסירת הפרטים היא בהתנדבות ואינה חובה חוקית. אם לא תמסרו אותם, לא נוכל ליצור איתכם קשר בעקבות הפנייה.',
        'הפרטים משמשים אך ורק למענה לפנייה ולתיאום תור. הם אינם נמכרים ואינם מועברים לצד שלישי למטרות שיווק.',
        'דיוור פרסומי יישלח רק אם סימנתם במפורש את תיבת ההסכמה הנפרדת לכך, וניתן לבטל את ההסכמה בכל עת.',
      ],
      ar: [
        'تقديم التفاصيل طوعي وليس التزامًا قانونيًا. إذا لم تقدّموها، لن نتمكن من التواصل معكم بشأن الطلب.',
        'تُستخدم التفاصيل فقط للردّ على الطلب وتنسيق الموعد. ولا تُباع ولا تُنقل إلى طرف ثالث لأغراض تسويقية.',
        'لن تُرسَل رسائل دعائية إلا إذا وضعتم علامة صريحة في خانة الموافقة المنفصلة لذلك، ويمكن سحب الموافقة في أي وقت.',
      ],
      en: [
        'Providing your details is voluntary and is not a legal obligation. If you do not provide them, we will not be able to contact you about your enquiry.',
        'The details are used solely to answer your enquiry and arrange an appointment. They are not sold and are not passed to third parties for marketing purposes.',
        'Marketing messages are sent only if you actively ticked the separate consent box, and that consent can be withdrawn at any time.',
      ],
    },
  },
  {
    heading: {
      he: 'שמירה ומחיקה',
      ar: 'الحفظ والحذف',
      en: 'Retention and deletion',
    },
    body: {
      he: [
        'פניות שלא הפכו לטיפול בפועל נמחקות בתוך 12 חודשים.',
        'אם הפכתם למטופלים במרפאה, המידע הרפואי מנוהל בנפרד ממערכת האתר, בהתאם לחוק זכויות החולה, התשנ״ו-1996 ולכללי שמירת רשומות רפואיות.',
      ],
      ar: [
        'الطلبات التي لم تتحوّل إلى علاج فعلي تُحذف خلال 12 شهرًا.',
        'إذا أصبحتم مرضى في العيادة، تُدار المعلومات الطبية بشكل منفصل عن نظام الموقع، وفقًا لقانون حقوق المريض لعام 1996 وقواعد حفظ السجلات الطبية.',
      ],
      en: [
        'Enquiries that do not become actual treatment are deleted within 12 months.',
        'If you become a patient of the clinic, medical information is managed separately from the website system, in accordance with the Patient’s Rights Law, 1996 and medical record-keeping rules.',
      ],
    },
  },
  {
    heading: {
      he: 'הזכויות שלכם',
      ar: 'حقوقكم',
      en: 'Your rights',
    },
    body: {
      he: [
        'עומדת לכם הזכות לעיין במידע שנאסף עליכם, לבקש את תיקונו אם אינו נכון, ולבקש את מחיקתו.',
        'לפנייה בנושא, השתמשו בפרטי הקשר של המרפאה המופיעים באתר.',
      ],
      ar: [
        'يحق لكم الاطّلاع على المعلومات التي جُمعت عنكم، وطلب تصحيحها إذا كانت غير صحيحة، وطلب حذفها.',
        'للتواصل بهذا الشأن، استخدموا تفاصيل الاتصال بالعيادة الموجودة في الموقع.',
      ],
      en: [
        'You have the right to review the information collected about you, to request its correction if it is inaccurate, and to request its deletion.',
        'To do so, please use the clinic contact details shown on this site.',
      ],
    },
  },
  {
    heading: { he: 'אבטחת מידע', ar: 'أمن المعلومات', en: 'Information security' },
    body: {
      he: [
        'הפניות נשמרות במאגר עם הרשאות גישה מוגבלות והצפנה באחסון.',
        'האתר מוגש באמצעות HTTPS בלבד.',
      ],
      ar: [
        'تُحفظ الطلبات في قاعدة بيانات بصلاحيات وصول محدودة وتشفير عند التخزين.',
        'يُقدَّم الموقع عبر HTTPS فقط.',
      ],
      en: [
        'Enquiries are stored with restricted access permissions and encryption at rest.',
        'The site is served over HTTPS only.',
      ],
    },
  },
];
