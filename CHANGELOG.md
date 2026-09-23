# Changelog

## 2026-09-24

### Admin CMS local audit remediation (unmerged)

- Completed shared claims validation and connected published clinic photography
  to the existing About page, preserving empty-state public output exactly.
- Kept the recovered Access configuration guard, filename length cap and early
  CI data gates; added orphan-aware allocation and exact deployment tracking.
- Corrected stale hours saves to return a conflict without overwriting newer
  revisions. No production configuration, credential use or remote action.
- Clean verification: 418 unit tests, 52 browser tests, 47-page HTML audit;
  all 128 production files byte-identical to the preserved baseline.


## 2026-09-21

### Early light-only opt-out

- Changed the HTML color-scheme declaration from `light` to `only light` and
  placed it immediately after the charset, before style loading, to explicitly
  opt out of automatic darkening from the start of document parsing.
- Retained the light-only CSS palette; no inversion filters or theme scripts.
- App-level forced recoloring is separate from the site’s system-theme support.

### Mobile presentation and contact cleanup

- Removed individual Instagram links from gallery cards and the lightbox;
  photos still open for viewing. Added a profile-button row above the gallery.
  Instagram is available; Facebook awaits the clinic’s exact URL.
- Fixed the site to light mode and centered the hero tooth logo on mobile.
- Removed repeated homepage contact banner, hero phone line, map phone blocks
  and footer contact/hours columns. Full details remain on the contact page.
- Added three locale checks for dark system preference, centered mobile logo
  and consolidated contact actions, bringing browser coverage to 34 tests.

### Owner-selected Instagram work gallery

- Replaced the visible illustration gallery with three supplied treatment
  photographs matched visually to the clinic's Instagram posts.
- Preserved complete image compositions; added original-post links to the
  cards and full-size viewer, with Hebrew, Arabic and English descriptions.
- Recorded the owner's explicit publishing direction and exact selection in
  ADR 0009. Other media remains outside the published manifest.
- Updated gallery regression checks for image loading, uncropped presentation,
  original-post links and source changes during lightbox navigation.

### Remove empty doctor portrait card

- Removed the empty name/portrait panel from the homepage and About pages.
  The introduction uses one column until an actual reviewed portrait exists.
- Individually reviewed the newly supplied media; all 13 files contain patient
  treatment imagery. Preserved them privately under the existing media rules;
  no new patient images were committed or deployed.

### Visible picture gallery and interactive hero logo

- Added three reviewed original dental illustrations, with explicit AI-art
  disclosure, localized captions and accessible full-size viewing. Real clinic
  photography remains a separate manifest source and takes precedence later.
- Added the exact vector tooth logo to the physical top-left of the hero in
  every locale. Layered depth responds to mouse movement within the hero;
  touch, no-JS and reduced-motion visitors get the static version.
- Optimized gallery/full-size images to WebP and corrected tile alt text.
  Six new browser tests cover actual image loading, lightbox navigation,
  focus return, logo placement, tracking and reduced motion in all locales.
  All 76 unit tests, 31 browser tests and the 41-page HTML audit pass.

### Location and hero follow-up

- Enabled the owner-supplied Street 1003 / Waze destination in all locales,
  including Google Maps links and the click-to-load map. Grouped directions
  and the map into one responsive section with a restrained pin transition.
- Removed the narrow fact strip beneath the hero, as requested.
- Added three browser checks for the shared destination and opt-in map;
  25 browser tests now cover the site. Approved clinic photographs remain
  pending; no patient images or invented clinic photography were introduced.

### Phase 3 — premium production upgrade

Merged to `main` through PR #1 on 2026-09-21. Production deployment is tracked
by the `Deploy to Production` GitHub workflow.

- Production merge deployment succeeded. Diagnosed and disconnected the unused
  Cloudflare Worker Git integration with owner approval; live GitHub Pages and
  DNS are unchanged.
- Fixed a desktop consent click lost when blur validation collapsed an inline
  error. Error space now stays stable and only active errors describe fields;
  three locale regression tests bring the browser suite to 22.

**QA completion (2026-09-21 follow-up)**
- Added 19 Chromium/axe tests covering locales at 375/768/1440px, contact
  validation and WhatsApp popup/fallback behavior, no-JS/reduced-motion
  visibility, and synthetic gallery/rating/map interactions. Both workflows
  enforce the suite before uploading/deploying the site.
