/**
 * Edit Mode speaks the page's language: Hebrew and Arabic right-to-left,
 * English left-to-right. Interface words only — site content is never
 * translated here.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { EDITOR_STRINGS } from '../../workers/admin/src/ui/visual-strings.ts';
import { BAR_STRINGS } from '../../src/components/editor/bar-strings.ts';
import { VISUAL_CLIENT } from '../../workers/admin/src/ui/visual.ts';

type Tree = Record<string, unknown>;
const shape = (node: unknown, at = ''): string[] =>
  node && typeof node === 'object' && !Array.isArray(node)
    ? Object.entries(node as Tree).flatMap(([k, v]) => shape(v, `${at}${k}.`))
    : [`${at.slice(0, -1)}${Array.isArray(node) ? `[${node.length}]` : ''}`];

test('every interface string exists in Hebrew, Arabic and English, with the same structure', () => {
  const he = shape(EDITOR_STRINGS.he).sort();
  for (const lang of ['ar', 'en'] as const) {
    assert.deepEqual(shape(EDITOR_STRINGS[lang]).sort(), he, `${lang} differs from he`);
  }
  assert.deepEqual(Object.keys(BAR_STRINGS.ar).sort(), Object.keys(BAR_STRINGS.he).sort());
  assert.deepEqual(Object.keys(BAR_STRINGS.en).sort(), Object.keys(BAR_STRINGS.he).sort());
});

test('no language is missing a value, and placeholders match across languages', () => {
  const flat = (node: unknown, at = ''): Array<[string, string]> =>
    typeof node === 'string' ? [[at, node]]
      : Array.isArray(node) ? node.map((v, i) => [`${at}[${i}]`, String(v)] as [string, string])
        : Object.entries(node as Tree).flatMap(([k, v]) => flat(v, at ? `${at}.${k}` : k));
  const heValues = new Map(flat(EDITOR_STRINGS.he));
  for (const lang of ['he', 'ar', 'en'] as const) {
    for (const [key, value] of flat(EDITOR_STRINGS[lang])) {
      assert.ok(value.trim() !== '', `${lang}.${key} is empty`);
      const holes = (s: string) => (s.match(/\{[a-z]+\}/g) ?? []).sort().join(',');
      assert.equal(holes(value), holes(heValues.get(key) ?? ''), `${lang}.${key} placeholders differ`);
    }
  }
  // Written in the right script, not left in Hebrew by accident.
  for (const [key, value] of flat(EDITOR_STRINGS.ar)) assert.doesNotMatch(value, /[֐-׿]/, `ar.${key} contains Hebrew`);
  for (const [key, value] of flat(EDITOR_STRINGS.en)) assert.doesNotMatch(value, /[֐-׿؀-ۿ]/, `en.${key} is not English`);
});

test('the client carries no hard-coded Hebrew: every word comes from the dictionary', () => {
  const source = readFileSync(new URL('../../workers/admin/src/ui/visual-client.ts', import.meta.url), 'utf8');
  const code = source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
  assert.doesNotMatch(code, /[֐-׿؀-ۿ]/);
});

test('the dialog takes the page language and direction; the dictionary is inlined safely', () => {
  assert.match(VISUAL_CLIENT, /dialog\.lang=locale; dialog\.dir=DIR;/);
  assert.match(VISUAL_CLIENT, /const DIR = locale==='en'\?'ltr':'rtl';/);
  assert.doesNotMatch(VISUAL_CLIENT, /__STRINGS__/);
  assert.doesNotMatch(VISUAL_CLIENT, /<\/script/i);
  assert.doesNotThrow(() => new Function(VISUAL_CLIENT));
});

test('the Workers Builds step refuses to build without an exact commit to record', async () => {
  const { spawnSync } = await import('node:child_process');
  const script = new URL('../../scripts/build-admin-ci.mjs', import.meta.url).pathname;
  for (const sha of [undefined, '', 'main', 'abc123']) {
    const env = { ...process.env };
    if (sha === undefined) delete env.WORKERS_CI_COMMIT_SHA; else env.WORKERS_CI_COMMIT_SHA = sha;
    const result = spawnSync(process.execPath, [script], { env, encoding: 'utf8' });
    assert.equal(result.status, 1, `built with ${String(sha)}`);
    assert.match(result.stderr, /refusing to build/);
  }
});
