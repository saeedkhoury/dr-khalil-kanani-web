# Search-intent map — 2026-10-01

Which ONE page answers which search, per language. Supersedes the query table
in `docs/SEO-SEARCH-MAP.md` (2026-09-27), whose rules still apply: one
location (Jadeidi-Makr), no neighbouring-town pages, no prices, no
superlatives, no on-site reviews.

**Evidence codes.** AC = Google autocomplete (`hl` = language, `gl=il`,
2026-10-01) — what people really type, without volumes. SERP = observed result
page (`docs/SEO-GEO-BASELINE.md` §7). GSC = Search Console. Keyword volumes are
not available to this project (no Ads account); priority is judged from
autocomplete presence, the business's services, and what already ranks.

## How people actually search here

- **Hebrew** says *רופא שיניים* (dentist) + town: "רופא שיניים ג'דיידה מכר"
  is an autocomplete. Searchers type `'` where the site writes `׳`; Google
  treats them alike. Treatment searches are dominated by **price** ("מחיר")
  and **health funds** ("כללית", "מכבי") — prices cannot be published (Israeli
  dental advertising rules); health-fund arrangements are a fact the owner
  can add. Extraction searches are about **wisdom teeth** ("עקירת שן בינה").
  Veneers: "ציפויים לשיניים", "למינייט לשיניים".
- **Arabic in Israel** says *دكتور اسنان* + town ("دكتور اسنان الناصرة",
  "… شفاعمرو", "… طمره"); **"دكتور اسنان جديده المكر" is an autocomplete**.
  "طبيب اسنان الجديدة" autocompletes to *El Jadida, Morocco* — the
  formal phrasing competes with a foreign city. Veneers are searched as
  **"فينير"**; aligners as "تقويم شفاف" and "انفزلاين"; extraction as "خلع
  ضرس العقل"; pain as "الم الاسنان". "دكتور اسنان قريب مني مفتوح الآن" —
  hours matter.
- **English** has no local autocomplete demand at all. English pages serve
  brand lookups, non-Hebrew/Arabic speakers, and AI assistants.

## Map

Priority: **P1** now · **P2** next · **P3** later / owner-dependent.

