---
name: multilingual-ui
description: Use when building or changing any UI that renders in Hebrew, Arabic and English. Covers RTL/LTR, bidi isolation, logical properties and locale parity — the failure modes that are invisible in one language and broken in another.
---

# Multilingual UI

## Purpose

RTL bugs are subtle, recurring, and usually invisible to whoever wrote the
component in English. This encodes the ones that actually bite here.

## When to use

Any component, layout or page touching three-language rendering.

## When NOT to use

Server logic, build config, content authoring (use `dental-content`).

## Workflow

1. **Logical properties only.** Tailwind 4.2+:
   `inline-s-*` / `inline-e-*` / `pbs-*` / `pbe-*` / `border-bs` / `border-be`.
   Never `left`, `right`, `ml-`, `mr-`, `pl-`, `pr-`.
   Note `start-*` / `end-*` are **deprecated** — use `inline-s-*` / `inline-e-*`.

2. **Isolate every Latin run inside RTL text** with `.u-ltr`. Phone numbers,
   emails, Latin brand names, URLs. Without it `04-884-8891` renders reordered
   inside a Hebrew or Arabic paragraph.

3. **Mirror only what is directional.** `.u-flip` on chevrons and arrows.
   Never on logos, photographs, the phone handset or the clock icon.

4. **No negative letter-spacing on Hebrew or Arabic.** Tightening damages
   connected scripts. `global.css` already overrides this per `html[lang]`.

5. **Western digits in Arabic.** Eastern Arabic-Indic numerals (٠١٢٣) are a
   Gulf/Egypt convention and read as foreign in the Levant.

6. **Uppercase is Latin-only.** `.eyebrow` suppresses `text-transform` for
   `he` and `ar` — Hebrew and Arabic have no uppercase.

7. **Fonts are scoped per locale** in `BaseLayout.astro`. Adding a face to
   every page costs every visitor; check the per-locale byte count after any
   font change.

8. **Language switcher must link page → equivalent page**, as real crawlable
   `<a href>`. Never a `<select onchange>`, never a cookie-and-reload, and
   never an IP or Accept-Language redirect.

## Verification

Check the change in **all three locales** at **375px and desktop**:

```bash
npm run build     # locale parity gate
```

Then in the browser:
- axe-core: zero violations
- Heading order: no skipped levels (AA-mandatory in Israel)
- Sticky mobile bar does not cover footer content
- Switcher lands on the equivalent page, not a homepage

## Output

A component that renders correctly in he, ar and en, with the verification
above actually run — not assumed.
