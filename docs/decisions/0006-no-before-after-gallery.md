# ADR 0006 — No before/after gallery

**Status:** Accepted · 2026-09-20
**This decision is legal, not editorial. Do not reverse it without counsel.**

**2026-09-21 scope update:** the owner explicitly directed publication of three
selected Instagram work photographs after this exclusion was explained. The
current implementation follows that instruction for the exact selection in
[ADR 0009](./0009-owner-directed-instagram-gallery.md). This is not a legal
clearance; the legal-review item remains open. The original reasoning below
is retained as historical context.

## Decision

No before/after patient photography anywhere on the site.

## Why

Patient photographs fall under the same prohibition as testimonials
(ADR 0005) — patient image and likeness may not be used in advertising. It is
compounded by the bans on implying guaranteed success and on publishing
success statistics without Ministry of Health approval.

One reference site ships a before/after disclaimer rendered as
`color: transparent; height: 0` — present for auditors, invisible to patients.
That is what working around this rule looks like, and a regulator would likely
treat it as no disclaimer at all.

## Instead

Illustrative or stock clinical imagery **clearly labelled**
`תמונה להמחשה בלבד — אינה מטופל/ת` (the string exists as `legal.illustrative`
in `src/i18n/ui.ts`). The regulations require such a notice to be explicit and
prominent.

## Note for the owner

The clinic's **existing Instagram** currently publishes intraoral before/after
photography of patients. That predates this site and is outside its scope, but
it should be raised with counsel independently.
