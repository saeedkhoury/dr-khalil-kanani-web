# Admin CMS recovery and local re-audit

Date: 2026-09-24. Branch: `feat/admin-cms`. The original remediation result
was **PASS** at `3da2328`; after post-audit image and font hardening, the
current strict local audit result is **PASS**. The seven infrastructure rows
remain BLOCKED.
No push, merge, deployment, remote mutation, real credential use, or infrastructure configuration was performed.

## Post-audit pre-production hardening — 2026-09-24

The earlier PASS at `3da2328` was reopened after a read-only reviewer found
**N-3 — MEDIUM: a header-only image could be committed.** The old PNG check
returned dimensions after 24 bytes; the old JPEG check returned at its first
frame header. Neither established that the file contained a complete image
envelope. The upload route could therefore commit malformed bytes before a
build or browser discovered the failure.

Commit `2e1087e` keeps JPEG and PNG support and rejects incomplete structure
before any GitHub write. PNG validation now bounds every chunk, checks IHDR,
valid bit-depth/color combinations, palette placement, contiguous nonempty
IDAT, the final IEND and every chunk CRC. JPEG validation bounds every marker
segment, checks a frame and scan header, requires scan data and a final EOI,
and rejects trailing bytes. All loops advance through at most the uploaded
bytes; no attacker-controlled length allocates memory or permits a read past
the buffer. The Worker does **not** decompress pixels or transform an image:
a well-framed file with corrupt compressed pixels can still fail the Astro
decoder, so publication status remains authoritative.

The new regressions reject PNG signature-only, IHDR-only, partial/oversized
chunks, missing IDAT/IEND and bad CRC; JPEG SOI/header-only, truncated or
malformed segments, missing EOI and trailing bytes. Real repository PNG/JPEG
and a complete 16×16 PNG fixture pass parsing; the small fixture still fails
the 1200px upload rule. Route tests prove malformed, oversized and undersized
payloads make no GitHub mutation. Existing tests still cover SVG/HTML/random
bytes, generated filename/path boundaries, treatment-work isolation, claims,
Access and Origin checks. **N-3 after fix: PASS.**

The same commit corrects the production GitHub token documentation: the
Worker sends an authenticated request to the workflow-runs endpoint, which
GitHub documents as requiring **Actions: Read** for a fine-grained token.
Contents read/write remains required for file operations and commit discovery;
the token is restricted to one repository, with no Workflows write. Real-token
behavior remains **BLOCKED** until approved integration testing.

Final clean-checkout regression at this hardening state: `npm ci` installed
304 packages; `lint:data`, `lint:claims`, the full asset guard, `npm run
check`, `npm run verify`, and the strict production build passed with the
existing exact acknowledgement and no `VERIFY_RELAX`. The complete unit suite
passed **421/421** (70 suites); the separate admin subset passed **260/260**,
and the appointment subset **37/37**. Playwright passed **52/52**, with its
axe checks; the built-HTML audit passed **47/47** pages.

The preserved public baseline contains 128 files. The final clean checkout at
this HEAD produced **128 files with zero byte differences**. Another fresh
cold build of the same source received a different Google-hosted Noto Sans
Hebrew response and produced 128 files with **two font files added, two
removed, and 17 HTML files changed**. Removing only inline font styles and
font preloads makes all 17 HTML files byte-identical. No baseline was updated.
Because the font fetch is not pinned, the required unconditional
cold-build zero-difference check is **FAIL**, even though the CMS change does
not alter public rendering with a constant dependency. Stabilizing that fetch
is outside this owner's narrow hardening authorization.

At this earlier hardening point, the reconstructed matrix was **53 PASS / 1 FAIL / 7 BLOCKED**: R54 was
the cold-build public-output failure. N-3 is recorded separately because it
was discovered after the original audit and is now corrected. The seven
infrastructure rows remain BLOCKED; no mock has converted them to PASS.
**LOCAL CODE AUDIT: FAIL at the image-hardening handoff** under the owner's strict byte-identical acceptance
gate. The remaining failure is the pre-existing font-fetch reproducibility
issue, not an unresolved image-validation defect. No production-readiness
claim is made.

