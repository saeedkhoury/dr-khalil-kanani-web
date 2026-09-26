import { TOKENS } from './tokens.ts';

/**
 * ADMIN STYLESHEET.
 *
 * Binding rules, from the approved design spec:
 *
 *  · Mobile first, Hebrew first, RTL. LOGICAL PROPERTIES ONLY — no `left`,
 *    `right`, `margin-left`, `padding-right` or `text-align: left/right`
 *    anywhere. A test enforces it, because a physical property is invisible
 *    in Hebrew until someone opens the panel in English and the layout is
 *    inside out. Block-axis properties are written logically too
 *    (min-block-size, not min-height) — RTL does not flip that axis, but an
 *    absolute rule is one nobody has to remember the exception to.
 *  · Depth from layered tint and hairlines, NEVER drop shadows.
 *  · --color-signal is 3.28:1 and is used for icons and rules only, never for
 *    text. A test enforces that too.
 *  · Touch targets ≥48px: this is used one-handed, standing, between patients.
 *  · No dashboard, no stat cards, no charts, no gradients.
 */
export const STYLES = `${TOKENS}

*, *::before, *::after { box-sizing: border-box; }

html { -webkit-text-size-adjust: 100%; }

body {
  margin: 0;
  background: var(--color-mist);
  color: var(--color-body);
  font-size: var(--text-base);
  line-height: 1.6;
  font-family: "Noto Sans Hebrew", "Arial Hebrew", David, system-ui, sans-serif;
}

/* A single column that stops growing. A form read at arm's length does not
   benefit from being wider than a paragraph. */
.wrap { max-inline-size: 42rem; margin-inline: auto; padding: 1rem 1rem 4rem; }

header.bar {
  background: var(--color-porcelain);
  border-block-end: 1px solid var(--color-line);
  padding: 0.75rem 1rem;
}
header.bar h1 { margin: 0; font-size: var(--text-lg); color: var(--color-ink); }
header.bar .who { font-size: var(--text-xs); color: var(--color-muted); }

/* Two tabs. Not a sidebar: there are two jobs, and a menu implies more. */
nav.tabs { display: flex; gap: 0.5rem; margin-block: 1rem; }
nav.tabs button {
  flex: 1;
  min-block-size: 48px;
  font: inherit;
  font-size: var(--text-base);
  color: var(--color-ink);
  background: var(--color-porcelain);
  border: 1px solid var(--color-line-strong);
  border-radius: var(--radius-btn);
  cursor: pointer;
}
nav.tabs button[aria-selected="true"] {
  background: var(--color-ink);
  border-color: var(--color-ink);
  color: #fff;
}

section[hidden] { display: none; }

h2 { font-size: var(--text-xl); color: var(--color-ink); margin-block: 0 0.25rem; }
.intro { color: var(--color-muted); font-size: var(--text-sm); margin-block-start: 0; }

.card {
  background: var(--color-porcelain);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-card);
  padding: 0.875rem 1rem;
  margin-block-end: 0.75rem;
}

/* ── Hours ── */
.day { display: grid; grid-template-columns: 1fr; gap: 0.5rem; }
/* Grid and flex children may shrink below their content. A time field is
   much wider on some systems ("09:00 AM" in a wide fallback font on Linux)
   and must wrap onto its own line, never push the page sideways. */
.day > * { min-inline-size: 0; }
.day .name { font-weight: 600; color: var(--color-ink); }
.day .times { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; min-inline-size: 0; }
.day .times label { font-size: var(--text-xs); color: var(--color-muted); }
.day input[type="time"] {
  min-inline-size: 0;
  max-inline-size: 100%;
  min-block-size: 48px;
  font: inherit;
  padding-inline: 0.5rem;
  color: var(--color-body);
  background: var(--color-porcelain);
  border: 1px solid var(--color-line-strong);
  border-radius: var(--radius-field);
}
.day input[type="time"]:disabled { background: var(--color-haze); color: var(--color-muted); }

/* A 48px target for the switch itself, not just its label text. */
.toggle { display: flex; align-items: center; gap: 0.5rem; min-block-size: 48px; cursor: pointer; }
.toggle input { inline-size: 1.35rem; block-size: 1.35rem; accent-color: var(--color-ink); }

/* ── Buttons ── */
button.primary, button.secondary, button.danger {
  min-block-size: 48px;
  inline-size: 100%;
  font: inherit;
  font-size: var(--text-base);
  border-radius: var(--radius-btn);
  cursor: pointer;
  transition: background var(--dur-fast) var(--ease-out);
}
button.primary { background: var(--color-ink); color: #fff; border: 1px solid var(--color-ink); }
button.primary:hover:not(:disabled) { background: var(--color-ink-deep); }
button.primary:disabled { background: var(--color-tide); border-color: var(--color-tide); color: var(--color-muted); cursor: not-allowed; }
button.secondary { background: var(--color-porcelain); color: var(--color-ink); border: 1px solid var(--color-line-strong); }

/* Permanent delete: set apart, danger-coloured TEXT on the normal surface.
   Not a red-filled button and not a dramatic modal — the weight belongs on
   the confirmation, not on the colour. */
button.danger {
  background: transparent;
  color: var(--color-danger);
  border: 1px solid var(--color-line-strong);
}

:where(a, button, input, select, textarea):focus-visible {
  outline: 3px solid var(--color-ink);
  outline-offset: 2px;
}

/* ── Gallery ── */
.group-title { font-size: var(--text-sm); color: var(--color-muted); margin-block: 1.25rem 0.5rem; }
.photo { display: flex; gap: 0.75rem; align-items: flex-start; }
.photo img {
  inline-size: 84px; block-size: 84px; object-fit: cover;
  border-radius: var(--radius-field); background: var(--color-haze); flex: none;
}
.photo .meta { flex: 1; min-inline-size: 0; }
.photo .alt { font-size: var(--text-sm); overflow-wrap: anywhere; }
/* State is stated in TEXT, never by colour alone. */
.state { font-size: var(--text-xs); font-weight: 600; }
.state.is-published { color: var(--color-ok); }
.state.is-unpublished { color: var(--color-muted); }
.photo .actions { display: flex; flex-direction: column; gap: 0.5rem; margin-block-start: 0.5rem; }

/* ── Forms ── */
label.field { display: block; margin-block-end: 0.75rem; }
label.field > span { display: block; font-size: var(--text-sm); color: var(--color-ink); margin-block-end: 0.25rem; }
label.field .hint { font-size: var(--text-xs); color: var(--color-muted); font-weight: 400; }
input[type="text"], input[type="file"], select, textarea {
  inline-size: 100%;
  min-block-size: 48px;
  font: inherit;
  padding: 0.5rem 0.625rem;
  color: var(--color-body);
  background: var(--color-porcelain);
  border: 1px solid var(--color-line-strong);
  border-radius: var(--radius-field);
}
textarea { min-block-size: 5rem; resize: vertical; }
.preview { display: block; max-inline-size: 100%; border-radius: var(--radius-field); margin-block-end: 0.75rem; }

/* ── Messages ── */
.error { color: var(--color-danger); font-size: var(--text-sm); margin-block-start: 0.25rem; }
.status {
  border: 1px solid var(--color-line-strong);
  border-radius: var(--radius-card);
  background: var(--color-porcelain);
  padding: 0.75rem 1rem;
  margin-block: 1rem;
  font-size: var(--text-sm);
}
.status.is-failed { border-color: var(--color-danger); }
.status.is-published { border-color: var(--color-ok); }

dialog {
  border: 1px solid var(--color-line-strong);
  border-radius: var(--radius-card);
  padding: 1.25rem;
  max-inline-size: min(28rem, calc(100vw - 2rem));
  color: var(--color-body);
  background: var(--color-porcelain);
}
dialog::backdrop { background: rgb(12 42 61 / 0.45); }

@media (min-width: 40rem) {
  .day { grid-template-columns: 8rem 1fr auto; align-items: center; }
  button.primary, button.secondary { inline-size: auto; padding-inline: 1.5rem; }
}

@media (prefers-reduced-motion: reduce) {
  * { transition-duration: 0.01ms !important; animation-duration: 0.01ms !important; }
}
`;
