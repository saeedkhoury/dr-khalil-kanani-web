# Removing the patient images from public Git history

**Status: CLOSED — NOT ACTIONED. Superseded by the publishing decision.**

Nothing in this document was ever executed. No history was rewritten, no branch
was force-pushed, and repository visibility was not changed. The analysis below
is kept as a record of what was considered and why it was dropped.

**Written:** 2026-09-21 · **Closed:** 2026-09-21 by the owner

See [Why this was closed](#why-this-was-closed) at the end before reading the
options — they no longer apply.

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

---

## Why this was closed

The owner reviewed this document on 2026-09-21 and chose not to proceed. The
reasoning, recorded so a future reader does not reopen it from scratch:

### The premise no longer held

This plan was written on the assumption that the images were never intended to
be public. That assumption was overtaken by the owner's own subsequent
decisions:

- Three of the twelve unique images were published to the live website under
  [ADR 0009](./decisions/0009-owner-directed-instagram-gallery.md), at the
  owner's explicit instruction.
- The owner then approved publishing the remaining nine.

Once every one of those images is deliberately served from the homepage,
removing them from Git history protects nothing. A photograph on the front page
is not made private by scrubbing a copy of it out of a commit.

### What was verified before closing

Checked on 2026-09-21, so the decision rests on facts rather than assumption:

| Check | Result |
|---|---|
| Repository visibility | Public, 0 forks |
| Original 13 files in history | Present |
| Files in the working tree | 3, byte-identical (md5) to quarantined originals |
| Those 3 live on the website | Yes, serving from `drkhalilkanani.com` |
| EXIF / GPS / IPTC / XMP in the committed JPEGs | **None** |

The EXIF check mattered independently of the publishing decision: Git stores
the source JPEG with whatever metadata it carries, while the `.webp` and
`.avif` derivatives Astro generates are re-encoded and carry none. Had the
sources held GPS coordinates or device identifiers, that would have been a
live exposure that publishing did not cover. They do not — the `PHOTO-2026-…`
filenames are a WhatsApp export pattern, and WhatsApp strips this metadata.

### Weighed against the cost

A history rewrite changes every commit SHA after the rewrite point, strands
existing clones, and — the part most often missed — does **not** delete the
objects from GitHub. They stay retrievable by direct SHA URL until a GitHub
Support ticket is processed. That is a real operational risk in exchange for no
privacy benefit.

### What this closure does NOT decide

Three things are explicitly out of scope, and closing this document does not
resolve any of them:

1. **Whether publishing patient imagery is lawful.** That question is untouched
   by anything Git does and is unchanged by this closure. It remains an open
   item for Israeli counsel. Nothing here is legal advice or a legal
   conclusion, and no assumption has been made on the owner's behalf.
2. **Approval for any further images.** This closure covers the assets the
   owner has individually approved. It is not blanket approval. Any new asset
   requires its own review and its own explicit instruction, exactly as
   ADR 0009 states.
3. **Repository visibility.** Unchanged, and deliberately so. If the repository
   is ever made private, note that GitHub Pages from a private repository
   requires a paid plan on personal accounts — changing visibility without
   checking would take the live site down.

### The control that stays

The reason this incident happened — an unreviewed `git add -A` — is addressed
by controls that remain in force and must not be removed:

- `scripts/check-assets.mjs` blocks any commit containing an image that is not
  registered in `src/data/media.ts`. Registration demands a category and alt
  text in three languages, which cannot be written without opening the file.
- `.githooks/pre-commit`, wired by `npm run prepare`, runs it on every commit.
- `AGENTS.md` §3.2 bans `git add -A` for anything that could include media.
- `docs/ASSETS.md`: "Open every image before you commit it. No exceptions."

All four were verified present and working at closing time. Closing this
document changes none of them.