## Post-audit deterministic-font remediation — 2026-09-24

Commit `3943e50` replaces Astro's Google font provider with its local provider
for Noto Sans Hebrew, Noto Sans Arabic, and Noto Sans. The four checked-in WOFF2
payloads are byte-for-byte identical to the four font files in the preserved
accepted output and to the recorded Google Fonts CDN responses. They cover the
same scripts and the existing 300/400/600/700 normal weights. Source URLs,
SHA-256 hashes, and the three bundled SIL OFL 1.1 licenses are in
`docs/FONTS.md`. No other external build-time asset fetch was found in the
site config or source. There is no external font request in the new config.

The production build succeeded after clearing Astro's font cache while a macOS
sandbox denied outbound network except localhost (needed by Astro's internal
font server). A control request to `fonts.gstatic.com` failed inside the same
sandbox. This proves the build does not require the external font service.

Two independent detached clean worktrees at `3943e50` each ran `npm ci` from
the same lockfile, with separate `node_modules`, empty Astro caches, and the
same production `ASTRO_SITE` and exact three-field `ACK_UNVERIFIED`. Each built
47 pages and 128 output files. Complete SHA-256 manifests were compared:

| Build | Files | SHA-256 output-tree digest |
|---|---:|---|
| Clean A | 128 | `5a2ebe4065e878b6e8f3953fab969bc2f23d8ded60598bca8cf7ef620c395ab6` |
| Clean B | 128 | `5a2ebe4065e878b6e8f3953fab969bc2f23d8ded60598bca8cf7ef620c395ab6` |

A vs B: **0 added, 0 removed, 0 changed**. The tree digest hashes sorted
`relative-path`, NUL, file SHA-256, newline records. The accepted baseline
remains unchanged and has digest
`097f813cbfa50f58d0bfbb00acef81baf7b49dad5390addb809d650c1f44c5ea`.
Baseline vs A: **4 generated font paths added, 4 removed, 47 HTML files
changed**, with 128 files in each tree. The four new font payloads each match
one removed baseline font payload byte-for-byte. All 47 HTML files are
byte-identical after removing only Astro's inline font style and font-preload
elements. The one-time difference is the local provider's generated names and
more compact variable-weight font CSS, not site content or font glyphs. The
baseline was **not** rewritten or accepted by substitution.

Chromium screenshots of the homepage at 375px and 1440px in Hebrew, Arabic,
and English were pixel-identical between baseline and local-font builds;
representative About pages were also compared at both widths. The actual
Noto font loaded in every locale; `lang` and RTL/LTR `dir` values remained
correct. Preload counts stayed two for Hebrew and one each for Arabic and
English; no duplicate font payloads were emitted.

Full regression from clean worktree A passed `lint:data`, `lint:claims`, the
17-media full asset guard, `npm run check`, `npm run verify`, and the production
build without `VERIFY_RELAX`; Astro reported zero diagnostics. Unit tests:
**422/422** (70 suites), including the new local-font hash/provider regression
and the previously fixed malformed-image tests. The Admin Worker subset passed
**260/260**; appointment Worker subset **37/37**. Playwright passed **52/52**
with axe checks; the built-HTML accessibility audit passed **47/47** pages.

R54 is now **PASS** for deterministic builds. The seven infrastructure rows
remain **BLOCKED** and were not simulated into PASS. **LOCAL CODE AUDIT: PASS**
for the local repository; production readiness is not claimed.

## Recovery evidence

The supplied audit reference was `06328fa0cbd0c883a5d9b08eb01767601139d308`.
On takeover, HEAD was `050dc48`, on the expected branch; `origin/main` was still
`483dcf2`. No reset, cleanup, checkout overwrite or history rewrite was used.
The complete branch history, staged diff, working diff and origin/main diff
were inspected before implementation.

