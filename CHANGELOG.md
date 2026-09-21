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