- Fixed gallery initialization order, English tablet header overflow and
  duplicate WhatsApp navigation. Escaped gallery JSON, corrected Arabic rating
  numerals and Hebrew h3 tracking, included mobile safe-area clearance, and
  moved reveal hiding after observer/failsafe registration.
- Asset guard checks tracked media in CI and the staged manifest on commit,
  fails closed on Git errors and refuses CI bypass; three regression tests
  bring unit coverage to 76 tests.
- Opened homepage/contact screenshot samples across nine locale/width pairs.
  Physical-device, VoiceOver, native-copy and owner/legal checks remain open.

**Safety — patient images (3.0)**
- 13 patient before/after photographs, swept into `7cd7ea5` by a `git add -A`,
  quarantined to gitignored `.private-assets/` and removed from the tree. They
  were never referenced and never served. **They remain in public Git history** —
  see `docs/GIT-HISTORY-REMEDIATION.md`. No irreversible action taken.
- `scripts/check-assets.mjs` + `.githooks/pre-commit`: an image cannot be
  committed unless it is registered in `src/data/media.ts`, which requires a
  category and alt text in three languages — impossible to write without having
  opened the file. `git add -A` banned in `AGENTS.md` §3.2.

**Deployment safety (3.0)**
- `VERIFY_RELAX` demoted to preview-only. Production now uses `ACK_UNVERIFIED`,
  an explicit per-field allowlist; any *other* unverified published field fails
  the build. The gate also distinguishes *published* fields (block) from
  *hidden* ones (warn), so a guarded placeholder no longer blocks a deploy.
- `preview.yml`: PRs build, run every gate and upload an artifact. Never deploy.
- `deploy.yml`: production only.

**Design (3.1–3.4)**
- Display type scale, media radius, section rhythm, full-bleed helper
- Hero rebuilt with two deliberate states — photographic, or a **typographic**
  composition with a fact strip. The empty state is a design, not a placeholder.
- `src/lib/images.ts` resolves manifest filenames to real Astro assets.
  `<Image src="string">` silently fails to optimise; this was a latent bug that
  would have surfaced the moment a photo was added.
- Treatment cards: a rule that draws across on hover, a small lift, and a
  chevron that travels *towards the reading direction* in both RTL and LTR
- Clinic gallery: asymmetric editorial grid, native `<dialog>` lightbox with
  RTL-aware arrow keys and swipe. Renders nothing while unregistered.

**Reviews and location (3.5)**
- Google review **aggregate** (rating + count + attribution), shown only from
  owner-supplied figures. Still no quotes, no names, no `AggregateRating`
  markup — Google rules self-controlled review markup ineligible, and Israeli
  law prohibits patient identities (ADR 0005). The star row is a proportional
  fill, so 4.9 never rounds up to five.
- **Click-to-load map facade** (ADR 0008). The iframe is created in script on
  press, so no iframe, `preconnect` or `dns-prefetch` for Google exists in the
  served HTML. Zero third-party contact on load is preserved and now tested.

**Motion (3.6)**
- `<dialog>` entry and backdrop via `@starting-style` + `allow-discrete`
- Map iframe fades in on `load`, with a 4s failsafe so it can never stay blank
- Both honour `prefers-reduced-motion`

**Fixed**
- **Dead JS on every page.** The gallery lightbox script was hoisted into the
  bundle whenever the component was on the page — including when the gallery
  rendered nothing, which is every page today. Moved inside the conditional as
  an inline script. The site now ships **no external JS file at all**: ~2.7KB
  inline, down from ~4.1KB.
- **Heading skip, AA-mandatory in Israel.** `/treatments/` emitted `h1 → h3`
  because card titles were hardcoded. Card level is now derived from the
  section level, and `scripts/audit-html.mjs` fails the build if they drift.
- Star-fill width no longer emits `98.00000000000001%`.

**Quality (3.7–3.8)**
- `scripts/audit-html.mjs` — audits **built** HTML for heading order, duplicate
  ids, missing alt, unnamed controls, untitled iframes and `lang`/`dir`
  correctness. Wired into both workflows. 41/41 pages clean.
- Unit tests 65 → **73**: review-aggregate guards, star-fill rounding, a test
  asserting `aggregateRating` never appears in structured data, and structural
  tests that the facade contacts nobody before being pressed.
