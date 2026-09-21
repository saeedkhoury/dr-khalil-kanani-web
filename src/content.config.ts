import { defineCollection } from 'astro:content';
import { z } from 'zod';
import { glob } from 'astro/loaders';

/**
 * Content contract.
 *
 * Files are organised as `<locale>/<slug>.md`, so the entry id is e.g.
 * "ar/dental-implants". Slugs are identical English strings across locales —
 * that is what makes the language switcher a pure /{locale}/{samePath}
 * mapping and keeps URLs shareable in WhatsApp.
 *
 * Locale parity (every slug present in he, ar AND en) is asserted at build
 * time by assertLocaleParity() in src/lib/verify.ts.
 */

const localeId = z.enum(['he', 'ar', 'en']);

/** A question/answer pair rendered as visible HTML.
 *  Note: FAQPage structured data is deliberately NOT emitted — Google retired
 *  FAQ rich results on 7 May 2026. Visible, well-structured Q&A is what now
 *  serves both patients and AI extraction. */
const qa = z.object({
  q: z.string().min(4),
  a: z.string().min(10),
});

const treatments = defineCollection({
  loader: glob({
    pattern: '**/*.md',
    base: './src/content/treatments',
    /**
     * Force the entry id to be "<locale>/<filename>".
     *
     * Without this, the glob loader treats the frontmatter `slug` field as an
     * id override — and because the slug is deliberately IDENTICAL across
     * locales (that is what makes the language switcher a pure path swap),
     * all three language versions collapse onto one colliding id and content
     * is silently dropped. The locale-parity check also depends on the
     * locale prefix being present in the id.
     */
    generateId: ({ entry }) => entry.replace(/\.md$/, ''),
  }),
  schema: z.object({
    locale: localeId,
    /** Shared English slug — must match the filename and exist in all locales. */
    slug: z.string().regex(/^[a-z0-9-]+$/, 'Slugs must be lowercase ASCII with hyphens'),

    title: z.string().min(2),
    /** Shorter label for cards and navigation, where the full title wraps badly. */
    cardTitle: z.string().min(2),
    /** One or two plain-language sentences. No outcome claims. */
    summary: z.string().min(20).max(320),

    /** Search-intent tier. 1 = high-intent, surfaced first. */
    tier: z.union([z.literal(1), z.literal(2)]),
    order: z.number().int().min(0),
    /** Key into the icon set in src/components/primitives/Icon.astro */
    icon: z.string().min(2),

    /** Sections. Kept as structured fields rather than free markdown so the
     *  same shape is guaranteed in all three languages. */
    candidacy: z.array(z.string().min(6)).min(1).max(6),
    process: z.array(z.object({ step: z.string().min(3), detail: z.string().min(10) })).min(2).max(6),
    expect: z.array(z.string().min(6)).min(1).max(6),
    faq: z.array(qa).max(6).default([]),

    /** Clinical review stamp. Doubles as an E-E-A-T signal and as a forcing
     *  function for periodic professional review of medical copy. */
    reviewedOn: z.coerce.date().optional(),

    seoTitle: z.string().max(60).optional(),
    seoDescription: z.string().min(50).max(160),

    draft: z.boolean().default(false),
  }),
});

export const collections = { treatments };
