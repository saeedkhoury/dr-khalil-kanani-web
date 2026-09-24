import { z } from 'zod';
import { findClaims } from './claims.ts';

const text = (max = 2000) => z.string().trim().min(1).max(max);
const translated = <T extends z.ZodType>(value: T) => z.strictObject({ he: value, ar: value, en: value });
const qa = z.strictObject({ q: text(400), a: text(2000) });

const serviceLocale = z.strictObject({
  title: text(120), cardTitle: text(80), summary: text(320),
  candidacy: z.array(text(500)).min(1).max(6),
  process: z.array(z.strictObject({ step: text(120), detail: text(1000) })).min(2).max(6),
  expect: z.array(text(500)).min(1).max(6),
  faq: z.array(qa).max(6),
  reviewedOn: z.iso.date().optional(),
  seoTitle: text(60).optional(),
  seoDescription: text(160),
});

/*
 * DRAFTS. An unpublished item may be incomplete: the doctor can save a new
 * treatment with only its Hebrew text and come back for Arabic and English,
 * rather than being unable to save anything until all three exist — and
 * nobody is tempted to invent a translation just to get past the form.
 * Unpublished items are never rendered (getTreatments filters on status),
 * the same maximum lengths apply, and the moment an item is published it must
 * satisfy the complete rules above.
 */
const draft = (max = 2000) => z.string().trim().max(max);
const serviceLocaleDraft = z.strictObject({
  title: draft(120), cardTitle: draft(80), summary: draft(320),
  candidacy: z.array(draft(500)).max(6),
  process: z.array(z.strictObject({ step: draft(120), detail: draft(1000) })).max(6),
  expect: z.array(draft(500)).max(6),
  faq: z.array(z.strictObject({ q: draft(400), a: draft(2000) })).max(6),
  reviewedOn: z.iso.date().optional(),
  seoTitle: draft(60).optional(),
  seoDescription: draft(160),
});

// Built field by field in the repository's own key order, so a save rewrites
// only the values that changed and never reorders every object in the file.
const serviceFields = {
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(80),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(80),
};
const serviceRest = {
  tier: z.union([z.literal(1), z.literal(2)]),
  order: z.number().int().min(0).max(999),
  icon: z.enum(['implant', 'crown', 'whitening', 'filling', 'veneer', 'aligner', 'root-canal', 'extraction', 'cleaning', 'emergency', 'aesthetic']),
};
export const serviceSchema = z.discriminatedUnion('status', [
  z.strictObject({ ...serviceFields, status: z.literal('published'), ...serviceRest, locales: translated(serviceLocale) }),
  z.strictObject({ ...serviceFields, status: z.literal('unpublished'), ...serviceRest, locales: translated(serviceLocaleDraft) }),
]);
export const servicesSchema = z.array(serviceSchema).max(40).superRefine((items, ctx) => {
  const ids = new Set<string>();
  const slugs = new Set<string>();
  for (const [index, item] of items.entries()) {
    if (ids.has(item.id)) ctx.addIssue({ code: 'custom', path: [index, 'id'], message: 'duplicate id' });
    if (slugs.has(item.slug)) ctx.addIssue({ code: 'custom', path: [index, 'slug'], message: 'duplicate slug' });
    ids.add(item.id); slugs.add(item.slug);
  }
});

const faqId = z.string().regex(/^faq-[a-z0-9-]+$/).max(80);
const faqOrder = z.number().int().min(0).max(999);
export const faqSchema = z.array(z.discriminatedUnion('status', [
  z.strictObject({ id: faqId, status: z.literal('published'), order: faqOrder, q: translated(text(400)), a: translated(text(2000)) }),
  z.strictObject({ id: faqId, status: z.literal('unpublished'), order: faqOrder, q: translated(draft(400)), a: translated(draft(2000)) }),
])).max(40).superRefine((items, ctx) => {
  const ids = new Set<string>();
  for (const [index, item] of items.entries()) {
    if (ids.has(item.id)) ctx.addIssue({ code: 'custom', path: [index, 'id'], message: 'duplicate id' });
    ids.add(item.id);
  }
});

export const doctorProfileSchema = z.strictObject({
  intro: translated(text(3000)),
  approach: translated(z.array(text(500)).min(1).max(6)),
  credentials: z.array(z.strictObject({ label: translated(text(300)), year: z.string().regex(/^\d{4}$/).optional() })).max(20),
});

const permittedUrl = (hosts: readonly string[]) => z.string().max(300).refine((raw) => {
  if (raw === '') return true;
  try {
    const url = new URL(raw);
    return url.protocol === 'https:' && hosts.includes(url.hostname.toLowerCase()) && !url.username && !url.password;
  } catch { return false; }
}, 'unsupported or insecure destination');

export const contactFactsSchema = z.strictObject({
  landline: z.string().regex(/^0[2-9]-\d{3}-\d{4}$/),
  mobile: z.string().regex(/^05\d-\d{3}-\d{4}$/),
  email: z.union([z.literal(''), z.email().max(254)]),
  street: translated(text(120)), locality: translated(text(120)), region: translated(text(120)),
  postalCode: z.string().regex(/^\d{5,7}$/),
  instagram: permittedUrl(['www.instagram.com', 'instagram.com']),
  facebook: permittedUrl(['www.facebook.com', 'facebook.com']),
  googleBusiness: permittedUrl(['www.google.com', 'google.com', 'maps.app.goo.gl']),
});

export const editableCopyKeys = [
  'hero.eyebrow', 'hero.title', 'hero.subtitle',
  'trust.explanation.title', 'trust.explanation.body', 'trust.languages.title', 'trust.languages.body',
  'trust.availability.title', 'trust.availability.body', 'trust.personal.title', 'trust.personal.body',
  'treatments.title', 'treatments.intro', 'doctor.title', 'doctor.cta', 'faq.title',
  'contact.title', 'contact.subtitle', 'location.title', 'location.subtitle',
  'gallery.eyebrow', 'gallery.title', 'gallery.intro',
  'action.bookAppointment', 'action.readMore', 'action.allTreatments',
  'feedback.title', 'feedback.body', 'feedback.cta',
] as const;
export const managedCopySchema = z.strictObject(Object.fromEntries(editableCopyKeys.map((key) => [key, translated(text(1000))])) as Record<(typeof editableCopyKeys)[number], ReturnType<typeof translated<ReturnType<typeof text>>>>);

export type Service = z.infer<typeof serviceSchema>;
export type ManagedCopy = z.infer<typeof managedCopySchema>;
export type DoctorProfile = z.infer<typeof doctorProfileSchema>;
export type GeneralFaq = z.infer<typeof faqSchema>;
export type ContactFacts = z.infer<typeof contactFactsSchema>;

/** CMS input and build use the same strict schema and decoded claims rules. */
export function parseManaged<T>(schema: z.ZodType<T>, value: unknown, name: string): T {
  const parsed = schema.parse(value);
  const violations: string[] = [];
  function walk(node: unknown, path: string): void {
    if (typeof node === 'string') {
      for (const finding of findClaims(node)) if (finding.severity === 'error') violations.push(`${path}: ${finding.rule}`);
    } else if (Array.isArray(node)) node.forEach((child, i) => walk(child, `${path}[${i}]`));
    else if (node && typeof node === 'object') for (const [key, child] of Object.entries(node)) walk(child, `${path}.${key}`);
  }
  walk(parsed, name);
  if (violations.length) throw new Error(`${name}: prohibited claims: ${violations.join('; ')}`);
  return parsed;
}
