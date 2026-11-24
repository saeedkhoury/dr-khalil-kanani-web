# Architecture

## Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | **Astro 7.3** | Content site, not an app. Ships zero JS by default, which serves the two hardest constraints: mobile Core Web Vitals and accessibility. Content Collections + Zod make trilingual content a build-time contract. |
| Styling | **Tailwind 4.3** | Native logical properties (`inline-s-*`/`inline-e-*`) — exactly what RTL needs, no plugin. |
| Hosting | **GitHub Pages** (static) | Where the site is actually deployed, at www.drkhalilkanani.com. No adapter — the build is plain static output, so what is built is what is served. |
| Store | **None** | The site stores nothing. The form POSTs to the appointment relay Worker, which emails the clinic through Resend; if the relay is unreachable it falls back to the WhatsApp handoff (ADR 0007). |
| Edit Mode | **Cloudflare Worker + Access** (`workers/admin/`) | The doctor edits the real pages; the Worker commits JSON content to `main` through the GitHub API (ADR 0010, `VISUAL-CMS.md`). |
| Mail | **Cloudflare Worker + Resend** (`workers/appointment-email/`) | The one piece that sends mail; separate from the static build. |
| Motion | **motion** (2.3kb) | `framer-motion` renamed to `motion`; the vanilla API avoids pulling React into a zero-JS site. |
| Fonts | Noto Sans Hebrew / Arabic / Latin | Modular but cross-script harmonised. Self-hosted and subset by Astro's Fonts API. |

## Two decisions carrying most of the weight

**`src/data/clinic.ts` is the single source of truth for NAP.** Header, footer,
contact page, JSON-LD and the sticky bar all read from it. Both reference
clinics studied during discovery shipped three different phone numbers across
their own sites; one linked Waze to the wrong street. This makes that failure
class structurally impossible.

**`src/content.config.ts` enforces locale parity.** One Zod schema, three
locales, plus a build-time assertion that every slug exists in he, ar and en.
Translation drift becomes a failed build, not a silent 404.

## Rendering

**Fully static. No server routes, no adapter.**

An adapter was previously configured and split the build into `dist/client` +
`dist/server`. The deploy workflow uploaded only `dist/client`, so the form
endpoint was never deployed and every live request 405'd. Removing the adapter
removes that whole class of mismatch: `dist/` is the site.

## Directory map

```
src/
  pages/       [locale]/ index · about · contact · faq · treatments/[slug] ·
               accessibility · privacy · terms · cookies · 404
  components/  sections/ (Hero, TreatmentsGrid, DoctorIntro, FindTheClinic,
               StickyActionBar, …) · primitives/
  data/        clinic.ts (NAP SoT) · *.json (CMS-editable content) · media.ts
  i18n/        config.ts (routing, dir) · ui.ts (all UI strings)
  lib/         seo.ts · schema.ts (JSON-LD) · phone.ts (ZERO-DEP) · verify.ts
workers/       admin/ (Edit Mode) · appointment-email/ (relay)
scripts/       linters, audits, ops/ (production watch)
tests/         unit/ (node:test) · e2e/ (Playwright + axe)
```

`lib/phone.ts` exists solely so the client form script can validate a phone
number without importing Zod — that import cost 85KB of browser JS.
