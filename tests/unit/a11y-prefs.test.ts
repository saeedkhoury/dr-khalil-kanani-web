/**
 * Presentation preferences chosen in the accessibility panel.
 *
 * They are stored only in the visitor's own browser and applied before first
 * paint as attributes on <html>, which global.css reads. A visitor who never
 * opens the panel gets no attributes at all — the site exactly as designed.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_PREFS, PREFS_KEY, TEXT_STEPS, parsePrefs, prefAttributes, HEAD_SCRIPT, FAB_KEY, parseFabPosition, snapFab } from '../../src/lib/a11y-prefs.ts';

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

describe('where the visitor dragged the accessibility button', () => {
  test('nothing stored or anything malformed → default corner (null)', () => {
    for (const raw of [null, '', 'x', '[]', '{"side":"top","y":0.5}', '{"side":"left","y":"0.5"}', '{"side":"left","y":2}', '{"side":"left","y":-0.1}']) {
      assert.equal(parseFabPosition(raw), null, String(raw));
    }
  });
  test('a side and a height fraction survive', () => {
    assert.deepEqual(parseFabPosition('{"side":"left","y":0.42,"x":9}'), { side: 'left', y: 0.42 });
    assert.deepEqual(parseFabPosition('{"side":"right","y":1}'), { side: 'right', y: 1 });
  });
  test('snap: the nearer physical edge wins, height is clamped into the allowed band', () => {
    assert.deepEqual(snapFab({ centerX: 50, top: 300, viewportW: 375, minTop: 80, maxTop: 640, viewportH: 812 }), { side: 'left', y: 300 / 812 });
    assert.deepEqual(snapFab({ centerX: 300, top: 10, viewportW: 375, minTop: 80, maxTop: 640, viewportH: 812 }), { side: 'right', y: 80 / 812 });
    assert.deepEqual(snapFab({ centerX: 300, top: 900, viewportW: 375, minTop: 80, maxTop: 640, viewportH: 812 }), { side: 'right', y: 640 / 812 });
  });
  test('the head script restores the position before paint', () => {
    const attrs: Record<string, string> = {};
    const props: Record<string, string> = {};
    const doc = { documentElement: { setAttribute: (k: string, v: string) => { attrs[k] = v; }, style: { setProperty: (k: string, v: string) => { props[k] = v; } } } };
    const storage = { getItem: (k: string) => (k === FAB_KEY ? '{"side":"left","y":0.5}' : null) };
    new Function('document', 'localStorage', HEAD_SCRIPT)(doc, storage);
    assert.deepEqual(attrs, { 'data-fab-side': 'left' });
    assert.deepEqual(props, { '--fab-y': '0.5' });
  });
});
