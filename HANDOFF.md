# HANDOFF

Current repository state. Not a history — see `CHANGELOG.md` for that.

**Last updated:** 2026-09-21

---

## Status

**LIVE** at https://www.drkhalilkanani.com (GitHub Pages, deploys on push to
`main`).

Phase 3 is merged into `main` through
[PR #1](https://github.com/saeedkhoury/dr-khalil-kanani-web/pull/1), following the
owner's explicit merge/deploy instruction on 2026-09-21. Merge `ea6f49e` deployed
successfully in [production run 35603231942](https://github.com/saeedkhoury/dr-khalil-kanani-web/actions/runs/35603231942).
The production workflow runs on push; its latest successful run is the
deployment source of truth. The implementation passed 76 unit tests, 19
Chromium/axe tests and the 41-page HTML audit locally and in production CI.
A live desktop form check then exposed blur validation moving the consent
checkbox during a click. Inline error space is now reserved, with three new
locale regression tests bringing the browser suite to 22. Owner verification and manual checks below
remain outstanding; merge authorization did not change fact verification.

The separate Cloudflare `Workers Builds: dr-khalil-kanani-web` failure was
investigated after account sign-in. Its build had no environment variables, so
the launch gate correctly refused the three unconfirmed published fields.
That unused Worker had both public/preview URLs disabled and no custom domain
or route. With explicit owner approval, its Git connection was disconnected on
2026-09-21; the dashboard now offers **Connect**. Future pushes use the gated
GitHub Pages workflow. Historical failed checks remain historical; the Worker
was not deleted, and DNS and clinic verification were not changed.

### ⚠️ Open safety item — read `docs/GIT-HISTORY-REMEDIATION.md`

Thirteen patient before/after photographs were committed to this **public**
repository on 2026-09-21 in `7cd7ea5`. They were removed from the tree in
`e822ce7` but **remain in public Git history**. They were never referenced by
the site and were never served to a visitor — the exposure is the repository,
not the website.

Nothing irreversible has been done about this. The recommendation, the risks of
each option, and the order to do them in are in
[docs/GIT-HISTORY-REMEDIATION.md](docs/GIT-HISTORY-REMEDIATION.md). It needs the
owner's decision, and probably a lawyer's.

## What exists

- Astro 7.3 + Tailwind 4.3, fully static, no adapter, no server
- Three locales (he / ar / en), full RTL, 41 built pages
- 6 treatments × 3 locales, authored to the medical-claims discipline
- Appointment requests hand off to WhatsApp (ADR 0007) — nothing is stored
- Clinic gallery, editorial grid + `<dialog>` lightbox, data-driven from
  `src/data/media.ts`, renders nothing while that array is empty
- Google review aggregate + link-out, renders nothing until figures are supplied
- Click-to-load map facade (ADR 0008), renders nothing without a confirmed pin
- Accessibility statement and privacy policy (drafts, need legal review)

### Enforcement gates

| Gate | Command | Blocks |
|---|---|---|
| Launch gate (published vs hidden) | `npm run build` | production build |
| Claims linter | `npm run lint:claims` | verify + CI |
| Mixed-script (homoglyph) linter | `npm run lint:scripts` | verify + CI |
| Asset guard (unregistered media) | `npm run lint:assets` | **pre-commit** + CI |
| Accessibility audit of built HTML | `npm run lint:a11y` | preview + deploy |
| Unit tests (76) | `npm test` | CI |
| Type/template check | `npm run check` | verify + CI |
| Chromium + axe browser QA (22 tests) | `npm run test:e2e` | preview + deploy |

`VERIFY_RELAX=1` is **preview only**. Production uses `ACK_UNVERIFIED`, an
explicit per-field allowlist; anything not on it fails the build.

## Verified — 2026-09-21 follow-up

| Check | Result |
|---|---|
| Unit tests | 76 pass, 0 fail |
| `npm run verify` | Pass, zero type errors/warnings/hints |
| Production build | 41 pages with existing CI `ASTRO_SITE` and exact three-field `ACK_UNVERIFIED`; no `VERIFY_RELAX` |
| Bare `npm run build` | Correctly refuses the three unconfirmed published fields |
| Heading order (2.4.10, AA-mandatory in Israel) | 41/41 pages, no skips, 1×`h1` |
| Duplicate ids / missing alt / unnamed controls / `lang`+`dir` | 41/41 pages clean |
| Browser matrix | 39 localized pages × 375/768/1440px; no overflow, browser errors, failing responses or third-party requests |
| axe | Zero WCAG 2/2.1 A/AA violations across matrix, root/404, populated fixtures and open lightbox |
| Contact flow | Empty/invalid/missing-consent states; intercepted WhatsApp handoff and blocked-popup fallback in he/ar/en |
| Motion | Normal/reduced-motion, no JS, and failed observer initialization checked |
| Populated Phase 3 components | Gallery opens/navigates/closes/restores focus; Arabic Western digits; map loads only after press (request intercepted) |
| Visual review | Homepage/contact screenshots sampled at top, middle and footer in all three locales × three widths; synthetic lightbox inspected |

Browser fixtures build in an OS temporary copy using the existing vector mark
and synthetic rating/coordinates. They never modify `src/data/` or production
`dist/`, and are removed when testing finishes.

QA fixes: gallery JSON now precedes its script and escapes `<`; tablet
navigation collapses before overflow; WhatsApp opens one tab without redirecting
the original; Arabic ratings use Western digits; Hebrew h3 tracking is neutral;
mobile footer clearance includes safe-area insets; reveal hiding starts after
observers and the failsafe exist. The asset guard scans tracked files in CI,
reads staged registrations, fails on Git errors and disallows CI bypass.

## NOT verified

VoiceOver, physical iPhone/Android app handoff, outdoor legibility, native
language review and live clinic/map/rating confirmation remain unperformed.
Screenshot review is not a screen-reader or real-device pass. No approved
visual regression baseline exists. See [docs/QA-CHECKLIST.md](docs/QA-CHECKLIST.md)
for the remaining human checks.

## Outstanding owner verification

Seven facts remain unverified. The bare production build blocks the three
published fields; CI already explicitly acknowledges those three. The four
hidden/overridden fields warn. No verification status was changed here.

| Field | Needs |
|---|---|
| `address.street` | Exact street address |
| `address.geo` | Confirmed map pin — **hides Maps, Waze and the map facade** |
| `hours` | Opening hours, Sun–Thu / Fri / Sat |
| `siteUrl` | Confirmed domain (CI overrides it, so it never ships) |
| `doctor.ar` / `doctor.en` | Canonical Arabic spelling and Latin transliteration |
| `tagline.ar` | Native Arabic review |

Also blocking, but not build-enforced:

- **Israeli legal review** of the advertising-claims posture, the accessibility
  statement and the privacy policy.
- `doctor.credentials` is empty — no verifiable qualifications were found in any
  public source. Nothing may be written there without owner confirmation.
- `ACCESSIBILITY_CONTACT` in `src/data/legal.ts` needs a real name/phone/email.
- **Google Business Profile URL** (`clinic.social.googleBusiness`) and, once it
  exists, `clinic.googleRating` copied from the live profile. Reviews live on
  Google by legal necessity (ADR 0005); this is the clinic's only review surface.
- **Clinic photography** — 9–12 images (exterior, reception, rooms, equipment)
  plus a doctor portrait and one hero landscape. See `docs/ASSETS.md`.
  **No patients, no before/after, no exceptions** (ADR 0006).

## Known gaps (not blockers)

- 4 Tier-2 treatments unwritten: crowns, fillings, extractions, cleaning.
- The logo wordmark is Hebrew-only; no Arabic or English lockup exists. The UI
  works around this with the mark plus localised HTML text.
- The hero, doctor portrait and gallery all render deliberate typographic empty
  states. They are designed, not broken — but they are waiting on photography.

## Recommended next action

1. Read `docs/GIT-HISTORY-REMEDIATION.md` and decide. This is time-sensitive in
   a way the rest is not.
2. Use the latest `Deploy to Production` run for deployment status. The obsolete
   Cloudflare Git connection has been disconnected with owner approval.
3. Complete the remaining human checks in `docs/QA-CHECKLIST.md`.
4. Send the owner the verification list above. Everything else waits on it.
