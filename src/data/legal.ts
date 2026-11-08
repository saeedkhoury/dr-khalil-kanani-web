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

/** Date of the privacy policy, terms of use and cookie policy. The accessibility statement has its own, below. */
export const LAST_UPDATED = '2026-11-08';

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

/**
 * Privacy policy. Describes what the deployed system actually does
 * (checked 2026-11-08): the form POSTs to the appointment-email Worker on
 * Cloudflare, which stores nothing and hands the request to Resend for
 * delivery to the clinic inbox; WhatsApp is the fallback. The site sets no
 * cookies and runs no analytics. Earlier text described an encrypted lead
 * database and a 12-month deletion schedule that never existed — a privacy
 * notice that misdescribes processing is itself a breach of s.11.
 *
 * The retention wording deliberately names no period: the clinic has not
 * chosen one. If the owner sets one, state it here.
 */
export const privacyPolicy: LegalSection[] = [
  {
    heading: { he: 'כללי', ar: 'عام', en: 'General' },
    body: {
      he: [
        'מדיניות זו מסבירה איזה מידע נאסף באתר, לשם מה, מי מקבל אותו ומהן הזכויות שלכם.',
        'האתר מופעל על ידי המרפאה ששמה ופרטיה מופיעים בתחתית עמוד זה (״המרפאה״), והיא האחראית על המידע.',
        'המידע מטופל בהתאם לחוק הגנת הפרטיות, התשמ״א-1981 והתקנות שהותקנו מכוחו.',
      ],
      ar: [
        'توضّح هذه السياسة ما هي المعلومات التي تُجمع في الموقع، ولأي غرض، ومن يتلقاها، وما هي حقوقكم.',
        'يُدار الموقع من قِبل العيادة التي يظهر اسمها وتفاصيلها في أسفل هذه الصفحة («العيادة»)، وهي المسؤولة عن المعلومات.',
        'تُعالَج المعلومات وفقًا لقانون حماية الخصوصية لعام 1981 والأنظمة الصادرة بموجبه.',
      ],
      en: [
        'This policy explains what information this site collects, why, who receives it, and what your rights are.',
        'The site is operated by the clinic whose name and details appear at the bottom of this page (“the clinic”), which is responsible for the information.',
        'Information is handled in accordance with the Protection of Privacy Law, 1981 and the regulations made under it.',
      ],
    },
  },
  {
    heading: { he: 'איזה מידע נאסף', ar: 'ما هي المعلومات التي تُجمع', en: 'What information is collected' },
    body: {
      he: [
        'גלישה באתר אינה מחייבת מסירת פרטים אישיים כלשהם.',
        'בטופס בקשת התור נאספים: שם מלא ומספר טלפון (חובה), אופן יצירת הקשר המועדף, ובאופן אופציונלי הטיפול שמעניין אתכם, שעות נוחות והערה קצרה. נא לא לכתוב פרטים רפואיים בהערה.',
        'איננו מבקשים מספר תעודת זהות, תאריך לידה, קופת חולים או היסטוריה רפואית, והטופס אינו מאפשר לצרף קבצים.',
        'מסירת הפרטים היא בהתנדבות ואינה חובה חוקית. ללא שם ומספר טלפון לא נוכל לחזור אליכם.',
      ],
      ar: [
        'تصفّح الموقع لا يتطلب تقديم أي تفاصيل شخصية.',
        'في نموذج طلب الموعد تُجمع: الاسم الكامل ورقم الهاتف (إلزاميان)، وطريقة التواصل المفضّلة، واختياريًا العلاج الذي يهمّكم والأوقات المناسبة وملاحظة قصيرة. يُرجى عدم كتابة تفاصيل طبية في الملاحظة.',
        'لا نطلب رقم الهوية أو تاريخ الميلاد أو صندوق المرضى أو التاريخ الطبي، ولا يتيح النموذج إرفاق ملفات.',
        'تقديم التفاصيل طوعي وليس إلزامًا قانونيًا. بدون الاسم ورقم الهاتف لن نتمكن من معاودة الاتصال بكم.',
      ],
      en: [
        'You can browse this site without giving any personal details.',
        'The appointment request form collects your full name and phone number (required), your preferred way of being contacted and, optionally, the treatment you are interested in, a convenient time of day and a short note. Please do not include medical details in the note.',
        'We do not ask for an ID number, date of birth, health fund or medical history, and the form does not accept file attachments.',
        'Providing the details is voluntary and not a legal obligation. Without a name and phone number we cannot reply to you.',
      ],
    },
  },
  {
    heading: { he: 'למה המידע משמש', ar: 'لماذا تُستخدم المعلومات', en: 'What the information is used for' },
    body: {
      he: [
        'הפרטים משמשים אך ורק כדי לחזור אליכם בעקבות הפנייה ולתאם תור.',
        'הם אינם משמשים לפרסום, אינם נמכרים ואינם מצורפים לרשימת תפוצה.',
      ],
      ar: [
        'تُستخدم التفاصيل فقط لمعاودة الاتصال بكم بخصوص الطلب وتنسيق موعد.',
        'لا تُستخدم للإعلان، ولا تُباع، ولا تُضاف إلى قائمة مراسلات.',
      ],
      en: [
        'The details are used only to get back to you about your request and to arrange an appointment.',
        'They are not used for advertising, not sold and not added to any mailing list.',
      ],
    },
  },
  {
    heading: {
      he: 'איך הפנייה נשלחת ומי מקבל אותה',
      ar: 'كيف يُرسَل الطلب ومن يتلقاه',
      en: 'How your request is delivered and who receives it',
    },
    body: {
      he: [
        'כשאתם לוחצים על ״שליחה״, הפרטים עוברים בחיבור מוצפן לשירות שליחה קטן הפועל על תשתית Cloudflare. השירות אינו שומר את הפנייה; הוא מעביר אותה מיד לספק משלוח הדואר האלקטרוני Resend, שמוסר אותה כהודעת דוא״ל לתיבת הדואר של המרפאה.',
        'אם שירות השליחה אינו זמין, נפתחת במקום זאת הודעת וואטסאפ עם הפרטים. ההודעה נשלחת רק אם תלחצו על שליחה בוואטסאפ, ומאותו רגע היא נשמרת בחשבון הוואטסאפ שלכם ושל המרפאה, בכפוף למדיניות של וואטסאפ (Meta).',
        'ספקים אלה פועלים עבור המרפאה לצורך העברת ההודעה בלבד, וחלקם מעבדים מידע בשרתים מחוץ לישראל.',
        'המרפאה אינה מוכרת את פרטיכם ואינה מעבירה אותם לאחרים, אלא אם הדבר נדרש על פי דין.',
      ],
      ar: [
        'عند الضغط على «إرسال»، تنتقل التفاصيل عبر اتصال مشفّر إلى خدمة إرسال صغيرة تعمل على بنية Cloudflare التحتية. لا تحفظ هذه الخدمة الطلب، بل تنقله فورًا إلى مزوّد خدمة البريد الإلكتروني Resend، الذي يسلّمه كرسالة بريد إلكتروني إلى صندوق بريد العيادة.',
        'إذا كانت خدمة الإرسال غير متاحة، تُفتح بدلًا من ذلك رسالة واتساب تحتوي على التفاصيل. لا تُرسَل الرسالة إلا إذا ضغطتم على إرسال في واتساب، ومنذ تلك اللحظة تُحفظ في حسابكم على واتساب وحساب العيادة، وفقًا لسياسة واتساب (Meta).',
        'يعمل هؤلاء المزوّدون لصالح العيادة لغرض نقل الرسالة فقط، وبعضهم يعالج المعلومات على خوادم خارج إسرائيل.',
        'لا تبيع العيادة تفاصيلكم ولا تنقلها إلى آخرين، إلا إذا اقتضى القانون ذلك.',
      ],
      en: [
        'When you press Send, the details travel over an encrypted connection to a small sending service that runs on Cloudflare’s infrastructure. That service does not save the request; it passes it straight to the email delivery provider Resend, which delivers it as an email to the clinic’s inbox.',
        'If the sending service is unavailable, a WhatsApp message containing your details opens instead. It is sent only if you press send in WhatsApp, and from then on it is held in your WhatsApp account and the clinic’s, under WhatsApp’s (Meta’s) policies.',
        'These providers act for the clinic only to deliver the message, and some of them process information on servers outside Israel.',
        'The clinic does not sell your details or pass them to anyone else, unless the law requires it.',
      ],
    },
  },
  {
    heading: { he: 'כמה זמן המידע נשמר', ar: 'مدة حفظ المعلومات', en: 'How long information is kept' },
    body: {
      he: [
        'האתר עצמו אינו שומר עותק של הפנייה.',
        'הפנייה נשמרת בתיבת הדואר או בוואטסאפ של המרפאה כל עוד הדבר נחוץ כדי לחזור אליכם ולתאם תור.',
        'אם תהפכו למטופלים במרפאה, המידע הרפואי מנוהל בנפרד מהאתר, בהתאם לחוק זכויות החולה, התשנ״ו-1996 ולכללים בדבר ניהול רשומות רפואיות.',
      ],
      ar: [
        'لا يحفظ الموقع نفسه نسخة من الطلب.',
        'يُحفظ الطلب في صندوق بريد العيادة أو في واتساب ما دام ذلك ضروريًا لمعاودة الاتصال بكم وتنسيق الموعد.',
        'إذا أصبحتم مرضى في العيادة، تُدار المعلومات الطبية بشكل منفصل عن الموقع، وفقًا لقانون حقوق المريض لعام 1996 والقواعد المتعلقة بإدارة السجلات الطبية.',
      ],
      en: [
        'The site itself keeps no copy of your request.',
        'The request is kept in the clinic’s email inbox or WhatsApp for as long as it is needed to get back to you and arrange an appointment.',
        'If you become a patient of the clinic, medical information is managed separately from the website, in accordance with the Patient’s Rights Law, 1996 and the rules on keeping medical records.',
      ],
    },
  },
  {
    heading: { he: 'עוגיות ומידע טכני', ar: 'ملفات تعريف الارتباط والمعلومات التقنية', en: 'Cookies and technical information' },
    body: {
      he: [
        'האתר אינו משתמש בעוגיות (cookies) ואינו משתמש בכלי סטטיסטיקה, פרסום או מעקב.',
        'האתר מאוחסן ב-GitHub Pages. כמו כל שרת אינטרנט, ספק האחסון מקבל את כתובת ה-IP של המכשיר שלכם ופרטים טכניים בסיסיים כדי להציג את העמודים.',
        'המפה בעמוד יצירת הקשר נטענת מ-Google רק אם תלחצו על הכפתור להצגתה. פרטים נוספים במדיניות העוגיות.',
      ],
      ar: [
        'لا يستخدم الموقع ملفات تعريف الارتباط (cookies)، ولا يستخدم أدوات إحصاء أو إعلان أو تتبّع.',
        'الموقع مستضاف على GitHub Pages. وكأي خادم إنترنت، يتلقى مزوّد الاستضافة عنوان IP لجهازكم وتفاصيل تقنية أساسية لعرض الصفحات.',
        'تُحمَّل الخريطة في صفحة التواصل من Google فقط إذا ضغطتم على زر عرضها. لمزيد من التفاصيل راجعوا سياسة ملفات تعريف الارتباط.',
      ],
      en: [
        'This site sets no cookies and uses no analytics, advertising or tracking tools.',
        'The site is hosted on GitHub Pages. Like any web server, the host receives your device’s IP address and basic technical details in order to deliver the pages.',
        'The map on the contact page loads from Google only if you press the button to show it. See the cookie policy for details.',
      ],
    },
  },
  {
    heading: { he: 'הזכויות שלכם', ar: 'حقوقكم', en: 'Your rights' },
    body: {
      he: [
        'עומדת לכם הזכות לעיין במידע עליכם, ולבקש לתקנו או למחקו אם אינו נכון, שלם, ברור או מעודכן, בהתאם לסעיפים 13 ו-14 לחוק הגנת הפרטיות.',
        'אפשר גם לבקש מהמרפאה למחוק פנייה שלא הובילה לטיפול.',
        'לפנייה בנושא, השתמשו בפרטי הקשר שבתחתית עמוד זה. אם לדעתכם נפגעה פרטיותכם, אפשר גם לפנות לרשות להגנת הפרטיות במשרד המשפטים.',
      ],
      ar: [
        'يحق لكم الاطلاع على المعلومات المتعلقة بكم، وطلب تصحيحها أو حذفها إذا لم تكن صحيحة أو كاملة أو واضحة أو محدّثة، وفقًا للبندين 13 و14 من قانون حماية الخصوصية.',
        'يمكنكم أيضًا أن تطلبوا من العيادة حذف طلب لم يؤدِّ إلى علاج.',
        'للتواصل بهذا الشأن، استخدموا تفاصيل الاتصال في أسفل هذه الصفحة. وإذا رأيتم أن خصوصيتكم انتُهكت، يمكنكم أيضًا التوجّه إلى سلطة حماية الخصوصية في وزارة العدل.',
      ],
      en: [
        'You have the right to review the information held about you, and to ask for it to be corrected or deleted if it is inaccurate, incomplete, unclear or out of date, under sections 13 and 14 of the Protection of Privacy Law.',
        'You can also ask the clinic to delete an enquiry that did not lead to treatment.',
        'To make a request, use the contact details at the bottom of this page. If you believe your privacy has been infringed, you may also contact the Privacy Protection Authority at the Ministry of Justice.',
      ],
    },
  },
  {
    heading: { he: 'אבטחת מידע', ar: 'أمن المعلومات', en: 'Information security' },
    body: {
      he: [
        'האתר מוגש באמצעות HTTPS בלבד, והפנייה עוברת מוצפנת מהדפדפן שלכם אל שירות השליחה ומשם אל ספק הדואר האלקטרוני.',
        'שירות השליחה מקבל פניות רק מאתר זה ואינו שומר אותן.',
        'אין שיטת העברה או אחסון שהיא מאובטחת לחלוטין.',
      ],
      ar: [
        'يُقدَّم الموقع عبر HTTPS فقط، وينتقل الطلب مشفّرًا من متصفحكم إلى خدمة الإرسال ومنها إلى مزوّد البريد الإلكتروني.',
        'تستقبل خدمة الإرسال الطلبات من هذا الموقع فقط ولا تحفظها.',
        'لا توجد طريقة نقل أو تخزين آمنة تمامًا.',
      ],
      en: [
        'The site is served over HTTPS only, and your request travels encrypted from your browser to the sending service and on to the email provider.',
        'The sending service accepts requests only from this site and does not store them.',
        'No method of transmission or storage is completely secure.',
      ],
    },
  },
  {
    heading: { he: 'שינויים במדיניות', ar: 'تغييرات في السياسة', en: 'Changes to this policy' },
    body: {
      he: ['אנו עשויים לעדכן מדיניות זו. התאריך בראש העמוד מציין מתי עודכנה לאחרונה.'],
      ar: ['قد نُحدّث هذه السياسة. يشير التاريخ في أعلى الصفحة إلى آخر تحديث لها.'],
      en: ['We may update this policy. The date at the top of the page shows when it last changed.'],
    },
  },
];
