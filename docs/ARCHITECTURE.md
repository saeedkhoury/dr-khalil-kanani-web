# Architecture

## Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | **Astro 7.3** | Content site, not an app. Ships zero JS by default, which serves the two hardest constraints: mobile Core Web Vitals and accessibility. Content Collections + Zod make trilingual content a build-time contract. |
| Styling | **Tailwind 4.3** | Native logical properties (`inline-s-*`/`inline-e-*`) — exactly what RTL needs, no plugin. |
| Hosting | **GitHub Pages** (static) | Where the site is actually deployed, at www.drkhalilkanani.com. No adapter — the build is plain static output, so what is built is what is served. |
| Store | **None** | The form hands off to WhatsApp (ADR 0007); the site stores nothing at all. |
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
  data/        clinic.ts (NAP SoT) · doctor.ts · faq.ts · legal.ts
  i18n/        config.ts (routing, dir) · ui.ts (all UI strings)
  lib/         verify.ts (gates) · schema.ts (JSON-LD) · validation.ts (zod)
               phone.ts (ZERO-DEP — client-safe) · content.ts · delivery.ts
               rate-limit.ts · env.ts (Workers secrets/bindings)
  content/     treatments/{he,ar,en}/*.md
  components/  primitives/ · sections/ · islands/
  pages/       [locale]/... · api/ · 404
scripts/       lint-claims.mjs · lint-mixed-scripts.mjs
```

`lib/phone.ts` exists solely so the client form script can validate a phone
number without importing Zod — that import cost 85KB of browser JS.

`lib/env.ts` exists because Cloudflare Workers secrets and bindings resolve
through `cloudflare:workers`, not `process.env`. Reading them the wrong way
failed silently in production while looking correct locally.
