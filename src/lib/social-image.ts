/**
 * The link-preview image (Open Graph / X card) for every page: the clinic's
 * own logo, centred on the site's porcelain background.
 *
 * Until 2026-10-07 the preview was an illustration of a porcelain tooth and a
 * dental mirror; the owner asked for the clinic logo. It is rendered from the
 * same vector as the header, favicon and schema logo
 * (src/assets/brand/clinic-mark.svg), so it cannot drift from the real mark.
 * A doctor's-work image is patient material and must never be a preview.
 *
 * The URL is versioned (`-v1`) because WhatsApp, iMessage and Facebook cache
 * previews by image URL: to change the picture again, render it at a new
 * version rather than replacing the bytes behind this one.
 */
import sharp from 'sharp';
import { clinic } from '../data/clinic.ts';
import type { Locale } from '../i18n/config.ts';

export const SOCIAL_IMAGE = {
  path: '/social/clinic-share-v1.png',
  type: 'image/png',
  width: 1200,
  height: 630,
} as const;

/** Logo height as a share of the image: clearly visible, inside the centre square any crop keeps. */
const LOGO_SHARE = 0.56;
/** --color-porcelain (src/styles/global.css). */
const BACKGROUND = '#fcfdfe';

const ALT: Record<Locale, (name: string) => string> = {
  he: (name) => `הלוגו של מרפאת השיניים — ${name}`,
  ar: (name) => `شعار عيادة الأسنان — ${name}`,
  en: (name) => `Dental clinic logo — ${name}`,
};

export function socialImage(origin: string, locale: Locale) {
  const { path, ...rest } = SOCIAL_IMAGE;
  return { url: new URL(path, origin).toString(), ...rest, alt: ALT[locale](clinic.doctor[locale]) };
}

/** The 1200×630 PNG: the mark, trimmed to its ink, centred on porcelain. */
export async function renderSocialImage(svg: string): Promise<Buffer> {
  const { width, height } = SOCIAL_IMAGE;
  const logoHeight = Math.round(height * LOGO_SHARE);
  const rendered = await sharp(Buffer.from(svg), { density: 1200 })
    .resize(1600, 1600, { fit: 'inside', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  const trimmed = await sharp(rendered).trim({ threshold: 1 }).toBuffer();
  const logo = await sharp(trimmed).resize({ height: logoHeight, kernel: 'lanczos3' }).png().toBuffer({ resolveWithObject: true });
  return sharp({ create: { width, height, channels: 4, background: BACKGROUND } })
    .composite([{
      input: logo.data,
      left: Math.round((width - logo.info.width) / 2),
      top: Math.round((height - logo.info.height) / 2),
    }])
    .flatten({ background: BACKGROUND })
    .png()
    .toBuffer();
}
