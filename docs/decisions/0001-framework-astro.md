# ADR 0001 — Astro as the framework

**Status:** Accepted · 2026-09-20

## Context

A content site for a solo dental clinic: ~15 routes × 3 locales, low update
frequency, one developer. The two hardest constraints are mobile performance
and WCAG 2.1 AA conformance (a legal requirement in Israel), plus keeping
three languages from drifting apart.

## Decision

**Astro 7.3**, static by default, with one server route.

## Why

- Ships **zero JS by default**. The honest island count here is one (the form),
  because `<details>` covers accordions and menus and a native `<form>` covers
  submission. Less JS directly serves both performance and accessibility.
- **Content Collections + Zod** make trilingual content a build-time contract:
  a missing Arabic field fails the build rather than 404ing silently.
- Built-in **Fonts API** (self-hosting + subsetting) and **CSP API**.
- Cloudflare acquired Astro in Jan 2026, so Workers support is first-class.

## Alternatives

| Option | Rejected because |
|---|---|
| Nuxt 4 | Respectable; `@nuxtjs/i18n` + Nuxt SEO are more batteries-included. Loses on default JS payload and content-integrity guarantees. |
| Next.js | The "hireable" choice, heaviest for a brochure site. |
| WordPress | What both reference clinics use — and both are object lessons: 110 requests, plugin rot, security surface. |

## Trade-off accepted

Smaller talent pool than Next or WordPress if the project is handed off.