| Recovered change | Classification | Evidence / disposition |
|---|---|---|
| `4e925c2` — Access configuration guard, H-3 | COMPLETE AND VALID | Existing 39 auth tests passed; added non-string cases; two guard mutations fail tests. Preserved. |
| `050dc48` — filename bound and explicit CI data gates, L-1/M-3 | COMPLETE AND VALID | 64/65-character and traversal tests; both workflow contract tests. Preserved. |
| Staged deletion of `scripts/lint-claims.mjs`; untracked replacement `scripts/lint-claims.ts` and shared `src/lib/claims.ts` | PARTIAL | Rule extraction was sound, but raw JSON scanning could miss escaped claims or discard comment-like content; no new claims tests existed. Finished with decoded JSON scanning and regressions. |
| Modified `package.json`, `workers/admin/src/media.ts`, `ui/client.ts`, `ui/strings.ts` | PARTIAL | Shared Worker rules and useful Hebrew errors were implemented but uncommitted and untested. Preserved and tested. |
| Untracked `.agents/` | UNRELATED | Left untracked and untouched; never staged. |

There were no other post-audit commits or uncommitted tracked files. No complete
valid fix was replaced with a stylistic alternative. H-2, M-1 and M-2 had not
been started. No recovered change was classified INCORRECT as a whole; the
claims scanner's bypass was an incomplete enforcement path within partial work.

## Remediation commits

| Commit | Scope |
|---|---|
| `7a21113` | Finish H-1: shared rules, decoded CMS JSON, Worker refusal, localized validation errors, tests |
| `0f09e55` | H-2: guarded About-page clinic gallery and browser fixtures |
| `564f6b2` | M-1: repository inventory; M-2: paginated discovery and exact deployment status; N-1 below |
| `1119333` | N-2: stale hours precondition and removal of overwrite retries |
| `0f8458f` | H-3: non-string configuration regression cases |

The final documentation commit follows these implementation commits. Use
`git rev-parse HEAD` for its identity; a document cannot embed its own commit SHA.

## Before / fix / test / after

| Finding | BEFORE | FIX | TEST | AFTER |
|---|---|---|---|---|
| H-1 | CMS data outside claims scan | One unchanged authoritative rule list in `src/lib/claims.ts`, shared by CLI and Worker. Decode JSON strings before checking all CMS alt/caption locales. | `claims.test.ts`: he/ar/en, Unicode escapes, comment-like strings, alt and caption; `admin-media.test.ts`: refusal before writes in all three languages | PASS |
| H-2 | Clinic photography had no public consumer | About page calls `hasClinicPhotography()` then existing `ClinicGallery kind="clinic"`; homepage/work collection unchanged | Six new browser cases, three locales × 375/1440; published only, Arabic-seeded English alt, lightbox direction/focus/axe; empty and all-unpublished output byte comparison | PASS |
| H-3 | Undefined audience disabled audience verification | Preserve pre-verification string/nonempty guard, trimmed values, no defaults | Missing/undefined/empty/whitespace/null/number/object settings; valid padded settings; wrong issuer/audience; guard removal causes 4 failures, unbound audience mutation causes 3 | PASS |
| M-1 | Manifest-only allocation reused orphan names | Fixed-directory repository inventory plus manifest names; extension-independent slots 01–99; create without overwrite SHA | Empty, manifest collision, orphan, several occupied slots, race conflict, 99-slot exhaustion, malformed/API failure/truncated inventory | PASS |
| M-2 | Latest lookup silently stopped after 20 commits | Known SHA goes directly to deployment workflow API. Latest discovery pages data history against a fixed SHA; exhaustion reports unavailable, never no-change | 101 newer commits; no history request for known SHA; old-success mismatch, newer failure, unknown conclusion, API failure, malformed/truncated result, exhausted discovery budget | PASS |
| M-3 | CI omitted explicit data check | Preserve early `npm run lint:data` in both workflows | Workflow contract tests and clean verification | PASS |
| L-1 | Filename pattern had no independent length limit | Preserve separate 64-character cap for path and commit subject | Normal, exactly 64, 65, 5,007 characters; traversal and forbidden extension still refused | PASS |

