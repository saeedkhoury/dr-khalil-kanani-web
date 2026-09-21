# Removing the patient images from public Git history

**Status: RECOMMENDATION ONLY. Nothing here has been executed.**
Every step below is irreversible or externally visible, so each one needs the
owner's explicit go-ahead. This document exists so that decision can be made
with the facts in front of you rather than under pressure.

**Written:** 2026-09-21

**Phase 3 follow-up:** the branch has now been pushed and
[draft PR #1](https://github.com/saeedkhoury/dr-khalil-kanani-web/pull/1) is open.
The preservation prerequisite below is complete. No visibility change or
history rewrite has been performed; the remediation decision remains open.

---

## 1. What is actually exposed

| | |
|---|---|
| Files | 13 JPEGs, ~2.0 MB total |
| Content | Patient before/after dental photography |
| Added in | `7cd7ea5` (2026-09-21), by a `git add -A` that swept the directory |
| Removed in | `e822ce7` — removed from the **tree**, not from **history** |
| Repository | `saeedkhoury/dr-khalil-kanani-web` — **public**, 0 forks |
| Reachable how | `git clone` then `git log`, or a direct blob URL on github.com |

**Verified facts, not assumptions:**

- The images were **never referenced by any page**. Nothing imported them, so
  Astro never processed them and they were never in `dist/`. **The live website
  never served them.** The exposure is the repository, not the site.
- They are **not in the current tree** (`git ls-files` → 0 matches).
- The working copies now live in `.private-assets/`, which is gitignored and
  guarded by `scripts/check-assets.mjs`.
- 0 forks at the time of writing, which materially limits the blast radius.

**What I cannot verify:** whether anyone cloned, mirrored or indexed the
repository between 2026-09-21 and now. Public repositories are crawled by
archives and code-search indexes as a matter of routine. Treat the images as
having been publicly available and act accordingly — do not assume nobody
looked.

## 2. Why this matters beyond tidiness

Two separate regimes are engaged, and they are the owner's exposure, not the
developer's:

- **תקנות רופאי השיניים (פרסומת אסורה), תשס"ט-2009** — publishing patient
  images in connection with a dental practice is prohibited, reportedly even
  with consent. Liability is criminal and is not shifted by outsourcing.
- **Protection of Privacy Law, Amendment 13** (in force 14 Aug 2025) — health
  data is sensitive personal data. Depending on the facts, an exposure may
  carry notification duties.

**This is legal exposure, and I am not a lawyer.** Dr. Kanani should get an
opinion from a lawyer familiar with Israeli medical privacy before deciding
whether notification is required. Deleting the evidence first can make that
conversation harder, which is one argument for option A below.

## 3. The options

### Option A — Make the repository private *(recommended first move)*

```bash
gh repo edit saeedkhoury/dr-khalil-kanani-web --visibility private --accept-visibility-change-consequences
```

- **Time:** seconds. **Reversible:** yes.
- **Stops:** all further public access, including to history and blob URLs.
- **Does not:** remove anything already copied, or clean history.
- **Side effects:** GitHub Pages from a private repo requires a paid plan on
  personal accounts. **Check this before running it or the live site goes
  down.** If the plan does not cover it, move Pages to a separate public
  repository that contains only `dist/`, or host elsewhere.

This is recommended first because it is fast, reversible, and buys time to do
the rest carefully instead of in a hurry.

### Option B — Rewrite history, then force-push

```bash
# From a FRESH clone, never the working copy:
git clone --mirror https://github.com/saeedkhoury/dr-khalil-kanani-web.git
cd dr-khalil-kanani-web.git

# Keep a full backup outside the repo before touching anything.
cp -R . ~/backup-dr-kanani-repo-$(date +%Y%m%d).git

pipx install git-filter-repo   # or: brew install git-filter-repo
git filter-repo --path-glob 'src/assets/images/PHOTO-2026-*' --invert-paths

git push --force --mirror
```

**What this achieves:** the blobs become unreachable from any branch or tag.

**What it does NOT achieve, and this is the part people get wrong:**

> Force-pushing does **not** delete the objects from GitHub. They remain
> retrievable by direct SHA URL until GitHub garbage-collects them. You must
> **open a GitHub Support ticket** asking them to purge the cached views and
> run GC. Until they confirm, the images are still fetchable by anyone who
> recorded a commit SHA.

**Risks:**

| Risk | Severity | Mitigation |
|---|---|---|
| Every commit SHA after the rewrite point changes | Certain | Only `main` exists and only you have a clone. Re-clone afterwards; do not `git pull` into the old copy. |
| Any un-pushed local work is stranded | High if it exists | Push or stash everything first. Phase 3 has now been pushed; check for any newer local work. |
| Open PRs break | PR #1 is now open | Preserve its work and plan to recreate/rebase the PR after rewriting. |
| Pages deployment re-runs | Low | The workflow rebuilds from source; content is unchanged. |
| Backup taken after the rewrite is worthless | High | Take the backup first, as above. |
| The rewrite looks complete but is not | Medium | Verify: `git log --all --oneline -- 'src/assets/images/*'` must print nothing, in a **fresh** clone. |

### Option C — Delete the repository and push a fresh one

Strongest guarantee, and the only one that does not depend on GitHub's GC
schedule. Costs the entire commit history, the Actions history, and the Pages
configuration, all of which must be rebuilt. Reasonable only if history has no
value to you.

## 4. Recommended sequence

1. **Push `feature/phase-3-premium-upgrade`** so no work is stranded. **Done.**
2. **Tell Dr. Kanani** what happened, in plain terms. He cannot take legal
   advice about an exposure he has not been told about.
3. **Confirm the Pages/private-repo plan question**, then **Option A**.
4. **Get the legal opinion** on notification duties.
5. **Then Option B**, with the backup taken first, followed by a **GitHub
   Support ticket**, followed by verification from a fresh clone.
6. Consider keeping the repository private permanently. It is a single clinic's
   marketing site; there is no benefit to it being public, and this incident is
   the second-best argument for that. The first is that it contains the clinic's
   entire content pipeline.

## 5. Why this cannot happen again

Already in place, committed in `e822ce7`:

- `scripts/check-assets.mjs` — blocks any commit containing an image that is
  not registered in `src/data/media.ts`. Registration requires a category and
  alt text in three languages, which is impossible to write without having
  opened the file.
- `.githooks/pre-commit`, wired by `npm run prepare`.
- `AGENTS.md` §3.2 — `git add -A` is banned outright.
- `docs/ASSETS.md` — "Open every image before you commit it. No exceptions."

The guard cannot recognise a patient photograph. What it enforces is that a
human classified the file before it entered a commit. That is the control that
was missing on 2026-09-21.
