# Current plan

**Updated:** 2026-09-21 · Phase 3 premium upgrade merged to main

The original numbered implementation plan (core pages, six treatments in three
languages and appointment requests) is complete. The current Phase 3 refers to
the premium upgrade in `CHANGELOG.md`, merged through PR #1.

## Completed

- Typography, hero, treatment cards, conditional gallery, Google aggregate
  link-out, click-to-load map and reduced-motion behavior.
- Asset, content, locale, claims and built-HTML accessibility gates.
- Follow-up fixes for gallery initialization, tablet layout, WhatsApp handoff,
  Western Arabic numerals, Hebrew tracking, safe-area clearance and reveals.
- 76 unit tests and 19 Chromium/axe tests, enforced in preview/production CI.
- Homepage/contact screenshot samples reviewed at 375/768/1440px in he/ar/en.

## Remaining launch follow-up

- Verify the production workflow and live three-locale smoke checks.
- Complete human checks in `docs/QA-CHECKLIST.md`: VoiceOver, real iPhone/Android
  handoff, native-language review and outdoor legibility.
- Owner confirmation of address, map pin, hours, domain, doctor spellings,
  Arabic tagline, credentials and accessibility contact. Do not invent these.
- Owner/legal decision on `docs/GIT-HISTORY-REMEDIATION.md` and legal review
  of clinic copy, accessibility statement and privacy policy.

## Later, separate work

- Four Tier-2 treatments: crowns, fillings, extractions, cleaning.
- Reviewed clinic/doctor photography, Google Business Profile and real rating.
- Cookieless analytics and hosting-appropriate security headers if required.

The architecture is static GitHub Pages with WhatsApp handoff (ADR 0007).
Supabase, KV and a server appointment endpoint are not current tasks.
