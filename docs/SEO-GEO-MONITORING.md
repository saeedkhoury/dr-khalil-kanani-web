# SEO + GEO monitoring

How to tell whether the work is working. Measure on the schedule below, add a
dated row, never overwrite an old one. A manual search is an **observation**,
never a ranking: it depends on who searches, where, on what device, and when.

## Baseline (2026-10-01)

| Metric | Source | Baseline | Date of data |
|---|---|---|---|
| Clicks / impressions (3 months) | Search Console → Performance | 5 / 38 | to 2026-09-28 |
| CTR / average position | same | 13.2 % / 2.2 | to 2026-09-28 |
| Queries visible | same → Queries | 0 (below anonymisation threshold) | to 2026-09-28 |
| Landing pages with impressions | same → Pages | `/` (36), `http://` apex (2) | to 2026-09-28 |
| Device split (impressions) | same → Devices | mobile 24 · desktop 14 | to 2026-09-28 |
| Indexed pages | URL Inspection (Page-indexing report still "processing") | 1 confirmed (`/he/`); `/ar/`, `/en/`, `/he/treatments/dental-implants/` "crawled – not indexed" | 2026-10-01 |
| Sitemap | Search Console → Sitemaps | Success, 45 discovered, read 2026-09-30 | 2026-10-01 |
| Business Profile rating / reviews | Google Maps | 5.0 / 2 (see the review-policy note) | 2026-10-01 |
| Local pack, "רופא שיניים ג'דיידה מכר" | observed (manager's browser) | in the 3-pack | 2026-10-01 |
| Citations live with identical facts | `docs/LOCAL-CITATIONS.md` | 2 (Business Profile, Instagram) | 2026-10-01 |
| Lighthouse mobile (perf, home HE/AR/EN) | local Lighthouse | 96 / 99 / 98; LCP 2.4 / 1.8 / 1.3 s | 2026-10-01 |
| Live crawl gate | `node scripts/audit-seo.mjs https://www.drkhalilkanani.com` | 46 pages, 0 errors, 1 warning | 2026-10-01 |
| IndexNow | deploy log, job `indexnow` | last submission HTTP 200 | 2026-09-30 |
| Bing | Bing Webmaster Tools | not set up | — |
| Google result favicon | `node scripts/check-google-favicon.mjs` | www: s2 current, faviconV2 still the old "A"; bare host: both still the "A" | 2026-10-01 |

## What to track and how to read it

| Question | Where | Segment it by |
|---|---|---|
| Are pages being indexed? | Search Console → Pages (and URL Inspection for samples) | language folder `/he/`, `/ar/`, `/en/`; treatment pages |
| Are we found for the brand? | Performance → Queries, filter *contains* "כנעאני" / "كنعاني" / "kanani" | language |
| Are we found for "dentist + town"? | Performance → Queries, filter "שיניים", "اسنان", "dentist" | branded vs non-branded |
| Which treatments are found? | Performance → Pages, filter `/treatments/` | each slug × language |
| Does the Business Profile show? | Business Profile → Performance (searches, views, calls, directions, website clicks) | queries it reports |
| Do searchers act? | Business Profile calls / directions / website clicks; Search Console clicks | month |
| Is the site still healthy? | the live crawl gate after every release | errors = 0 |
| Do AI assistants describe the clinic correctly? | a fixed prompt set, monthly (below) | correct / merged with Wasim / absent |

Branded = query contains the doctor's name in any script. Everything else is
non-branded. Hebrew / Arabic / English = the script of the query (Search
Console's country filter cannot separate them; filter by characters).

## Fixed AI check (monthly, logged as observations)

Ask the same questions in a logged-out browser and record the answer and its
sources: "רופא שיניים בג'דיידה מכר", "دكتور اسنان في الجديدة المكر",
"dentist in Jadeidi-Makr", "מי זה ד״ר חליל כנעאני?" in Google (AI Overview if
shown), ChatGPT search and Bing Copilot. Record: clinic mentioned (yes/no),
facts correct (phone, address, hours), merged with another dentist (yes/no),
sources cited.

## Cadence

| When | What |
|---|---|
| Every release | live crawl gate; IndexNow line in the deploy log |
| Weekly until it passes | `node scripts/check-google-favicon.mjs` — exit 0 once Google shows the tooth for both hostnames; until then change nothing on the site |
| Monthly | Search Console Performance (3-month window) and Pages; Business Profile performance; the AI check; one observation per P1 query |
| Quarterly | Lighthouse mobile on the three homes + two treatment pages; citations audit (every listing still identical) |

## Measurement limits

- The public site loads **no analytics or third-party scripts**; its privacy
  policy promises no cookie-based analytics and no advertising pixels. Search
  Console and the Business Profile are the measurement; that is enough at
  this size. Adding analytics needs a privacy/consent decision first.
- Search Console shows no queries until volume passes its privacy threshold.
- Average position mixes the brand (position ~1) with everything else; read
  non-branded separately.
