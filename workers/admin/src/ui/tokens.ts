/**
 * DESIGN TOKENS — the same values as src/styles/global.css.
 *
 * The panel is served by a Worker and the website by GitHub Pages, so it
 * cannot link the site's stylesheet without either a runtime dependency on
 * the public site or a second origin. Both are worse than this.
 *
 * So the tokens are mirrored here, and `tests/unit/admin-ui.test.ts` parses
 * global.css and asserts EVERY value below matches it. There is still one
 * design system; the duplication is proven identical by a test rather than
 * trusted, and a change to the site's palette fails the suite until the panel
 * follows.
 *
 * Only the tokens the panel actually uses are mirrored — copying the display
 * type scale into an admin form would be inventing a need.
 */
export const TOKENS = `
:root {
  --color-porcelain: #fcfdfe;
  --color-mist: #f1f6fa;
  --color-haze: #e3edf5;
  --color-tide: #cfe0ee;
  --color-ink: #0c5283;
  --color-ink-deep: #083d63;
  --color-signal: #2195d2;
  --color-body: #0f2a3d;
  --color-muted: #4a6274;
  --color-line: #dce7f0;
  --color-line-strong: #b9cfe2;
  --color-danger: #b3261e;
  --color-ok: #0f6e3d;

  --text-xs: 0.8125rem;
  --text-sm: 0.9375rem;
  --text-base: 1.0625rem;
  --text-lg: 1.1875rem;
  --text-xl: clamp(1.375rem, 1.2rem + 0.7vw, 1.625rem);

  --radius-card: 14px;
  --radius-btn: 12px;
  --radius-field: 10px;
  --radius-pill: 999px;

  --ease-out: cubic-bezier(0.22, 0.61, 0.36, 1);
  --dur-fast: 150ms;
  --dur-base: 240ms;
}
`.trim();

/** Token names this file claims to mirror, for the drift test to check. */
export const MIRRORED_TOKENS = [
  'color-porcelain', 'color-mist', 'color-haze', 'color-tide', 'color-ink',
  'color-ink-deep', 'color-signal', 'color-body', 'color-muted', 'color-line',
  'color-line-strong', 'color-danger', 'color-ok',
  'text-xs', 'text-sm', 'text-base', 'text-lg', 'text-xl',
  'radius-card', 'radius-btn', 'radius-field', 'radius-pill',
  'ease-out', 'dur-fast', 'dur-base',
] as const;
