/**
 * Favicons, rendered at build time from the clinic's own vector logo
 * (src/assets/brand/clinic-mark.svg — the tooth, the same paths as the header
 * logo and the schema logo). Until 2026-10-01 /favicon.ico was the Astro
 * starter's "A", and Google Search showed it.
 *
 * Vector, not a screenshot of the logo: a raster source carries its own
 * near-white background, which Google and dark browser tabs draw as a white
 * box around the tooth. Rendering the paths gives clean edges at 16 px and
 * true transparency at every size.
 *
 * The routes pass the SVG text in (inlined at build with `?raw`); a file read
 * from this module would resolve against dist/.
 */
import sharp from 'sharp';

/**
 * Sizes inside /favicon.ico, the site's ONE declared icon: browser tabs
 * (16, 32) and Google Search, which asks for 48 px or a larger multiple of 48.
 */
export const ICO_SIZES = [16, 32, 48, 96, 144, 192] as const;

/** Clear space around the mark, as a share of the square's side. */
const MARGIN = 0.04;

/** The mark, trimmed to its own ink and centred on a transparent square. */
async function squareMark(svg: string): Promise<Buffer> {
  const transparent = { r: 0, g: 0, b: 0, alpha: 0 };
  // Rendered large once, then scaled down per size: small icons keep the
  // anti-aliasing of the full-resolution render.
  const rendered = await sharp(Buffer.from(svg), { density: 1200 })
    .resize(1024, 1024, { fit: 'inside', background: transparent })
    .png()
    .toBuffer();
  // The artboard is not the mark: trim to the ink so the tooth sits centred.
  const { data, info } = await sharp(rendered).trim({ threshold: 1 }).toBuffer({ resolveWithObject: true });
  const side = Math.ceil(Math.max(info.width, info.height) / (1 - 2 * MARGIN));
  const left = Math.floor((side - info.width) / 2);
  const top = Math.floor((side - info.height) / 2);
  return sharp(data)
    .extend({ left, right: side - info.width - left, top, bottom: side - info.height - top, background: transparent })
    .png()
    .toBuffer();
}

/** A square, transparent PNG of the mark at `size` pixels. */
export async function faviconPng(svg: string | Buffer, size: number): Promise<Buffer> {
  return sharp(await squareMark(String(svg)))
    .resize(size, size, { kernel: 'lanczos3' })
    .png()
    .toBuffer();
}

/** 180×180 on white: iOS draws transparency as black and rounds the corners itself. */
export async function appleTouchIcon(svg: string | Buffer): Promise<Buffer> {
  const size = 180;
  const pad = Math.round(size * 0.1);
  const inner = size - 2 * pad;
  const mark = await sharp(await squareMark(String(svg))).resize(inner, inner).png().toBuffer();
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
