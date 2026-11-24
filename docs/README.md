# Documentation index

Every project document, one line each. Start with `AGENTS.md` (rules),
`HANDOFF.md` (current state) and `BUILD-STATE.md` (stage, backlog, metrics).
Continue work with `/pro-build`; large features can use `/speckit-*`.

## Company kit (pro-build) → where each piece lives

This is an existing project, so most kit documents already existed under
other names. They are mapped here rather than duplicated.

| Kit document | File | Notes |
|---|---|---|
| State and backlog | [`BUILD-STATE.md`](../BUILD-STATE.md) | single source of truth: gates, backlog, deploy log, risks |
| Project brief | [`company/00-brief.md`](company/00-brief.md) | draft, awaiting owner approval |
| Validation (stage 0) | — | skipped: client site |
| PRD | [`REQUIREMENTS.md`](REQUIREMENTS.md) | authoritative requirements |
| Roadmap | [`../planning/ROADMAP.md`](../planning/ROADMAP.md) | Now / Next / Later; backlog mirrors it in BUILD-STATE |
| Architecture | [`ARCHITECTURE.md`](ARCHITECTURE.md) | **partly stale** (form delivery, store): see BUILD-STATE → Next |
| Decision records | [`decisions/`](decisions/) | ADR 0001–0012 |
| Implementation plan | [`../planning/CURRENT_PLAN.md`](../planning/CURRENT_PLAN.md) | last updated 2026-09-21 |
| Design | [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md) | tokens, components, Apple design language |
| Platform and runbook | [`company/04-platform.md`](company/04-platform.md) | environments, secrets map, SLOs, watch, incidents |
| Launch readiness (QA) | [`QA-CHECKLIST.md`](QA-CHECKLIST.md), [`TESTING.md`](TESTING.md) | human checks still open |
| Releases | [`../CHANGELOG.md`](../CHANGELOG.md) + BUILD-STATE deploy log | release = merge (ADR 0012) |
| Go-to-market | [`SEO-RUNBOOK.md`](SEO-RUNBOOK.md), [`LOCAL-CITATIONS.md`](LOCAL-CITATIONS.md) | SEO and local listings only |
| Operating reviews | [`company/09-reviews/`](company/09-reviews/) | weekly; baseline 2026-11-24 |
| Constitution | [`../.specify/memory/constitution.md`](../.specify/memory/constitution.md) | small files, tests, mobile-first, one-command run |

## Engineering

| File | What it covers |
|---|---|
| [ARCHITECTURE.md](ARCHITECTURE.md) | stack, rendering, directory map |
| [DEPLOYMENT.md](DEPLOYMENT.md) | GitHub Pages deploy, gates, env, rollback |
| [TESTING.md](TESTING.md) | unit, browser and accessibility tests |
| [SECURITY.md](SECURITY.md) | admin CMS boundary, form endpoint, headers |
| [PRIVACY.md](PRIVACY.md) | privacy architecture |
| [I18N.md](I18N.md) | he / ar / en routing, RTL, strings |
| [VISUAL-CMS.md](VISUAL-CMS.md) | Edit Mode (the doctor's editor) |
| [GIT-HISTORY-REMEDIATION.md](GIT-HISTORY-REMEDIATION.md) | removing patient images from public history |
| [specs/](specs/), [audits/](audits/) | admin CMS design, plan and remediation audit |

## Content and design

| File | What it covers |
|---|---|
| [CONTENT.md](CONTENT.md) | content model and verified clinic information |
| [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) | design tokens and components |
| [ASSETS.md](ASSETS.md) | image rules and registration |
| [FONTS.md](FONTS.md) | font provenance |
| [ILLUSTRATIONS.md](ILLUSTRATIONS.md) | original dental illustrations |

## Search and local presence

| File | What it covers |
|---|---|
| [SEO.md](SEO.md) | SEO rules |
| [SEO-RUNBOOK.md](SEO-RUNBOOK.md) | how visibility is kept and measured |
| [SEO-GEO-MONITORING.md](SEO-GEO-MONITORING.md) | metrics schedule and baselines |
| [SEO-BASELINE.md](SEO-BASELINE.md), [SEO-GEO-BASELINE.md](SEO-GEO-BASELINE.md) | dated baselines |
| [SEO-SEARCH-MAP.md](SEO-SEARCH-MAP.md), [SEARCH-INTENT-MAP.md](SEARCH-INTENT-MAP.md) | search-intent maps |
| [LOCAL-CITATIONS.md](LOCAL-CITATIONS.md) | directory listings |
