# HANDOFF

Current repository state. Not a history — see `CHANGELOG.md` for that.

**Last updated:** 2026-09-21

---

## Status

**LIVE** at https://www.drkhalilkanani.com (GitHub Pages, deploys on push to
`main`). Phase 2 polish in progress.

⚠️ The deploy workflow runs `build:preview` (`VERIFY_RELAX=1`), which
**bypasses the launch gate**. The live site is serving placeholder address and
hours. Either resolve the outstanding facts or make that bypass an explicit,
reviewed decision — right now the gate is not protecting production.

### Fixed this session (was losing every enquiry)

`POST /api/appointment-request/` returned **405** in production. GitHub Pages
is static-only; the Cloudflare adapter put the endpoint in `dist/server`, which
the workflow never uploaded. The form now hands off to WhatsApp instead
(ADR 0007), the adapter is gone, and the build is plain static output.

## What exists

- Astro 7.3 + Tailwind 4.3, Cloudflare adapter, Motion for scroll reveal
- Three locales (he / ar / en) with full RTL support, 15 static page routes
- 6 treatments × 3 locales, authored to the medical-claims discipline
- Appointment request form + server endpoint with layered spam defence
- Accessibility statement and privacy policy (drafts, need legal review)
- Four enforcement gates: launch, locale parity, claims linter, mixed-script

## Verified

| Check | Result |
|---|---|
| axe-core, 8 page types | **0 violations** |
| Heading order (2.4.10, AA-mandatory in Israel) | no skips, 1×`h1` per page |
| hreflang / canonical | language-only codes, x-default→he, self-referencing |
| Language switcher | preserves location page-to-page |
| Form validation + error summary | inline errors, focus moves, links to fields |
| Form delivery | Composes a WhatsApp message to the verified mobile; he + ar verified |
| Form validation | Empty submit raises 3 linked errors and focuses the summary |
| Motion | Fail-visible: all 14 reveals get `.is-in` within 2s even if observers never fire |
| Sticky mobile bar | 35px clearance, never covers footer |
| Client JS | ~2.9KB inline, **zero external JS files** |
| Fonts per page | he 31.5KB · en 35KB · ar 162KB (was 393KB everywhere) |

## Blockers — production deploy is gated on these

**The build refuses `NODE_ENV=production` until resolved.** Run `npm run build`
to see the current list. As of now, 7 fields:

| Field | Needs |
|---|---|
| `address.street` | Exact street address + verified map pin |
| `hours` | Opening hours, Sun–Thu / Fri / Sat |
| `siteUrl` | Confirmed domain |
| `doctor.ar` / `doctor.en` | Canonical Arabic spelling and Latin transliteration |
| `tagline.ar` | Native Arabic review |

Also blocking, but not build-enforced:

- **Israeli legal review** of the advertising-claims posture, the accessibility
  statement and the privacy policy.
- `doctor.credentials` is empty — no verifiable qualifications were found in any
  public source. Nothing may be written there without owner confirmation.
- `ACCESSIBILITY_CONTACT` in `src/data/legal.ts` needs a real name/phone/email.
- **Google Business Profile URL** (`clinic.social.googleBusiness`). Until it is
  set, the PatientFeedback link-out does not render. Reviews live on Google by
  legal necessity (ADR 0005), so this is the clinic's only review surface.
- **Clinic photography** (9–12 images: interior, rooms, equipment, reception —
  no patients) and a doctor portrait. The gallery is not yet built; it is the
  largest remaining visual gap.

## Known gaps (not blockers)

- 4 Tier-2 treatments not yet written: crowns, fillings, extractions, cleaning.
- Clinic gallery not built — blocked on real photography, not on code.
- Motion could not be VISUALLY verified: the browser pane runs hidden in this
  environment, which pauses the document timeline and IntersectionObserver.
  The mechanism and the fail-visible guarantee were verified programmatically;
  the visual result needs a human eye on a real screen.
- No clinic photography. The hero uses a geometric treatment of the logo mark,
  which is honest but placeholder-ish.
- The logo wordmark is Hebrew-only; no Arabic or English lockup exists. The UI
  works around this by using the mark plus localised HTML text.
- No automated test suite yet (verification has been manual + axe in-browser).
- Waze and Google Maps buttons are written but render only once
  `address.geo` holds a confirmed pin; until then FindTheClinic shows an honest
  "call us for the exact address" panel instead of guessing a location.

## Recommended next action

Send the owner the verification list above. Everything else is blocked behind it.
While waiting, the Tier-2 treatment content can be written.
