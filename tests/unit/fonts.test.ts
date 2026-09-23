import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const expected = new Map([
  ['noto-sans-hebrew-hebrew.woff2', '30420f52f9569d1a89d5ee276a40e9d984808ae794eb91570b2a74e3d2275f09'],
  ['noto-sans-hebrew-latin.woff2', '3cd723aa62514a13f5abcf94664d2dd0a20d3fad79962f796e77e5f240b32d98'],
  ['noto-sans-arabic-arabic.woff2', '69cdf0bf005fdc9cc13fb5a8581697eb9ba8f761aeaf255fc717d14c62c38891'],
  ['noto-sans-latin.woff2', 'afc7a910f4ff04ee2ff7b3a2ef8b24f8340b8ea8d8125f2779f1f0b69d1b56b9'],
]);

test('production font families resolve only the reviewed local WOFF2 bytes', () => {
  const config = readFileSync(new URL('../../astro.config.mjs', import.meta.url), 'utf8');
  assert.equal((config.match(/provider: fontProviders\.local\(\)/g) ?? []).length, 3);
  assert.doesNotMatch(config, /provider: fontProviders\.(?:google|fontsource|npm)\(/);
  const sources = [...config.matchAll(/src: \['(\.\/src\/assets\/fonts\/[a-z-]+\.woff2)'\]/g)]
    .map((match) => match[1]);

  assert.equal(sources.length, expected.size);
  for (const src of sources) {
    const name = src.split('/').at(-1);
    assert.ok(name && expected.has(name), `unexpected font source: ${src}`);
    const bytes = readFileSync(new URL(`../../${src.slice(2)}`, import.meta.url));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), expected.get(name), name);
  }
});
