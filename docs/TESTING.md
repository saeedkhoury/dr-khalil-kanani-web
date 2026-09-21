# Testing strategy

## What is enforced automatically

| Gate | Command | Blocks |
|---|---|---|
| Launch verification | `npm run build` | Production build with any unverified clinic fact |
| Locale parity | `npm run build` | A treatment missing from any locale |
| Claims linter | `npm run lint:claims` | Prohibited advertising patterns |
| Mixed-script linter | `npm run lint:scripts` | Cyrillic/Greek homoglyphs in he/ar text |
| Type check | `npm run check` | Type errors |

`npm run verify` runs the linters and the type check together.

## Manual verification matrix

Every UI change is checked across:

- **Locales**: he, ar, en
- **Directions**: RTL and LTR
- **Viewports**: 375px and desktop

and for:

- axe-core — **zero violations** (wcag2a, wcag2aa, wcag21a, wcag21aa)
- Heading order — no skipped levels, exactly one `h1`
  (2.4.10 is AA-mandatory in Israel, stricter than baseline WCAG)
- Keyboard navigation and visible focus throughout
- The sticky mobile bar never covering footer content
- Language switcher landing on the equivalent page, not a homepage
- Form: empty submit, invalid phone, missing consent, valid submit
- Endpoint: honeypot, too-fast submit, rate limit, unconfigured delivery

## Current state

Verification so far has been **manual plus axe-core in-browser**, and all of
the above passes. An automated Playwright suite covering the same matrix is
the main testing gap — see `planning/ROADMAP.md`.

## Baseline results (2026-09-20)

- axe-core across 8 page types: 0 violations
- Heading order on `/he/`: `1233332333333222222`, no skips
- Client JS: ~2.9KB inline, zero external JS files
- Fonts: he 31.5KB · en 35KB · ar 162KB per page
