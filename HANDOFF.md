# HANDOFF

Current repository state. Not a history — see `CHANGELOG.md` for that.

**Last updated:** 2026-09-23

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

Location/design follow-up on 2026-09-21: the owner supplied Street 1003 and
`https://waze.com/ul/hsvbgrg6s4`. Its resolved destination is
`32.9336,35.148804`; only street and coordinates were changed to owner-supplied.
Google Maps, the original Waze link and the opt-in map panel now render in all
three locales. The location section is a unified directions/map layout; the
narrow fact strip at the bottom of the hero was removed as requested.
Three destination/embed tests brought the browser suite to 25.
The real Google iframe was also loaded in Chromium and its rendered map/marker
visually checked. This confirms rendering, not an on-site arrival check.

The gallery now shows three real treatment-work photographs, individually
opened and matched to posts on the clinic's Instagram. The owner explicitly
requested these after the prior exclusion was explained; the scoped direction
and source URLs are recorded in [ADR 0009](docs/decisions/0009-owner-directed-instagram-gallery.md).
Each original is shown uncropped, with localized descriptive text, a full-size
viewer. Per-photo links were removed at the owner’s request; one profile-button
row sits above the gallery. Instagram is configured; Facebook stays hidden
until the owner supplies its URL. Original post URLs remain in the manifest
for internal provenance. These replace the AI illustrations in the
visible gallery; the original illustration assets remain available as fallback.
Patient consent and legal clearance have not been independently verified.

The original vector tooth mark sits at the top-left of the desktop hero and centered on mobile in
all locales, with layered 3D depth and hero-scoped mouse tracking. Touch,
reduced-motion and no-JS visitors receive the static mark. The empty portrait
panel remains removed from the homepage and About pages; no actual doctor
portrait has been supplied. Other supplied treatment images remain outside
the published manifest in `.private-assets/reviewed-2026-09-21-upload/`.
The original aligner illustration was restored after preserving the patient
image that had replaced it locally.

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
`e822ce7` but **remain in public Git history**. They were not referenced by the site at that time. The later owner-directed
gallery publishes only the three reviewed originals listed in ADR 0009; it
does not resolve the historical exposure of the remaining files.

Nothing irreversible has been done about this. The recommendation, the risks of
each option, and the order to do them in are in
[docs/GIT-HISTORY-REMEDIATION.md](docs/GIT-HISTORY-REMEDIATION.md). It needs the
owner's decision, and probably a lawyer's.

### Branch `feat/admin-cms` — admin CMS Phase 1 COMPLETE, unmerged

Five commits on `feat/admin-cms`, not pushed and not merged. Phase 1 is the
**data foundation only**: no admin Worker, no admin UI, no Cloudflare or DNS
change, nothing the owner can log into yet.

| | Commit | What it does |
|---|---|---|
| 1 | `78f81be` | media types extracted to `src/data/media-types.ts`, so a future admin Worker can import types without importing the manifest that holds `treatmentWork` |
| 2 | `af13d20` | asset guard reads both manifests; staged and full modes over one validation core |
| 3 | `58d0a53` | opening hours move to `src/data/hours.json`; `VERIFICATION.hours.published` becomes derived |
| 4 | `2e9ee2a` | clinic photography becomes `src/data/clinic-photography.json` with a required `status` |
| 5 | `10165ef` | QA fixtures own their JSON; `docs/ASSETS.md` and `AGENTS.md` updated |

**The site did not change.** All 128 built files are byte-identical to a
baseline captured before the first commit — 0 of 47 HTML pages differ, same
SHA-256 tree digest. This was a data-model migration and nothing else.

Two mutable JSON files now exist, and nothing but a developer can write them
yet: `src/data/hours.json` (seven rows, still empty, block still hidden) and
`src/data/clinic-photography.json` (`[]`).

New gate: `npm run lint:data`, now part of `npm run verify`. It validates both
JSON files using `src/lib/data-schema.ts` — the same functions the build calls,
deliberately not a second copy, so CI and the build cannot start disagreeing
about what is valid.

`npm run lint:assets` is now staged-scope and `npm run lint:assets:full` is
full-scope; `verify` and CI use the latter.

Phase 1 stopped where the plan says it stops. **Do not** assume the owner can
edit anything yet.

### Branch `feat/admin-cms` — admin CMS Phase 2 COMPLETE, unmerged

The security shell for `admin.drkhalilkanani.com`. **It proves who you are and
then does nothing.** No admin UI, no data mutation, no GitHub access, and
nothing deployed or configured in Cloudflare.

| | Commit | What it does |
|---|---|---|
| 1 | `14ea94f` | drop a tsconfig include pointing at a file that never existed |
| 2 | `9516f0d` | transport layer — `Env`, error contract, security headers, `jose` |
| 3 | `ee6fd2c` | independent Cloudflare Access JWT verification |
| 4 | `76d40dd` | routing and `GET /api/session` |

`workers/admin/` is isolated from `workers/appointment-email/` — separate
config, secrets and domain, nothing shared.

**Not deployed and not configured.** No Access application exists, no custom
domain is bound, no secret is set. `ALLOWED_EMAILS` is unset, which means the
Worker **refuses everyone**, including a valid signed token. That is the
intended resting state until an identity list is deliberately configured.
`GITHUB_TOKEN` appears nowhere — not in the type, the config, or the account.

**The public site did not change.** All 128 built files remain byte-identical
to the Phase 1 baseline. `jose` is the Worker's only runtime dependency and no
site module imports it.

