/**
 * The link preview (Open Graph / X card) is the clinic's own logo.
 *
 * Until 2026-10-07 every page shared an illustration of a porcelain tooth and
 * a dental mirror; the owner asked for the clinic logo instead. The image is
 * rendered from the same vector the header, favicon and schema logo use, at a
 * new stable URL so platforms that cached the old preview fetch afresh.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import sharp from 'sharp';

import { SOCIAL_IMAGE, socialImage, renderSocialImage } from '../../src/lib/social-image.ts';
import { clinic, LOCALES } from '../../src/data/clinic.ts';

const ORIGIN = 'https://www.drkhalilkanani.com';
const MARK = readFileSync(new URL('../../src/assets/brand/clinic-mark.svg', import.meta.url), 'utf8');

describe('share-preview metadata', () => {
  for (const locale of LOCALES) {
    test(`${locale}: absolute https URL on the canonical host, PNG 1200×630, alt names the clinic`, () => {
      const og = socialImage(ORIGIN, locale);
      assert.equal(og.url, `${ORIGIN}/social/clinic-share-v1.png`);
      assert.equal(og.type, 'image/png');
      assert.equal(og.width, 1200);
      assert.equal(og.height, 630);
      assert.ok(og.alt.includes(clinic.doctor[locale]), og.alt);
      assert.doesNotMatch(og.alt, /mirror|מראה|مرآة/i, 'not the old illustration');
    });
  }

  test('the URL is new — not the old illustration path', () => {
    assert.doesNotMatch(SOCIAL_IMAGE.path, /illustration/);
    assert.match(SOCIAL_IMAGE.path, /^\/social\/clinic-share-v\d+\.png$/);
  });
});

describe('the share image is the clinic logo', () => {
  test('1200×630 opaque PNG on the porcelain background', async () => {
    const png = await renderSocialImage(MARK);
    const meta = await sharp(png).metadata();
    assert.equal(meta.format, 'png');
    assert.equal(meta.width, 1200);
    assert.equal(meta.height, 630);
    const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    assert.deepEqual([...data.subarray(0, 4)], [0xfc, 0xfd, 0xfe, 255], 'porcelain, opaque corner');
    // Logo pixels: only clinic blue, nothing else drawn.
    let marked = 0; let blue = 0; let minX = info.width; let maxX = 0; let minY = info.height; let maxY = 0;
    for (let y = 0; y < info.height; y += 1) for (let x = 0; x < info.width; x += 1) {
      const i = (y * info.width + x) * 4;
      const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
      if (r > 235 && g > 235 && b > 235) continue;
      marked += 1; if (b >= r && b >= g) blue += 1;
      minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    }
    assert.equal(blue, marked, 'every drawn pixel is clinic blue');
    const h = maxY - minY + 1;
    assert.ok(h > 630 * 0.45 && h < 630 * 0.7, `logo height ${h}px: clearly visible, with safe margins`);
    assert.ok(Math.abs(minX - (1200 - 1 - maxX)) <= 3, 'centred horizontally');
    assert.ok(Math.abs(minY - (630 - 1 - maxY)) <= 3, 'centred vertically');
    // WhatsApp/iMessage may crop to the centre square: the logo must fit in it.
    assert.ok(minX >= (1200 - 630) / 2 && maxX <= (1200 + 630) / 2, 'inside the centre square');
  });
});
