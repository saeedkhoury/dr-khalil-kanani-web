# SEO

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

## Google Business Profile — decide before building citations

- **One profile**, `Dentist` primary category.
- **Single-script name.** Google banned repeated names across scripts on
  **2026-08-10**; the common Israeli `Hebrew / عربي` listing name is now a
  suspension risk.
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
