/**
 * Accessibility statement and privacy policy content.
 *
 * ⚠ DRAFT — REQUIRES ISRAELI LEGAL REVIEW BEFORE LAUNCH.
 *   These texts are written to cover the elements the regulations require.
 *   They are not legal advice and must be reviewed by an Israeli lawyer.
 *
 * ACCESSIBILITY — checked 2026-10-07 against the Commission for Equal Rights
 * of Persons with Disabilities guide "הצהרת נגישות ומידע על הסדרי הנגישות
 * באתר אינטרנט" (gov.il, updated 15.04.2026) and the standard's text:
 *  - Websites must meet IS 5568 Part 1 at level AA (reg. 35 of the Equal
 *    Rights for Persons with Disabilities (Service Accessibility)
 *    Regulations, 2013). The current edition is IS 5568-1 (September 2023),
 *    which replaced the May 2021 edition and is WCAG 2.0 with national
 *    changes: 1.2.1–1.2.3 raised to AA, 1.2.4/1.2.5 lowered to AAA, 2.4.10
 *    Section Headings raised to AA, 3.1.2 not applicable.
 *  - The statement must be prominent, reachable from at least two places
 *    (here: the footer and the accessibility panel), and give: last-update
 *    date, commitment, standard and level, measures taken, supported
 *    browsers, how it was tested, known limitations, third-party partial
 *    conformance, the accessibility coordinator's details where one must be
 *    appointed, and a contact for reporting problems.
 *  - The organisation's physical accessibility arrangements must also be
 *    published (reg. 34א) — see PHYSICAL_ACCESSIBILITY_CONFIRMED below.
 * A רכז נגישות must be appointed by a service provider employing 25 or more
 * people. Whether that applies here is the owner's fact; no coordinator is
 * named until the owner confirms one, and the clinic phone is the contact.
 * No unverified legal timeline is promised in the statement.
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

/** Privacy policy date. The accessibility statement has its own, below. */
export const LAST_UPDATED = '2026-09-20';

/** Date the accessibility statement was last reviewed against the site. */
export const ACCESSIBILITY_UPDATED = '2026-10-07';

/**
 * Physical accessibility of the clinic (reg. 34א): OWNER INFORMATION REQUIRED.
 * Nothing about parking, the route from the street, the entrance, steps,
 * the treatment room or the toilet has been confirmed by the clinic, so the
 * statement says so and asks visitors to call ahead. Replace that section
 * with the confirmed facts — never with assumptions.
 */