66 new tests, all offline: real RSA keys, real RS256 signatures, `fetch`
stubbed to serve a local JWKS. Mutation-tested — removing any single security
control fails at least one test.

**Before deploying:** the Access application must exist and be verified, and a
non-allow-listed identity refused, *before* a custom domain makes the Worker
reachable. See `docs/specs/2026-09-22-admin-cms-phase-2.md` §M.

### Phases 4-8 — the CMS itself, complete locally

| Phase | Commit | What |
|---|---|---|
| 4 | `cefd392` | opening-hours API |
| 5 | `dccf65d` | clinic photography API |
| 6 | `0d0041e` | publication status by commit SHA |
| 7 | `11358c8` | the panel — server-rendered Hebrew/RTL |
| 8 | `561d1e5` | browser tests against the real Worker |

The admin CMS is **feature complete locally**. The doctor can edit opening
hours and add, publish, unpublish and permanently delete clinic photographs,
and see where each change got to.

**Nothing is deployed or configured.** `ALLOWED_EMAILS`, `GITHUB_TOKEN`,
`CONTENT_BRANCH` and the Access application are all unset, and every one of
them being unset means the Worker refuses. No commit has ever been made to a
real repository.

Verification is by mocked GitHub only — local tests prove the exact request
that *would* be sent without sending it.
**BLOCKED — REQUIRES APPROVED INTEGRATION TEST CONFIGURATION.**

### Phase 3 — GitHub client + path allow-list (`3ab0773`)

`workers/admin/src/github.ts`: the only code that can change the website.
A caller names a target (`hours` / `photography` / `image`), never a path;
owner, repo and branch are Worker values. 38 tests against a stubbed fetch,
mutation-tested.

**No endpoint uses it and nothing is configured.** `GITHUB_TOKEN` and
`CONTENT_BRANCH` are unset, and `CONTENT_BRANCH` has no default — so the
client refuses every call. BLOCKED — REQUIRES PRODUCTION CONFIGURATION.

Three real bugs were found by its own tests during implementation, the most
serious being that reads would have come from `main` while writes went to the
content branch (a percent-encoded `?ref=`).

## What exists

- Astro 7.3 + Tailwind 4.3, fully static, no adapter, no server
- Three locales (he / ar / en), full RTL, 41 built pages
- 6 treatments × 3 locales, authored to the medical-claims discipline
- Appointment requests hand off to WhatsApp (ADR 0007) — nothing is stored
- Picture gallery, editorial grid + `<dialog>` lightbox, data-driven from
  `src/data/media.ts`; three owner-selected Instagram treatment posts and source links
- Original tooth logo with layered 3D depth and optional mouse tracking
- Google review aggregate + link-out, renders nothing until figures are supplied
- Click-to-load map facade (ADR 0008), renders nothing without a confirmed pin
- Accessibility statement and privacy policy (drafts, need legal review)

The site uses the light palette, including native controls when the OS prefers
dark mode. An early `color-scheme: only light` meta declaration explicitly opts
out of browser auto-darkening before CSS loads, backed by the same CSS policy.
An app-level forced recoloring mode can still override site rendering; the
owner’s iPhone screenshots show inverted photographs and require checking the
app’s Auto Dark mode, not just emulating the OS preference. The homepage closing contact banner, repeated hero phone
line, map phone blocks and footer contact/hours columns were removed. The
contact page retains full details; desktop header and mobile action bar retain
quick contact. The browser suite now contains 34 tests.

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
| Chromium + axe browser QA (31 tests) | `npm run test:e2e` | preview + deploy |

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
| Instagram gallery follow-up | Three matched originals load; uncropped tiles and profile buttons checked in he/ar/en at 375/768/1440px; mobile lightboxes visually inspected; gallery axe and navigation pass |
| Picture/logo follow-up | Hero screenshots inspected in all locales at 375/768/1440px; loaded gallery and lightbox checked; desktop pointer tracking/reset, reduced-motion and emulated coarse-pointer fallback pass |

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
language review, on-site arrival at the supplied pin and live rating confirmation remain unperformed.
Screenshot review is not a screen-reader or real-device pass. No approved
visual regression baseline exists. See [docs/QA-CHECKLIST.md](docs/QA-CHECKLIST.md)
for the remaining human checks.

## Outstanding owner verification

Five facts remain unverified. The bare production build blocks the three
published fields; CI already explicitly acknowledges those three. The two
hidden/overridden fields warn. The street and map pin were supplied by the
owner on 2026-09-21 and are now marked `owner`.

| Field | Needs |
|---|---|
| `hours` | Opening hours, Sun–Thu / Fri / Sat — now edited in `src/data/hours.json` |
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
  These are still distinct from the three treatment posts selected under ADR 0009.

## Known gaps (not blockers)

- 4 Tier-2 treatments unwritten: crowns, fillings, extractions, cleaning.
- The logo wordmark is Hebrew-only; no Arabic or English lockup exists. The UI
  works around this with the mark plus localised HTML text.
- Actual clinic and doctor photography is still pending. The hero uses the
  original mark and the picture gallery uses the three selected Instagram posts.

## Recommended next action

1. Read `docs/GIT-HISTORY-REMEDIATION.md` and decide. This is time-sensitive in
   a way the rest is not.
2. Use the latest `Deploy to Production` run for deployment status. The obsolete
   Cloudflare Git connection has been disconnected with owner approval.
3. Complete the remaining human checks in `docs/QA-CHECKLIST.md`.
4. Send the owner the verification list above. Everything else waits on it.
