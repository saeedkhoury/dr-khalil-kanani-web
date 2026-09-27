# SEO

See also: [SEO-SEARCH-MAP.md](SEO-SEARCH-MAP.md) (query ↔ page),
[SEO-RUNBOOK.md](SEO-RUNBOOK.md) (canonical strategy, robots and AI crawlers,
monitoring) and [SEO-BASELINE.md](SEO-BASELINE.md) (measured starting point).

## Structured data

`Dentist` for the clinic — simultaneously a `LocalBusiness`, `MedicalBusiness`
and `MedicalOrganization`, so it is strictly the most specific correct type.
A linked `Person` node for the doctor via `employee` / `worksFor`.

**One stable, language-neutral `@id`** for the clinic, shared across all three
locale pages. Per-language ids would fabricate three dental clinics in
Jadeidi-Makr and fragment every signal.

### Deliberate omissions

| Omitted | Reason |
|---|---|
| `priceRange` | Google recommends it; Israeli regulations prohibit publishing treatment prices. A recommended property is optional, a criminal offence is not. |
| `aggregateRating` / `review` | Self-controlled reviews are ineligible for star rich results and risk manual action — and patient testimonials are prohibited regardless. |
| `FAQPage` | Google **retired FAQ rich results on 2026-05-07**. Visible, well-structured Q&A serves patients and AI extraction instead. |
| `address` / `geo` / hours | Not emitted while unverified. An empty `PostalAddress` is worse than none — one reference site ships exactly that. |

### Included

`availableLanguage: ["he","ar","en"]` — undocumented by Google, but it
machine-encodes the clinic's actual differentiator. `areaServed`, `sameAs`,
`BreadcrumbList`, `WebSite` with `alternateName` in all three scripts.
`logo`/`image`: `/logo.png`, rendered at build from the favicon SVG (Google
needs a raster ≥112px). `hasMap`: the same pin the page's map link opens.
The doctor's `Person` links to the About page.

**Every URL is built from the page's own origin** (`buildGraph({ origin })`).
Until 2026-09-27 the graph read a placeholder origin, and the live site
described a clinic at `example.invalid`. `npm run lint:seo` now fails any
build where that recurs.

## Google Business Profile — decide before building citations

- **One profile**, `Dentist` primary category.
- **Single-script name.** Google's business-name guidelines prohibit
  "repeated bilingual names / script transliterations … even if it appears
  this way on physical storefront signage" (checked 2026-09-27; the earlier
  note here gave a 2026-08-10 date that could not be confirmed). The common
  Israeli `Hebrew / عربي` listing name is a suspension risk.
- Set the **"Languages spoken"** attribute — highest-value field for this clinic
  and routinely left blank.
- Sun–Thu hours; special hours for both Jewish and Muslim holidays.

## Citations, in priority order

GBP → **Waze** → **health-fund provider directory** → Dapei Zahav → B144 →
easy.co.il. The first two are Israel-specific and routinely skipped.

**`rest.co.il` is restaurants only — do not use it.**

Lock one canonical Latin, one Hebrew and one Arabic form of the address.
Transliteration drift is the top NAP failure mode in Israel.

## Other

- Phone numbers never appear in `<title>` — bidi hazard and truncation budget.
- Unique `<title>` and meta description per page, per locale.
- One `h1` per page; heading order never skips (also an a11y requirement).