| Query cluster | Lang | Intent | Target URL | Current coverage | Content gap | Priority | Evidence |
|---|---|---|---|---|---|---|---|
| רופא שיניים ג'דיידה מכר · מרפאת שיניים ג'דיידה | he | local | `/he/` + Business Profile | in map pack (observed); site not on page 1 | hours; H1 is "רפואת שיניים ואסתטיקה" (no "רופא שיניים", no town) | P1 | AC, SERP |
| دكتور اسنان جديده المكر · عيادة اسنان الجديدة المكر | ar | local | `/ar/` + Business Profile | `/ar/` not indexed; no pack | Arabic copy says "عيادة أسنان" / "طبيب"; people say "دكتور اسنان" | P1 | AC, SERP |
| dentist Jadeidi-Makr | en | local | `/en/` + Business Profile | in pack (observed); `/en/` not indexed | — | P2 | SERP |
| ד"ר חליל כנעאני · חליל כנעאני רופא שיניים | he | brand | `/he/` · `/he/about/` | knowledge panel + site #2; competing entity (Dr. Wasim Khalil Kanani) | disambiguation: full official name, about page facts | P1 | SERP |
| د. خليل كنعاني · دكتور خليل كنعاني | ar | brand | `/ar/` · `/ar/about/` | absent | indexing; Arabic name spelling unconfirmed | P1 | SERP |
| Dr Khalil Kanani | en | brand | `/en/` | Hebrew home shown | Latin spelling unconfirmed | P2 | baseline |
| רופא שיניים חירום · כאב שיניים חזק · שן שבורה | he | emergency | `/he/treatments/emergency-dental/` | not indexed | **hours**; "what to do now" already present | P1 | AC |
| طبيب/دكتور اسنان طوارئ · الم الاسنان | ar | emergency | `/ar/treatments/emergency-dental/` | not indexed | hours | P2 | AC |
| השתלות שיניים (+ ג'דיידה) | he | treatment | `…/he/treatments/dental-implants/` | not indexed; directories own the SERP | — (price/fund queries out of scope) | P2 | AC, SERP |
| زراعة اسنان | ar | treatment | `…/ar/treatments/dental-implants/` | not indexed | — | P2 | AC |
| ציפויים לשיניים · למינייט | he | treatment | `…/he/treatments/veneers/` | not indexed | the word "למינייט" absent | P2 | AC |
| فينير · فينير الاسنان | ar | treatment | `…/ar/treatments/veneers/` | not indexed | **"فينير" absent** — page says only "القشور التجميلية" | P1 | AC |
| קשתיות שקופות · יישור שיניים שקוף | he | treatment | `…/he/treatments/clear-aligners/` | not indexed | "יישור שיניים שקוף" phrasing | P2 | AC |
| تقويم شفاف · انفزلاين | ar | treatment | `…/ar/treatments/clear-aligners/` | not indexed | brand name only if the clinic uses that system (owner) | P3 | AC |
| הלבנת שיניים | he | treatment | `…/he/treatments/teeth-whitening/` | not indexed | — | P2 | AC |
| تبييض اسنان | ar | treatment | `…/ar/treatments/teeth-whitening/` | not indexed | — | P2 | AC |
| טיפול שורש · טיפול שורש כואב · החלמה | he | treatment + info | `…/he/treatments/root-canal/` | not indexed | pain/recovery questions in its FAQ (doctor review) | P2 | AC |
| علاج عصب الاسنان | ar | treatment | `…/ar/treatments/root-canal/` | not indexed | — | P2 | AC |
| עקירת שן · עקירת שן בינה | he | treatment | `…/he/treatments/tooth-extraction/` | not indexed; only 4 internal links | wisdom-tooth wording present; linking weak | P1 (links) | AC |
| خلع ضرس · خلع ضرس العقل | ar | treatment | `…/ar/treatments/tooth-extraction/` | not indexed | check wisdom-tooth wording (doctor review) | P2 | AC |
| סתימה לבנה | he | treatment | `…/he/treatments/dental-fillings/` | not indexed; only 4 internal links | linking weak | P1 (links) | AC |
| حشوة اسنان | ar | treatment | `…/ar/treatments/dental-fillings/` | not indexed | linking weak | P1 (links) | AC |
| שעות פתיחה / טלפון / כתובת ד"ר כנעאני | he/ar/en | contact | `/{l}/contact/` + Business Profile | not indexed | **hours**; phone mismatch | P1 | baseline |
| כללית / מכבי + רופא שיניים | he/ar | attribute | `/{l}/faq/` | FAQ says arrangements vary | the actual arrangements (owner fact) | P3 | AC, AI Overview |
| רופא שיניים דובר ערבית / עברית / אנגלית | he/ar/en | attribute | home + about | stated on the site | Business Profile "languages" attribute | P3 | baseline |

## Deliberately out of scope

- **Prices** ("מחיר", "كم سعره") — not published (advertising rules). The
  pages explain the treatment instead.
- **"ابتسامة هوليود" / Hollywood smile, "השתלות ביום אחד", laser whitening** —
  heavy demand, but the owner declined Hollywood-smile wording and none of
  these is offered as stated; writing them would be a claim.
- **Nearby towns** (עכו, כפר יאסיף, אבו סנאן, Julis …) — real demand
  ("רופא שיניים חירום עכו"), but pages for towns the clinic is not in are
  doorway pages. Proximity is earned through the Business Profile.
- **"best / הכי טוב / افضل"** — superlatives are claims; reviews belong on the
  Business Profile.

## Cannibalisation check

One page per cluster; the three language versions of a page are one intent
joined by hreflang. The home page targets the local/brand cluster; the
treatments hub targets nothing alone (it routes). No two treatment pages share
a cluster. FAQ answers link to the treatment page rather than competing with
it.
