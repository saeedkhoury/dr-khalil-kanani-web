/**
 * Favicons are rendered from the clinic's own mark (public/favicon.svg — the
 * tooth glyph extracted from the supplied logo, the same paths as the header
 * logo). Until 2026-10-01, /favicon.ico was still the Astro starter's "A",
 * and Google Search showed it next to the clinic's results.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import sharp from 'sharp';

import { faviconPng, appleTouchIcon, icoFromPngs, ICO_SIZES } from '../../src/lib/favicon.ts';

const MARK = readFileSync(new URL('../../public/favicon.svg', import.meta.url), 'utf8');

/** Share of opaque pixels whose colour is the clinic's blue family. */
async function blueShare(png: Buffer): Promise<{ opaque: number; blue: number }> {
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let opaque = 0; let blue = 0;
  for (let i = 0; i < data.length; i += info.channels) {
    const [r, g, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3]];
    if (a < 128 || (r > 235 && g > 235 && b > 235)) continue; // transparent or white background
    opaque += 1;
    if (b > r + 40 && b > g) blue += 1; // #2195D2 / #0C5283 family — not black, white or pink
  }
  return { opaque, blue };
}

describe('the favicon is the clinic mark', () => {
  for (const size of [48, 96]) {
    test(`${size}×${size} PNG: square, transparent, clinic blue`, async () => {
      const png = await faviconPng(MARK, size);
      const meta = await sharp(png).metadata();
      assert.equal(meta.format, 'png');
      assert.equal(meta.width, size);
      assert.equal(meta.height, size);
      assert.ok(meta.hasAlpha);
      const { data } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      assert.equal(data[3], 0, 'top-left corner is transparent — no tile or template background');
      const { opaque, blue } = await blueShare(png);
      assert.ok(opaque > size * size * 0.1, 'the mark fills a real part of the square');
      assert.ok(blue / opaque > 0.9, `mark pixels are clinic blue (${blue}/${opaque})`);
    });
  }

  test('apple-touch-icon: 180×180, opaque white (iOS draws transparency as black), clinic blue mark', async () => {
    const png = await appleTouchIcon(MARK);
    const meta = await sharp(png).metadata();
    assert.equal(meta.width, 180);
    assert.equal(meta.height, 180);
    const { data } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    assert.deepEqual([...data.subarray(0, 4)], [255, 255, 255, 255], 'white corner');
    const { opaque, blue } = await blueShare(png);
    assert.ok(blue / opaque > 0.9);
  });
});

describe('favicon.ico is a real ICO file', () => {
  test('ICO header with 16, 32 and 48 px PNG images that decode to their stated size', async () => {
    const images = await Promise.all(ICO_SIZES.map(async (size) => ({ size, data: await faviconPng(MARK, size) })));
    const ico = icoFromPngs(images);
    assert.equal(ico.readUInt16LE(0), 0, 'reserved');
    assert.equal(ico.readUInt16LE(2), 1, 'type 1 = icon');
    assert.equal(ico.readUInt16LE(4), ICO_SIZES.length);
    for (let i = 0; i < ICO_SIZES.length; i += 1) {
      const entry = 6 + 16 * i;
      const size = ICO_SIZES[i];
      assert.equal(ico[entry], size);
      assert.equal(ico[entry + 1], size);
      const length = ico.readUInt32LE(entry + 8);
      const offset = ico.readUInt32LE(entry + 12);
      const meta = await sharp(ico.subarray(offset, offset + length)).metadata();
      assert.equal(meta.format, 'png');
      assert.equal(meta.width, size);
      assert.equal(meta.height, size);
    }
  });

  test('a 256 px image is written as 0 in the one-byte size field, as the format requires', async () => {
    const ico = icoFromPngs([{ size: 256, data: await faviconPng(MARK, 256) }]);
    assert.equal(ico[6], 0);
    assert.equal(ico[7], 0);
  });
});
