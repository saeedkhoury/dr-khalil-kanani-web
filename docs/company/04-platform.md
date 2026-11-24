# 04 — Platform and operations

How the site is built, deployed, watched and recovered. Facts here were read
from the repository and the live endpoints on 2026-11-24. Engineering rules
are in `AGENTS.md`; hosting history is in `docs/engineering/DEPLOYMENT.md`.

## Environments

| Environment | What | Deployed by | Protection |
|---|---|---|---|
| Local | `npm run dev` on :4321 | developer | none needed; no env or secrets |
| PR preview | `preview-site` artifact (download, not hosted) | `preview.yml` on every PR to `main` | verify · security · build-preview |
| **Production** (public site) | GitHub Pages, `https://www.drkhalilkanani.com` | `deploy.yml` on every push to `main` | all gates block the deploy (ADR 0012) |
| Admin / Edit Mode | Cloudflare Worker `drkanani-admin`, `admin.drkhalilkanani.com` | `admin-preview.yml` from `ADMIN_DEPLOY_BRANCH` | Cloudflare Access (sign-in) + `ALLOWED_EMAILS` |
| Admin staging | Worker `drkanani-admin-staging`, `admin-staging.drkhalilkanani.com` | manual `wrangler deploy --env staging` | Cloudflare Access |
| Appointment relay | Worker `drkanani-appointment-email` on `workers.dev` | manual `wrangler deploy` | origin allow-list, rate limit |

**Why `main` is production:** the doctor's Edit Mode saves are commits to
`main`, and GitHub Pages hosts one deployment per repo. See ADR 0012.

## Services

| Service | Use | Account owner | Status |
|---|---|---|---|
| GitHub | repo, Actions, Pages, issues (alerts) | owner | live; repo public |
| GitHub secret scanning + push protection | blocks pushed credentials | owner | **on** |
| Dependabot version updates | weekly grouped PRs (`.github/dependabot.yml`) | owner | on after this PR merges |
| Dependabot security updates | auto PRs for advisories | owner | **off**, owner can enable in Settings → Code security |
| Cloudflare | admin Worker, Access, relay Worker | owner | live |
| Resend | sends appointment requests to the clinic inbox | owner | live (preflight 204 on 2026-11-24) |
| Google Search Console / Business Profile | search visibility | owner | live (`docs/seo/SEO-GEO-MONITORING.md`) |
| Error tracking (Sentry) | — | — | N/A: static site, no client errors worth paying for; revisit if JS grows |
| Product analytics | — | — | N/A by decision: no cookies, no analytics (privacy policy) |
| Uptime monitor (external) | — | — | not set up; the 30-min GitHub check covers it (see Watch layers) |
| Paging | — | — | N/A: solo owner; alerts are GitHub issues → email |

## Secrets and settings map (names only, never values)

| Name | Kind | Where | Used by |
|---|---|---|---|
| `ASTRO_SITE`, `ASTRO_BASE`, `ACK_UNVERIFIED` | build env (not secret) | `deploy.yml` | production build |
| `VERIFY_RELAX` | build env, **preview only** | `preview.yml`, local | never in production |
| `CLOUDFLARE_API_TOKEN` | repo secret, **not set** (2026-11-24) | GitHub → Actions secrets | `admin-preview.yml` (Workers deploy scope only) |
| `CLOUDFLARE_ACCOUNT_ID`, `ADMIN_DEPLOY_BRANCH` | repo variables (set) | GitHub → Actions variables | `admin-preview.yml` |
| `ADMIN_PREVIEW` | repo variable, **not set** | GitHub → Actions variables | turns `admin-preview.yml` on; every run so far was skipped |
| `GITHUB_TOKEN`, `ALLOWED_EMAILS` | Worker secrets | Cloudflare → `drkanani-admin` | admin CMS writes; who may sign in |
| `ACCESS_AUD`, `ACCESS_TEAM_DOMAIN`, `ADMIN_ORIGIN`, `ADMIN_REBUILD`, `CONTENT_BRANCH` | Worker vars | `workers/admin/wrangler.toml` | admin CMS |
| `RESEND_API_KEY`, `MAIL_TO` | Worker secrets | Cloudflare → `drkanani-appointment-email` | relay |
| `ALLOWED_ORIGIN`, `MAIL_FROM` | Worker vars | `workers/appointment-email/wrangler.toml` | relay |

