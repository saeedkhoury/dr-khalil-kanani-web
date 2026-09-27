# SEO baseline — 2026-09-27

The measured starting point, before the SEO foundation release. Re-measure
with docs/SEO-RUNBOOK.md and append a dated section; never edit this one.

Rankings below are **observations**, not results: one query, one moment, one
signed-in browser in Israel, `pws=0`. Location, language, device and
personalisation all move them.

## Technical crawl (live site, `node scripts/audit-seo.mjs`)

| Check | Before | After (build of the SEO release) |
|---|---|---|
| URLs crawled | 46 | 46 |
| In sitemap | 46 (incl. `/`, whose canonical is `/he/`) | 45 (canonical URLs only) |
| robots.txt | **404** | 200, allows all, names the sitemap |
| JSON-LD origin | **every @id and url on `example.invalid`** | `https://www.drkhalilkanani.com` |
| og:image | **missing on every page** | 1200×630, per-locale alt |
| Errors | 997 | 0 |
| Warnings | 5 | 1 (`/en/about/` description 183 chars — CMS text) |

Healthy before and after: HTTPS; apex and `http://` 301 to `https://www.`;
trailing-slash redirect; real 404 status; one H1 and no heading skips on
every page; correct `lang`/`dir`; full, reciprocal hreflang clusters with
x-default; no noindex on public pages; no links to the admin host.

## Indexing

| Engine | Query | Result |
|---|---|---|
| Google | `site:drkhalilkanani.com` | **1 URL**: `http://drkhalilkanani.com` (apex, http — not the canonical) |
| Bing | `site:drkhalilkanani.com` | **0** — no pages of the site |
| Google Search Console | property for the domain | **None** under the developer's Google account |
| Bing Webmaster Tools | account | Not signed in / no site |

## Observed queries (Google, he/en UI, signed-in, `pws=0`)

| Query | Target | Observed |
|---|---|---|
| ד"ר חליל כנעאני | `/he/` | **Position 1** — shown as `https://www.drkhalilkanani.com` with the about-page description |
| Dr. Khalil Kanani dentist | `/en/` | Position 1 is the **Hebrew** home (the English page is not indexed); then the clinic's Facebook page and Instagram |
| רופא שיניים ג׳דיידה מכר | `/he/` | **Not on page 1.** Directories (dunsguide, clalit, d.co.il, doctors.co.il, infomed, easy.co.il, b144) and a map pack of dentists 47–54 km away |
| Google Maps: the doctor's name near the clinic | GBP | **No profile found** — Maps returned a different dentist |

Entity notes seen in results — for the owner, not for the site:

- A **Facebook page** "ד"ר חליל אסעד כנעאני | Judaydah" (Dentist & Dental
  Office, phone 04-8848891) appears to be the clinic's. The site does not
  link it until the owner confirms the exact URL.
- An Instagram post under the clinic's account quotes **other phone numbers**
  (052-6610024, 053-9475255). If they are not the clinic's, correct the post;
  mixed numbers weaken the NAP match that local search relies on.
- A different dentist with a similar name (Wasim Khalil Kanani) practises in
  the same town. Consistent name + address + GBP is what keeps the two apart.

## Performance (Lighthouse 12, local run against the live site)

PageSpeed Insights' anonymous quota was exhausted, so these are lab runs
(simulated slow 4G on mobile). No field (CrUX) data exists yet — the site has
too little traffic.

| Page | Mobile perf / a11y / BP / SEO | Mobile LCP · CLS · TBT | Desktop perf / a11y / BP / SEO |
|---|---|---|---|
| `/he/` | 97 / 100 / 100 / 100 | 2.5 s · 0 · 0 ms | 100 / 100 / 100 / 100 |
| `/he/treatments/dental-implants/` | 100 / 100 / 100 / 100 | 1.1 s · 0 · 0 ms | 100 / 100 / 100 / 100 |
| `/he/about/` | 100 / 100 / 100 / 100 | 1.1 s · 0 · 0 ms | 100 / 100 / 100 / 100 |
| `/he/contact/` | 100 / 100 / 100 / 100 | 1.1 s · 0 · 0 ms | 100 / 100 / 100 / 100 |

Home LCP is header text awaiting its web font. The doctor's-work strip sends
800px images to 288px tiles (~88 KB avoidable, below the fold, lazy).

## AI search

- `OAI-SearchBot` is not blocked: before this release there was no robots.txt
  at all; now `User-agent: * / Allow: /`. The public site is served by GitHub
  Pages with no WAF or bot challenge (DNS-only, not proxied by Cloudflare),
  so no crawler is challenged.
- ChatGPT referrals: **not measurable** — the site has no analytics.
