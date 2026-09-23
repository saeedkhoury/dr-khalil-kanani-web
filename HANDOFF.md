# HANDOFF

Current repository state. Not a history — see `CHANGELOG.md` for that.

**Last updated:** 2026-09-24

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

### Branch `feat/admin-cms` — local audit complete, unmerged

**LOCAL CODE AUDIT: PASS for local code and reproducible builds.**
The seven supplied CMS findings are resolved and
re-proved. Two additional findings were separately recorded and fixed:
publication status accepted unrelated workflow success, and hours could
silently overwrite a newer revision. Full recovery evidence, commit list,
before/fix/test/after results and the reconstructed 61-row requirement matrix
are in [the remediation audit](docs/audits/2026-09-24-admin-cms-remediation.md).
Post-audit image hardening in `2e1087e` also rejects incomplete PNG/JPEG
structure before committing an upload. The Worker validates framing and PNG
CRCs; it does not decode compressed pixels. GitHub token documentation now
requires `Contents: Read and write` plus `Actions: Read` for authenticated
deployment status, still pending real-token verification.

Commit `3943e50` vendors the exact four Noto WOFF2 payloads from the accepted
public baseline and uses Astro's local font provider. [Font provenance and
licenses](docs/FONTS.md) records the upstream CDN responses, byte hashes,
and bundled SIL OFL 1.1 licenses. A cache-cleared production build passed
with outbound network denied except localhost, which Astro needs internally.

The original 61-row matrix was not supplied; the current reconstructed matrix
has **54 PASS / 0 FAIL / 7 BLOCKED**. R54 now passes because two independent
clean installs produced identical 128-file output trees. The CMS
image-validation defect is corrected. The matrix does not
claim original row identities.
The local audit matrix predates production integration; its seven infrastructure
rows must be re-evaluated against live evidence before handoff.

The CMS manages only opening hours and clinic photography. Published clinic
photographs now render on the existing About page in all three locales;
unpublished photos and empty collections produce no section. Treatment work
remains developer-managed on the homepage. English is still seeded from Arabic
with `needsEnglishReview: true` until a developer supplies reviewed English.

CMS text uses the same claims rules in the Worker and CLI. Upload allocation
checks repository files as well as the manifest, so orphan files are skipped.
Hours saves require the form's loaded blob SHA and never retry a conflict.
Publication is tied to the exact SHA and production deployment workflow.

At the end of the local audit, nothing had been pushed, merged, deployed or
configured. Test GitHub requests used mocks only; `.agents/` remains untracked.

### Production integration in progress — 2026-09-24

The reviewed `feat/admin-cms` branch was pushed at frozen HEAD `85b525b`.
`codex/admin-cms-integration` is a separate branch and is the only CMS write
target. Its Worker config sets the exact Access team domain and AUD, the admin
origin, `CONTENT_BRANCH=codex/admin-cms-integration`, `workers_dev=false`,
`preview_urls=false`, and the `admin.drkhalilkanani.com` custom domain.

Cloudflare Zero Trust already has One-time PIN. A self-hosted Access application
for the admin hostname was created with OTP as its sole login method and **no
Allow policy**, so it denies all identities. The admin Worker is deployed and
bound to that hostname; an anonymous `/api/session` request redirects to the
Access login. Its `workers.dev` hostname returns 404. The zone has an active
rate limiting rule scoped to this hostname's `/api/` paths: over 60 requests
per IP in 10 seconds are blocked for 10 seconds.

`ALLOWED_EMAILS` and `GITHUB_TOKEN` are installed as Worker secrets after the
owner configured the two-email Access policy and created a fine-grained token.
The token authenticated as the repository owner and passed repository/Actions
reads; a deliberately incomplete Contents write reached GitHub validation
without changing a file. The temporary local token copy was removed. The
anonymous admin route still redirects to Access, and direct `workers.dev`
returns 404. A real OTP sign-in and authenticated CMS write/read tests remain
pending. No CMS write to `main`, merge, or website production deployment has
occurred.

Verification from a clean detached worktree with a fresh lockfile install:

- `npm run verify`: all gates pass; Astro reports zero diagnostics.
- Unit suite: **422 passed**, including **260 admin Worker** and **37 appointment
  Worker** tests, also run separately.
- Playwright: **52 passed**; tested axe states have zero violations.
- Production build with the existing exact three-field acknowledgement passes;
  built-HTML accessibility audit passes **47 pages**.
- Independent clean builds A and B: **128 files each, zero differences**, same
  SHA-256 tree digest (`5a2ebe4065e878b6e8f3953fab969bc2f23d8ded60598bca8cf7ef620c395ab6`).
  Against the unchanged accepted baseline, the local-provider migration has
  four generated font paths added, four removed, and 47 HTML font-markup
  changes. The four font payloads are byte-identical to the baseline; stripping
  only font markup leaves all 47 HTML files identical. The earlier
  all-unpublished fixture was byte-identical before this migration.
- Homepage and About screenshots at 375px and 1440px in he/ar/en are
  pixel-identical to the accepted baseline; the Noto faces load and directions
  remain correct.
- Six populated clinic-gallery screenshots were opened: he/ar/en at 375/1440.
- Access guard mutations fail their tests; current-tree credential-pattern
  scan found no matches. Existing public media history is unchanged.

The empty current photography manifest and placeholder hours remain unchanged.
No clinic fact has been promoted to verified. Real-device/native-language/legal
checks below remain outstanding.

### Known: the public stylesheet includes unused documentation utilities

Four utilities from docs/.claude prose predate the CMS. They were deliberately
left unchanged under the owner's scope restriction. Worker and test sources
remain excluded from public Tailwind scanning.

## What exists

- Astro 7.3 + Tailwind 4.3, fully static, no adapter, no server
- Three locales (he / ar / en), full RTL, 47 built pages
- 6 treatments × 3 locales, authored to the medical-claims discipline
- Appointment requests use the separate email-relay Worker; quick phone and WhatsApp contact remain available
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
| Unit tests (422) | `npm test` | CI |
| Type/template check | `npm run check` | verify + CI |
| Chromium + axe browser QA (52 tests) | `npm run test:e2e` | preview + deploy |

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
