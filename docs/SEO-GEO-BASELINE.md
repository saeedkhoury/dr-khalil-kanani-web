# SEO + GEO baseline — 2026-10-01

The measured starting point for the SEO / local SEO / AI-search project.
Earlier measurements: `docs/SEO-BASELINE.md` (2026-09-27 → 09-30). Re-measure
with `docs/SEO-GEO-MONITORING.md` and add a dated section; never edit this one.

**Four states, never mixed up:** IMPLEMENTED (in the code) → CRAWLABLE (a
crawler can fetch it) → INDEXED (Search Console says so) → RANKING / OBSERVED
(seen in one search, at one moment). Everything marked *observed* below comes
from one browser in Israel, signed in **as the Business Profile's manager**,
`pws=0` — the most personalised view possible. It is evidence of what exists,
not a ranking.

## 1. Live crawl (2026-10-01 13:30 UTC)

Method: `node scripts/audit-seo.mjs https://www.drkhalilkanani.com` (the
deploy gate) plus a read-only research crawl of every sitemap URL and every
internal link, as a mobile browser and as eight crawlers.

| Check | Result |
|---|---|
| Pages crawled / in sitemap / indexable | 46 / 45 / 45 (`/` serves the Hebrew home with canonical `/he/`, not in the sitemap) |
| Gate errors / warnings | **0 / 1** — `/en/about/` description 183 chars (CMS text) |
| Status codes | every sitemap URL 200; no internal link to a non-200 |
| Redirects | `http://`, apex and `http://www.` → 301 `https://www.drkhalilkanani.com/`; `/he` → 301 `/he/` |
| 404 | real 404 status (unknown paths, unknown treatment, `/HE/`) |
| Duplicate URL | `/he/index.html` answers 200 (GitHub Pages); canonical points to `/he/` — harmless |
| robots.txt | 200 — `User-agent: * / Allow: /` + sitemap |
| Sitemap | `/sitemap-index.xml` → `/sitemap-0.xml`, 45 URLs, 3 hreflang alternates each, **no `<lastmod>`**; `/sitemap.xml` is 404 (robots.txt names the index, which is enough) |
| Canonical | self-referencing on all 45; Google's chosen canonical = declared (inspected `/`, `/he/`) |
| hreflang | he/ar/en + x-default on every page, reciprocal |
| `lang` / `dir` | correct per locale (he/ar rtl, en ltr) |
| H1 | exactly one per page; no heading-level skips |
| Images | 13 on each home page (12 doctor's-work photos + logo), all with alt; 1 intentionally empty (decorative logo); none on treatment pages; width/height set |
| Structured data | one `@graph` per page: WebSite → Dentist `#clinic` ↔ Person `#dentist`, WebPage, BreadcrumbList; Service per treatment (`mainEntity` on treatment pages) |
| JavaScript needed to read content | **No** — every fact is in the server HTML; the 10 KB of script is the gallery and form |
| Admin leakage | no link to the admin host; admin answers only behind Access |
| llms.txt | 404 (not published — see §8) |
| Hosting / edge | GitHub Pages behind Fastly; **no Cloudflare, no WAF, no bot challenge** on the public host |

### Crawler access (same page, eight user agents)

`Googlebot`, `Bingbot`, `OAI-SearchBot`, `GPTBot`, `ChatGPT-User`,
`PerplexityBot`, `ClaudeBot`, `Applebot` → **200 on robots.txt and on
`/ar/treatments/dental-implants/`, byte-identical HTML** (no cloaking, no block).

### Per-page content (main-content words)

| Page type | HE | AR | EN | Notes |
|---|---|---|---|---|
| Home | 476 | 508 | 643 | H1 "רפואת שיניים ואסתטיקה" / "طب وتجميل الأسنان" / "Dental & aesthetic care" names neither "dentist" nor the town |
| About (doctor) | **71** | **74** | **96** | Thin — the doctor entity page has almost no verifiable facts (owner) |
| Contact | 273 | 288 | 353 | phone, WhatsApp, Maps, Waze, form; **no hours** |
| FAQ | 214 | 229 | 301 | 5 general questions |
| Treatments hub | 199 | 208 | 272 | description lists **6 of the 8** treatments (no fillings, no extraction) |
| Treatment pages (8 × 3) | 197–293 | 208–307 | 253–408 | what / who / steps / expect / FAQ / related; review date |

### Internal links (unique pages linking in, all languages)

Home, about, contact, FAQ, hub: 17–18 (navigation). Treatment pages: implants,
emergency, aligners 12–13; whitening 8–9; veneers, root canal 5–6;
**extraction and fillings 4** — the "related treatments" block shows the first
three by order, so the last two are reached only from the hub.

## 2. Performance (Lighthouse 12.8, mobile, simulated slow 4G, 2026-10-01)

PageSpeed Insights' anonymous quota was exhausted (HTTP 429), so these are
local lab runs against the live site. No field (CrUX) data exists for a site
with this little traffic.

| Page | Perf | A11y | BP | SEO | LCP | CLS | TBT | Transfer |
|---|---|---|---|---|---|---|---|---|
| `/he/` | 96 | 100 | 100 | 100 | 2.4 s | 0 | 20 ms | 330 KB |
| `/ar/` | 99 | 100 | 100 | 100 | 1.8 s | 0.006 | 0 | 462 KB |
| `/en/` | 98 | 100 | 100 | 100 | 1.3 s | 0 | 0 | 333 KB |
| `/he/treatments/dental-implants/` | 99 | 100 | 100 | 100 | 1.1 s | 0 | 0 | 50 KB |
| `/ar/treatments/dental-implants/` | 98 | 100 | 100 | 100 | 1.7 s | 0 | 0 | 181 KB |
| `/en/treatments/dental-implants/` | 98 | 100 | 100 | 100 | 1.2 s | 0 | 0 | 53 KB |
| `/ar/contact/` | 98 | 100 | 100 | 100 | 1.8 s | 0 | 0 | 186 KB |
| `/he/about/` | 99 | 100 | 100 | 100 | 1.1 s | 0 | 0 | 49 KB |

HTML: home pages ≈ 22 KB gzipped (156 KB raw: the tooth logo SVG is inlined
13×, it compresses away); treatment pages ≈ 10 KB. Server response 0.24–0.37 s.
**The one measurable gap:** Arabic pages preload a 162 KB Arabic font, so their
LCP is ~0.6 s slower than Hebrew/English — still inside "good" (≤ 2.5 s).
Asset caching is fixed by GitHub Pages at 10 minutes.

## 3. Google Search Console (read 2026-10-01; data to 2026-09-28)

| Item | Value |
|---|---|
| Property | Domain `drkhalilkanani.com`, verified (DNS TXT — keep it) |
| Performance, last 3 months | **5 clicks · 38 impressions · CTR 13.2 % · average position 2.2** |
| Countries | Israel only |
| Devices | desktop 3 clicks / 14 impressions / pos 1.6 · mobile 2 / 24 / pos 2.5 |
| Pages with impressions | `https://www.drkhalilkanani.com/` 4 / 36 · `http://drkhalilkanani.com/` 1 / 2 |
| Queries | none shown — below Google's anonymisation threshold (all brand traffic) |
| Sitemap | Success · last read 2026-09-30 · 45 discovered |
| Page-indexing report | "Processing data" |

URL Inspection (read only — **no indexing requests made**):

| URL | Google's verdict |
|---|---|
| `/` | Alternate page with proper canonical (canonical `/he/`, Google agrees) |
| `/he/` | **Indexed** |
| `/ar/` | Crawled – currently not indexed |
| `/en/` | Crawled – currently not indexed |
| `/he/treatments/dental-implants/` | Crawled – currently not indexed |

**This is the main bottleneck.** Google can fetch every page and chose to index
only the Hebrew home. For a weeks-old site with almost no external references,
that is normal; the remedy is authority and distinct usefulness (Business
Profile, consistent citations, real links, fuller pages), not repeated
indexing requests.

## 4. Bing / IndexNow

| Item | Value |
|---|---|
| IndexNow key | `public/29afe2e2…d.txt`, served 200, content matches its name |
| Behaviour | submits only pages whose served HTML changed; removed URLs included; waits for the live `build.txt`; sends nothing when nothing changed |
| Last real submissions | 2026-09-30 22:31 and 22:36 UTC (doctor's-work saves): `/he/`, `/ar/`, `/en/` → **HTTP 200**; code-only deploys → "nothing changed, nothing sent" |
| Bing Webmaster Tools | not set up |
| `site:` on Bing | not measured — Bing answered with a CAPTCHA, which is not solved by automation |

## 5. Entity consistency (website ↔ Business Profile ↔ other sources)

Authoritative site source: `src/data/contact-facts.json` (contact page, footer,
schema, maps) + `src/data/hours.json` + `src/data/doctor.ts`.

| Fact | Website | Google Business Profile (public, 2026-10-01) | Other sources | Status |
|---|---|---|---|---|
| Name | ד״ר חליל כנעאני / د. خليل كنعاني / Dr. Khalil Kanani | ד״ר חליל כנעאני | Facebook page: "ד"ר חליל **אסעד** כנעאני" | ✓ site = GBP; Facebook adds a middle name |
| Category | `Dentist` | מרפאת שיניים (dental clinic) | — | ✓ compatible |
| Address | רחוב 1003, ג׳דיידה-מכר 2510500 | רח' 1003, ג'דיידה מכר, 2510500 | — | ✓ |
| Map pin | 32.9336, 35.148804 | 32.9336519, 35.148451 (W4MX+F9) | — | ≈ 33 m apart — owner to confirm the door |
| Phone | primary **04-884-8891**; 052-288-5179 mobile/WhatsApp | **052-288-5179** | 2026-09-27: an Instagram post quotes 052-6610024, 053-9475255 | ✗ primary differs |
| Hours | **none published** | Sun closed · Mon–Tue 12–19 · Wed closed · Thu–Sat 12–19 | — | ✗ missing on site |
| Website | — | drkhalilkanani.com | — | ✓ |
| Social / `sameAs` | Instagram only | — | Facebook page (not linked: unconfirmed) | partial |
| Business Profile link on site | none (`googleBusiness` empty) | Maps CID `475737018590581798` | — | gap |

**Name collision (new, important).** Dr. *Wasim* Khalil Kanani (ואסים חליל
כנעני) is a different dentist with listings in the same town (Clalit, easy,
b144, infomed, doctorita). For the query "חליל כנעאני רופא שיניים" six of ten
results are his; for "د. خليل كنعاني" the top result is his easy.co.il page and
the clinic's site is absent. Google's **AI Overview** for "dentist
Jadeidi-Makr" lists "Kanani And Wasim Chalil" — the two are already being
merged by AI systems.

## 6. Google Business Profile (public view, 2026-10-01)

Verified, owner-managed; name, address, website correct. Rating **5.0 from 2
reviews**, both posted in the last week, by reviewers who share the
developer's family name. Google's policy forbids reviews with a conflict of
interest (owners, staff, family, anyone paid or connected); such reviews risk
removal and profile penalties. Competitor in the same pack: 35 reviews.
Hours "may vary" flags on the holiday. Photos: owner content uploaded 4 days ago.
Not readable from the public view: description, services, attributes,
appointment link — to be checked in the profile manager by the owner.

## 7. The search landscape (observed 2026-10-01)

| Query | Lang | Map pack | Organic page 1 | Clinic |
|---|---|---|---|---|
| רופא שיניים ג'דיידה מכר | he | ד"ר פהד סמרי (0 reviews; business name includes marketing text) · **ד״ר חליל כנעאני (5.0, 2)** · ד"ר בהאא הנו, Julis (5.0, **35**) | Clalit, dunsguide, doctors.co.il, Dapei Zahav, infomed, Maccabi, easy, ids4u, Waze | in pack; site not on page 1 |
| השתלות שיניים ג'דיידה מכר | he | none | all directories (Dapei Zahav has a dedicated "implants in Jadeidi-Makr" page) | absent |
| דكتور اسنان جديده المكر | ar | none | easy (Arabic), competitors' Facebook pages, a Facebook group thread "is there a good dentist from Jadeidi-Makr?", abc-israel, **asnan.co.il (Arab Dentists Union)**, Instagram | absent |
| dentist Jadeidi-Makr | en | sponsored iDENTX ad; Samri; **the clinic**; Khaled Abbas | easy (en), doctors.co.il, Facebook | in pack; AI Overview merges with Wasim |
| חליל כנעאני רופא שיניים | he | knowledge panel = the clinic's profile | site #2; Wasim's listings around it | ✓ panel |
| د. خليل كنعاني | ar | — | Wasim's easy listing, unrelated people | absent (`/ar/` not indexed) |

**Directories own the local results.** easy.co.il feeds Google's AI Overview
with structured fields — services, hours, health-fund arrangements. The clinic
has **no** listing on easy.co.il or doctors.co.il (checked 2026-10-01).

## 8. AI / answer-engine readiness

- Every fact an assistant needs is in plain HTML, crawlable, the same for
  people and bots: who, where, phone, languages, what each treatment is.
  **Missing facts are the gap, not markup:** opening hours, health-fund
  arrangements, the doctor's verifiable background.
- OpenAI's own documentation: OAI-SearchBot surfaces sites in ChatGPT search
  (opting out removes them from answers); GPTBot is model training only and
  is not needed for search; robots changes take ~24 h. Current robots.txt
  allows both.
- **llms.txt**: no major search or AI provider has confirmed using it for
  answers; large 2026 studies found almost no crawler traffic to these files.
  Not published now; revisit if a provider documents support.

## 9. Prioritised findings

| # | Finding | Impact | Who |
|---|---|---|---|
| 1 | Only `/he/` indexed; AR/EN/treatments "crawled – not indexed" | blocks everything non-brand | authority work (below) |
| 2 | Name collision with Dr. Wasim Khalil Kanani; AI already merges them | brand + AI answers | owner name decision + consistent listings |
| 3 | No listing on easy.co.il / doctors.co.il / Dapei Zahav / b144 | local + AI Overview source | owner (claims need the business) |
| 4 | Hours missing on site; phone mismatch with GBP | local trust, "open now" queries | owner facts |
| 5 | Both Google reviews look conflict-of-interest | profile risk | owner |
| 6 | About page thin (71–96 words) | E-E-A-T for a medical site | owner facts + doctor review |
| 7 | Extraction & fillings weakly linked | internal links | developer |
| 8 | Treatments-hub description lists 6 of 8 | accuracy | developer |
| 9 | Arabic vocabulary gap (فينير; دكتور اسنان) | AR relevance | developer, doctor review |
| 10 | GBP URL not on the site / in schema | entity link | developer (fact known) |
| 11 | Arabic font 162 KB | AR LCP +0.6 s, still "good" | optional |
