/**
 * The link-preview image (Open Graph / X card) for every page.
 *
 * The clinic has no approved photograph of itself yet, and a doctor's-work
 * image is patient material that must never travel as a preview. So the
 * preview is the site's own reviewed illustration (docs/ILLUSTRATIONS.md),
 * cropped to the 1200×630 that every major platform expects.
 */
import { getImage } from 'astro:assets';
import { illustrations } from '../data/media';
import { resolveImage } from './images';
import type { Locale } from '../i18n/config';

export const SOCIAL_IMAGE = { width: 1200, height: 630 } as const;
const SOURCE = 'illustration-tooth-01.png';

export async function socialImage(origin: string, locale: Locale) {
  const record = illustrations.find((i) => i.file === SOURCE);
  const asset = resolveImage(SOURCE);
  if (!record || !asset) throw new Error(`social image source ${SOURCE} is missing`);
  // The QA fixture swaps every image for an SVG mark; pass that through as
  // the gallery does, rather than rasterising it.
  const format = asset.format === 'svg' ? 'svg' : 'jpg';
  const image = await getImage({ src: asset, ...SOCIAL_IMAGE, fit: 'cover', format, quality: 82 });
  return { url: new URL(image.src, origin).toString(), ...SOCIAL_IMAGE, alt: record.alt[locale] };
}
