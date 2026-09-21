# HANDOFF

Current repository state. Not a history — see `CHANGELOG.md` for that.

**Last updated:** 2026-09-21

---

## Status

**LIVE** at https://www.drkhalilkanani.com (GitHub Pages, deploys on push to
`main`).

Phase 3 (premium upgrade) is complete **on the branch
`feature/phase-3-premium-upgrade`**, which has **not** been merged and **not**
been pushed to `main`. `main` is untouched at `fc5c91b`; production still serves
Phase 2.

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

### Seven enforcement gates

| Gate | Command | Blocks |
|---|---|---|
| Launch gate (published vs hidden) | `npm run build` | production build |
| Claims linter | `npm run lint:claims` | verify + CI |
| Mixed-script (homoglyph) linter | `npm run lint:scripts` | verify + CI |
| Asset guard (unregistered media) | `npm run lint:assets` | **pre-commit** + CI |
| Accessibility audit of built HTML | `npm run lint:a11y` | preview + deploy |
| Unit tests (73) | `npm test` | CI |
| Type/template check | `npm run check` | verify + CI |

`VERIFY_RELAX=1` is **preview only**. Production uses `ACK_UNVERIFIED`, an
explicit per-field allowlist; anything not on it fails the build.

## Verified — programmatically, this session

| Check | Result |
|---|---|
| Unit tests | 73 pass, 0 fail |
| Heading order (2.4.10, AA-mandatory in Israel) | 41/41 pages, no skips, 1×`h1` |
| Duplicate ids / missing alt / unnamed controls / `lang`+`dir` | 41/41 pages clean |
| Physical CSS properties in source (RTL risk) | none found |
| Third-party resources loaded on page load | **zero** |
| Client JS | ~2.7KB inline, **zero external JS files** |
| Page weight | he 137KB · en 137KB · ar 268KB (Arabic font) |
| Gallery render path | probed end-to-end with temporary images, then reverted |
| Rating + facade render path | probed end-to-end with temporary data, then reverted |

## NOT verified

**No visual or screen-reader QA has been performed.** The browser pane in this
environment runs hidden, which pauses the document timeline and
IntersectionObserver, so anything animated cannot be honestly checked here.

[docs/QA-CHECKLIST.md](docs/QA-CHECKLIST.md) lists what a person has to do,
across nine locale × width passes, plus VoiceOver, plus real devices. Nothing on
it has been ticked.

## Blockers — production deploy is gated on these

Run `npm run build` for the live list. Currently 7 fields:

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
2. Push `feature/phase-3-premium-upgrade` and open a PR — do this **before** any
   history rewrite, or the work is stranded.
3. Walk `docs/QA-CHECKLIST.md` in a real browser before merging to `main`.
4. Send the owner the verification list above. Everything else waits on it.
