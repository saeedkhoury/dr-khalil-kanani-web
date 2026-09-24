/**
 * A real PNG of a chosen size, for upload tests.
 *
 * Noise does not compress, so a 1600×1200 image is ~5.7 MB — the size of an
 * actual phone photograph, and above GitHub's 1 MB inline-content limit.
 * Every upload failure this project shipped was invisible to tests that used
 * tiny or fake images.
 */
import { crc32, deflateSync } from 'node:zlib';

function chunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body) >>> 0);
  return Buffer.concat([length, body, crc]);
}

export function noisePng(width: number, height: number, seed = 1): Buffer {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bit depth
  header[9] = 2; // RGB
  const rowLength = width * 3 + 1;
  const raw = Buffer.alloc(rowLength * height);
  let state = seed >>> 0 || 1;
  for (let y = 0; y < height; y += 1) {
    raw[y * rowLength] = 0; // filter: none
    for (let i = 1; i < rowLength; i += 1) {
      state ^= state << 13; state ^= state >>> 17; state ^= state << 5;
      raw[y * rowLength + i] = state & 0xff;
    }
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 1 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}
