/**
 * Presentation preferences chosen in the accessibility panel.
 *
 * They are stored only in the visitor's own browser and applied before first
 * paint as attributes on <html>, which global.css reads. A visitor who never
 * opens the panel gets no attributes at all — the site exactly as designed.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_PREFS, PREFS_KEY, TEXT_STEPS, parsePrefs, prefAttributes, HEAD_SCRIPT } from '../../src/lib/a11y-prefs.ts';

describe('parsing stored preferences', () => {
  test('nothing stored, garbage, or wrong types → defaults', () => {
    for (const raw of [null, '', 'not json', '[]', '{"text":"big","contrast":"yes"}', '{"text":99}', '{"text":-1}']) {
      assert.deepEqual(parsePrefs(raw), DEFAULT_PREFS, String(raw));
    }
  });
  test('valid values survive; unknown keys are dropped', () => {
    assert.deepEqual(parsePrefs('{"text":2,"contrast":true,"links":false,"motion":true,"evil":"<script>"}'),
      { text: 2, contrast: true, links: false, motion: true });
  });
  test('text steps are modest and start at 100%', () => {
    assert.equal(TEXT_STEPS[0], 1);
    assert.ok(TEXT_STEPS.every((s, i) => i === 0 || s > TEXT_STEPS[i - 1]));
    assert.ok(TEXT_STEPS.at(-1)! <= 1.3, 'larger steps break layout; browser zoom covers beyond');
  });
});

describe('attributes on <html>', () => {
  test('defaults set nothing — the designed site is unchanged', () => {
    assert.deepEqual(prefAttributes(DEFAULT_PREFS), {});
  });
  test('each choice maps to one attribute', () => {
    assert.deepEqual(prefAttributes({ text: 2, contrast: true, links: true, motion: true }), {
      'data-a11y-text': '2', 'data-a11y-contrast': '', 'data-a11y-links': '', 'data-a11y-motion': '',
    });
  });
});

describe('the pre-paint head script', () => {
  const run = (stored: string | null, throwOnRead = false) => {
    const attrs: Record<string, string> = {};
    const doc = { documentElement: { setAttribute: (k: string, v: string) => { attrs[k] = v; } } };
    const storage = { getItem: (k: string) => { if (throwOnRead) throw new Error('blocked'); return k === PREFS_KEY ? stored : null; } };
    new Function('document', 'localStorage', HEAD_SCRIPT)(doc, storage);
    return attrs;
  };
  test('applies stored preferences exactly as prefAttributes does', () => {
    const prefs = { text: 1, contrast: true, links: false, motion: true } as const;
    assert.deepEqual(run(JSON.stringify(prefs)), prefAttributes(prefs));
  });
  test('nothing stored → no attributes', () => assert.deepEqual(run(null), {}));
  test('malformed or blocked storage never throws and sets nothing unsafe', () => {
    assert.deepEqual(run('{"text":"2\\" onload=\\"x"}'), {});
    assert.deepEqual(run('}{'), {});
    assert.deepEqual(run(null, true), {});
  });
});