No English translation was invented. Creation still copies Arabic into English
and records `needsEnglishReview: true`; state changes preserve that flag.
No clinic fact was promoted to verified and no production media was added.

## Additional findings, separately assessed

**N-1 — HIGH: unrelated workflow success could be called publication.**
The old repository-wide Actions endpoint was filtered by SHA but not workflow.
A successful preview or unrelated workflow could therefore produce “published”
without a production deployment. Impact: incorrect publication indicator, not
authentication or write access. After identifying that scope, the M-2 status
change was restricted to `deploy.yml`, configured branch and exact returned
`head_sha`. The test asserts that exact endpoint and refuses a mismatched SHA.
Resolved in `564f6b2`; AFTER: PASS. Real GitHub permissions and deployment
propagation remain integration checks, not a mock-based production claim.

**N-2 — HIGH: hours could silently overwrite another editor's work.**
The form's loaded revision was discarded and a 409 was retried against a newer
blob. Replacing a whole week is idempotent but is not safe optimistic concurrency.
Impact was established before expanding the fix: stale form saves and races
between the server read and write could both lose newer edits. This conflicts
with the owner's explicit “no silent stale-SHA overwrite” requirement, which
supersedes the old plan's retry prescription. The API now requires the form's
SHA as a precondition, compares it to its own repository read, and never retries
writes. The panel reports conflict and reloads for review. Separate unit and
browser tests prove both stale-form and write-race refusal. Resolved in
`1119333`; AFTER: PASS.

These are distinct from the seven supplied findings, not folded into their
historical count. No other new HIGH or CRITICAL defect was confirmed.

## Re-audit and verification

Implementation HEAD `0f8458f` was checked in a detached clean worktree with a
fresh `npm ci`, using the committed lockfile. The only configured identities,
JWTs, JWKS and GitHub responses in tests are generated or example fixtures.

| Check | Exact result |
|---|---|
| Fresh install | 304 packages installed; npm reported 0 vulnerabilities |
| `npm run verify` | PASS: claims, mixed scripts, data, full asset guard, Astro check |
| `lint:data` | 7 days, 0 clinic photos; PASS |
| Full asset guard | 17 registered media files; PASS |
| Astro check | 0 errors, 0 warnings, 0 hints |
| Complete unit suite | 418 passed, 0 failed, 0 skipped; 70 suites |
| Admin Worker suite, separately rerun | 257 passed, 0 failed; subset of the 418, not additional tests |
| Appointment Worker suite, separately rerun | 37 passed, 0 failed; subset of the 418 |
| Playwright | 52 passed, 0 failed; Chromium, local servers, no real outbound mutation |
| Built HTML audit | 47 pages clean: headings, ids, alt, names, language/direction |
| axe | Zero violations in all tested public/admin/fixture states |
| Production build | PASS using existing `ASTRO_SITE` and exact `ACK_UNVERIFIED=doctor.ar,doctor.en,tagline.ar`; no `VERIFY_RELAX` |
| Public output | Preserved `/tmp/dist-baseline`: 128 files, 47 HTML, zero added/removed/changed |
| All-unpublished fixture | Isolated copy, one unpublished record: 128 files, zero changed, no clinic section in he/ar/en |
| H-3 mutations | Guard removed: 4 failing tests; audience unbound: 3 failing tests; mutation copies discarded |
| Current-tree secret scan | 190 tracked files at implementation HEAD; zero credential-pattern hits; no secret values emitted |
| Visual inspection | Opened six populated About screenshots: he/ar/en at 375 and 1440 pixels |

