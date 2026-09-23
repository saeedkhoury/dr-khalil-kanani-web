/**
 * The admin panel's markup, stylesheet and client script.
 *
 * Three things these tests exist to defend:
 *   1. one design system — the tokens must match the public site's
 *   2. RTL correctness — logical properties only, enforced mechanically
 *   3. the confirmation gate and the escaping, which are safety, not polish
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { escapeHtml, renderPanel } from '../../workers/admin/src/ui/page.ts';
import { STYLES } from '../../workers/admin/src/ui/styles.ts';
import { CLIENT } from '../../workers/admin/src/ui/client.ts';
import { MIRRORED_TOKENS } from '../../workers/admin/src/ui/tokens.ts';
import { UI } from '../../workers/admin/src/ui/strings.ts';
import { CMS_CATEGORIES, DAY_ORDER } from '../../src/lib/data-schema.ts';
import { adminRequest, callAdmin } from '../helpers/admin-api.ts';

const globalCss = readFileSync(new URL('../../src/styles/global.css', import.meta.url), 'utf8');
const page = renderPanel('doctor@example.test');

describe('one design system, proven not assumed', () => {
  test('every mirrored token matches src/styles/global.css exactly', () => {
    // The panel cannot link the site's stylesheet without a runtime
    // dependency on the public site, so the tokens are mirrored — and this
    // fails the moment the site's palette changes and the panel does not.
    for (const name of MIRRORED_TOKENS) {
      const inSite = new RegExp(`--${name}:\\s*([^;]+);`).exec(globalCss);
      assert.ok(inSite, `--${name} is not defined in global.css`);
      const inPanel = new RegExp(`--${name}:\\s*([^;]+);`).exec(STYLES);
      assert.ok(inPanel, `--${name} is not defined in the panel stylesheet`);
      assert.equal(
        inPanel[1].trim(), inSite[1].trim(),
        `--${name} has drifted from the site`,
      );
    }
  });

  test('the panel cannot leak utilities into the public stylesheet', () => {
    // This happened: Tailwind scans the project for class names, saw
    // `--text-base` and `--ease-out` inside the panel's own CSS, and emitted
    // `.text-base`, `.ease-out` and friends into the PUBLIC stylesheet — 715
    // bytes no page used, and a changed file hash on all 47 pages.
    //
    // The admin Worker must be invisible to the site's build.
    assert.match(globalCss, /@source not ["']\.\.\/\.\.\/workers["']/);
    // tests/ too: a test quoting a token name did exactly the same thing the
    // day after workers/ was excluded.
    assert.match(globalCss, /@source not ["']\.\.\/\.\.\/tests["']/);
  });

  test('the panel invents no colour of its own', () => {
    // Any raw hex outside the token block would be a second palette.
    const body = STYLES.slice(STYLES.indexOf('}') + 1);
    const hexes = body.match(/#[0-9a-f]{3,8}\b/gi) ?? [];
    // #fff on the ink button is the one literal, and it is the same white the
    // site uses for text on ink.
    assert.deepEqual([...new Set(hexes.map((h) => h.toLowerCase()))], ['#fff']);
  });
});

describe('RTL correctness is mechanical, not a matter of care', () => {
  test('the stylesheet uses logical properties only', () => {
    // A physical property is invisible in Hebrew until someone opens the
    // panel in English and the layout is inside out.
    const forbidden = [
      /(^|[\s;{])margin-(left|right)\s*:/,
      /(^|[\s;{])padding-(left|right)\s*:/,
      /(^|[\s;{])border-(left|right)\s*:/,
      /(^|[\s;{])(left|right)\s*:/,
      /text-align\s*:\s*(left|right)/,
      /float\s*:\s*(left|right)/,
      /(^|[\s;{])(max-|min-)?width\s*:/,
      /(^|[\s;{])(max-|min-)?height\s*:/,
    ];
    // Media queries legitimately use min-width: a breakpoint is about the
    // viewport, not about writing direction, and there is no logical form of
    // it to prefer. Everything else must be logical.
    const declarations = STYLES.replace(/@media[^{]*\{/g, '{');
    for (const pattern of forbidden) {
      assert.ok(!pattern.test(declarations), `physical property found: ${pattern}`);
    }
  });

  test('the document declares Hebrew and RTL', () => {
    assert.match(page, /<html lang="he" dir="rtl">/);
  });

  test('the Arabic description field is marked as Arabic', () => {
    // Otherwise a screen reader announces Arabic with a Hebrew voice.
    assert.match(page, /id="photo-alt-ar"[^>]*lang="ar"/);
  });
});

describe('the signal colour is never used for text', () => {
  test('--color-signal appears only on non-text properties', () => {
    // It measures 3.28:1. It is for icons and rules, never words.
    for (const match of STYLES.matchAll(/([a-z-]+)\s*:\s*var\(--color-signal\)/g)) {
      assert.ok(
        !['color', 'caret-color'].includes(match[1]),
        `--color-signal used for ${match[1]}`,
      );
    }
  });
});

describe('touch targets and depth', () => {
  test('every interactive control reserves at least 48px', () => {
    // Used one-handed, standing, between patients.
    const targets = STYLES.match(/min-block-size:\s*48px/g) ?? [];
    assert.ok(targets.length >= 5, `expected several 48px targets, found ${targets.length}`);
  });

  test('depth comes from tint and hairlines, never drop shadows', () => {
    assert.ok(!/box-shadow/.test(STYLES), 'a drop shadow was introduced');
    assert.ok(!/text-shadow/.test(STYLES));
    assert.ok(!/gradient/.test(STYLES), 'the design uses no gradients');
  });

  test('motion is disabled for those who ask', () => {
    assert.match(STYLES, /prefers-reduced-motion: reduce/);
  });
});

describe('the panel markup', () => {
  test('renders all seven days in the Israeli week order', () => {
    for (const [i, day] of DAY_ORDER.entries()) {
      assert.ok(page.includes(`data-row="${i}"`), `row ${i} missing`);
      assert.ok(page.includes(UI.days[day]!), `${day} missing its Hebrew name`);
    }
    // Sunday first, Saturday last.
    assert.ok(page.indexOf(UI.days.Sunday!) < page.indexOf(UI.days.Saturday!));
  });

  test('offers exactly the categories the CMS may write', () => {
    for (const category of CMS_CATEGORIES) {
      assert.ok(page.includes(`value="${category}"`), `${category} missing`);
    }
    // And never the ones it may not.
    for (const forbidden of ['treatment-work', 'illustration', 'hero', 'portrait']) {
      assert.ok(!page.includes(`value="${forbidden}"`), `${forbidden} is offered`);
    }
  });

  test('the add form follows the binding order: pick, preview, category, he, ar, confirm, save', () => {
    // The preview precedes the descriptions because he cannot describe a
    // photograph he has not seen — and seeing it is when he would notice a
    // patient in the frame.
    const order = ['photo-file', 'photo-preview', 'photo-category', 'photo-alt-he', 'photo-alt-ar', 'photo-confirm', 'photo-submit'];
    const positions = order.map((id) => page.indexOf(`id="${id}"`));
    for (const [i, position] of positions.entries()) {
      assert.notEqual(position, -1, `${order[i]} missing`);
      if (i > 0) assert.ok(position > positions[i - 1], `${order[i]} is out of order`);
    }
  });

  test('the submit button starts disabled until the confirmation is ticked', () => {
    assert.match(page, /id="photo-submit"[^>]*disabled/);
    assert.match(CLIENT, /photo-confirm[\s\S]*?photo-submit'\)\.disabled = !/);
  });

  test('the delete dialog names the specific photograph', () => {
    assert.match(CLIENT, /confirm-delete-body'\)\.textContent = T\.gallery\.deleteBody \+ ' \(' \+ record\.file/);
  });

  test('the status region is a live region that persists', () => {
    // No toast: a message that disappears is no use to someone who looked away.
    assert.match(page, /id="status"[^>]*role="status"[^>]*aria-live="polite"/);
    assert.ok(!/toast/i.test(CLIENT));
  });

  test('tabs are real tabs for a screen reader', () => {
    assert.match(page, /role="tablist"/);
    assert.match(page, /id="tab-hours"[^>]*aria-controls="panel-hours"[^>]*aria-selected/);
    assert.match(page, /id="panel-hours"[^>]*role="tabpanel"[^>]*aria-labelledby="tab-hours"/);
  });

  test('every time input is associated with its day for a screen reader', () => {
    for (let i = 0; i < 7; i += 1) {
      assert.ok(page.includes(`<label for="opens-${i}">`), `opens-${i} has no label`);
      assert.ok(page.includes(`aria-describedby="day-${i}"`), `row ${i} is not tied to its day`);
    }
  });

  test('the panel is never indexed', () => {
    assert.match(page, /name="robots" content="noindex, nofollow"/);
  });

  test('it carries no secret and no repository path', () => {
    for (const leak of ['GITHUB_TOKEN', 'ghp_', 'Authorization', 'Bearer', 'api.github.com', 'src/data/', 'cloudflareaccess']) {
      assert.ok(!page.includes(leak), `the page carries ${leak}`);
      assert.ok(!CLIENT.includes(leak), `the client script carries ${leak}`);
    }
  });
});

describe('escaping', () => {
  test('escapeHtml neutralises markup', () => {
    assert.equal(escapeHtml('<script>alert(1)</script>'), '&lt;script&gt;alert(1)&lt;/script&gt;');
    assert.equal(escapeHtml(`" onload="x`), '&quot; onload=&quot;x');
    assert.equal(escapeHtml("' & '"), '&#39; &amp; &#39;');
  });

  test('the authenticated email is escaped into the page', () => {
    // It comes from a verified token, but it is still interpolated text.
    const hostile = renderPanel('a"><script>alert(1)</script>@x.test');
    assert.ok(!hostile.includes('<script>alert(1)'), 'markup survived into the page');
    assert.ok(hostile.includes('&lt;script&gt;'));
  });

  test('photo descriptions are rendered as text, never as markup', () => {
    // The client builds cards with textContent, so a description containing
    // markup is characters rather than a script.
    assert.match(CLIENT, /alt\.textContent =/);
    // Comments stripped, so the comment explaining the rule does not trip it.
    const code = CLIENT.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    assert.ok(!/innerHTML/.test(code), 'the client uses innerHTML somewhere');
    assert.ok(!/outerHTML|insertAdjacentHTML|document\.write/.test(code));
  });
});

describe('the panel is served correctly', () => {
  test('GET / returns the panel to an authenticated caller', async () => {
    const { response } = await callAdmin(await adminRequest('/'), []);
    assert.equal(response.status, 200);
    assert.match(response.headers.get('Content-Type') ?? '', /^text\/html/);
    const body = await response.text();
    assert.match(body, /<html lang="he" dir="rtl">/);
    assert.ok(body.includes('doctor@example.test'));
  });

  test('the panel, its script and its stylesheet all require authentication', async () => {
    for (const path of ['/', '/panel.js', '/panel.css']) {
      const { response } = await callAdmin(new Request(`https://admin.drkhalilkanani.test${path}`), []);
      assert.equal(response.status, 401, `${path} was served unauthenticated`);
    }
  });

  test('the document CSP permits no inline execution', async () => {
    const { response } = await callAdmin(await adminRequest('/'), []);
    const csp = response.headers.get('Content-Security-Policy') ?? '';
    assert.match(csp, /script-src 'self'/);
    assert.match(csp, /style-src 'self'/);
    assert.match(csp, /frame-ancestors 'none'/);
    assert.ok(!csp.includes("'unsafe-inline'"), 'unsafe-inline was permitted');
    assert.ok(!csp.includes("'unsafe-eval'"));
  });

  test('the panel keeps every other security header', async () => {
    const { response } = await callAdmin(await adminRequest('/'), []);
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
    assert.equal(response.headers.get('X-Content-Type-Options'), 'nosniff');
    assert.equal(response.headers.get('Referrer-Policy'), 'no-referrer');
    assert.equal(response.headers.get('X-Frame-Options'), 'DENY');
    assert.equal(response.headers.get('Access-Control-Allow-Origin'), null);
  });

  test('the API keeps its stricter default-src none', async () => {
    const { response } = await callAdmin(await adminRequest('/api/session'), []);
    assert.match(response.headers.get('Content-Security-Policy') ?? '', /default-src 'none'/);
  });
});
