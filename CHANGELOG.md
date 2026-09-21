# Changelog

## [Unreleased]

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
