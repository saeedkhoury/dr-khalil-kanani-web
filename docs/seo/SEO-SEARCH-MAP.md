# SEO search-intent map

Which page answers which search, in which language — built only from what the
clinic actually is: one dentist, one clinic, one address (Street 1003,
Jadeidi-Makr), eight published treatments. Reviewed 2026-09-27.

**Rules this map follows**

- One location: **Jadeidi-Makr** (ג׳דיידה-מכר / الجديدة-المكر). No page claims to
  serve neighbouring towns — the clinic has not said it does, and location
  pages written to rank are doorway pages under Google's spam policies.
- One page per intent. Language versions of the same page are one intent
  in three languages, joined by hreflang — not duplicates.
- Query patterns are realistic phrasings, not a keyword list to stuff into
  copy. They are used in titles and descriptions once, naturally.
- Spellings of the town vary in real searches (ג׳דיידה / ג'דיידה / ג'ודידה /
  ג'דידה מכר; جديدة المكر / الجديدة المكر; Judeide / Jadeidi / Jdeideh-Makr).
  The site uses ONE form per script (contact-facts.json); search engines map
  the variants. Do not add the others to copy.

## Query families

| # | Query family (examples) | Lang | Intent | Target page | Current coverage (2026-09-27) | Recommended improvement |
|---|---|---|---|---|---|---|
| 1 | ד"ר חליל כנעאני · חליל כנעאני רופא שיניים | he | Navigational (the doctor) | `/he/` · `/he/about/` | **#1 on Google** (observed, see baseline). Only the apex `http://` URL is indexed. | Search Console + sitemap so the canonical `https://www.…/he/` replaces it. Keep the name identical everywhere (GBP, Facebook, Instagram). |
| 2 | د. خليل كنعاني · طبيب اسنان خليل كنعاني | ar | Navigational | `/ar/` · `/ar/about/` | Not indexed | Indexing (GSC/IndexNow). **Owner to confirm the Arabic spelling** (`doctor.ar` is unverified). |
| 3 | Dr Khalil Kanani dentist | en | Navigational | `/en/` · `/en/about/` | Hebrew home ranks; `/en/` not indexed | Indexing. **Owner to confirm Latin spelling** (`doctor.en`). |
| 4 | רופא שיניים ג׳דיידה מכר · מרפאת שיניים ג'דיידה | he | Local | `/he/` + GBP | Not on page 1; directories and a map pack of distant dentists rank | **Google Business Profile** (owner). Title now names the town. Citations (see SEO.md). |
| 5 | طبيب اسنان الجديدة المكر · عيادة اسنان جديدة المكر | ar | Local | `/ar/` + GBP | Not indexed | Same as 4. |
| 6 | dentist Jadeidi-Makr · dental clinic near Acre | en | Local | `/en/` + GBP | Not indexed | Same as 4. No "near Acre" copy — proximity is Google's job, from the address. |
| 7 | השתלות שיניים ג׳דיידה מכר / زراعة اسنان الجديدة المكر / dental implants Jadeidi-Makr | he/ar/en | Treatment + local | `/{l}/treatments/dental-implants/` | Page exists; not indexed | Title now "… בג׳דיידה-מכר"; page links to About + Contact. |
| 8 | הלבנת שיניים … / تبييض الأسنان … / teeth whitening … | he/ar/en | Treatment + local | `…/teeth-whitening/` | as 7 | as 7 |
| 9 | ציפויים / قشور / veneers … | he/ar/en | Treatment + local | `…/veneers/` | as 7 | as 7 |
| 10 | קשתיות שקופות / تقويم شفاف / clear aligners … | he/ar/en | Treatment + local | `…/clear-aligners/` | as 7 | as 7 |
| 11 | טיפול שורש / علاج عصب / root canal … | he/ar/en | Treatment + local | `…/root-canal/` | as 7 | as 7 |
| 12 | עקירת שן / خلع ضرس / tooth extraction … | he/ar/en | Treatment + local | `…/tooth-extraction/` | as 7 | as 7 |
| 13 | סתימה לבנה / حشوة اسنان / dental filling … | he/ar/en | Treatment + local | `…/dental-fillings/` | as 7 | as 7 |
| 14 | רופא שיניים חירום / طبيب اسنان طوارئ / emergency dentist … | he/ar/en | Urgent + local | `…/emergency-dental/` | as 7 | **Hours are the gap**: an urgent searcher needs to know if the clinic is open. Owner must supply hours (GBP + site). |
| 15 | מה עושים כשכואבת שן · כמה זמן טיפול שורש | he/ar/en | Informational | treatment FAQ sections · `/{l}/faq/` | as 7 | Keep answers conservative (claims linter). No new articles until the owner wants them. |
| 16 | טלפון / כתובת / שעות פתיחה ד"ר כנעאני | he/ar/en | Contact | `/{l}/contact/` + GBP | Not indexed | Title now "צרו קשר ודרכי הגעה". Hours missing (owner). |
| 17 | רופא שיניים דובר ערבית/עברית/אנגלית | he/ar/en | Attribute | home + about | Content says so; not indexed | GBP "Languages spoken" attribute. |

## Out of scope, deliberately

- **Prices** ("כמה עולה שתל") — Israeli dental advertising rules prohibit
  publishing treatment prices. Pages explain, never quote.
- **"Best dentist" / reviews** — no superlatives, no on-site testimonials
  (ADR 0005). Reviews belong on the Google Business Profile.
- **Health-fund (Clalit/Maccabi) queries** — the site does not state which
  funds the clinic works with. Owner can add it as a fact if true.
- **Neighbouring towns** (Kafr Yasif, Abu Snan, Acre …) — no pages, no copy.

## Where the patterns live

Titles: `src/lib/seo.ts` (developer-controlled; the CMS cannot remove the
town from a title). Descriptions: the CMS `seoDescription` field (required,
≤160 chars, claims-linted). The site's town, in each script:
`src/data/contact-facts.json`.
