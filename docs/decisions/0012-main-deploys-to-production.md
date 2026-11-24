# ADR 0012 — `main` deploys straight to production; protection comes from gates, not a staging hop

**Status:** Accepted · 2026-11-24 (records the existing setup; no pipeline change).

## Context

Generic DevOps practice (and the pro-build playbook) says merging to `main`
should deploy to staging, with production promoted separately from an
already-built artifact. This site does the opposite on purpose:

- The doctor edits content in Edit Mode (ADR 0010). Each save is a commit to
  `main`, and `deploy.yml` publishes it. A staging hop would mean every
  content edit waits for a developer to promote it, which defeats the editor.
- GitHub Pages allows one deployment per repository, so there is no second
  hosted environment to stage on (docs/DEPLOYMENT.md).
- The site is static: no database, no server state, no migrations. A bad
  deploy is undone by reverting a commit, and the previous build is one
  re-run away.

## Decision

1. **`main` is production.** `deploy.yml` stays as it is.
2. **Protection comes from gates that block the deploy**, in parallel jobs:
   data schema, claims, mixed scripts, asset guard, type check, unit tests,
   strict build with the launch gate, built-HTML accessibility, SEO crawl,
   and the sharded Playwright/axe suite. A failing gate means nothing ships.
3. **No branch protection that requires PR checks on `main`.** It would block
   the CMS's direct commits. Developer changes still go through a pull
   request (`preview.yml` + the new `security` job), and only the owner
   merges.
4. **Watch after the fact.** `scheduled-check.yml` checks every 30 minutes
   that production serves the tip of `main` and that the pages, language
   direction and appointment relay are healthy, and opens an issue if not.
5. **The admin Worker is separate.** It deploys from `ADMIN_DEPLOY_BRANCH`
   via `admin-preview.yml` and is covered by its own tests and Cloudflare
   Access.

## Consequences

- Release = merge. The deploy log in `BUILD-STATE.md` records each production
  deploy as merge → live, so DORA lead time is the CI duration (~4 min).
- Rollback = `git revert` on `main` (see the runbook in
  `docs/company/04-platform.md`). There is no "promote previous build".
- Revisit if the site ever gets a server, a database, or paying customers;
  then add a staging environment before production (pro-build stage 4).
