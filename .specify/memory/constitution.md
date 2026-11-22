# Dr. Khalil Kanani Website Constitution

## Core Principles

### I. Simple Code, Small Files

- Code MUST take the simplest approach that meets the spec. A new abstraction, dependency or
  client-side island MUST be justified in the plan's Complexity Tracking table.
- New source files MUST stay at or under 400 lines. No source file may exceed 800 lines.
- A file already over 400 lines MUST NOT grow. Any change that would grow it MUST first move
  code out of it.
- Functions SHOULD stay under 50 lines and MUST NOT nest more than 4 levels deep.
- Organise code by feature or domain, not by file type.

Rationale: one person maintains this site, sometimes after long gaps. Small, plain files are
what make it safe to come back to.

### II. Every Feature Ships With Tests

- Every feature or bug fix MUST include at least one automated test that fails without the
  change and passes with it. Logic goes in `tests/unit` (`npm test`). User-facing flows go in
  `tests/e2e` (`npm run test:e2e`).
- Tests MUST take their expectations from the data the page was built from. They MUST NOT
  hard-code counts, ordering, file names or copy that the owner can edit in Edit Mode.
- Tests MUST wait for conditions, never for fixed sleeps.
- A failing test MUST be fixed or the change reverted. Disabling or skipping a test needs a
  written reason in the PR.

Rationale: every Edit Mode save runs the e2e suite before deploying. A test that pins content
silently stops the owner's edits from going live.

### III. Mobile-First UI

- Every page MUST be designed and checked at 375px first, then at desktop width.
- No horizontal scrolling at 320px (WCAG 1.4.10 Reflow).
- Primary actions (call, WhatsApp, directions, booking) MUST have touch targets of at least
  44×44 CSS px and be reachable without zooming.
- The sticky mobile contact bar MUST NOT cover page or footer content.
- Each change MUST be checked in all three locales (`/he/`, `/ar/`, `/en/`), in both RTL and
  LTR, using logical CSS properties only.

Rationale: most patients find the clinic on a phone, and this site is its main way of getting
new patients.

### IV. One-Command Local Run

- On a fresh clone, after `npm install`, the single command `npm run dev` MUST serve the full
  public site in all three locales.
- It MUST NOT require environment variables, secrets, accounts, Docker or running external
  services.
- Any other part of the project (for example the admin worker) MUST also start with one
  documented command in `README.md`.
- A change that adds a local setup step MUST either automate it inside that command or be
  rejected.

Rationale: whoever opens the repository next, whether a contributor, a reviewer or a coding
agent, should be looking at the running site within minutes.

## Project Constraints

These rules come from Israeli law and the project's history. They are defined in `AGENTS.md`
and are binding here. If this constitution and `AGENTS.md` disagree, `AGENTS.md` §2's
source-of-truth order decides.

- **No invented facts** (§3.1): no credential, address, opening hour, price or qualification
  without the owner's written confirmation. The launch gate enforces this.
- **No unreviewed media** (§3.2): every image is opened, classified and registered in
  `src/data/media.ts`. Never use `git add -A`.
- **No prohibited medical claims** (§3.3): no guarantees, praise of skill, prices, success
  statistics or unrecognised specialist titles.
- **Accessibility** (§6): WCAG 2.1 AA. Heading order with no skipped levels is mandatory
  under IS 5568.
- **Privacy** (§7): collect the minimum, consent unticked by default, cookieless analytics only.
- **Client JavaScript defaults to zero** (§5): use native elements before adding an island.

## Development Workflow & Quality Gates

A change is done only when everything in the Definition of Done in `AGENTS.md` §11 holds:

1. `npm run verify` passes (claims, mixed-script, data and asset checks, plus `astro check`).
2. `npm test` passes, and so does `npm run test:e2e` for user-facing changes.
3. `npm run build` passes with the launch gate on. Production never uses `VERIFY_RELAX`.
4. `npm run lint:a11y` passes against the fresh build, and axe-core reports zero violations.
5. The change is checked in all three locales at 375px and at desktop width (Principle III).
6. `HANDOFF.md` matches reality.

Merging to `main` deploys to production and is done only by the repository owner.

## Governance

- This constitution sits above specs, plans and tasks produced by Spec Kit. It does not
  override Israeli law or `AGENTS.md` (see Project Constraints).
- Every `/speckit-plan` MUST complete its Constitution Check against Principles I–IV and the
  Project Constraints. Any departure MUST be justified in Complexity Tracking.
- Every PR review MUST confirm compliance. A change that breaks a principle without a recorded
  justification MUST NOT merge.
- Amendments are made by editing this file through a PR approved by the repository owner, with
  the version bumped as follows:
  - MAJOR: removing or redefining a principle in a way that breaks compatibility.
  - MINOR: adding a principle or section, or materially expanding guidance.
  - PATCH: wording, clarifications and typo fixes.
- Day-to-day development guidance lives in `AGENTS.md` and `CLAUDE.md`.

**Version**: 1.0.0 | **Ratified**: 2026-11-17 | **Last Amended**: 2026-11-17
