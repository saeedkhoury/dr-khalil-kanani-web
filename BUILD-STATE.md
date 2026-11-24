# Dr. Khalil Kanani — dental clinic website

- Project type(s): Web (static content site, Astro on GitHub Pages) + System (Cloudflare Workers: Edit Mode admin, appointment email relay)
- Track: Existing project (Client site shape: no payments, no go-to-market beyond SEO and local listings)
- Stage: 9 Operate & Grow, with stage 5 Engineering for each backlog item
- Next step: owner approves `docs/company/00-brief.md` and answers its two open items (3-month goal number, budget); then merge the dependency upgrade
- Last updated: 2026-11-24
- Model policy: auto routing (haiku / sonnet / opus) · Fable: off
- Main-session model: sonnet (opus for architecture, security and legal-risk work)
- Spec mode: spec-kit for large features (`.specify/`, constitution v1.0.0); native for small ones

Read first: `AGENTS.md` (rules) → `HANDOFF.md` (state) → this file → `docs/README.md` (index).

## Gates
| # | Department | Status | Date | Artifact |
|---|---|---|---|---|
| K | Kickoff | **pending owner approval** (2 open items) | 2026-11-24 | docs/company/00-brief.md |
| 0 | Founder Office | skipped: client site, the clinic is the business | — | — |
| 1 | Product | recorded (pre-pro-build) | 2026-09 | docs/REQUIREMENTS.md, planning/ROADMAP.md |
| 2 | Engineering Leadership | recorded; docs drift noted | 2026-09 → 11 | docs/ARCHITECTURE.md, docs/decisions/ (0001–0012) |
| 3 | Design | recorded | 2026-11-08 | docs/DESIGN_SYSTEM.md (Apple design, PR #29) |
| 4 | Platform / DevOps | **in progress** (this PR) | 2026-11-24 | docs/company/04-platform.md |
| 5 | Engineering | ongoing | | backlog below |
| 6 | QA & Security | partly: automated gates green; human checks open | | docs/QA-CHECKLIST.md |
| 7 | Release | release = merge to `main` (ADR 0012) | | deploy log below, CHANGELOG.md |
| 8 | Go-to-Market | SEO and local listings only | 2026-10-01 | docs/SEO-*.md, docs/LOCAL-CITATIONS.md |
| 9 | Operate & Grow | baseline review done | 2026-11-24 | docs/company/09-reviews/2026-11-24.md |

## Decisions
- 2026-11-24: `main` deploys straight to production; protection is the blocking gates plus a 30-min read-only watch, not a staging hop (the doctor's Edit Mode saves go to `main`; GitHub Pages hosts one deployment). ADR 0012.
- 2026-11-24: alerts are GitHub issues opened by `scheduled-check.yml` (no paging service; solo owner).
- 2026-11-24: PR dependency audit blocks on critical until the upgrade below merges, then on high.
- 2026-11-22: Spec Kit + constitution v1.0.0 adopted (PR #32).

## Backlog
### Now
- [ ] Upgrade build dependencies to clear 5 high + 2 moderate advisories: astro ≥ 7.4.5, sharp ≥ 0.35.5, zod ≥ 4.6.6, plus transitive vite / undici / source-map-js / smol-toml (acceptance: `npm audit --omit=dev` shows 0 high; full CI green; Lighthouse within budget)
- [ ] Then raise the PR audit gate in `preview.yml` from `critical` to `high`
### Next
- [ ] Fix docs drift: ARCHITECTURE / DEPLOYMENT / SECURITY still describe a WhatsApp-only form and Supabase; the live form uses the Resend relay (acceptance: each doc matches the code and live endpoints)
- [ ] Owner: set `CLOUDFLARE_API_TOKEN` + `ADMIN_PREVIEW=on` so Edit Mode rebuilds itself after saves (level C: owner creates the token)
- [ ] Owner: enable Dependabot security updates (Settings → Code security)
- [ ] Split `workers/admin/src/index.ts` (870 lines) when next touched (constitution I)
- [ ] Tier-2 treatments: crowns, fillings, extractions, cleaning (planning/ROADMAP.md)
### Later
- Optional external uptime monitor (UptimeRobot / Better Stack free tier), owner-created
- Clinic and doctor photography; ar/en logo lockups
- Educational content under the reg. 4 exemption (strongest permitted SEO play)
### Done
- [x] Company kit + read-only production watch (PR #34, 2026-11-24)
- [x] Brand logo + `.agents/skills` (PR #33, 2026-11-24)
- [x] Spec Kit + constitution (PR #32, 2026-11-22)
- [x] Legal pages and accurate privacy notice (PR #30, 2026-11-08)
- [x] Apple design language, Liquid Glass header, new footer (PR #29, 2026-11-08)

## Services
| Service | Status | Environments |
|---|---|---|
| GitHub repo (public) | live; secret scanning + push protection on | — |
| Hosting: GitHub Pages | live | production only (ADR 0012) |
| Cloudflare Workers + Access | live | admin, admin-staging, relay |
| Resend (email) | live | production |
| Payments | N/A: nothing is sold online | — |
| Error tracking (Sentry) | N/A: static site | — |
| Analytics | N/A by decision: no cookies, no tracking | — |

Full list with reasons: `docs/company/04-platform.md` → Services.

## Metrics (latest review: 2026-11-24)
| Metric | Target | Last week | This week |
|---|---|---|---|
| North Star: **OPEN** (owner picks: enquiries, GSC clicks, or GBP calls) | — | — | — |
| Smoke checks passing (SLO) | 99.5 % / 28 d | — | starts after merge |
| Mobile Lighthouse perf he / ar / en | ≥ 90 | — | 97 / 100 / 100 |
| LCP he / ar / en | ≤ 2.5 s | — | 1.4 / 1.1 / 1.3 s |
| High advisories (prod deps) | 0 | — | 5 |

## Approvals log (level B)
| Date | Action | Scope | User's words |
|---|---|---|---|
| 2026-11-22 | Merge PR #32 | merge commit 56e2380 | "merge #32 and pull" |
| 2026-11-23 | Delete remote branch `feat/og-logo-speckit` | tip 38de451 | "delete the old remote branch" |
| 2026-11-24 | Merge PR #34, then PR #33 | merge ba227e2 (#34); #33 after conflict resolution | "merge #34 and #33 and pull" |

## Release candidate (stage 7)
Not used: release = merge to `main` (ADR 0012). Each merge is one deploy-log row.

## Operations
- Recovery objectives: no server state (RPO n/a) · restore the public site < 1 h (revert + deploy) · Incident owner: repo owner · Alert route: GitHub issue → owner's GitHub email
- Backups: git (every clone is a full copy) · Last restore test: n/a (revert path exercised by normal deploys)
- Secret scanner: GitHub secret scanning + push protection; gitleaks per PR + weekly full history · Last scan: first gitleaks run = this PR's CI

## Reliability and delivery
- SLOs: site up and correct 99.5 % · edits live within 45 min 98 % · mobile perf budget 95 % of days (`docs/company/04-platform.md`)
- Infrastructure approach: platform-managed (GitHub Pages, Cloudflare); settings documented in 04-platform.md
- Watch layers: uptime monitor N/A (optional, owner) · scheduled CI check `scheduled-check.yml` · AI watch routine not set up
- Paging: N/A, solo owner; alerts are issues

## Deploy log (for DORA)
| ID | Version | Platform | SHA | Included PRs (merged at) | Exposed to production | Class | Outcome |
|---|---|---|---|---|---|---|---|
| D-001 | — | web | 8af9be4 | #28 (2026-10-28 11:20 UTC) | 2026-10-28 11:24 | minor | healthy |
| D-002 | — | web | b147a80 | #29 (2026-11-08 10:51) | 2026-11-08 10:56 | minor | healthy |
| D-003 | — | web | c782ee1 | #30 (2026-11-08 14:34) | 2026-11-08 14:39 | minor | healthy |
| D-004 | — | web | 56e2380 | #32 (2026-11-22 10:25) | 2026-11-22 10:29 | patch | healthy |

## Incident log
| ID | SEV | Started | Recovered | Caused by deployment | Cause | Review |
|---|---|---|---|---|---|---|
| — | | | | | none recorded since pro-build adoption | |

## Model log
| Stage | Main work done by | Notes |
|---|---|---|
| K + 4 + 9 baseline | opus (main session) | company kit, DevOps watch, baseline review |

## Risks and blockers
- 10 published treatment-work photos: prohibited-advertising risk pending legal review (owner + lawyer; ADR 0010)
- Shipped unverified fields `doctor.ar`, `doctor.en`, `tagline.ar` (owner to confirm; `deploy.yml` ACK list)
- Five high advisories in build dependencies (agent; Now item)
- Edit Mode does not auto-rebuild: `ADMIN_PREVIEW` / `CLOUDFLARE_API_TOKEN` unset (owner, level C)
- Scheduled workflows stop after 60 days without a commit on a public repo (weekly review checks the last run)
