# HANDOFF

Current repository state. Not a history — see `CHANGELOG.md` for that.

**Last updated:** 2026-09-20

---

## Status

Phase 1–5 built and verified. The site runs, builds, and passes its gates.
**It cannot be deployed to production yet**, by design — see Blockers.

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
| Endpoint defences | cross-origin 403, bad input 422, rate limit 429, unconfigured 503 |
| Spam signals | flagged `spam_suspected` and stored — never silently dropped |
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
- Delivery is unconfigured: `SUPABASE_URL` / `SUPABASE_SERVICE_KEY`. The endpoint
  returns 503 and logs loudly rather than silently discarding an enquiry.
  On Cloudflare these must be set with `wrangler secret put` — they are read
  via `cloudflare:workers`, not `process.env`. See docs/DEPLOYMENT.md.
- `RATE_LIMIT_KV` is not bound. Without it the limiter falls back to a
  per-isolate map and warns on every request.

## Known gaps (not blockers)

- 4 Tier-2 treatments not yet written: crowns, fillings, extractions, cleaning.
- No clinic photography. The hero uses a geometric treatment of the logo mark,
  which is honest but placeholder-ish.
- The logo wordmark is Hebrew-only; no Arabic or English lockup exists. The UI
  works around this by using the mark plus localised HTML text.
- No automated test suite yet (verification has been manual + axe in-browser).
- Rate limiting falls back to in-memory without a KV binding (warns loudly).
- The `appointment_requests` table needs `status` and `spam_signal` columns;
  the clinic's lead view should filter `status = 'new'` and triage the rest.

## Recommended next action

Send the owner the verification list above. Everything else is blocked behind it.
While waiting, the Tier-2 treatment content can be written.
