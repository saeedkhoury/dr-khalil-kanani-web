# SEO runbook — how search visibility is kept and measured

Search is measured, not declared finished. This is what runs automatically,
what to check by hand, and how often. Baseline: docs/SEO-BASELINE.md.
Query ↔ page map: docs/SEO-SEARCH-MAP.md.

## What runs on every deploy (automatic)

Every push to `main` — including every Edit Mode save — runs, in order:

1. **`npm run lint:seo`** (scripts/audit-seo.mjs) crawls the built site the
   way Googlebot does and **blocks the deploy** on: missing/invalid robots.txt
   or sitemap; a sitemap URL that is not 200, canonical and indexable; an
   indexable page missing from the sitemap; wrong or duplicate canonical;
   noindex on a public page; a broken or non-reciprocal hreflang cluster;
   missing x-default; wrong `lang`/`dir`; missing/duplicate title or
   description; not exactly one H1 or a skipped heading level; JSON-LD that
   does not parse, names another origin, or carries review/rating markup;
   missing Open Graph image; an image without alt; a link to the admin or
   placeholder hosts; orphan pages; a missing page not answering 404.
2. **IndexNow** (scripts/indexnow.mjs): before the deploy it compares each
   page of the new build with what the live site serves; after the deploy,
   once the live `build.txt` names the new commit, it submits only the
   changed URLs to `api.indexnow.org` (shared with Bing, Yandex, Seznam,
   Naver…). Never blocks a deploy. The key is `public/<key>.txt` — public by
   design; ownership is proven by serving it.

Run the same crawl against the live site at any time:

```bash
node scripts/audit-seo.mjs https://www.drkhalilkanani.com
```

## Canonical strategy (do not change casually)

- One host: `https://www.drkhalilkanani.com`. Apex and `http://` 301 here
  (GitHub Pages).
- **One Hebrew home page: `/he/`.** `/` renders the same Hebrew page (GitHub
  Pages cannot redirect) with `rel=canonical` → `/he/`, and is left out of the
  sitemap. x-default → `/he/`.
- Every language page is self-canonical and lists all three languages plus
  x-default. Never canonicalise one language to another — it de-indexes it.
- Trailing slash always.

## Robots and AI crawlers

`/robots.txt` (src/pages/robots.txt.ts): everything public is allowed, the
sitemap is named. The admin is a separate host behind Cloudflare Access —
crawlers get a login redirect there, and robots.txt deliberately does not
mention it.

| Crawler | Purpose (official docs) | Policy |
|---|---|---|
| Googlebot, Bingbot | Search | Allowed |
| OAI-SearchBot | Shows sites in ChatGPT search answers | **Allowed** — blocking it removes the site from ChatGPT search answers |
| GPTBot | Collects training data for OpenAI models; separate from search | Allowed today. **Owner decision** — add `User-agent: GPTBot` / `Disallow: /` if the clinic does not want its copy used for training. Does not affect ChatGPT search. |
| ChatGPT-User, Claude-User, Perplexity-User | Fetches a page on a user's request | robots.txt may not apply; nothing to do |
| Google-Extended | Gemini training/grounding control (not a crawler) | Allowed today; same owner decision as GPTBot |

The public site is served by GitHub Pages with DNS-only Cloudflare records,
so no WAF/bot-fight setting can challenge a crawler. **If the `www` record is
ever switched to "proxied"**, re-test with the user agents in the baseline
before assuming AI crawlers still get through.

## Monthly check (15 minutes)

1. **Search Console → Pages**: indexed count should approach 45. Read every
   "Why pages aren't indexed" reason. "Alternate page with proper canonical
   tag" for `/` is expected and correct.
2. **Search Console → Performance**: clicks, impressions, top queries per
   country (Israel) and per page. Compare with the query families in
   SEO-SEARCH-MAP.md. Note new queries the site shows for but does not answer.
3. **Search Console → Core Web Vitals** (once there is enough traffic) and
   **Enhancements** (breadcrumbs).
4. **Bing Webmaster Tools → Search Performance / Index**: same questions.
   **IndexNow insights** shows the submissions from deploys.
5. **Google Business Profile → Performance**: calls, direction requests,
   website clicks, the searches that found the profile.
6. Spot-check three queries per language from the map, logged-out, and add a
   dated line to SEO-BASELINE.md: query · engine · date · indexed? · observed
   position (only if unambiguous) · target page. **Never** record a position
   as a promise, and never "optimise" the check by searching repeatedly from
   the same account.

## When something changes

| Event | Do |
|---|---|
| New treatment published in Edit Mode | Nothing: sitemap, hreflang, schema, IndexNow and the crawl are automatic. Check it appears in GSC within ~2 weeks. |
| Treatment unpublished | IndexNow notifies; the URL 404s. If it had traffic, consider asking the developer for a redirect page instead. |
| Hours, phone or address change | Change it in Edit Mode **and on the Google Business Profile the same day**. The site and GBP must never disagree. |
| Domain / hosting change | Stop. Re-read "Canonical strategy". Use GSC Change of Address. |
| New language or new page type | Developer: extend src/lib/seo.ts titles and run `npm run lint:seo`. |

## AI search visibility

There is no special "AI SEO" work: AI answer engines use the same signals —
crawlable HTML, clear facts, consistent entity data, reputable citations.
To check: ask ChatGPT (search on), Copilot, Perplexity and Gemini the query
families in the map, in all three languages, once a month; note whether the
clinic is cited and which page. Record as observations.

**Referrals from ChatGPT** arrive with `utm_source=chatgpt.com`. The site has
no analytics, so these are not counted today. If the owner wants them
measured, the least invasive option is Cloudflare Web Analytics (cookieless,
no personal data) — that is an owner decision and needs the privacy policy
updated first (docs/PRIVACY.md).

## What must never be done

Fake reviews or ratings (in schema or copy), invented credentials or facts,
keyword-stuffed copy or alt text, pages for towns the clinic does not claim,
hidden text, bought links, repeated indexing requests, or a noindex/robots
change "to test something" on production.