export const PHYSICAL_ACCESSIBILITY_CONFIRMED = false;

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
        'האתר הותאם לדרישות התקן הישראלי ת״י 5568 חלק 1 (2023) ברמה AA, המבוסס על הנחיות WCAG 2.0, בהתאם לתקנות שוויון זכויות לאנשים עם מוגבלות (התאמות נגישות לשירות), התשע״ג-2013.',
      ],
      ar: [
        'تولي العيادة أهمية لتقديم خدمة متاحة لعموم الجمهور، بمن فيهم الأشخاص ذوو الإعاقة.',
        'جرى ملاءمة الموقع لمتطلبات المعيار الإسرائيلي ת״י 5568 الجزء 1 (2023) بمستوى AA، المستند إلى إرشادات WCAG 2.0، وفقًا لأنظمة المساواة في حقوق الأشخاص ذوي الإعاقة (تعديلات إتاحة الخدمة) لعام 2013.',
      ],
      en: [
        'The clinic considers it important to provide an accessible service to the public, including people with disabilities.',
        'This site has been adapted to the requirements of Israeli Standard IS 5568 Part 1 (2023) at level AA, which is based on WCAG 2.0, under the Equal Rights for Persons with Disabilities (Service Accessibility) Regulations, 2013.',
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
        'מבנה סמנטי ותקין של כותרות וחלקי עמוד בכל עמוד, המאפשר ניווט באמצעות קורא מסך.',
        'ניווט מלא באמצעות מקלדת, כולל סימון ברור של הפוקוס וקישור לדילוג לתוכן הראשי. רכיב בפוקוס אינו מוסתר מאחורי הכותרת העליונה או סרגל הפעולות.',
        'יחסי ניגודיות של 4.5:1 לפחות עבור טקסט רגיל.',
        'תוויות מפורשות לכל שדה בטופס, והודעות שגיאה המקושרות לשדה ומוקראות על ידי טכנולוגיה מסייעת.',
        'טקסט חלופי לתמונות בעלות משמעות, וסימון תמונות דקורטיביות ככאלה.',
        'כיווניות תקינה של הדף בעברית, בערבית ובאנגלית, לרבות בידוד מספרי טלפון.',
        'התאמה לצפייה במכשירים ניידים ובהגדלת תצוגה בדפדפן, ללא גלילה אופקית.',
        'כיבוד הגדרת המערכת להפחתת תנועה ואנימציות.',
        'כפתור עגול ״הגדרות נגישות״ בכל עמוד (בפינה התחתונה, וניתן לגרור אותו לכל גובה לאורך צדי המסך) מאפשר להגדיל את הטקסט, להגביר ניגודיות, להדגיש קישורים ולעצור אנימציות. ההגדרות נשמרות בדפדפן שלכם בלבד.',
        'האתר אינו עושה שימוש בקבצי PDF; כל התוכן מוגש כדפי HTML.',
      ],
      ar: [
        'بنية دلالية وسليمة للعناوين وأقسام الصفحة في كل صفحة، تتيح التصفح عبر قارئ الشاشة.',
        'تصفّح كامل بواسطة لوحة المفاتيح، بما في ذلك إبراز واضح للتركيز ورابط للتخطي إلى المحتوى الرئيسي. العنصر الذي عليه التركيز لا يختفي خلف الشريط العلوي أو شريط الإجراءات.',
        'نسب تباين لا تقل عن 4.5:1 للنص العادي.',
        'تسميات صريحة لكل حقل في النموذج، ورسائل خطأ مرتبطة بالحقل وتُقرأ بواسطة التقنيات المساعدة.',
        'نص بديل للصور ذات المعنى، ووسم الصور الزخرفية بهذه الصفة.',
        'اتجاه سليم للصفحة بالعبرية والعربية والإنجليزية، بما في ذلك عزل أرقام الهواتف.',
        'ملاءمة للعرض على الأجهزة المحمولة وعند تكبير العرض في المتصفح، دون تمرير أفقي.',
        'احترام إعداد النظام لتقليل الحركة والرسوم المتحركة.',
        'زر دائري «إعدادات إمكانية الوصول» في كل صفحة (في الزاوية السفلية، ويمكن سحبه إلى أي ارتفاع على جانبَي الشاشة) يتيح تكبير النص وتعزيز التباين وإبراز الروابط وإيقاف الحركة. تُحفظ الإعدادات في متصفحكم فقط.',
        'لا يستخدم الموقع ملفات PDF؛ كل المحتوى يُقدَّم كصفحات HTML.',
      ],
      en: [
        'A semantic, correctly ordered structure of headings and page regions on every page, allowing screen-reader navigation.',
        'Full keyboard navigation, including a clearly visible focus indicator and a skip-to-content link. A focused element is never hidden behind the top header or the action bar.',
        'Contrast ratios of at least 4.5:1 for normal text.',
        'Explicit labels on every form field, with error messages tied to their field and announced by assistive technology.',
        'Alternative text for meaningful images, with decorative images marked as such.',
        'Correct text direction in Hebrew, Arabic and English, including isolation of phone numbers.',
        'Support for mobile devices and for browser zoom, with no horizontal scrolling.',
        'Respect for the system setting to reduce motion and animation.',
        'A round "Accessibility settings" button on every page (in the lower corner; you can drag it to any height along either side of the screen) lets you enlarge text, increase contrast, highlight links and stop animations. Settings are saved only in your browser.',
        'The site uses no PDF files; all content is delivered as HTML pages.',
      ],
    },
  },
  {
    heading: {
      he: 'איך האתר נבדק',
      ar: 'كيف فُحص الموقع',
      en: 'How the site was tested',
    },
    body: {
      he: [
        'האתר נבדק בגרסאות עדכניות של הדפדפנים Chrome ו-Safari, במחשב ובגודל מסך של טלפון, בעברית, בערבית ובאנגלית.',
        'הבדיקות כללו בדיקה אוטומטית (axe-core) של כל עמודי האתר, ניווט ידני במקלדת, בדיקת מבנה הכותרות ושמות הרכיבים כפי שהם נמסרים לטכנולוגיה מסייעת, הגדלת טקסט ותצוגה, והפחתת תנועה.',
        'האתר מיועד לגרסאות עדכניות של הדפדפנים הנפוצים. כל התוכן והקישורים זמינים גם כאשר JavaScript כבוי; כפתור ההגדרות והגלריה המורחבת דורשים אותו.',
      ],
      ar: [
        'فُحص الموقع في إصدارات حديثة من المتصفحَين Chrome وSafari، على الحاسوب وبحجم شاشة الهاتف، بالعبرية والعربية والإنجليزية.',
        'شملت الفحوص فحصًا آليًا (axe-core) لجميع صفحات الموقع، والتنقل اليدوي بلوحة المفاتيح، وفحص بنية العناوين وأسماء العناصر كما تُنقل إلى التقنيات المساعدة، وتكبير النص والعرض، وتقليل الحركة.',
        'الموقع مُعدّ للإصدارات الحديثة من المتصفحات الشائعة. كل المحتوى والروابط متاحة أيضًا عند تعطيل JavaScript؛ أما زر الإعدادات والعرض المكبَّر للمعرض فيتطلبانه.',
      ],
      en: [
        'The site was tested in current versions of Chrome and Safari, on a computer and at phone screen size, in Hebrew, Arabic and English.',
        'Testing included an automated check (axe-core) of every page, manual keyboard navigation, review of the heading structure and of control names as exposed to assistive technology, text and page enlargement, and reduced motion.',
        'The site is intended for current versions of common browsers. All content and links remain available with JavaScript turned off; the settings button and the enlarged gallery view need it.',
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
        'מפת המיקום נטענת מ-Google רק לאחר לחיצה, והיא תוכן של צד שלישי שנגישותו אינה בשליטתנו. הכתובת, ההוראות וקישורי הניווט מוצגים גם כטקסט, ללא המפה.',
        'הבדיקה לא כללה עדיין בדיקה עם תוכנת הקראת מסך מסוימת על ידי משתמש/ת.',
        'אנו פועלים לשיפור מתמיד של נגישות האתר. אם נתקלתם ברכיב שאינו נגיש, נשמח לדעת.',
      ],
      ar: [
        'تُحمَّل خريطة الموقع من Google فقط بعد النقر، وهي محتوى من طرف ثالث لا نتحكم في إتاحته. العنوان والتعليمات وروابط التنقل معروضة أيضًا كنص، دون الخريطة.',
        'لم يشمل الفحص بعد اختبارًا ببرنامج قارئ شاشة محدد من قِبل مستخدم/ة.',
        'نعمل على تحسين إتاحة الموقع باستمرار. إذا واجهتم عنصرًا غير متاح، يسرّنا أن نعرف.',
      ],
      en: [
        'The location map loads from Google only after you press a button; it is third-party content whose accessibility we do not control. The address, directions and navigation links are also given as text, without the map.',
        'Testing has not yet included a session by a person using a specific screen reader.',
        'We work to improve the accessibility of this site continuously. If you encounter an element that is not accessible, we would like to know.',
      ],
    },
  },
  {
    heading: {
      he: 'הסדרי נגישות במרפאה',
      ar: 'ترتيبات إمكانية الوصول في العيادة',
      en: 'Accessibility arrangements at the clinic',
    },
    body: {
      he: [
        'פרטי הנגישות הפיזית של המרפאה (חניה, הדרך מהרחוב, הכניסה, חדר הטיפולים והשירותים) טרם פורסמו כאן. כדי שנוכל להיערך מראש, אנא התקשרו לפני ההגעה וספרו לנו איזו התאמה אתם צריכים.',
      ],
      ar: [
        'لم تُنشر هنا بعد تفاصيل إمكانية الوصول المادية في العيادة (الموقف، الطريق من الشارع، المدخل، غرفة العلاج ودورة المياه). لكي نستعد مسبقًا، يُرجى الاتصال قبل الوصول وإخبارنا بالتعديل الذي تحتاجونه.',
      ],
      en: [
        'Details of the clinic’s physical accessibility (parking, the route from the street, the entrance, the treatment room and the toilet) have not yet been published here. So that we can prepare, please call before you come and tell us what accommodation you need.',
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
        'אם נתקלתם בבעיית נגישות באתר, או שאתם זקוקים להתאמת נגישות לצורך קבלת שירות במרפאה, אנא צרו קשר בטלפון שלהלן ונטפל בפנייה. כדאי לציין את העמוד ואת הבעיה.',
      ],
      ar: [
        'إذا واجهتم مشكلة في إتاحة الموقع، أو كنتم بحاجة إلى تعديل لإتاحة الوصول لتلقي الخدمة في العيادة، يُرجى التواصل معنا عبر الهاتف أدناه وسنعالج الطلب. يُفضَّل ذكر الصفحة والمشكلة.',
      ],
      en: [
        'If you encounter an accessibility problem on this site, or you need an accessibility accommodation in order to receive service at the clinic, please contact us at the phone number below and we will address it. It helps to mention the page and the problem.',
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
