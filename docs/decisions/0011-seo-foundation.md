# ADR 0011 — SEO foundation: one canonical home, developer-owned SEO, crawl as a gate

**Status:** Implemented · 2026-09-27.

## Context

An audit of the live site found it technically sound in structure (HTTPS,
hreflang, headings, lang/dir, 404s) but broken in three places that matter
most to search engines: no robots.txt, every JSON-LD URL on the placeholder
`example.invalid` (the graph read `clinic.siteUrl` while canonicals read
`ASTRO_SITE`), and `/` listed in the sitemap while declaring `/he/` canonical.
Google had indexed one URL — the apex `http://` home. Every page now changes
through Edit Mode, so any SEO rule has to survive content edits.

## Decisions

1. **One Hebrew home page.** `/he/` is canonical. `/` stays (GitHub Pages
   cannot 301 it) but canonicalises to `/he/`, is omitted from the sitemap,
   and x-default points at `/he/`. The entity (`WebSite.url`, `Dentist.url`)
   is the domain root, identical on every page.
2. **One origin, passed explicitly.** The layout derives `origin` once and
   hands it to canonical, hreflang, Open Graph and `buildGraph({ origin })`.
   `clinic.siteUrl` is the real domain (verified: DNS, Pages, TLS).
3. **SEO is developer-owned; content is owner-owned.** Titles follow patterns
   in `src/lib/seo.ts` (the town from contact-facts.json, once). The CMS
   edits text within strict schemas: it cannot remove a title, change a
   published slug, add noindex, touch canonicals or inject schema/HTML.
   JSON-LD is serialised with `<` escaped so CMS text cannot close its
   `<script>`.
4. **The crawl is a deploy gate.** `scripts/audit-seo.mjs` runs on every PR
   and every deploy against the built site. A content edit that would
   de-index a page fails the build instead of shipping.
5. **IndexNow, changed pages only,** after the live site serves the commit.
   Not a gate. The key is public by design.
6. **Nothing unverified in markup.** No hours until the owner supplies them;
   no ratings, reviews, prices or FAQPage; no Facebook `sameAs` until the
   owner confirms the URL; no town the clinic has not claimed.
7. **All crawlers allowed on the public site**, including OAI-SearchBot.
   Training crawlers (GPTBot, Google-Extended) are an owner decision recorded
   in the runbook; blocking them would not affect search.

## Not done here

Search Console, Bing Webmaster Tools and Google Business Profile need the
owner's accounts. Analytics (to count ChatGPT referrals) needs an owner
decision and a privacy-policy update.