Rotating any secret is the owner's action (Cloudflare / GitHub / Resend
dashboards). The agent updates code to match, never handles the value.

## Secret scanning

- GitHub secret scanning and push protection: on.
- `gitleaks` on every PR (commits in the PR) and weekly over the full history
  (`scheduled-check.yml` → security). Findings are redacted in the logs.
- A real hit means the credential is compromised: the owner rotates it first;
  on this public repo, assume it was already copied.

## Backups and restore

| Data | Where it lives | Backup | Restore |
|---|---|---|---|
| Site code and content (incl. Edit Mode saves) | git, GitHub | every clone is a full copy | `git revert` / redeploy any commit |
| Images | `src/assets`, `public` in git | same | same |
| Appointment requests | the clinic's email inbox only (no database) | the mail provider's | N/A for the site |
| Worker config | `wrangler.toml` in git; secrets in Cloudflare | secrets are re-enterable by the owner | redeploy with `wrangler deploy` |

RPO/RTO: no server state to lose. Target time to restore the public site:
under 1 hour (revert + ~5 min deploy).

## Reliability targets (SLOs, 28-day windows)

| Journey | SLI (measured by) | SLO | Error budget |
|---|---|---|---|
| Site is up and correct | share of 30-min smoke checks that pass (`scheduled-check.yml` smoke) | 99.5 % | 1,344 checks/28 d → **6 failed checks** (~3 h) |
| Edits go live | share of `main` commits live within 45 min (smoke build check) | 98 % | 1 in 50 deploys |
| Fast on mobile | share of daily Lighthouse runs within budget on all three homes (perf ≥ 90, LCP ≤ 2.5 s, CLS ≤ 0.1) | 95 % | 1 day in 28 |

Missing runs are **unknown coverage**, never counted as good. When a budget is
spent, the next cycle is reliability work (the owner decides in the weekly
review).

## Watch layers

| Layer | Status | What it does |
|---|---|---|
| Scheduled CI check | `.github/workflows/scheduled-check.yml` | smoke every 30 min, Lighthouse daily, gitleaks + npm audit weekly; opens one issue per failing check |
| External uptime monitor | not set up (optional) | would catch a GitHub Actions outage too; owner creates an UptimeRobot / Better Stack account (free) checking `/he/` every 5 min |
| AI watch routine | not set up (optional) | a read-only `/schedule` routine could summarise the open alert issues weekly |

Everything scheduled is read-only: GET/OPTIONS against production, issues as
the only write. Nothing automated changes production.

## Runbook

### Deploy
Merge a PR to `main` (owner only), or save in Edit Mode. `deploy.yml` runs the
gates and publishes. Confirm with `curl https://www.drkhalilkanani.com/build.txt`
= the merge SHA. `retry-deploy.yml` re-runs a failed deploy once.

### Roll back
1. `git revert <bad-sha>` on a branch → PR → owner merges (or, in an outage,
   the owner pushes the revert to `main` directly).
2. Wait for `deploy.yml` (~5 min); confirm `build.txt`.
3. Never revert past a commit that removed patient media (AGENTS.md §3.2).

### Incident response

| SEV | Meaning | First response |
|---|---|---|
| SEV1 | site down, a locale broken, enquiries failing, a privacy or legal exposure (e.g. a patient image or wrong fact published) | within 1 h: acknowledge the issue, revert or take the item down, then fix |
| SEV2 | a page or feature broken, deploy stuck, performance budget breached | same day |
| SEV3 | cosmetic, one-off check flake | next weekly review |

Steps: acknowledge on the alert issue → mitigate (revert) → confirm with
`node scripts/ops/prod-check.mjs smoke` → fix forward via PR → write a short
review in `docs/company/09-reviews/` with an `I-NNN` id, linking the causing
deploy `D-NNN` (or "not deploy-related"), and update the deploy log in
`BUILD-STATE.md`.

Status note for the clinic (only if patients were affected):
> The website had a problem between <time> and <time>. It is fixed. If you
> sent an appointment request during that time, please call or WhatsApp us.

### Run the checks by hand
```bash
EXPECTED_SHA=$(git rev-parse origin/main) COMMIT_AGE_MIN=999 node scripts/ops/prod-check.mjs smoke
gh workflow run scheduled-check.yml -f check=all     # after this file is on main
```
