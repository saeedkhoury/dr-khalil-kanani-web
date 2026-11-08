/**
 * Terms of use and cookie policy.
 *
 * ⚠ DRAFT — REQUIRES ISRAELI LEGAL REVIEW, like everything in legal.ts.
 *
 * Both describe the site as deployed on 2026-11-08 and nothing more:
 *  - No cookies are set by the site. The only browser storage is the
 *    accessibility panel's two localStorage keys (src/lib/a11y-prefs.ts),
 *    which never leave the device. Israel has no ePrivacy-style cookie law,
 *    and with no cookies or tracking there is nothing to ask consent for —
 *    so there is deliberately no banner (docs/PRIVACY.md).
 *  - Google content appears only after an explicit click (MapFacade, ADR 0008).
 *  - Fonts and images are served from the site itself (docs/FONTS.md).
 *
 * If analytics, an embed or any cookie is ever added, the cookie policy must
 * change first — and a consent step may then be needed.
 *
 * Deliberately absent: a refund or cancellation policy. The site sells
 * nothing and takes no payment, and inventing commercial terms for a clinic
 * would be inventing facts (AGENTS.md §3.1). Prices may not be advertised
 * at all (§3.3).
 */
import type { LegalSection } from './legal';

export const termsOfUse: LegalSection[] = [
  {
    heading: { he: 'על תנאים אלה', ar: 'حول هذه الشروط', en: 'About these terms' },
    body: {
      he: ['תנאים אלה חלים על השימוש באתר. השימוש באתר מהווה הסכמה להם. אם אינכם מסכימים להם, אנא אל תשתמשו באתר.'],
      ar: ['تسري هذه الشروط على استخدام الموقع. استخدام الموقع يعني الموافقة عليها. إذا لم توافقوا عليها، يُرجى عدم استخدام الموقع.'],
      en: ['These terms apply to the use of this website. By using the site you accept them. If you do not agree, please do not use the site.'],
    },
  },
  {
    heading: { he: 'מידע רפואי', ar: 'معلومات طبية', en: 'Medical information' },
    body: {
      he: [
        'המידע באתר הוא מידע כללי בלבד, ואינו מהווה ייעוץ רפואי, אבחנה או המלצה לטיפול.',
        'כל טיפול נקבע באופן אישי, לאחר בדיקה במרפאה. אל תדחו פנייה לטיפול בשל דבר שקראתם באתר.',
      ],
      ar: [
        'المعلومات في الموقع عامة فقط، ولا تشكّل استشارة طبية أو تشخيصًا أو توصية بالعلاج.',
        'يُحدَّد كل علاج بشكل شخصي بعد الفحص في العيادة. لا تؤجّلوا طلب العلاج بسبب شيء قرأتموه في الموقع.',
      ],
      en: [
        'Information on this site is general only, and is not medical advice, a diagnosis or a recommendation for treatment.',
        'Every treatment is decided individually, after an examination at the clinic. Do not delay seeking care because of something you read here.',
      ],
    },
  },
  {
    heading: { he: 'מצבי חירום', ar: 'حالات الطوارئ', en: 'Emergencies' },
    body: {
      he: ['האתר והטופס אינם מיועדים למצבי חירום. במצב חירום רפואי התקשרו למגן דוד אדום בטלפון 101.'],
      ar: ['الموقع والنموذج غير مخصّصين لحالات الطوارئ. في حالة طوارئ طبية اتصلوا بنجمة داوود الحمراء على الرقم 101.'],
      en: ['This site and its form are not for emergencies. In a medical emergency, call Magen David Adom on 101.'],
    },
  },
  {
    heading: { he: 'בקשות לתור', ar: 'طلبات المواعيد', en: 'Appointment requests' },
    body: {
      he: ['שליחת טופס הבקשה אינה קובעת תור. התור נקבע רק לאחר שהמרפאה יוצרת איתכם קשר ומאשרת אותו.'],
      ar: ['إرسال نموذج الطلب لا يحجز موعدًا. يُحدَّد الموعد فقط بعد أن تتواصل العيادة معكم وتؤكده.'],
      en: ['Sending the request form does not book an appointment. An appointment is made only once the clinic contacts you and confirms it.'],
    },
  },
  {
    heading: { he: 'דיוק וזמינות', ar: 'الدقة والإتاحة', en: 'Accuracy and availability' },
    body: {
      he: [
        'אנו משתדלים שהמידע באתר יהיה נכון ומעודכן, אך ייתכנו בו טעויות או מידע שאינו עדכני. מומלץ לוודא שעות פעילות ושירותים מול המרפאה בטלפון.',
        'ייתכן שהאתר לא יהיה זמין מעת לעת.',
      ],
      ar: [
        'نحرص على أن تكون المعلومات في الموقع صحيحة ومحدّثة، لكنها قد تحتوي على أخطاء أو معلومات غير محدّثة. يُنصح بالتأكد من ساعات العمل والخدمات مع العيادة هاتفيًا.',
        'قد لا يكون الموقع متاحًا من حين لآخر.',
      ],
      en: [
        'We try to keep the information on this site correct and up to date, but it may contain errors or become out of date. Please confirm opening hours and services with the clinic by phone.',
        'The site may occasionally be unavailable.',
      ],
    },
  },
  {
    heading: { he: 'קישורים לשירותים אחרים', ar: 'روابط إلى خدمات أخرى', en: 'Links to other services' },
    body: {
      he: ['האתר מקשר לשירותים המופעלים על ידי אחרים, כגון וואטסאפ, אינסטגרם, Google Maps ו-Waze. המרפאה אינה אחראית לתוכן, לזמינות או למדיניות הפרטיות שלהם.'],
      ar: ['يحتوي الموقع على روابط لخدمات يديرها آخرون، مثل واتساب وإنستغرام وGoogle Maps وWaze. العيادة غير مسؤولة عن محتواها أو إتاحتها أو سياسات الخصوصية الخاصة بها.'],
      en: ['The site links to services run by others, such as WhatsApp, Instagram, Google Maps and Waze. The clinic is not responsible for their content, availability or privacy practices.'],
    },
  },
  {
    heading: { he: 'תוכן וזכויות יוצרים', ar: 'المحتوى وحقوق النشر', en: 'Content and copyright' },
    body: {
      he: [
        'הטקסטים, העיצוב, הלוגו והתמונות באתר שייכים למרפאה או משמשים ברשות, ומוגנים בזכויות יוצרים.',
        'מותר לצפות בעמודים ולשתף קישורים אליהם לשימוש אישי שאינו מסחרי. העתקה, פרסום מחדש או שימוש מסחרי בתוכן מחייבים אישור בכתב מהמרפאה.',
        'חלק מהתמונות הן איורים, והן מסומנות ככאלה.',
      ],
      ar: [
        'النصوص والتصميم والشعار والصور في الموقع مملوكة للعيادة أو مستخدمة بإذن، وهي محمية بحقوق النشر.',
        'يُسمح بتصفّح الصفحات ومشاركة روابطها للاستخدام الشخصي غير التجاري. أما نسخ المحتوى أو إعادة نشره أو استخدامه تجاريًا فيتطلب إذنًا خطيًا من العيادة.',
        'بعض الصور رسوم توضيحية، وهي موسومة على هذا النحو.',
      ],
      en: [
        'The text, design, logo and images on this site belong to the clinic or are used with permission, and are protected by copyright.',
        'You may view the pages and share links to them for personal, non-commercial use. Copying, republishing or commercial use of the content requires the clinic’s written permission.',
        'Some images are illustrations and are labelled as such.',
      ],
    },
  },
  {
    heading: { he: 'שימוש הוגן באתר', ar: 'الاستخدام المقبول', en: 'Acceptable use' },
    body: {
      he: ['אין לעשות שימוש לרעה באתר — למשל לשלוח בקשות כוזבות או אוטומטיות, לנסות לשבש את פעולתו, או לנסות לגשת לחלקים שאינם ציבוריים.'],
      ar: ['يُمنع إساءة استخدام الموقع — مثل إرسال طلبات كاذبة أو آلية، أو محاولة تعطيل عمله، أو محاولة الوصول إلى أجزاء غير عامة.'],
      en: ['Please do not misuse the site — for example by sending false or automated requests, trying to disrupt it, or trying to reach parts of it that are not public.'],
    },
  },
  {
    heading: { he: 'הגבלת אחריות', ar: 'حدود المسؤولية', en: 'Limitation of liability' },
    body: {
      he: [
        'במידה המותרת על פי דין, המרפאה אינה אחראית לנזק הנובע מהשימוש באתר או מהסתמכות על המידע הכללי שבו.',
        'אין בתנאים אלה כדי להגביל אחריות שאין להגבילה על פי דין, או לגרוע מזכויותיכם כמטופלים.',
      ],
      ar: [
        'في الحدود التي يسمح بها القانون، لا تتحمل العيادة المسؤولية عن أي ضرر ناتج عن استخدام الموقع أو الاعتماد على معلوماته العامة.',
        'لا تحدّ هذه الشروط من مسؤولية لا يجوز تحديدها قانونًا، ولا تنتقص من حقوقكم كمرضى.',
      ],
      en: [
        'To the extent the law allows, the clinic is not liable for damage resulting from use of the site or from reliance on its general information.',
        'Nothing in these terms limits any liability that cannot be limited by law, or takes away any of your rights as a patient.',
      ],
    },
  },
  {
    heading: { he: 'פרטיות ועוגיות', ar: 'الخصوصية وملفات تعريف الارتباط', en: 'Privacy and cookies' },
    body: {
      he: ['השימוש במידע שאתם מוסרים מתואר במדיניות הפרטיות, והמידע הנשמר במכשיר שלכם מתואר במדיניות העוגיות.'],
      ar: ['استخدام المعلومات التي تقدّمونها موضّح في سياسة الخصوصية، والمعلومات المحفوظة على جهازكم موضّحة في سياسة ملفات تعريف الارتباط.'],
      en: ['How the information you provide is used is described in the privacy policy, and what is stored on your device is described in the cookie policy.'],
    },
  },
  {
    heading: { he: 'הדין החל', ar: 'القانون الساري', en: 'Governing law' },
    body: {
      he: ['על תנאים אלה יחולו דיני מדינת ישראל, וסמכות השיפוט בכל עניין הנוגע להם תהיה לבתי המשפט המוסמכים בישראל.'],
      ar: ['تسري على هذه الشروط قوانين دولة إسرائيل، وتكون صلاحية النظر في أي مسألة تتعلق بها للمحاكم المختصة في إسرائيل.'],
      en: ['These terms are governed by the laws of the State of Israel, and any dispute about them will be decided by the competent courts in Israel.'],
    },
  },
  {
    heading: { he: 'שינויים בתנאים', ar: 'تغييرات في الشروط', en: 'Changes to these terms' },
    body: {
      he: ['אנו עשויים לעדכן תנאים אלה. התאריך בראש העמוד מציין מתי עודכנו לאחרונה.'],
      ar: ['قد نُحدّث هذه الشروط. يشير التاريخ في أعلى الصفحة إلى آخر تحديث لها.'],
      en: ['We may update these terms. The date at the top of the page shows when they last changed.'],
    },
  },
];