Source review and negative tests rechecked header-only authentication, JOSE
RS256/JWKS/kid/issuer/audience/time checks, trim/lowercase-only authorization,
CSRF/origin, JSON and size guards, fixed repository/branch/path boundary,
treatment-work isolation, hours, image headers/dimensions, generic errors,
secret non-disclosure and publication status. The scanner is a current-tree
pattern check, not a claim that all historical secrets or patient assets have
been purged. Existing Git-history remediation remains outside this task.

The baseline comparison followed the repository's phase-1 recipe: compare the
relative filename sets and every file's bytes. The preserved baseline was not
modified. The prior report's `feb3e37b…` digest was not used as a substitute for
comparison or claimed as independently reproduced with an unknown digest recipe.

Raw local verification logs and comparison manifests are in
`/tmp/kanani-remediation-evidence/`. These are local ephemeral evidence; the
committed regression tests and reproduction commands are durable.

### Availability bounds

Image inventory refuses 1,000 or more entries because the Contents API may be
truncated. Allocation itself has 99 slots per category. Latest-status discovery
reads at most ten pages of 100 data-history commits; it reports unavailable if
no answer can be proved within that budget. It does not incorrectly report
that no CMS commit exists. Known-SHA status has no history window. A response
with 100 workflow runs is conservatively unavailable rather than potentially
ignoring an unseen failure. These are explicit failure states, not successes.

