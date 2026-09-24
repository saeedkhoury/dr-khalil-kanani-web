/** General FAQ; unpublished entries are absent from every public page. */
import faqData from './general-faq.json' with { type: 'json' };
import { faqSchema, parseManaged } from '../lib/managed-schema.ts';
import type { Locale } from '../i18n/config';

export interface FaqItem {
  q: Record<Locale, string>;
  a: Record<Locale, string>;
}

export const generalFaq: FaqItem[] = parseManaged(faqSchema, faqData, 'general FAQ')
  .filter((item) => item.status === 'published')
  .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
  .map(({ q, a }) => ({ q, a }));
