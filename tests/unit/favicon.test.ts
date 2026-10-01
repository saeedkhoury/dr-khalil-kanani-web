/**
 * Favicons are rendered from the clinic tooth logo the owner supplied on
 * 2026-10-01 (src/assets/brand/clinic-tooth.png). Until then /favicon.ico was
 * the Astro starter's black/white/pink "A", and Google Search showed it.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import sharp from 'sharp';

import { faviconPng, appleTouchIcon, icoFromPngs, ICO_SIZES } from '../../src/lib/favicon.ts';

const SOURCE = readFileSync(new URL('../../src/assets/brand/clinic-tooth.png', import.meta.url));

/**
 * Pixels that are not the light background: how many are blue-dominant (the
 * tooth and its anti-aliased edges), pinkish, or black/grey — the colours of
 * the old "A".
 */
async function colours(png: Buffer): Promise<{ marked: number; blue: number; pink: number; dark: number }> {
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let marked = 0; let blue = 0; let pink = 0; let dark = 0;
  for (let i = 0; i < data.length; i += info.channels) {
    const [r, g, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3]];
    if (a < 128 || (r > 225 && g > 225 && b > 225)) continue; // background / highlight
    marked += 1;
    if (b >= r && b >= g) blue += 1;
    if (r > b + 20) pink += 1;
    if (r < 60 && g < 60 && b < 60 && Math.abs(r - b) < 15) dark += 1;
  }
  return { marked, blue, pink, dark };
}

async function corner(png: Buffer): Promise<number[]> {
  const { data } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return [...data.subarray(0, 4)];
}

describe('the favicon is the supplied clinic tooth logo', () => {
  for (const size of [48, 96]) {
    test(`${size}×${size} PNG: square, on the logo's light background, clinic blue`, async () => {
      const png = await faviconPng(SOURCE, size);
      const meta = await sharp(png).metadata();
      assert.equal(meta.format, 'png');
      assert.equal(meta.width, size);
      assert.equal(meta.height, size);
      const [r, g, b, a] = await corner(png);
      assert.ok(r > 240 && g > 240 && b > 240 && a === 255, `light opaque corner, got ${[r, g, b, a]}`);
      const { marked, blue, pink, dark } = await colours(png);
      assert.ok(marked > size * size * 0.1, 'the tooth fills a real part of the square');
      assert.equal(blue, marked, 'every tooth pixel is blue');
      assert.equal(pink + dark, 0, 'nothing pink or black — not the old "A"');
    });
  }

  test('the tooth keeps its proportions and is centred', async () => {
    const png = await faviconPng(SOURCE, 96);
    const { info } = await sharp(png).trim({ threshold: 12 }).toBuffer({ resolveWithObject: true });
    const srcBox = (await sharp(SOURCE).trim({ threshold: 12 }).toBuffer({ resolveWithObject: true })).info;
    const ratio = (w: number, h: number) => w / h;
    assert.ok(Math.abs(ratio(info.width, info.height) - ratio(srcBox.width, srcBox.height)) < 0.06, 'aspect ratio preserved');
    const left = -(info.trimOffsetLeft ?? 0); const right = 96 - left - info.width;
    assert.ok(Math.abs(left - right) <= 2, `centred horizontally (${left} / ${right})`);
  });

  test('apple-touch-icon: 180×180, opaque (iOS draws transparency as black), clinic blue', async () => {
    const png = await appleTouchIcon(SOURCE);
    const meta = await sharp(png).metadata();
    assert.equal(meta.width, 180);
    assert.equal(meta.height, 180);
    const [, , , a] = await corner(png);
    assert.equal(a, 255);
    const { marked, blue, pink, dark } = await colours(png);
    assert.equal(blue, marked);
    assert.equal(pink + dark, 0);
  });
});

describe('favicon.ico is a real ICO file', () => {
  test('ICO header with 16, 32 and 48 px PNG images that decode to their stated size', async () => {
    const images = await Promise.all(ICO_SIZES.map(async (size) => ({ size, data: await faviconPng(SOURCE, size) })));
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
    const ico = icoFromPngs([{ size: 256, data: await faviconPng(SOURCE, 256) }]);
    assert.equal(ico[6], 0);
    assert.equal(ico[7], 0);
  });
});
