/**
 * All UI strings, in every locale.
 *
 * ── MEDICAL-CLAIMS DISCIPLINE ──────────────────────────────────────────────
 * Israeli law (תקנות רופאי השיניים (פרסומת אסורה), תשס״ט-2009) prohibits
 * advertising that guarantees treatment success, publishes prices or
 * promotions, praises the dentist's skill, or uses patient identities.
 *
 * Every string here is therefore an OPERATIONAL FACT or a NEUTRAL DESCRIPTION.
 * None promises an outcome, a duration, a pain level or a success rate.
 *
 * The clinic's own flyer promises "תוצאות אסתטיות ומדויקות", "אחריות" and
 * "חיוך לבן ביטחון עצמי גבוה" — all outcome/guarantee claims. They are
 * deliberately NOT reproduced here. See docs/CONTENT.md.
 *
 * ⚠ he/ar copy needs native review before launch; ar especially (Levantine
 *   Palestinian register, not MSA-formal or Gulf vocabulary).
 */

import type { Locale } from './config';

export const ui = {
  he: {
    'site.title': 'ד״ר חליל כנעאני — מרפאת שיניים ואסתטיקה',
    'site.shortName': 'ד״ר חליל כנעאני',

    'nav.home': 'דף הבית',
    'nav.about': 'על הרופא',
    'nav.treatments': 'טיפולים',
    'nav.faq': 'שאלות נפוצות',
    'nav.contact': 'צרו קשר',
    'nav.menu': 'תפריט',
    'nav.close': 'סגירה',

    'a11y.skipToContent': 'דלג לתוכן הראשי',
    'a11y.languageSwitcher': 'בחירת שפה',
    'a11y.currentLanguage': 'השפה הנוכחית',
    'a11y.openMenu': 'פתיחת תפריט',
    'a11y.closeMenu': 'סגירת תפריט',
    'a11y.mainNav': 'ניווט ראשי',

    'action.call': 'חיוג',
    'action.callNow': 'להזמנת תור חייגו עכשיו',
    'action.whatsapp': 'וואטסאפ',
    'action.directions': 'ניווט',
    'action.bookAppointment': 'לקביעת תור',
    'action.sendRequest': 'שליחת בקשה',
    'action.readMore': 'קראו עוד',
    'action.allTreatments': 'כל הטיפולים',

    'hero.eyebrow': 'ג׳דיידה-מכר',
    'hero.title': 'רפואת שיניים ואסתטיקה',
    'hero.subtitle':
      'מרפאה פרטית בג׳דיידה-מכר. טיפול אישי, הסבר מלא לפני כל טיפול, ושירות בעברית, בערבית ובאנגלית.',

    'trust.explanation.title': 'הסבר מלא מראש',
    'trust.explanation.body': 'לפני כל טיפול תקבלו הסבר על מה שנעשה ולמה.',
    'trust.languages.title': 'עברית · ערבית · אנגלית',
    'trust.languages.body': 'מדברים איתכם בשפה שנוחה לכם.',
    'trust.availability.title': 'זמינות וקביעת תורים',
    'trust.availability.body': 'מענה טלפוני ובוואטסאפ, וקביעת תור נוחה.',
    'trust.personal.title': 'טיפול אישי',
    'trust.personal.body': 'רופא אחד שמכיר אתכם ואת התיק שלכם.',

    'treatments.title': 'הטיפולים שלנו',
    'treatments.intro': 'מידע על הטיפולים הניתנים במרפאה.',
    'treatments.relatedTitle': 'טיפולים נוספים',
    'treatments.aboutTitle': 'מה זה',
    'treatments.candidacyTitle': 'למי הטיפול מתאים',
    'treatments.processTitle': 'איך מתבצע הטיפול',
    'treatments.expectTitle': 'למה לצפות',
    'treatments.faqTitle': 'שאלות נפוצות על הטיפול',

    'doctor.title': 'על ד״ר חליל כנעאני',
    'doctor.cta': 'עוד על הרופא',

    'faq.title': 'שאלות נפוצות',

    'contact.title': 'צרו קשר',
    'contact.subtitle': 'נשמח לענות על כל שאלה ולסייע בקביעת תור.',
    'contact.phoneLabel': 'טלפון',
    'contact.mobileLabel': 'נייד / וואטסאפ',
    'contact.addressLabel': 'כתובת',
    'contact.hoursLabel': 'שעות פעילות',
    'contact.emailLabel': 'דוא״ל',

    'form.title': 'בקשת תור',
    'form.intro': 'מלאו את הפרטים והבקשה תישלח ישירות לרופא בוואטסאפ. אין צורך בפרטים רפואיים.',
    'form.name': 'שם מלא',
    'form.phone': 'טלפון',
    'form.contactMethod': 'איך תעדיפו שנחזור אליכם?',
    'form.contactMethod.phone': 'שיחת טלפון',
    'form.contactMethod.whatsapp': 'וואטסאפ',
    'form.treatment': 'הטיפול שמעניין אתכם',
    'form.treatment.none': 'לא בטוח/ה',
    'form.daypart': 'מתי נוח לכם?',
    'form.daypart.morning': 'בוקר',
    'form.daypart.afternoon': 'צהריים',
    'form.daypart.evening': 'ערב',
    'form.daypart.any': 'גמיש',
    'form.message': 'הערה (רשות)',
    'form.messageHint': 'נא לא לכתוב פרטים רפואיים. נדבר על הטיפול בטלפון.',
    'form.optional': 'רשות',
    'form.required': 'שדה חובה',
    'form.consent':
      'אני מאשר/ת שתיצרו איתי קשר בנוגע לפנייה זו. הפרטים ישמשו למטרה זו בלבד.',
    'form.marketingOptIn': 'אשמח לקבל עדכונים מהמרפאה (לא חובה)',
    'form.submit': 'שליחה בוואטסאפ',
    'form.submitting': 'פותח וואטסאפ…',
    'form.handoffNote': 'הפרטים אינם נשמרים באתר. לחיצה על שליחה תפתח וואטסאפ עם הודעה מוכנה — תוכלו לקרוא אותה ולשלוח בעצמכם.',
    'form.noJs': 'כדי לשלוח בקשה דרך הטופס יש להפעיל JavaScript. אפשר גם פשוט להתקשר או לכתוב בוואטסאפ:',
    'form.messageHeading': 'בקשת תור מהאתר',
    'msg.name': 'שם',
    'msg.phone': 'טלפון',
    'msg.contact': 'העדפת יצירת קשר',
    'msg.treatment': 'טיפול',
    'msg.daypart': 'זמן מועדף',
    'msg.note': 'הערה',

    'form.error.name': 'נא להזין שם מלא.',
    'form.error.phone': 'נא להזין מספר טלפון תקין בישראל.',
    'form.error.consent': 'יש לאשר יצירת קשר כדי לשלוח.',
    'form.error.generic': 'השליחה נכשלה. נסו שוב, או חייגו אלינו.',
    'form.error.summaryTitle': 'יש לתקן את הפרטים הבאים',

    'form.success.title': 'וואטסאפ נפתח',
    'form.success.body': 'ההודעה מוכנה בוואטסאפ — בדקו אותה ולחצו שליחה. אם לא נפתח, אפשר להתקשר אלינו.',

    'privacy.notice.title': 'מה קורה עם הפרטים שלכם',
    'privacy.notice.body':
      'מסירת הפרטים היא בהתנדבות ואינה חובה חוקית; בלעדיהם לא נוכל לחזור אליכם. האתר אינו שומר את הפרטים ואינו שולח אותם לשרת — הם מוכנסים להודעת וואטסאפ שאתם שולחים בעצמכם למרפאה. מרגע השליחה ההודעה מנוהלת בחשבון הוואטסאפ שלכם ובמרפאה, ובכפוף למדיניות של וואטסאפ. הפרטים ישמשו אך ורק למענה לפנייה ולתיאום תור.',
    'privacy.readPolicy': 'מדיניות הפרטיות',

    'legal.accessibility': 'הצהרת נגישות',
    'legal.privacy': 'מדיניות פרטיות',
    'legal.disclaimer':
      'המידע באתר הוא מידע כללי בלבד ואינו מהווה ייעוץ או המלצה רפואית. כל טיפול מותאם אישית לאחר בדיקה.',
    'legal.illustrative': 'תמונה להמחשה בלבד — אינה מטופל/ת של המרפאה.',
    'legal.reviewedBy': 'נבדק על ידי',

    'location.title': 'איך מגיעים למרפאה',
    'location.subtitle': 'המרפאה נמצאת בג׳דיידה-מכר. אפשר לנווט ישירות מכאן.',
    'location.pendingTitle': 'פרטי הכתובת המדויקת',
    'location.pendingBody': 'לקבלת הכתובת המדויקת והוראות הגעה, אנא התקשרו או כתבו לנו בוואטסאפ.',
    'action.waze': 'ניווט ב-Waze',
    'action.googleMaps': 'פתיחה ב-Google Maps',
    'feedback.title': 'חוות דעת של מטופלים',
    'feedback.body': 'חוות דעת על המרפאה מתפרסמות בפרופיל Google של המרפאה. אפשר לקרוא אותן שם.',
    'feedback.cta': 'קריאת חוות הדעת ב-Google',

    'gallery.eyebrow': 'המרפאה',
    'gallery.title': 'הצצה למרפאה',
    'gallery.intro': 'תמונות מהמרפאה בג׳דיידה-מכר.',
    'gallery.artEyebrow': 'גלריית איורים',
    'gallery.workEyebrow': 'מתוך פרסומי המרפאה',
    'gallery.workTitle': 'עבודות הרופא',
    'gallery.workIntro': 'מבחר תמונות טיפולים שפורסמו בעמוד האינסטגרם של המרפאה.',
    'gallery.artTitle': 'רפואת שיניים בתמונות',
    'gallery.artIntro': 'איורים שנוצרו בבינה מלאכותית להמחשה בלבד. אלו אינם צילומי המרפאה או מטופלים.',
    'gallery.close': 'סגירת התמונה',
    'gallery.previous': 'הקודמת',
    'gallery.next': 'הבאה',

    'map.load': 'הצגת מפה',
    'map.privacy': 'המפה נטענת מ-Google. דבר אינו נשלח עד שתלחצו.',
    'map.frameTitle': 'מפה של מיקום המרפאה',
    'map.noJs': 'לפתיחת המפה, השתמשו בקישורי הניווט ליד הכתובת.',
    'feedback.basedOn': 'מבוסס על {n} חוות דעת ב-Google',
    'feedback.ratingLabel': 'דירוג ממוצע ב-Google',

    'footer.rights': 'כל הזכויות שמורות',

    'error.404.title': 'הדף לא נמצא',
    'error.404.body': 'ייתכן שהקישור שגוי או שהדף הוסר.',
    'error.404.home': 'חזרה לדף הבית',

    'langBanner.text': 'הדף זמין גם בעברית',
    'langBanner.switch': 'מעבר',
    'langBanner.dismiss': 'סגירה',
  },

  ar: {
    'site.title': 'د. خليل كنعاني — عيادة أسنان وتجميل',
    'site.shortName': 'د. خليل كنعاني',

    'nav.home': 'الصفحة الرئيسية',
    'nav.about': 'عن الطبيب',
    'nav.treatments': 'العلاجات',
    'nav.faq': 'أسئلة شائعة',
    'nav.contact': 'اتصلوا بنا',
    'nav.menu': 'القائمة',
    'nav.close': 'إغلاق',

    'a11y.skipToContent': 'تخطَّ إلى المحتوى الرئيسي',
    'a11y.languageSwitcher': 'اختيار اللغة',
    'a11y.currentLanguage': 'اللغة الحالية',
    'a11y.openMenu': 'فتح القائمة',
    'a11y.closeMenu': 'إغلاق القائمة',
    'a11y.mainNav': 'التنقل الرئيسي',

    'action.call': 'اتصال',
    'action.callNow': 'لحجز موعد اتصلوا الآن',
    'action.whatsapp': 'واتساب',
    'action.directions': 'الاتجاهات',
    'action.bookAppointment': 'حجز موعد',
    'action.sendRequest': 'إرسال الطلب',
    'action.readMore': 'اقرأ المزيد',
    'action.allTreatments': 'كل العلاجات',

    'hero.eyebrow': 'الجديدة-المكر',
    'hero.title': 'طب وتجميل الأسنان',
    'hero.subtitle':
      'عيادة خاصة في الجديدة-المكر. رعاية شخصية، شرح كامل قبل كل علاج، وخدمة بالعربية والعبرية والإنجليزية.',

    'trust.explanation.title': 'شرح كامل مسبقًا',
    'trust.explanation.body': 'قبل كل علاج تحصلون على شرح لما سيجري ولماذا.',
    'trust.languages.title': 'عربية · عبرية · إنجليزية',
    'trust.languages.body': 'نتحدث معكم باللغة التي تريحكم.',
    'trust.availability.title': 'مواعيد وتوفّر',
    'trust.availability.body': 'ردّ عبر الهاتف والواتساب، وحجز موعد ميسّر.',
    'trust.personal.title': 'رعاية شخصية',
    'trust.personal.body': 'طبيب واحد يعرفكم ويعرف ملفكم.',

    'treatments.title': 'علاجاتنا',
    'treatments.intro': 'معلومات عن العلاجات المتوفرة في العيادة.',
    'treatments.relatedTitle': 'علاجات أخرى',
    'treatments.aboutTitle': 'ما هو',
    'treatments.candidacyTitle': 'لمن يناسب هذا العلاج',
    'treatments.processTitle': 'كيف يتم العلاج',
    'treatments.expectTitle': 'ماذا تتوقعون',
    'treatments.faqTitle': 'أسئلة شائعة حول العلاج',

    'doctor.title': 'عن د. خليل كنعاني',
    'doctor.cta': 'المزيد عن الطبيب',

    'faq.title': 'أسئلة شائعة',

    'contact.title': 'اتصلوا بنا',
    'contact.subtitle': 'يسعدنا الإجابة عن أي سؤال والمساعدة في حجز موعد.',
    'contact.phoneLabel': 'هاتف',
    'contact.mobileLabel': 'خلوي / واتساب',
    'contact.addressLabel': 'العنوان',
    'contact.hoursLabel': 'ساعات العمل',
    'contact.emailLabel': 'البريد الإلكتروني',

    'form.title': 'طلب موعد',
    'form.intro': 'املأوا التفاصيل وسيصل الطلب مباشرة إلى الطبيب عبر واتساب. لا حاجة لأي تفاصيل طبية.',
    'form.name': 'الاسم الكامل',
    'form.phone': 'رقم الهاتف',
    'form.contactMethod': 'كيف تفضّلون أن نتواصل معكم؟',
    'form.contactMethod.phone': 'مكالمة هاتفية',
    'form.contactMethod.whatsapp': 'واتساب',
    'form.treatment': 'العلاج الذي يهمكم',
    'form.treatment.none': 'غير متأكد',
    'form.daypart': 'ما هو الوقت المناسب لكم؟',
    'form.daypart.morning': 'صباحًا',
    'form.daypart.afternoon': 'ظهرًا',
    'form.daypart.evening': 'مساءً',
    'form.daypart.any': 'مرن',
    'form.message': 'ملاحظة (اختياري)',
    'form.messageHint': 'يُرجى عدم كتابة تفاصيل طبية. سنتحدث عن العلاج هاتفيًا.',
    'form.optional': 'اختياري',
    'form.required': 'حقل إلزامي',
    'form.consent': 'أوافق على أن تتواصلوا معي بخصوص هذا الطلب. ستُستخدم التفاصيل لهذا الغرض فقط.',
    'form.marketingOptIn': 'أرغب في تلقّي تحديثات من العيادة (اختياري)',
    'form.submit': 'إرسال عبر واتساب',
    'form.submitting': 'جارٍ فتح واتساب…',
    'form.handoffNote': 'لا يحفظ الموقع تفاصيلكم. الضغط على إرسال يفتح واتساب برسالة جاهزة — يمكنكم قراءتها وإرسالها بأنفسكم.',
    'form.noJs': 'لإرسال طلب عبر النموذج يلزم تفعيل JavaScript. يمكنكم ببساطة الاتصال أو المراسلة عبر واتساب:',
    'form.messageHeading': 'طلب موعد من الموقع',
    'msg.name': 'الاسم',
    'msg.phone': 'الهاتف',
    'msg.contact': 'طريقة التواصل المفضّلة',
    'msg.treatment': 'العلاج',
    'msg.daypart': 'الوقت المفضّل',
    'msg.note': 'ملاحظة',

    'form.error.name': 'يُرجى إدخال الاسم الكامل.',
    'form.error.phone': 'يُرجى إدخال رقم هاتف إسرائيلي صحيح.',
    'form.error.consent': 'يجب الموافقة على التواصل لإتمام الإرسال.',
    'form.error.generic': 'فشل الإرسال. حاولوا مجددًا أو اتصلوا بنا.',
    'form.error.summaryTitle': 'يُرجى تصحيح التفاصيل التالية',

    'form.success.title': 'تم فتح واتساب',
    'form.success.body': 'الرسالة جاهزة في واتساب — راجعوها واضغطوا إرسال. إذا لم يُفتح، يمكنكم الاتصال بنا.',

    'privacy.notice.title': 'ماذا يحدث لتفاصيلكم',
    'privacy.notice.body':
      'تقديم التفاصيل طوعي وليس إلزامًا قانونيًا؛ بدونها لن نتمكن من معاودة الاتصال بكم. لا يحفظ الموقع التفاصيل ولا يرسلها إلى خادم — تُدرَج في رسالة واتساب ترسلونها بأنفسكم إلى العيادة. ومنذ لحظة الإرسال تُدار الرسالة في حسابكم على واتساب وفي العيادة، ووفقًا لسياسة واتساب. ستُستخدم التفاصيل فقط للردّ على الطلب وتنسيق الموعد.',
    'privacy.readPolicy': 'سياسة الخصوصية',

    'legal.accessibility': 'بيان إمكانية الوصول',
    'legal.privacy': 'سياسة الخصوصية',
    'legal.disclaimer':
      'المعلومات في هذا الموقع عامة فقط ولا تشكّل استشارة أو توصية طبية. كل علاج يُحدَّد بشكل شخصي بعد الفحص.',
    'legal.illustrative': 'صورة توضيحية فقط — ليست لمريض/ة في العيادة.',
    'legal.reviewedBy': 'روجعت بواسطة',

    'location.title': 'كيف تصلون إلى العيادة',
    'location.subtitle': 'العيادة في الجديدة-المكر. يمكنكم التوجّه إليها مباشرة من هنا.',
    'location.pendingTitle': 'تفاصيل العنوان الدقيق',
    'location.pendingBody': 'للحصول على العنوان الدقيق وإرشادات الوصول، يُرجى الاتصال أو المراسلة عبر واتساب.',
    'action.waze': 'التنقّل عبر Waze',
    'action.googleMaps': 'فتح في Google Maps',
    'feedback.title': 'آراء المرضى',
    'feedback.body': 'تُنشر الآراء حول العيادة في ملف Google الخاص بها. يمكنكم قراءتها هناك.',
    'feedback.cta': 'قراءة الآراء على Google',

    'gallery.eyebrow': 'العيادة',
    'gallery.title': 'لمحة عن العيادة',
    'gallery.intro': 'صور من العيادة في الجديدة-المكر.',
    'gallery.artEyebrow': 'معرض الرسوم التوضيحية',
    'gallery.workEyebrow': 'من منشورات العيادة',
    'gallery.workTitle': 'من أعمال الطبيب',
    'gallery.workIntro': 'مجموعة من صور العلاجات المنشورة على صفحة العيادة في إنستغرام.',
    'gallery.artTitle': 'طب الأسنان بالصور',
    'gallery.artIntro': 'رسوم أُنشئت بالذكاء الاصطناعي للتوضيح فقط. ليست صورًا للعيادة أو للمرضى.',
    'gallery.close': 'إغلاق الصورة',
    'gallery.previous': 'السابقة',
    'gallery.next': 'التالية',

    'map.load': 'عرض الخريطة',
    'map.privacy': 'يتم تحميل الخريطة من Google. لا يُرسَل أي شيء حتى تضغطوا.',
    'map.frameTitle': 'خريطة موقع العيادة',
    'map.noJs': 'لفتح الخريطة، استخدموا روابط الاتجاهات بجانب العنوان.',
    'feedback.basedOn': 'استنادًا إلى {n} تقييمًا على Google',
    'feedback.ratingLabel': 'متوسط التقييم على Google',

    'footer.rights': 'جميع الحقوق محفوظة',

    'error.404.title': 'الصفحة غير موجودة',
    'error.404.body': 'قد يكون الرابط غير صحيح أو أن الصفحة أُزيلت.',
    'error.404.home': 'العودة إلى الصفحة الرئيسية',

    'langBanner.text': 'هذه الصفحة متوفرة بالعربية',
    'langBanner.switch': 'انتقال',
    'langBanner.dismiss': 'إغلاق',
  },

  en: {
    'site.title': 'Dr. Khalil Kanani — Dental & Aesthetic Clinic',
    'site.shortName': 'Dr. Khalil Kanani',

    'nav.home': 'Home',
    'nav.about': 'About',
    'nav.treatments': 'Treatments',
    'nav.faq': 'FAQ',
    'nav.contact': 'Contact',
    'nav.menu': 'Menu',
    'nav.close': 'Close',

    'a11y.skipToContent': 'Skip to main content',
    'a11y.languageSwitcher': 'Choose language',
    'a11y.currentLanguage': 'Current language',
    'a11y.openMenu': 'Open menu',
    'a11y.closeMenu': 'Close menu',
    'a11y.mainNav': 'Main navigation',

    'action.call': 'Call',
    'action.callNow': 'Call now to book',
    'action.whatsapp': 'WhatsApp',
    'action.directions': 'Directions',
    'action.bookAppointment': 'Book an appointment',
    'action.sendRequest': 'Send request',
    'action.readMore': 'Read more',
    'action.allTreatments': 'All treatments',

    'hero.eyebrow': 'Jadeidi-Makr',
    'hero.title': 'Dental & aesthetic care',
    'hero.subtitle':
      'A private clinic in Jadeidi-Makr. Personal care, a full explanation before every treatment, and service in Hebrew, Arabic and English.',

    'trust.explanation.title': 'Explained in advance',
    'trust.explanation.body': 'Before any treatment you get a clear explanation of what and why.',
    'trust.languages.title': 'Hebrew · Arabic · English',
    'trust.languages.body': 'We speak with you in the language you are comfortable in.',
    'trust.availability.title': 'Appointments & availability',
    'trust.availability.body': 'Reachable by phone and WhatsApp, with straightforward booking.',
    'trust.personal.title': 'Personal care',
    'trust.personal.body': 'One dentist who knows you and your history.',

    'treatments.title': 'Our treatments',
    'treatments.intro': 'Information about the treatments available at the clinic.',
    'treatments.relatedTitle': 'Other treatments',
    'treatments.aboutTitle': 'What it is',
    'treatments.candidacyTitle': 'Who it is considered for',
    'treatments.processTitle': 'How the treatment works',
    'treatments.expectTitle': 'What to expect',
    'treatments.faqTitle': 'Common questions about this treatment',

    'doctor.title': 'About Dr. Khalil Kanani',
    'doctor.cta': 'More about the dentist',

    'faq.title': 'Frequently asked questions',

    'contact.title': 'Contact us',
    'contact.subtitle': 'We are glad to answer any question and help you book.',
    'contact.phoneLabel': 'Phone',
    'contact.mobileLabel': 'Mobile / WhatsApp',
    'contact.addressLabel': 'Address',
    'contact.hoursLabel': 'Opening hours',
    'contact.emailLabel': 'Email',

    'form.title': 'Request an appointment',
    'form.intro': 'Fill in your details and the request goes straight to the dentist on WhatsApp. No medical details needed.',
    'form.name': 'Full name',
    'form.phone': 'Phone number',
    'form.contactMethod': 'How would you prefer we reply?',
    'form.contactMethod.phone': 'Phone call',
    'form.contactMethod.whatsapp': 'WhatsApp',
    'form.treatment': 'Treatment you are interested in',
    'form.treatment.none': 'Not sure',
    'form.daypart': 'When suits you?',
    'form.daypart.morning': 'Morning',
    'form.daypart.afternoon': 'Afternoon',
    'form.daypart.evening': 'Evening',
    'form.daypart.any': 'Flexible',
    'form.message': 'Note (optional)',
    'form.messageHint': 'Please do not include medical details. We will discuss treatment by phone.',
    'form.optional': 'optional',
    'form.required': 'required',
    'form.consent':
      'I agree to be contacted about this enquiry. My details will be used for that purpose only.',
    'form.marketingOptIn': 'I would like updates from the clinic (optional)',
    'form.submit': 'Send on WhatsApp',
    'form.submitting': 'Opening WhatsApp…',
    'form.handoffNote': 'This site does not store your details. Pressing send opens WhatsApp with a ready-written message — you can read it and send it yourself.',
    'form.noJs': 'Sending through the form needs JavaScript. You can simply call or message us on WhatsApp instead:',
    'form.messageHeading': 'Appointment request from the website',
    'msg.name': 'Name',
    'msg.phone': 'Phone',
    'msg.contact': 'Preferred contact',
    'msg.treatment': 'Treatment',
    'msg.daypart': 'Preferred time',
    'msg.note': 'Note',

    'form.error.name': 'Please enter your full name.',
    'form.error.phone': 'Please enter a valid Israeli phone number.',
    'form.error.consent': 'Please confirm you agree to be contacted.',
    'form.error.generic': 'Sending failed. Please try again, or call us.',
    'form.error.summaryTitle': 'There is a problem',

    'form.success.title': 'WhatsApp opened',
    'form.success.body': 'Your message is ready in WhatsApp — review it and press send. If it did not open, please call us.',

    'privacy.notice.title': 'What happens to your details',
    'privacy.notice.body':
      'Providing these details is voluntary and not a legal obligation; without them we cannot reply. This site does not store your details and does not send them to a server — they are placed into a WhatsApp message that you send to the clinic yourself. From the moment you send it, the message lives in your WhatsApp account and the clinic\u2019s, subject to WhatsApp\u2019s own policies. The details will be used solely to answer your enquiry and arrange an appointment.',
    'privacy.readPolicy': 'Privacy policy',

    'legal.accessibility': 'Accessibility statement',
    'legal.privacy': 'Privacy policy',
    'legal.disclaimer':
      'Information on this site is general only and is not medical advice or a recommendation. Every treatment is determined individually after examination.',
    'legal.illustrative': 'Illustrative image only — not a patient of the clinic.',
    'legal.reviewedBy': 'Reviewed by',

    'location.title': 'How to reach the clinic',
    'location.subtitle': 'The clinic is in Jadeidi-Makr. You can navigate straight there from here.',
    'location.pendingTitle': 'Exact address details',
    'location.pendingBody': 'For the exact address and directions, please call us or send a WhatsApp message.',
    'action.waze': 'Navigate with Waze',
    'action.googleMaps': 'Open in Google Maps',
    'feedback.title': 'Patient feedback',
    'feedback.body': 'Reviews of the clinic are published on its Google profile. You can read them there.',
    'feedback.cta': 'Read reviews on Google',

    'gallery.eyebrow': 'The clinic',
    'gallery.title': 'A look inside',
    'gallery.intro': 'Photographs of the clinic in Jadeidi-Makr.',
    'gallery.artEyebrow': 'Illustration gallery',
    'gallery.workEyebrow': 'From the clinic’s posts',
    'gallery.workTitle': 'The doctor’s work',
    'gallery.workIntro': 'Selected treatment photographs published on the clinic’s Instagram.',
    'gallery.artTitle': 'Dentistry, illustrated',
    'gallery.artIntro': 'AI-generated illustrations for visual reference. These are not photographs of the clinic or patients.',
    'gallery.close': 'Close image',
    'gallery.previous': 'Previous',
    'gallery.next': 'Next',

    'map.load': 'Show map',
    'map.privacy': 'The map is loaded from Google. Nothing is sent until you press.',
    'map.frameTitle': 'Map of the clinic location',
    'map.noJs': 'To open the map, use the directions links beside the address.',
    'feedback.basedOn': 'Based on {n} Google reviews',
    'feedback.ratingLabel': 'Average rating on Google',

    'footer.rights': 'All rights reserved',

    'error.404.title': 'Page not found',
    'error.404.body': 'The link may be wrong, or the page may have been removed.',
    'error.404.home': 'Back to home',

    'langBanner.text': 'This page is available in English',
    'langBanner.switch': 'Switch',
    'langBanner.dismiss': 'Dismiss',
  },
} as const;

export type UIKey = keyof (typeof ui)['en'];

/** Translator bound to a locale. Falls back to English, never to a raw key. */
export function useTranslations(locale: Locale) {
  return function t(key: UIKey): string {
    const table = ui[locale] as Record<string, string>;
    return table[key] ?? (ui.en as Record<string, string>)[key] ?? key;
  };
}