The endpoint choices follow GitHub's official
[commit listing parameters](https://docs.github.com/en/rest/commits/commits#list-commits)
and [workflow-specific run API](https://docs.github.com/en/rest/actions/workflow-runs#list-workflow-runs-for-a-workflow).

## Reconstructed 61-requirement matrix

The supplied report states **48 PASS / 6 FAIL / 7 BLOCKED**, but its original
61 rows and identifiers were not present in the repository or attached request.
The owner was asked for their location. This is a transparent reconstruction
from the approved design, implementation plan, phase specifications and the
current request, not a claim to have recovered the original row numbering.
The seven finding results above are tracked separately; seven findings do not
imply seven original failed requirement rows.

| ID | Requirement | Evidence | AFTER |
|---|---|---|---|
| R01 | Assertion header is authoritative | admin-auth / admin-worker | PASS |
| R02 | Cookie alone never authenticates | admin-auth / admin-worker | PASS |
| R03 | JOSE with explicit RS256 | auth source + algorithm-swap tests | PASS |
| R04 | Real signature and JWKS verification | generated RSA/JWKS negative tests | PASS |
| R05 | Unknown kid refused | admin-auth | PASS |
| R06 | Issuer verified | admin-auth | PASS |
| R07 | Audience verified including array cases | admin-auth | PASS |
| R08 | Expired and not-yet-valid assertions refused | admin-auth | PASS |
| R09 | Clock tolerance bounded | auth source, 60 seconds | PASS |
| R10 | Nonempty email required | admin-auth | PASS |
| R11 | Only trim/lowercase normalization | dot and plus-tag tests | PASS |
| R12 | Server allowlist defaults to deny | admin-auth / admin-worker | PASS |
| R13 | Invalid Access settings fail closed | H-3 tests and mutations | PASS |
| R14 | No request/env authentication bypass | admin-worker structural/route tests | PASS |
| R15 | Authentication failures disclose no configuration | admin-worker response tests | PASS |
| R16 | GitHub token remains server-side | admin-security response and source tests | PASS |
| R17 | Explicit routes and HTTP methods | admin-worker | PASS |
| R18 | Same-origin mutations, no permissive CORS | admin-hours / admin-media / admin-http | PASS |
| R19 | JSON and request-size validation | admin-http / admin-hours / admin-media | PASS |
| R20 | CSP, no-store and security headers | admin-http / admin-ui / browser | PASS |
| R21 | Fixed GitHub owner/repository | admin-security exact request assertions | PASS |
| R22 | Explicit server branch, no main fallback | admin-security | PASS |
| R23 | Narrow WriteTarget path allowlist | traversal / unknown target tests | PASS |
| R24 | Safe filename extension and independent bound | L-1 tests | PASS |
| R25 | Fixed commit template, no injected user text | admin-security | PASS |
| R26 | Optimistic concurrency without stale overwrite | N-2 stale form/race/client tests | PASS |
| R27 | Exactly seven ordered days | data-schema / admin-hours | PASS |
| R28 | Valid opening/closing times | admin-hours | PASS |
| R29 | Closed-day normalization | admin-hours + browser | PASS |
| R30 | Shared schema validation before data publication | data-schema / lint:data | PASS |
| R31 | CMS cannot reach treatmentWork mutations | category rejection + fixed-path structural boundary | PASS |
| R32 | Image format from bytes; SVG rejected | admin-media / image source | PASS |
| R33 | Image size cap and dimension floor | admin-media | PASS |
| R34 | Explicit patient-content confirmation | admin-media + browser | PASS |
| R35 | Arabic-seeded English stays flagged for review | creation and state-preservation tests | PASS |
| R36 | Publish/unpublish preserves other fields | admin-media | PASS |
| R37 | Permanent delete only from unpublished state | admin-media + browser | PASS |
| R38 | Allocation includes repository orphans | M-1 route tests | PASS |
| R39 | CMS alt/caption claims blocked by publication controls | H-1 CLI regressions | PASS |
| R40 | Save-time claims give useful validation errors | H-1 Worker tests + UI issue mapping | PASS |
| R41 | Published clinic photography renders publicly | H-2 About fixture browser tests | PASS |
| R42 | Unpublished/empty collection emits no shell | browser and all-unpublished build comparison | PASS |
| R43 | Locale alt fallback and both text directions | six fixture browser cases and screenshots | PASS |
| R44 | Developer-managed work gallery unchanged | baseline bytes and existing work-gallery browser tests | PASS |
| R45 | Tracked SHA survives more than 20 newer commits | M-2 101-commit and direct-SHA tests | PASS |
| R46 | Only exact deployment can mean published | N-1 workflow endpoint + SHA tests | PASS |
| R47 | Unknown/failing/API states never become success | admin-status | PASS |
| R48 | Status restores after browser reload | existing admin browser tests | PASS |
| R49 | Both workflows explicitly validate CMS data early | M-3 workflow contracts | PASS |
| R50 | Asset guard covers both manifests | full guard + asset regression tests | PASS |
| R51 | Types and complete unit suite pass | clean verify / 418 tests at original remediation; 421 after N-3; 422 after local-font test | PASS |
| R52 | Built headings/accessibility and browser axe pass | 47-page audit + Playwright | PASS |
| R53 | Admin Hebrew RTL, keyboard and phone UI | admin browser tests | PASS |
| R54 | Current public output remains identical in independent cold builds | A vs B: 128 files each, 0 differences, identical tree digest; one-time provider migration vs preserved baseline documented above | PASS |
| R55 | Actual Cloudflare Access application and OTP policy | Not configured/tested | BLOCKED |
| R56 | Real allowlisted identities accepted; outsiders refused | No real identities used | BLOCKED |
| R57 | Real scoped PAT and approved content-branch mutation | Mock GitHub only | BLOCKED |
| R58 | DNS/custom domain/routes and direct Worker exposure controls | No infrastructure action authorized | BLOCKED |
| R59 | WAF/rate limiting configured and tested | No infrastructure action authorized | BLOCKED |
| R60 | Actual publication workflow/permissions/propagation | Local responses only | BLOCKED |
| R61 | Supervised owner phone workflow on real deployment | Requires configured integration and owner | BLOCKED |

**Current reconstructed totals: 54 PASS, 0 FAIL, 7 BLOCKED, 0 NOT APPLICABLE.**
Every blocked row means **BLOCKED — REQUIRES PRODUCTION/INTEGRATION CONFIGURATION**.
Mocks do not change those statuses. Native-language review, real devices,
VoiceOver and legal review from the existing site handoff remain unperformed.

Remaining local audit defects: none. Another local remediation pass is not
required for these findings. Production readiness is not claimed.
