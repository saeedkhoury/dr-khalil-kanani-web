# Current plan

**Updated:** 2026-09-21 · Phase 3 premium upgrade merged to main

The original numbered implementation plan (core pages, six treatments in three
languages and appointment requests) is complete. The current Phase 3 refers to
the premium upgrade in `CHANGELOG.md`, merged through PR #1.

## Current authorized workstream — admin CMS local remediation

The later approved Admin CMS design and implementation plan are in
`docs/specs/2026-09-22-admin-cms-{design,plan}.md`. The owner's remediation
instruction supersedes the initial component/page freeze only for minimum
clinic-gallery integration, and requires stale writes to fail rather than
silently overwrite. Remediation is complete locally on `feat/admin-cms`.
See [the audit](../docs/audits/2026-09-24-admin-cms-remediation.md) and `HANDOFF.md`
for current verification. Infrastructure remains blocked and unauthorized.
The older completion notes below describe the earlier public-site workstream.

## Completed

- Typography, hero, treatment cards, conditional gallery, Google aggregate
  link-out, click-to-load map and reduced-motion behavior.
- Asset, content, locale, claims and built-HTML accessibility gates.
- Follow-up fixes for gallery initialization, tablet layout, WhatsApp handoff,
  Western Arabic numerals, Hebrew tracking, safe-area clearance and reveals.
- 76 unit tests and 31 Chromium/axe tests, enforced in preview/production CI.
- Phase 3 merge deployed successfully; unused Cloudflare Git connection
  disconnected after diagnosis and explicit owner approval.
- Desktop consent-click regression fixed by preserving inline error space.
- Owner-supplied Street 1003 and Waze destination enabled across languages.
  Redesigned directions/map section and removed the narrow hero fact strip.
- Homepage/contact screenshot samples reviewed at 375/768/1440px in he/ar/en.
- Visible gallery of three real treatment photos, matched to the clinic’s
  Instagram at the owner’s direction (ADR 0009), with full-size viewing and
  original-post links. The empty doctor portrait panel is removed.
- Original tooth mark at the hero's top-left with 3D mouse tracking, static on
  touch/reduced-motion/no-JS; hero screenshots reviewed across the same matrix.

## Remaining launch follow-up

- Complete human checks in `docs/QA-CHECKLIST.md`: VoiceOver, real iPhone/Android
  handoff, native-language review and outdoor legibility.
- Owner confirmation of hours, domain, doctor spellings,
  Arabic tagline, credentials and accessibility contact. Do not invent these.
- Owner/legal decision on `docs/GIT-HISTORY-REMEDIATION.md` and legal review
  of clinic copy, accessibility statement and privacy policy.

## Later, separate work

- Four Tier-2 treatments: crowns, fillings, extractions, cleaning.
- Reviewed clinic/doctor photography, Google Business Profile and real rating.
- Cookieless analytics and hosting-appropriate security headers if required.

The architecture is static GitHub Pages with WhatsApp handoff (ADR 0007).
Supabase, KV and a server appointment endpoint are not current tasks.
