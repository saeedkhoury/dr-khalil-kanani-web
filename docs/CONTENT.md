# Content model and verified clinic information

## Verification tiers

Every publishable fact sits in exactly one tier. The tier lives in the
`VERIFICATION` manifest in `src/data/clinic.ts` and is enforced at build time.

| Tier | Meaning | Publishable |
|---|---|---|
| `verified` | Confirmed by 2+ independent sources | Yes |
| `owner` | Supplied by the owner, single source | Yes |
| `unverified` | Inferred from research | **No** |
| `placeholder` | Invented for layout only | **Never** |

**No agent or developer may promote a fact between tiers.** Only the owner can.

## VERIFIED

| Fact | Sources |
|---|---|
| Landline `04-8848891` | Clinic flyer + Instagram bio (agree exactly) |
| Mobile `052-2885179` | Flyer + Instagram bio + Instagram post footer |
| ד״ר חליל כנעאני | Logo + flyer + Instagram |
| מרפאת שיניים ואסתטיקה | Logo lockup + flyer + Instagram bio |
| Brand `#0C5283` / `#2195D2` | Extracted from the source logo vector |
| Instagram `dr.khalil.kanani` | Direct observation |

## OWNER-PROVIDED (single source)

- Full name ד"ר חליל אסעד כנעאני — Instagram profile field only
- Locality Jadeidi-Makr — Instagram address field + a post footer

## NEEDS VERIFICATION — blocks production

1. Exact street address + confirmed map pin ("1003" is a plot number)
2. Opening hours (Sun–Thu / Fri / Sat)
3. Clinic email address
4. Confirmation that WhatsApp is on `052-2885179`
5. Domain name
6. **Credentials**: dental school, graduation year, licence number,
   memberships, languages, years practising — *nothing verifiable was found*
7. Health-fund arrangements (kupot holim)
8. Canonical Arabic spelling and Latin transliteration of the name
9. Accessibility contact: name, phone, email
10. Physical clinic accessibility (step-free entry, parking, accessible WC)

## Service-list conflicts to resolve

| Service | Brief | Flyer | Instagram |
|---|---|---|---|
| Implants, whitening, fillings, veneers, root canal, aligners | ✅ | ✅ | ✅ |
| **Crowns** | ✅ | ❌ | ❌ (an "E-Max" highlight implies it) |
| **Extractions** | ❌ | ✅ | ✅ |
| **Scaling / hygiene** | ❌ | ❌ | ✅ |
| **Emergency dental** | ❌ | ❌ | ✅ |

Emergency dental was added — it is the highest-intent search category in
dentistry. Crowns, fillings, extractions and cleaning are not yet written.

## Flagged for legal review

The clinic's Instagram currently publishes intraoral before/after patient
photography, a "special price, limited time" veneers post, and a free aligner
suitability check. Under the 2009 advertising regulations the first two appear
prohibited and the third needs counsel. None of them are reproduced on this site.

## Copy discipline

All copy states operational facts, never outcomes. The flyer's own promises
("precise aesthetic results", "warranty", "a white smile, high self-confidence")
are **deliberately not reproduced** — they are outcome and guarantee claims.
