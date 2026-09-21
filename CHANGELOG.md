# Changelog

## [Unreleased]

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
