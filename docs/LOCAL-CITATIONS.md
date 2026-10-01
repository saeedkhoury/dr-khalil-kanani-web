# Local citations — 2026-10-01

Where the clinic should exist, with exactly the same facts, so search engines
and AI assistants can recognise one entity — and tell it apart from
**Dr. Wasim Khalil Kanani**, a different dentist in the same town.

Rules: real listings only, owned or claimed by the clinic; identical name,
address, phone, hours, website on every one; no paid link schemes, no bulk
submission tools, no fake reviews, no review gating. Claiming a listing needs
the business owner's identity, so every row below is an **owner action**
unless stated.

## The facts every listing must carry (decide once — see open questions)

| Field | Value to use |
|---|---|
| Name | **open** — "ד״ר חליל כנעאני" (site + Business Profile today) or "ד״ר חליל אסעד כנעאני" (Facebook page). One form, everywhere. |
| Address | רח' 1003, ג'דיידה-מכר 2510500 |
| Phone | **open** — 04-884-8891 (site primary) or 052-288-5179 (Business Profile) as the main number; the other as secondary |
| Hours | **open** — the Business Profile shows Sun closed · Mon–Tue 12–19 · Wed closed · Thu–Sat 12–19; the site shows none |
| Website | https://www.drkhalilkanani.com/ (language page where the directory has a language) |
| Category | Dentist / רופא שיניים / طبيب أسنان |

## HIGH — do these

| Source | Why | Status 2026-10-01 |
|---|---|---|
| **Google Business Profile** | Map pack + knowledge panel; the source Maps and AI draw on first | Verified. Fix: phone, hours, conflict-of-interest reviews, description, services, languages attribute |
| **easy.co.il** | Ranks for every local query in Hebrew, Arabic and English; **Google's AI Overview quotes it** (services, hours, health funds) | **No listing** — only Wasim Kanani's page exists, and the AI merges the two |
| **Dapei Zahav (d.co.il) / B144 (b144.co.il)** | Bezeq's directory; owns "השתלות שיניים בג'דיידה-מכר" and the town dentist pages | Not found for the clinic |
| **doctors.co.il** | Ranks for "רופאי שיניים בג'דיידה-מכר"; profile pages per doctor | **Not listed** (6 local dentists listed, not this clinic) |
| **Facebook page** (existing) | Appears for brand searches; carries phone/hours | Exists ("ד"ר חליל אסעד כנעאני"); align its name/phone/hours, then link it from the site (`contact-facts.json → facebook`) |
| **Instagram** (existing) | Linked from the site (`sameAs`) | Remove other phone numbers from posts/bio if not the clinic's |
| **Bing Places** | Bing + Copilot + feeds; can import the Google profile | Not set up |
| **Apple Business Connect** | Apple Maps / Siri on iPhone — the doctor's patients are on iPhones | Not set up |
| **Waze** | Already returned for "רופא שיניים ג'דיידה מכר" (competitor's place) | Check the clinic's place exists with the right pin |

## MEDIUM — worth doing once the HIGH list is consistent

| Source | Why | Condition |
|---|---|---|
| **asnan.co.il** — Arab Dentists Union in Israel | The Arab community's professional dental body; lists clinics; ranks for the Arabic query | Only if the doctor is a member |
| **Israel Dental Association** (ההסתדרות לרפואת שיניים) | Professional authority signal | Only if a member and they publish member pages |
| **infomed.co.il** | Ranks for the town dentist query; doctor profiles | Free profile only; no paid placement |
| **dunsguide.co.il** | Ranks #2 for the Hebrew local query | Free listing only |
| **Health funds' dentist finders** (Clalit, Maccabi, Meuhedet, Leumit) | Rank for local queries; AI cites them | **Only if the clinic genuinely has an arrangement** — the site currently says arrangements vary |
| **Jadeidi-Makr local council** business/health listings | Local authority, local relevance | If the council publishes one |
| **ar.abc-israel.it** | Ranks for the Arabic local query | Free listing only, if it is a real directory page |

## IGNORE

| Source | Why |
|---|---|
| rotter.net "נבחרי רוטר", forum "best of" lists | User-generated, low quality, often paid |
| Foreign Arabic directories (Vezeeta, dalili, yellowpages.com.eg …) | Wrong country — they rank for Cairo/Riyadh, not here |
| Bulk "submit to 100 directories" services, link packages | Link schemes under Google's spam policies |
| Review-gating or "buy reviews" tools | Prohibited by Google's review policies |
| ids4u.co.il | A continuing-education centre, not a directory |
| Sponsored listings (paid placement on easy / Dapei Zahav) | Advertising, not a citation; a separate decision |
| GitHub repository | Ranks for "dentist Jadeidi-Makr" in English today; it is the site's source code, not a listing — not a citation to build on |

## Reviews — the legitimate way

Ask real patients, after a visit, for an honest Google review — by a card or
a WhatsApp message with the profile's review link. Ask everyone the same way;
never only satisfied patients, never suggest a rating or wording, never offer
anything in return. Reply to reviews without disclosing anything about the
person's treatment (medical confidentiality). Do not post on-site testimonials
(ADR 0005).