export const cookiePolicy: LegalSection[] = [
  {
    heading: { he: 'בקצרה', ar: 'باختصار', en: 'In short' },
    body: {
      he: ['האתר אינו משתמש בעוגיות (cookies), ואינו משתמש בכלי סטטיסטיקה, פרסום, פיקסלים של רשתות חברתיות או כל כלי מעקב אחר. לכן לא מוצגת באתר הודעת הסכמה לעוגיות.'],
      ar: ['لا يستخدم الموقع ملفات تعريف الارتباط (cookies)، ولا يستخدم أدوات إحصاء أو إعلان أو بكسلات شبكات التواصل الاجتماعي أو أي أداة تتبّع أخرى. لذلك لا يعرض الموقع إشعار موافقة على ملفات تعريف الارتباط.'],
      en: ['This site does not use cookies. It uses no analytics, advertising, social-media pixels or any other tracking. That is why you do not see a cookie consent banner.'],
    },
  },
  {
    heading: { he: 'מה נשמר במכשיר שלכם', ar: 'ما يُحفظ على جهازكم', en: 'What is stored on your device' },
    body: {
      he: [
        'אם תשנו את הגדרות הנגישות (גודל טקסט, ניגודיות, הדגשת קישורים או עצירת אנימציות) או תזיזו את כפתור הנגישות העגול, הבחירות נשמרות באחסון המקומי של הדפדפן (localStorage) כדי שיישארו בתוקף גם בעמוד הבא.',
        'אלה אינן עוגיות, הן אינן נשלחות אלינו או לאף גורם אחר, ואין בהן מידע מזהה. מלבדן לא נשמר דבר.',
      ],
      ar: [
        'إذا غيّرتم إعدادات إمكانية الوصول (حجم النص، التباين، إبراز الروابط أو إيقاف الحركة) أو حرّكتم زر إمكانية الوصول الدائري، تُحفظ اختياراتكم في التخزين المحلي للمتصفح (localStorage) لكي تبقى سارية في الصفحة التالية أيضًا.',
        'هذه ليست ملفات تعريف ارتباط، ولا تُرسَل إلينا أو إلى أي جهة أخرى، ولا تحتوي على معلومات تعرّف بكم. لا يُحفظ شيء غيرها.',
      ],
      en: [
        'If you change the accessibility settings (text size, contrast, link highlighting or stopping animations) or move the round accessibility button, your choices are saved in your browser’s local storage (localStorage) so they stay in place on the next page.',
        'These are not cookies, they are never sent to us or anyone else, and they contain nothing that identifies you. Nothing else is stored.',
      ],
    },
  },
  {
    heading: { he: 'תוכן משירותים אחרים', ar: 'محتوى من خدمات أخرى', en: 'Content from other services' },
    body: {
      he: [
        'המפה בעמוד יצירת הקשר אינה נטענת עד שתלחצו על הכפתור להצגתה. כשתעשו זאת, המפה נטענת מ-Google, ו-Google עשויה לקבל את כתובת ה-IP שלכם ולהגדיר עוגיות משלה, בכפוף למדיניות הפרטיות שלה.',
        'קישורים לוואטסאפ, לאינסטגרם, ל-Waze ול-Google Maps מובילים לשירותים אלה, שלהם מדיניות משלהם. דבר מהשירותים האלה אינו נטען באתר עד שתבחרו לפתוח קישור.',
        'הגופנים והתמונות מוגשים מהאתר עצמו, ולא משרתים של צד שלישי.',
      ],
      ar: [
        'لا تُحمَّل الخريطة في صفحة التواصل حتى تضغطوا على زر عرضها. عند ذلك تُحمَّل الخريطة من Google، وقد تتلقى Google عنوان IP الخاص بكم وتضع ملفات تعريف ارتباط خاصة بها، وفقًا لسياسة الخصوصية الخاصة بها.',
        'الروابط إلى واتساب وإنستغرام وWaze وGoogle Maps تنقلكم إلى تلك الخدمات، ولكل منها سياستها الخاصة. لا يُحمَّل أي شيء من هذه الخدمات في الموقع حتى تختاروا فتح رابط.',
        'تُقدَّم الخطوط والصور من الموقع نفسه، وليس من خوادم طرف ثالث.',
      ],
      en: [
        'The map on the contact page is not loaded until you press the button to show it. When you do, the map loads from Google, and Google may receive your IP address and set its own cookies, under Google’s privacy policy.',
        'Links to WhatsApp, Instagram, Waze and Google Maps take you to those services, which have their own policies. Nothing from those services loads on this site until you choose to open a link.',
        'Fonts and images are served from this site itself, not from third-party servers.',
      ],
    },
  },
  {
    heading: { he: 'אחסון האתר', ar: 'استضافة الموقع', en: 'Hosting' },
    body: {
      he: ['האתר מאוחסן ב-GitHub Pages. כמו כל שרת אינטרנט, ספק האחסון מקבל את כתובת ה-IP של המכשיר שלכם ופרטים טכניים בסיסיים כדי להציג את העמודים, בכפוף למדיניות הפרטיות של GitHub.'],
      ar: ['الموقع مستضاف على GitHub Pages. وكأي خادم إنترنت، يتلقى مزوّد الاستضافة عنوان IP لجهازكم وتفاصيل تقنية أساسية لعرض الصفحات، وفقًا لسياسة الخصوصية الخاصة بـ GitHub.'],
      en: ['The site is hosted on GitHub Pages. Like any web server, the host receives your device’s IP address and basic technical details in order to deliver the pages, under GitHub’s privacy statement.'],
    },
  },
  {
    heading: { he: 'איך למחוק את מה שנשמר', ar: 'كيفية حذف ما حُفظ', en: 'How to remove what is stored' },
    body: {
      he: ['אפשר למחוק את הגדרות הנגישות השמורות ואת מיקום הכפתור בכל עת באמצעות כפתור האיפוס בחלונית הנגישות, או על ידי מחיקת נתוני האתר בהגדרות הדפדפן.'],
      ar: ['يمكنكم حذف إعدادات إمكانية الوصول المحفوظة وموضع الزر في أي وقت بواسطة زر إعادة الضبط في لوحة إمكانية الوصول، أو بحذف بيانات الموقع من إعدادات المتصفح.'],
      en: ['You can remove the saved accessibility settings and button position at any time with the reset button in the accessibility panel, or by clearing this site’s data in your browser settings.'],
    },
  },
  {
    heading: { he: 'אם זה ישתנה', ar: 'إذا تغيّر ذلك', en: 'If this changes' },
    body: {
      he: ['אם נוסיף בעתיד כלי שמשתמש בעוגיות או במעקב, נעדכן מדיניות זו לפני כן, ונבקש את הסכמתכם לפני הפעלתו במקרים שבהם הדבר נדרש.'],
      ar: ['إذا أضفنا مستقبلًا أداة تستخدم ملفات تعريف الارتباط أو التتبّع، سنحدّث هذه السياسة مسبقًا، وسنطلب موافقتكم قبل تشغيلها حيثما يكون ذلك مطلوبًا.'],
      en: ['If we ever add a tool that uses cookies or tracking, we will update this policy first and, where required, ask for your consent before it runs.'],
    },
  },
];
