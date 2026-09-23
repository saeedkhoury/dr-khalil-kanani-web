/**
 * IMAGE INSPECTION — format and dimensions from the file's own bytes.
 *
 * ── WHY BYTES, NOT THE FILENAME ───────────────────────────────────────────
 * An extension is a claim by the uploader. These checks are the control: a
 * file named `photo.jpg` containing HTML, a script, or an SVG is refused here
 * regardless of what it is called, and nothing downstream has to wonder.
 *
 * ── WHY NO DEPENDENCY ─────────────────────────────────────────────────────
 * Reading a width and a height means reading two fixed-position integers in
 * PNG and walking a well-documented marker chain in JPEG. An image library
 * would be tens of thousands of lines of parsing — a far larger attack
 * surface than the ~60 lines below — to answer a question this small, in a
 * Worker that must not decode or re-encode anything.
 *
 * These functions never decode pixels. They read a header and stop.
 */

export type ImageFormat = 'jpeg' | 'png';

export interface ImageInfo {
  format: ImageFormat;
  width: number;
  height: number;
  /** The extension this file must be stored with, from its real type. */
  extension: 'jpg' | 'png';
}

const JPEG_SOI = [0xff, 0xd8, 0xff];
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

const startsWith = (bytes: Uint8Array, prefix: readonly number[]): boolean =>
  bytes.length >= prefix.length && prefix.every((b, i) => bytes[i] === b);

/**
 * PNG: an IHDR chunk is mandatory and must come first, so width and height
 * sit at fixed offsets 16 and 20, big-endian.
 */
function readPng(bytes: Uint8Array): ImageInfo | null {
  if (bytes.length < 24) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  // Bytes 12-15 must spell "IHDR"; if they do not, this is not a PNG whose
  // header we are willing to trust.
  if (String.fromCharCode(...bytes.subarray(12, 16)) !== 'IHDR') return null;
  const width = view.getUint32(16, false);
  const height = view.getUint32(20, false);
  if (width === 0 || height === 0) return null;
  return { format: 'png', width, height, extension: 'png' };
}

/**
 * JPEG: a chain of marker segments. Dimensions live in a Start Of Frame
 * marker (SOF0-SOF15), excluding SOF4/SOF8/SOF12 which are not frame headers.
 * Walk the chain rather than guessing an offset, because the number and size
 * of preceding segments (EXIF, ICC, comments) varies per file.
 */
function readJpeg(bytes: Uint8Array): ImageInfo | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 2; // past SOI

  while (offset + 3 < bytes.length) {
    if (bytes[offset] !== 0xff) return null; // lost the chain; refuse rather than scan
    const marker = bytes[offset + 1];

    // Standalone markers carry no length.
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      offset += 2;
      continue;
    }
    // Start of scan: pixel data begins and no SOF was found.
    if (marker === 0xda || marker === 0xd9) return null;

    const length = view.getUint16(offset + 2, false);
    if (length < 2) return null;

    const isSof =
      marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;

    if (isSof) {
      // segment: FF marker len(2) precision(1) height(2) width(2)
      if (offset + 9 >= bytes.length) return null;
      const height = view.getUint16(offset + 5, false);
      const width = view.getUint16(offset + 7, false);
      if (width === 0 || height === 0) return null;
      return { format: 'jpeg', width, height, extension: 'jpg' };
    }

    offset += 2 + length;
  }
  return null;
}

/**
 * Identify an image from its bytes.
 *
 * Returns null for anything that is not a JPEG or PNG whose header parses —
 * including SVG, GIF, WebP, HTML, and a JPEG truncated before its frame
 * header. Null means refuse; there is no "probably fine" answer.
 */
export function inspectImage(bytes: Uint8Array): ImageInfo | null {
  if (startsWith(bytes, PNG_SIGNATURE)) return readPng(bytes);
  if (startsWith(bytes, JPEG_SOI)) return readJpeg(bytes);
  return null;
}
