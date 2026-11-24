# Documentation index

Start with [`../AGENTS.md`](../AGENTS.md) (rules), [`../HANDOFF.md`](../HANDOFF.md)
(current state) and [`../BUILD-STATE.md`](../BUILD-STATE.md) (stage, backlog,
metrics). For what the website is and how it is built, read
**[`product/PRD.md`](product/PRD.md)**. Continue work with `/pro-build`; large
features can use `/speckit-*`.

```
docs/
├── product/          what we build and why
├── engineering/      how it is built, tested and deployed
├── design/           how it looks; images and illustrations
├── legal-security/   privacy, security, legal remediation
├── seo/              search and local visibility
├── decisions/        architecture decision records (ADR 0001–0012)
├── specs/            feature designs and plans
├── audits/           point-in-time audits
└── company/          pro-build: brief, platform runbook, weekly reviews
```

## product/

| File | What it covers |
|---|---|
| [PRD.md](product/PRD.md) | **The product requirements document**: goals, users, must / must-not, pages and features, key flows, how it is built |
| [CONTENT.md](product/CONTENT.md) | content model and verified clinic information |

## engineering/

| File | What it covers |
|---|---|
| [ARCHITECTURE.md](engineering/ARCHITECTURE.md) | stack, rendering, directory map |
| [VISUAL-CMS.md](engineering/VISUAL-CMS.md) | Edit Mode, the doctor's editor |
| [I18N.md](engineering/I18N.md) | he / ar / en routing, RTL rules, strings |
| [DEPLOYMENT.md](engineering/DEPLOYMENT.md) | GitHub Pages deploy, gates, environment, rollback |
| [TESTING.md](engineering/TESTING.md) | unit, browser and accessibility tests |
| [QA-CHECKLIST.md](engineering/QA-CHECKLIST.md) | manual checks only a person can do |
| [FONTS.md](engineering/FONTS.md) | font provenance and reproducible builds |

## design/

| File | What it covers |
|---|---|
| [DESIGN_SYSTEM.md](design/DESIGN_SYSTEM.md) | tokens, components, Apple design language |
| [ASSETS.md](design/ASSETS.md) | image rules: naming, registering, alt text |
| [ILLUSTRATIONS.md](design/ILLUSTRATIONS.md) | original dental illustrations |

## legal-security/

| File | What it covers |
|---|---|
| [PRIVACY.md](legal-security/PRIVACY.md) | privacy architecture under Amendment 13 |
| [SECURITY.md](legal-security/SECURITY.md) | admin CMS boundary, relay, headers |
| [GIT-HISTORY-REMEDIATION.md](legal-security/GIT-HISTORY-REMEDIATION.md) | removing patient images from public history |

## seo/

| File | What it covers |
|---|---|
| [SEO.md](seo/SEO.md) | SEO rules |
| [SEO-RUNBOOK.md](seo/SEO-RUNBOOK.md) | how visibility is kept and measured |
| [SEO-GEO-MONITORING.md](seo/SEO-GEO-MONITORING.md) | metrics schedule and baselines |
| [SEO-BASELINE.md](seo/SEO-BASELINE.md) · [SEO-GEO-BASELINE.md](seo/SEO-GEO-BASELINE.md) | dated baselines |
| [SEO-SEARCH-MAP.md](seo/SEO-SEARCH-MAP.md) · [SEARCH-INTENT-MAP.md](seo/SEARCH-INTENT-MAP.md) | search-intent maps |
| [LOCAL-CITATIONS.md](seo/LOCAL-CITATIONS.md) | directory listings |

## decisions/, specs/, audits/, company/

| Folder | What it holds |
|---|---|
| [decisions/](decisions/) | ADR 0001–0012: why things are the way they are |
| [specs/](specs/) | admin CMS design, phase 1 and plan |
| [audits/](audits/) | 2026-09-24 admin CMS remediation audit |
| [company/](company/) | [00-brief.md](company/00-brief.md) (draft brief) · [04-platform.md](company/04-platform.md) (environments, secrets map, SLOs, runbook) · [09-reviews/](company/09-reviews/) (weekly reviews) |

## Company kit (pro-build) → where each piece lives

| Kit document | File |
|---|---|
| State, backlog, deploy log | [`../BUILD-STATE.md`](../BUILD-STATE.md) |
| Brief | [company/00-brief.md](company/00-brief.md) |
| PRD | [product/PRD.md](product/PRD.md) |
| Roadmap · plan | [`../planning/ROADMAP.md`](../planning/ROADMAP.md) · [`../planning/CURRENT_PLAN.md`](../planning/CURRENT_PLAN.md) |
| Architecture · ADRs | [engineering/ARCHITECTURE.md](engineering/ARCHITECTURE.md) · [decisions/](decisions/) |
| Design | [design/DESIGN_SYSTEM.md](design/DESIGN_SYSTEM.md) |
| Platform and runbook | [company/04-platform.md](company/04-platform.md) |
| QA and launch readiness | [engineering/QA-CHECKLIST.md](engineering/QA-CHECKLIST.md) · [engineering/TESTING.md](engineering/TESTING.md) |
| Releases | [`../CHANGELOG.md`](../CHANGELOG.md) + the deploy log (release = merge, ADR 0012) |
| Go-to-market | [seo/SEO-RUNBOOK.md](seo/SEO-RUNBOOK.md) · [seo/LOCAL-CITATIONS.md](seo/LOCAL-CITATIONS.md) |
| Constitution | [`../.specify/memory/constitution.md`](../.specify/memory/constitution.md) |