- New: `docs/QA-CHECKLIST.md` (nothing on it has been ticked),
  `docs/GIT-HISTORY-REMEDIATION.md`, ADR 0008.

### Phase 2

**Fixed — the live site was losing every appointment request.**
`POST /api/appointment-request/` returned 405 in production. GitHub Pages is
static-only; the Cloudflare adapter placed the endpoint in `dist/server`, which
the deploy workflow never uploaded. Requests posted into a void.

- Form now composes a WhatsApp message to the clinic's verified mobile and
  hands off to it — reaching the dentist directly (ADR 0007, supersedes 0003)
- Cloudflare adapter removed; build is flat static `dist/`, so what is built is
  what is served. Workflow upload path corrected.
- Dead server modules deleted; `lib/validation.ts` -> `lib/form-options.ts`
- Nothing is stored by the site now, which removes the Amendment 13 database
  duties entirely

**Added**
- Motion language: one easing, four duration tokens, CSS-only stagger, and a
  **fail-visible** guarantee (content visible by default; hidden only under
  `.js-reveal` with a 2s failsafe) so a script failure can never blank a section
- Hero entrance choreography; scroll reveals extended from 2 to 14 elements
- Header scroll state (hairline + tint, never a shadow)
- `FindTheClinic` — location, hours, Google Maps and Waze, all behind the
  verified-address guard; no embedded map, so the site still contacts zero
  third parties
- `PatientFeedback` — a link-out to the clinic's Google profile. NOT a
  testimonials block: no names, quotes or ratings, because Israeli law
  prohibits publishing patient identities (ADR 0005)
- Hover/focus states on components that had none

### Added
- Astro 7 + Tailwind 4 foundation with Cloudflare adapter
- Trilingual he/ar/en routing with RTL support and location-preserving switcher
- Design system derived from the logo's own vectors, with contrast-verified tokens
- 6 treatments authored in three languages under the medical-claims discipline
- Appointment request form and endpoint with honeypot, timing, rate limit and
  server-side validation
- Accessibility statement and privacy policy drafts
- `Dentist` + `Person` JSON-LD with one shared clinic `@id` across locales
- Four build gates: launch verification, locale parity, claims linter,
  mixed-script linter

### Security fixes (post-review)
- **Cloudflare secrets and bindings were read from `process.env` / `globalThis`.**
  Neither carries them at runtime on Workers, so in production the rate limiter
  would have silently used a per-isolate map (no real limit) and delivery would
  have 503'd every genuine patient enquiry. Both now resolve through
  `src/lib/env.ts` using `cloudflare:workers`.
- **Anti-spam signals silently faked success.** A filled honeypot or a fast
  submit returned `{ok:true}` while discarding the request — so a password
  manager autofilling the hidden field, or a returning patient submitting
  quickly, would see "request sent" and never be contacted. Signals now flag
  the record `spam_suspected` and it is still stored.
- Honeypot renamed `company` -> `hp_check` and stripped of its label; the old
  name is a prime password-manager autofill target.
- Rate-limit key is now a hashed IP; the in-memory fallback is bounded and
  logs loudly instead of degrading silently.

### Notable decisions
- No reviews section and no before/after gallery — both prohibited for Israeli
  dentists (ADR 0005, 0006)
- No `FAQPage` structured data — Google retired FAQ rich results 2026-05-07
- No `priceRange` in schema — collides with the Israeli ban on publishing prices
- No CMS — the Supabase table is the lead inbox (ADR 0004)

### Fixed during build
- Glob loader was collapsing all three locale versions of each treatment onto
  one colliding id, silently dropping content
- Form posted to a path without a trailing slash and would have 404'd in
  production under `trailingSlash: 'always'`
- Client bundle pulled in all of Zod (85KB) for one phone regex
- Every locale downloaded all three script fonts (393KB)
- A Cyrillic homoglyph had slipped into an Arabic word
- Astro's scaffolder ships `CLAUDE.md` as a symlink to `AGENTS.md`; writing one
  silently destroyed the other. Symlink removed, both are real files.
- Two macOS filename-collision artifacts (`AGENTS 2.md`, `src/pages/index 2.astro`)
  — the second was emitting a junk `/index 2/` route into the build
