# ADR 0002 — i18n URL strategy

**Status:** Accepted · 2026-09-20

## Decision

- Subdirectories for **all** locales: `/he/`, `/ar/`, `/en/`. `/` 301s to `/he/`.
- hreflang uses **language-only** codes plus `x-default` → Hebrew.
- Slugs are **identical English strings** in every locale.
- Canonicals are always self-referencing.
- **No** IP or Accept-Language auto-redirect.

## Why

**Symmetric subdirectories** remove the root-vs-`/he/` duplicate and keep one
code path. Google marks query params "not recommended"; subdomains and ccTLDs
solve a geotargeting problem this single-country site does not have.

**Language-only codes** because one country means the region subtag
disambiguates nothing — and `en-IL` would wrongly exclude olim and family
searching from abroad.

**Shared English slugs** because Hebrew/Arabic-script slugs percent-encode into
~90 characters of mojibake when shared in WhatsApp, the dominant sharing
channel in Israel. The ranking value of keywords in a slug is a rounding error
next to title, h1 and body copy. It also makes the language switcher a pure
`/{locale}/{samePath}` map — which is what satisfies "changing language must
preserve the user's location".

**No auto-redirect** because Google explicitly warns against it, Googlebot
sends no `Accept-Language` header and crawls mostly from the US. Detection
would hide two of the three languages from indexing entirely. A dismissible
in-page banner gives the UX benefit with none of the crawl damage.

## Consequence

A cross-language canonical would deindex the Arabic site. This is the single
most destructive error available here and is called out in AGENTS.md.
