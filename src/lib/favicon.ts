/**
 * Raster favicons, rendered at build time from the clinic's mark
 * (public/favicon.svg — the tooth glyph extracted from the supplied logo,
 * identical to the header logo). One source: a raster copy cannot drift from
 * the mark visitors see, and no template icon can survive in a file nobody
 * looks at — /favicon.ico was the Astro starter's "A" until 2026-10-01, and
 * Google Search showed it.
 *
 * The SVG is passed in rather than read here: the routes inline it at build
 * (`?raw`), and a file read from this module would resolve against dist/.
 */
import sharp from 'sharp';

/** Sizes inside /favicon.ico: browser tabs (16, 32) and Google (48). */
export const ICO_SIZES = [16, 32, 48] as const;

/** The mark on a transparent square — the same look as favicon.svg. */
export async function faviconPng(svg: string, size: number): Promise<Buffer> {
  const pad = Math.max(1, Math.round(size * 0.04));
  const inner = size - 2 * pad;
  const mark = await sharp(Buffer.from(svg), { density: 1200 })
    .resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  return sharp({ create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: mark, left: pad, top: pad }])
    .png()
    .toBuffer();
}

/** 180×180 on white: iOS renders transparency as black and rounds the corners itself. */
export async function appleTouchIcon(svg: string): Promise<Buffer> {
  const size = 180;
  const pad = Math.round(size * 0.12);
  const inner = size - 2 * pad;
  const mark = await sharp(Buffer.from(svg), { density: 1200 })
    .resize(inner, inner, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png()
    .toBuffer();
  return sharp({ create: { width: size, height: size, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } } })
    .composite([{ input: mark, left: pad, top: pad }])
    .flatten({ background: '#ffffff' })
    .png()
    .toBuffer();
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
