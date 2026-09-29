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

---

## 2026-09-27 (later) — Search Console, Business Profile, observations

### Search Console

| Item | Status (as Google reported it) |
|---|---|
| Property | Domain property `drkhalilkanani.com`, owned by the developer’s Google account |
| Verification | **Verified** by DNS TXT record on the Cloudflare zone — **do not remove it** |
| Sitemap `https://www.drkhalilkanani.com/sitemap-index.xml` | Submitted 2026-09-27 → "Couldn't fetch", 0 discovered (before the SEO release; the file itself answered 200) |
| `/he/` URL inspection | "URL is not on Google — Crawled - currently not indexed"; last crawl 2026-09-24 (Googlebot smartphone); no referring sitemap detected |
| Indexing requests | **1** — `/he/`, 2026-09-27 ("added to a priority crawl queue") |
| Performance / Pages reports | "Processing data" — no data yet |

### Google Business Profile

Profile "ד״ר חליל כנעאני", רח' 1003, ג'דיידה-מכר, 2510500 — status in the
Business Profile Manager: **verified (אומת)**, 1 of 1 locations verified.
Public visibility on 2026-09-27: **not observed** — a Maps search for the
exact name plus address returned other businesses. Google showed no pending,
review or suspension notice in the views available here; the profile's own
edit panel could not be read from this session, so completeness (hours,
photos, category) is unconfirmed.

### Observed search results — observations, not rankings

One browser, signed in, Israel, desktop; `pws=0`. Results vary by location,
language, device, personalisation and time.

| Date | Engine | Query | Lang | Observed | Target URL | Target indexed? |
|---|---|---|---|---|---|---|
| 2026-09-27 | Google | ד"ר חליל כנעאני | he | Site listed first among web results | `/he/` | No (only apex http URL indexed) |
| 2026-09-27 | Google | ד״ר חליל כנעאני ג׳דיידה-מכר | he | An AI overview about a different dentist (Wasim Khalil Kanani, Clalit), then Clalit, then the site | `/he/` | No |
| 2026-09-27 | Google | Dr. Khalil Kanani dentist | en | Hebrew home listed first; English page absent | `/en/` | No |
| 2026-09-27 | Google | רופא שיניים ג׳דיידה מכר | he | Not on page 1; directories and a map pack of dentists 47–54 km away | `/he/` + GBP | No |
| 2026-09-27 | Google Maps | ד״ר חליל כנעאני רח 1003 ג'דיידה-מכר | he | Profile not shown | GBP | — |
| 2026-09-27 | Bing | site:drkhalilkanani.com | — | No pages of the site | all | No |

### After the SEO release (5fc13aa, deployed 2026-09-27)

| Check | Result |
|---|---|
| Live crawl (`node scripts/audit-seo.mjs https://www.drkhalilkanani.com`) | 46 pages crawled, 45 in sitemap, **0 errors** (997 before); 1 warning: `/en/about/` description 183 chars |
| `robots.txt` | 200, `User-agent: * / Allow: /`, names the sitemap |
| Sitemap | 200, valid XML, 45 canonical URLs (15 per language, 24 treatment pages), 135 hreflang links, `/` not listed |
| Crawlers (Googlebot, Bingbot, OAI-SearchBot, GPTBot) | 200 on robots.txt and a treatment page |
| IndexNow | 46 URLs submitted, HTTP **202** (accepted, key validation pending) |
| Search Console sitemap | **Success** — sitemap index read, 46 discovered pages (read before the release; the old sitemap still listed `/`) |
| `/he/` | **"URL is on Google — Page is indexed"**; crawled 2026-09-27 12:38 (Googlebot smartphone); Google-selected canonical = declared canonical `/he/`; discovered via the sitemap |
| `/en/` | "Discovered – currently not indexed" (known from the sitemap, not yet crawled) |
| `/he/treatments/dental-implants/` | "URL is unknown to Google" — no indexing request made |
| Structured data (validator.schema.org, live treatment page) | 0 errors; warnings for `availableLanguage` on `Dentist` (not a Dentist property) — fixed in the follow-up by moving it to a `ContactPoint` |
| Google Rich Results Test | Tool answered "Something went wrong" — not run |

## 2026-09-30 — after the deploys were unblocked

Production deploys failed from 2026-09-27 (69cd894, 47c0baa) on
content-dependent browser tests — a hidden doctor's-work upload broke an
assumption — so PR #7 and a staff upload waited until #8 fixed the tests.
Live since 2026-09-29: **84381a6**.

| Check | Result (as observed) |
|---|---|
| Live crawl | 46 pages, 45 in sitemap, 0 errors |
| JSON-LD | `Dentist.name` = "ד״ר חליל כנעאני" (the profile's name); languages on a `ContactPoint` |
| IndexNow | 45 URLs → HTTP **200** (key validated) |
| Search Console sitemap | Success, last read 2026-09-28, **45** discovered pages |
| Search Console performance (2026-09-26 – 09-27) | **4 clicks, 33 impressions, CTR 12.1 %, average position 2.1**; no queries shown (low volume) |
| Search Console page indexing | "Processing data" |

### Google Business Profile — publicly visible (observed 2026-09-30, Google Maps)

| Field | Profile | Website | Match |
|---|---|---|---|
| Name | ד״ר חליל כנעאני | ד״ר חליל כנעאני (JSON-LD name) | ✓ |
| Category | מרפאת שיניים (dental clinic) | `Dentist` | ✓ |
| Address | רח' 1003, ג'דיידה מכר, 2510500 | רחוב 1003, ג׳דיידה-מכר, 2510500 | ✓ (spelling variant only) |
| Pin | 32.9336519, 35.148451 (plus code W4MX+F9) | 32.9336, 35.148804 (from the owner's Waze link) | ≈ 33 m apart — owner to confirm the door |
| Phone | **052-288-5179** | primary **04-884-8891**; 052-288-5179 as mobile/WhatsApp | ✗ primary differs |
| Hours | Sun closed · Mon, Tue, Thu 12:00–19:00 · Wed closed · Fri, Sat 12:00–19:00 ("hours may vary") | none published (owner has not supplied them) | ✗ |
| Website | drkhalilkanani.com | — | ✓ |
| Reviews | 5.0 (2) | none on-site (ADR 0005) | — |
| Photos | 14 | — | — |

One of the two reviews is by a person connected to the site's development;
Google's policy prohibits reviews with a conflict of interest.

### Observed search results — observations, not rankings

| Date | Engine | Query | Lang | Observed | Target | Indexed? |
|---|---|---|---|---|---|---|
| 2026-09-30 | Google Maps | ד״ר חליל כנעאני ג'דיידה-מכר | he | The clinic's profile is shown | GBP | profile public |
| 2026-09-30 | Google | רופא שיניים ג'דיידה מכר | he | No map pack; directories and health-fund pages; clinic not on page 1 | `/he/` + GBP | `/he/` indexed |
