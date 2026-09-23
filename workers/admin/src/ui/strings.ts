/**
 * EVERY WORD THE PANEL SHOWS, in one file.
 *
 * Hebrew only. The doctor's own interface is not a trilingual product: adding
 * two more languages for one user would triple the surface where a wrong word
 * can appear, for nobody's benefit. The public SITE is trilingual; this is a
 * tool.
 *
 * The API speaks stable machine keys and never display text, so this is the
 * only place a sentence exists and the two cannot disagree.
 */

export const UI = {
  title: 'ניהול האתר',
  tabs: { hours: 'שעות פתיחה', gallery: 'גלריה' },

  days: {
    Sunday: 'ראשון',
    Monday: 'שני',
    Tuesday: 'שלישי',
    Wednesday: 'רביעי',
    Thursday: 'חמישי',
    Friday: 'שישי',
    Saturday: 'שבת',
  } as Record<string, string>,

  hours: {
    heading: 'שעות פתיחה',
    intro: 'סמנו את הימים שהמרפאה סגורה, ומלאו שעת פתיחה וסגירה לשאר.',
    closed: 'סגור',
    opens: 'פתיחה',
    closes: 'סגירה',
    save: 'שמירת שעות',
    saving: 'שומר…',
  },

  gallery: {
    heading: 'תמונות המרפאה',
    published: 'מוצג באתר',
    unpublished: 'מוסתר',
    emptyPublished: 'אין תמונות שמוצגות באתר.',
    emptyAll: 'עדיין לא הועלו תמונות.',
    publish: 'הצגה באתר',
    unpublish: 'הסתרה',
    remove: 'מחיקה לצמיתות',
    add: 'הוספת תמונה',
    pick: 'בחירת תמונה',
    category: 'סוג התמונה',
    altHe: 'תיאור בעברית',
    altAr: 'תיאור בערבית',
    altHint: 'מה רואים בתמונה. התיאור נקרא למי שלא רואה אותה.',
    confirm: 'אישור: בתמונה לא מופיע מטופל, חלק ממטופל, או תמונת לפני/אחרי.',
    submit: 'שמירה והצגה באתר',
    cancel: 'ביטול',
    deleteTitle: 'מחיקת תמונה לצמיתות',
    deleteBody: 'התמונה תימחק מהאתר ומההיסטוריה. לא ניתן לבטל.',
    deleteConfirm: 'מחיקה',
  },

  categories: {
    exterior: 'חזית המרפאה',
    reception: 'קבלה והמתנה',
    'treatment-room': 'חדר טיפולים',
    equipment: 'ציוד',
    'doctor-working': 'הרופא בעבודה',
    team: 'הצוות',
    atmosphere: 'אווירה',
  } as Record<string, string>,

  /**
   * Publication states, kept honest.
   *
   * `committed` must never read as though the change is live, and `failed`
   * must say plainly that the site is unaffected — GitHub Pages keeps serving
   * the last good deployment, so a rejected change cannot break anything.
   */
  status: {
    saving: 'שומר…',
    committed: 'נשמר. מתפרסם באתר — זה לוקח כשתי דקות.',
    published: 'פורסם באתר',
    failed: 'השמירה נשמרה אבל הפרסום נכשל. האתר ממשיך להציג את הגרסה הקודמת.',
    slow: 'עדיין מתפרסם. אפשר לחזור לבדוק עוד מעט.',
    reasons: {
      checks_failed: 'אחת הבדיקות האוטומטיות נכשלה.',
      timed_out: 'הפרסום ארך זמן רב מדי.',
      cancelled: 'הפרסום בוטל.',
      action_required: 'נדרשת פעולה ידנית.',
      startup_failure: 'הפרסום לא הצליח להתחיל.',
      stale: 'הפרסום פג תוקף.',
    } as Record<string, string>,
    contact: 'אם זה חוזר, כדאי לפנות למי שבנה את האתר.',
  },

  /** Validation messages, keyed by what the API returns. */
  issues: {
    times_required: 'יש למלא שעת פתיחה וסגירה',
    time_malformed: 'שעה לא תקינה',
    opens_after_closes: 'שעת הפתיחה חייבת להיות לפני שעת הסגירה',
    confirmation_required: 'יש לאשר שבתמונה לא מופיע מטופל',
    category_not_allowed: 'סוג תמונה לא מורשה',
    alt_he_required: 'יש למלא תיאור בעברית',
    alt_ar_required: 'יש למלא תיאור בערבית',
    file_required: 'יש לבחור תמונה',
    file_too_large: 'הקובץ גדול מדי (עד 8 מגהבייט)',
    unsupported_format: 'אפשר להעלות רק JPG או PNG',
    image_too_small: 'התמונה קטנה מדי (נדרש לפחות 1200 פיקסלים בצד הארוך)',
    category_full: 'יש כבר 99 תמונות בסוג הזה',
    photo_not_actionable: 'לא ניתן לבצע את הפעולה על התמונה הזו',
  } as Record<string, string>,

  errors: {
    AUTH_REQUIRED: 'ההתחברות פגה. רעננו את הדף.',
    AUTH_INVALID: 'ההתחברות פגה. רעננו את הדף.',
    FORBIDDEN: 'אין הרשאה לפעולה הזו.',
    CONFLICT: 'התוכן השתנה בינתיים. רעננו את הדף ונסו שוב.',
    NOT_CONFIGURED: 'המערכת עדיין לא הוגדרה במלואה.',
    UPSTREAM_UNAVAILABLE: 'יש תקלה זמנית. נסו שוב עוד מעט.',
    PAYLOAD_TOO_LARGE: 'הקובץ גדול מדי.',
    BAD_REQUEST: 'הבקשה לא תקינה.',
    SERVER_ERROR: 'יש תקלה זמנית. נסו שוב עוד מעט.',
    generic: 'משהו השתבש. נסו שוב.',
  } as Record<string, string>,
} as const;
