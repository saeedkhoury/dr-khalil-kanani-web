# Dr. Khalil Kanani — Dental Clinic Website

[![Deploy](https://github.com/saeedkhoury/dr-khalil-kanani-web/actions/workflows/deploy.yml/badge.svg)](https://github.com/saeedkhoury/dr-khalil-kanani-web/actions/workflows/deploy.yml)
[![PR checks](https://github.com/saeedkhoury/dr-khalil-kanani-web/actions/workflows/preview.yml/badge.svg)](https://github.com/saeedkhoury/dr-khalil-kanani-web/actions/workflows/preview.yml)
[![Production watch](https://github.com/saeedkhoury/dr-khalil-kanani-web/actions/workflows/scheduled-check.yml/badge.svg)](https://github.com/saeedkhoury/dr-khalil-kanani-web/actions/workflows/scheduled-check.yml)

The official website of a dental clinic in Jadeidi-Makr, Northern District,
Israel. It is published in **Hebrew, Arabic and English**, with full
right-to-left support.

**Live site:** [www.drkhalilkanani.com](https://www.drkhalilkanani.com)

---

## Contents

- [Overview](#overview)
- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
- [Commands](#commands)
- [Project structure](#project-structure)
- [Quality gates](#quality-gates)
- [Deployment and operations](#deployment-and-operations)
- [Ground rules](#ground-rules)
- [Documentation](#documentation)
- [License](#license)

## Overview

| | |
|---|---|
| **Languages** | Hebrew (`/he/`, default), Arabic (`/ar/`), English (`/en/`). Every page exists in all three, and the build checks this. |
| **Pages** | Home, about, treatments, FAQ, contact, plus the accessibility, privacy, cookies and terms pages |
| **Appointment requests** | The form sends requests to the clinic by email through a small relay. If the relay can't be reached, the request goes through WhatsApp instead. |
| **Edit Mode** | The doctor edits the real pages in the browser, behind Cloudflare Access. Each save becomes a commit on `main`. |
| **Rendering** | Fully static. There are no server routes and no database, and the site stores no visitor data. |
| **Accessibility** | Built to WCAG AA, which Israeli law requires. Every pull request is checked with axe-core. |

The product requirements are in [docs/product/PRD.md](docs/product/PRD.md).

## Tech stack

| Layer | Choice |
|---|---|
| Framework | [Astro](https://astro.build) 7, static output, no adapter |
| Styling | Tailwind CSS 4, logical properties only (RTL-safe) |
| Validation | Zod schemas for content and clinic data |
| Motion | `motion` (vanilla API, no React) |
| Images | Astro assets + `sharp` |
| Hosting | GitHub Pages, custom domain |
| Edit Mode | Cloudflare Worker + Cloudflare Access (`workers/admin/`) |
| Email relay | Cloudflare Worker + Resend (`workers/appointment-email/`) |
| Tests | `node:test` unit tests, Playwright end-to-end tests, axe-core |

## Getting started

**You'll need:** Node.js `>= 22.12.0` and npm.

```bash
git clone https://github.com/saeedkhoury/dr-khalil-kanani-web.git
cd dr-khalil-kanani-web
npm ci
npm run dev          # http://localhost:4321
```

`npm ci` also points git at the hooks in `.githooks/`, which include the pre-commit asset guard.

To build a copy you can preview locally:

```bash
npm run build:preview && npm run preview
```

> **About the launch gate:** `npm run build` refuses to build while any clinic
> fact is still waiting for the owner to verify it. Production names each of
> those facts in `ACK_UNVERIFIED`, so a new unverified fact can't get through
> unnoticed. Running the build prints the current list. Use
> `build:preview` (`VERIFY_RELAX=1`) only for local previews, never in CI.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Development server on `:4321` |
| `npm run build` | Production build that enforces the launch gate |
| `npm run build:preview` | Local build with the gate relaxed |
| `npm run preview` | Serves `dist/` |
| `npm test` | Unit tests (`tests/unit/`) |
| `npm run test:e2e` | Playwright browser and accessibility tests |
| `npm run verify` | Claims, mixed-script, data and asset linters, then `astro check` |
| `npm run lint:claims` | Checks the text against Israeli rules on dental advertising |
| `npm run lint:scripts` | Finds Cyrillic or Greek look-alike letters in Hebrew and Arabic text |
| `npm run lint:seo` | Crawls the built site for SEO problems |
| `node scripts/ops/prod-check.mjs smoke` | Read-only health check of the live site |

## Project structure

```
src/
├── pages/[locale]/    page routes, one tree serving he / ar / en
├── components/        sections, primitives, islands, Edit Mode UI
├── data/              clinic facts (clinic.ts is the one source of truth), CMS JSON
├── i18n/              locale config and UI strings
├── lib/               schema.org graph, SEO, claims, verification gate
├── layouts/           base layout
└── assets/            brand, fonts, images
workers/
├── admin/             Edit Mode API (Cloudflare Worker)
└── appointment-email/ appointment relay (Cloudflare Worker)
scripts/               linters, audits, IndexNow, ops checks
tests/                 unit, e2e and helpers
docs/                  product, engineering, design, legal, SEO, ADRs
```

## Quality gates

Every pull request runs `preview.yml`:

1. **Verify:** data, claims, mixed-script and asset linters, the type check and the unit tests.
2. **Security:** gitleaks secret scan, and `npm audit` blocking on high and critical advisories.
3. **Build preview:** a full build, then an HTML accessibility audit and the Playwright end-to-end suite with axe-core.

Every push to `main` runs `deploy.yml`. It does a strict build, runs the
end-to-end shards, deploys to GitHub Pages and notifies IndexNow.

## Deployment and operations

- **`main` is production** ([ADR 0012](docs/decisions/0012-main-deploys-to-production.md)).
  Edit Mode saves commit to `main`, so the gates above are what protect production.
- **Production watch** (`scheduled-check.yml`) only reads the live site, never changes it:
  - every 30 minutes: smoke check of the pages, the deployed build and the relay;
  - daily: Lighthouse budget;
  - weekly: secret scan and dependency audit.

  A failing check opens a GitHub issue.
- Environments, the secrets map (names only), SLOs and the rollback runbook are in
  [docs/company/04-platform.md](docs/company/04-platform.md).

## Ground rules

Read [AGENTS.md](AGENTS.md) before you change anything. The rules that matter most:

1. **Never invent a fact.** No credential, opening hour, address or price
   goes on the site until the owner confirms it. If a fact is missing, leave the
   block empty. The components already handle that.
2. **No medical claims.** Run `npm run lint:claims` before you finish.
3. **No reviews section and no before/after gallery.** Israeli dentists aren't
   allowed to publish either ([ADR 0005](docs/decisions/0005-no-onsite-reviews.md),
   [ADR 0006](docs/decisions/0006-no-before-after-gallery.md)).
4. **RTL-safe CSS only.** Use logical properties, and wrap Latin text inside
   Hebrew or Arabic in `.u-ltr`.
5. **Stage files by path.** Never use `git add -A`. Register media in `src/data/media.ts`.
6. **Changes reach `main` only through a pull request.**

## Documentation

| File | Purpose |
|---|---|
| [AGENTS.md](AGENTS.md) | Engineering rules |
| [CLAUDE.md](CLAUDE.md) | AI-assistant workflow |
| [HANDOFF.md](HANDOFF.md) | Current state and blockers |
| [BUILD-STATE.md](BUILD-STATE.md) | Stage, backlog, decisions, deploy log, risks |
| [CHANGELOG.md](CHANGELOG.md) | Notable changes |
| [docs/README.md](docs/README.md) | Index of every document |
| [docs/decisions/](docs/decisions/) | Architecture decision records |

## License

This is a private clinic's website. No open-source license is granted. The
code, content, photographs and brand assets are all rights reserved.
