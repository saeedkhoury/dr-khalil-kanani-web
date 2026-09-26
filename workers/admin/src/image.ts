/**
 * IMAGE INSPECTION — bounded structural validation from the file's own bytes.
 *
 * ── WHY BYTES, NOT THE FILENAME ───────────────────────────────────────────
 * An extension is a claim by the uploader. These checks are the control: a
 * file named `photo.jpg` containing HTML, a script, or an SVG is refused here
 * regardless of what it is called, and nothing downstream has to wonder.
 *
 * ── WHY NO DEPENDENCY ─────────────────────────────────────────────────────
 * The Worker checks the complete PNG chunk envelope and CRCs, or the JPEG
 * marker/scan envelope, before reporting dimensions. This uses constant
 * auxiliary memory and never trusts lengths beyond the supplied byte array.
 *
 * This is not pixel decoding: a well-framed image with invalid compressed
 * pixels can still fail the site's build-time image decoder. The Worker does
 * not transform uploaded bytes.
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

const CRC_TABLE = Array.from({ length: 256 }, (_, value) => {
  let crc = value;
  for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  return crc >>> 0;
});

function pngCrc(bytes: Uint8Array, start: number, end: number): number {
  let crc = 0xffffffff;
  for (let index = start; index < end; index += 1) {
    crc = CRC_TABLE[(crc ^ bytes[index]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/** PNG chunks have a 4-byte length, 4-byte type, data and 4-byte CRC. */
function readPng(bytes: Uint8Array): ImageInfo | null {
  if (bytes.length < 8 + 25 + 12 + 12) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = PNG_SIGNATURE.length;
  let width = 0;
  let height = 0;
  let colorType = -1;
  let hasPalette = false;
  let hasData = false;
  let dataEnded = false;

  while (offset <= bytes.length - 12) {
    const length = view.getUint32(offset, false);
    // Subtraction avoids overflow and makes both the data and CRC bounds
    // explicit before any offset derived from an attacker-controlled length.
    if (length > bytes.length - offset - 12) return null;
    const type = String.fromCharCode(...bytes.subarray(offset + 4, offset + 8));
    if (!/^[A-Za-z]{4}$/.test(type)) return null;
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    if (pngCrc(bytes, offset + 4, dataEnd) !== view.getUint32(dataEnd, false)) return null;

    if (offset === PNG_SIGNATURE.length) {
      if (type !== 'IHDR' || length !== 13) return null;
      width = view.getUint32(dataStart, false);
      height = view.getUint32(dataStart + 4, false);
      const depth = bytes[dataStart + 8];
      colorType = bytes[dataStart + 9];
      const validDepths: Record<number, readonly number[]> = {
        0: [1, 2, 4, 8, 16], 2: [8, 16], 3: [1, 2, 4, 8],
        4: [8, 16], 6: [8, 16],
      };
      if (width === 0 || height === 0 || !validDepths[colorType]?.includes(depth) ||
          bytes[dataStart + 10] !== 0 || bytes[dataStart + 11] !== 0 ||
          bytes[dataStart + 12] > 1) return null;
    } else if (type === 'IHDR') {
      return null;
    } else if (type === 'PLTE') {
      if (hasPalette || hasData || colorType === 0 || colorType === 4 ||
          length === 0 || length > 768 || length % 3 !== 0) return null;
      hasPalette = true;
    } else if (type === 'IDAT') {
      if (dataEnded || length === 0 || (colorType === 3 && !hasPalette)) return null;
      hasData = true;
    } else if (type === 'IEND') {
      if (length !== 0 || !hasData || dataEnd + 4 !== bytes.length) return null;
      return { format: 'png', width, height, extension: 'png' };
    } else if (type[0] === type[0].toUpperCase()) {
      // Unknown critical chunks cannot be safely interpreted.
      return null;
    }

    if (hasData && type !== 'IDAT') dataEnded = true;
    offset = dataEnd + 4;
  }
  return null;
}

/**
 * JPEG: consume every bounded marker segment and entropy scan through EOI.
 * Stuffed 0xFF bytes and restart markers are valid inside a scan; neither is
 * a substitute for actual scan data or a final EOI marker.
 */
function readJpeg(bytes: Uint8Array): ImageInfo | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 2; // past SOI
  let width = 0;
  let height = 0;
  let sawScan = false;
  let inScan = false;

  while (offset < bytes.length) {
    if (inScan) {
      let scanBytes = 0;
      while (offset < bytes.length) {
        if (bytes[offset] !== 0xff) {
          offset += 1;
          scanBytes += 1;
          continue;
        }
        const markerStart = offset;
        while (offset < bytes.length && bytes[offset] === 0xff) offset += 1;
        if (offset >= bytes.length) return null;
        const marker = bytes[offset];
        if (marker === 0x00 || (marker >= 0xd0 && marker <= 0xd7)) {
          offset += 1;
          if (marker === 0x00) scanBytes += 1;
          continue;
        }
        offset = markerStart;
        break;
      }
      if (scanBytes === 0) return null;
      inScan = false;
      continue;
    }

    if (bytes[offset] !== 0xff) return null;
    while (offset < bytes.length && bytes[offset] === 0xff) offset += 1;
    if (offset >= bytes.length) return null;
    const marker = bytes[offset];
    offset += 1;
    if (marker === 0x00 || marker === 0xd8 || marker === 0x01 ||
        (marker >= 0xd0 && marker <= 0xd7)) return null;
    if (marker === 0xd9) {
      return sawScan && offset === bytes.length
        ? { format: 'jpeg', width, height, extension: 'jpg' }
        : null;
    }
    if (offset > bytes.length - 2) return null;
    const length = view.getUint16(offset, false);
    if (length < 2 || length > bytes.length - offset) return null;

    const isSof =
      marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;

    if (isSof) {
      if (length < 11 || width !== 0) return null;
      const components = bytes[offset + 7];
      if (components < 1 || components > 4 || length !== 8 + 3 * components) return null;
      height = view.getUint16(offset + 3, false);
      width = view.getUint16(offset + 5, false);
      if (width === 0 || height === 0) return null;
    } else if (marker === 0xda) {
      if (length < 8 || width === 0) return null;
      const components = bytes[offset + 2];
      if (components < 1 || components > 4 || length !== 6 + 2 * components) return null;
      sawScan = true;
      inScan = true;
    }

    offset += length;
  }
  return null;
}

/**
 * Identify an image from its bytes.
 *
 * Returns null for anything that is not a structurally complete JPEG or PNG,
 * including SVG, GIF, WebP, HTML and header-only/truncated image files.
 */
export function inspectImage(bytes: Uint8Array): ImageInfo | null {
  if (startsWith(bytes, PNG_SIGNATURE)) return readPng(bytes);
  if (startsWith(bytes, JPEG_SOI)) return readJpeg(bytes);
  return null;
}
