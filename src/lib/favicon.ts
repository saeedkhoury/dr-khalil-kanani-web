/**
 * Favicons, rendered at build time from the clinic tooth logo the owner
 * supplied (src/assets/brand/clinic-tooth.png, 2026-10-01). Until then
 * /favicon.ico was the Astro starter's "A", and Google Search showed it.
 *
 * The image is trimmed to the tooth, centred on a square of its own light
 * background with a small margin — never stretched — and resized from the
 * full-resolution source for each size.
 *
 * The routes pass the image bytes in (inlined at build); a file read from
 * this module would resolve against dist/.
 */
import sharp from 'sharp';

/**
 * Sizes inside /favicon.ico, the site's ONE declared icon: browser tabs
 * (16, 32) and Google Search, which asks for 48 px or a larger multiple of 48.
 */
export const ICO_SIZES = [16, 32, 48, 96, 144, 192] as const;

/** Margin around the tooth, as a share of the square's side. */
const MARGIN = 0.06;

/** The tooth, trimmed and centred on a square of the logo's own background. */
async function squareLogo(source: Buffer): Promise<Buffer> {
  const { data } = await sharp(source).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const background = { r: data[0], g: data[1], b: data[2], alpha: 1 }; // the image's corner colour
  const trimmed = await sharp(source).removeAlpha().trim({ threshold: 12 }).toBuffer({ resolveWithObject: true });
  const { width, height } = trimmed.info;
  const side = Math.ceil(Math.max(width, height) / (1 - 2 * MARGIN));
  const left = Math.floor((side - width) / 2);
  const top = Math.floor((side - height) / 2);
  return sharp(trimmed.data)
    .extend({ left, right: side - width - left, top, bottom: side - height - top, background })
    .png()
    .toBuffer();
}

/** A square PNG of the logo at `size` pixels. */
export async function faviconPng(source: Buffer, size: number): Promise<Buffer> {
  return sharp(await squareLogo(source)).resize(size, size, { kernel: 'lanczos3' }).png().toBuffer();
}

/** 180×180, opaque: iOS renders transparency as black and rounds the corners itself. */
export async function appleTouchIcon(source: Buffer): Promise<Buffer> {
  return faviconPng(source, 180);
}

/**
 * An ICO container holding PNG images (supported by every current browser
 * and by Google). Header, one 16-byte directory entry per image, then the
 * PNG bytes. Width/height are one byte each; 256 is written as 0.
 */
export function icoFromPngs(images: Array<{ size: number; data: Buffer }>): Buffer {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // 1 = icon
  header.writeUInt16LE(images.length, 4);
  const entries: Buffer[] = [];
  let offset = 6 + 16 * images.length;
  for (const { size, data } of images) {
    const entry = Buffer.alloc(16);
    entry[0] = size >= 256 ? 0 : size;
    entry[1] = size >= 256 ? 0 : size;
    entry[2] = 0; // no palette
    entry[3] = 0; // reserved
    entry.writeUInt16LE(1, 4); // colour planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(data.length, 8);
    entry.writeUInt32LE(offset, 12);
    entries.push(entry);
    offset += data.length;
  }
  return Buffer.concat([header, ...entries, ...images.map((image) => image.data)]);
}

/** The bytes of a `data:` URI (how the routes receive the inlined image). */
export function bytesOfDataUri(uri: string): Buffer {
  const comma = uri.indexOf(',');
  if (!uri.startsWith('data:') || comma < 0 || !uri.slice(0, comma).endsWith(';base64')) {
    throw new Error('favicon source is not an inlined base64 image');
  }
  return Buffer.from(uri.slice(comma + 1), 'base64');
}
