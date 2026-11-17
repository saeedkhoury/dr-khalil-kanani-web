/**
 * The link-preview image (Open Graph / X card) for every page.
 *
 * This is the clinic's own logo, placed on a clean white 1200×630 canvas —
 * the size every major platform (LinkedIn, WhatsApp, Facebook, X) expects.
 * The logo carries the clinic name and is safe to travel as a preview, unlike
 * any doctor's-work image, which is patient material and must never be shared.
 *
 * The source is a brand asset (src/assets/brand/og-logo-01.png), already the
 * exact 1200×630, so the `cover` fit below is a no-op and nothing is cropped.
 * To change the preview, replace that file with another 1200×630 image.
 */
import { getImage } from 'astro:assets';
import type { Locale } from '../i18n/config';
import { socialImageAlt } from './seo';
import ogLogo from '../assets/brand/og-logo-01.png';

export const SOCIAL_IMAGE = { width: 1200, height: 630 } as const;

export async function socialImage(origin: string, locale: Locale) {
  const image = await getImage({ src: ogLogo, ...SOCIAL_IMAGE, fit: 'cover', format: 'jpg', quality: 82 });
  return { url: new URL(image.src, origin).toString(), ...SOCIAL_IMAGE, alt: socialImageAlt(locale) };
}
