/**
 * The Edit Mode bar's own words, in the page's language. Rendered by the
 * layout only in the admin build; the rest of the editor's interface text is
 * in workers/admin/src/ui/visual-strings.ts.
 */
export const BAR_STRINGS = {
  he: { title: 'עריכת האתר', notice: 'תוכן מוסתר אינו סודי: המאגר ציבורי. אין להזין מידע על מטופלים או סודות.', noticeShort: 'המאגר ציבורי: אין להזין מידע על מטופלים' },
  ar: { title: 'تعديل الموقع', notice: 'المحتوى المخفي ليس سريًا: المستودع عام. لا تُدخلوا معلومات عن المرضى أو أسرارًا.', noticeShort: 'المستودع عام: لا تُدخلوا معلومات عن المرضى' },
  en: { title: 'Editing the site', notice: 'Hidden content is not private: the repository is public. Do not enter patient information or secrets.', noticeShort: 'Public repository: no patient information' },
} as const;
