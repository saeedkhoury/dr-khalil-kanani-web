# Phase 1 — data model and safe content foundation

> **PROPOSAL ONLY. Nothing implemented.**
> Parent plan: [`2026-09-22-admin-cms-plan.md`](./2026-09-22-admin-cms-plan.md)

**Objective:** move CMS-editable opening hours and clinic photography into
structured JSON, **with zero intentional change to the public website**, while
making the asset guard stronger rather than weaker.

No Worker. No admin UI. No infrastructure. When this phase lands, the site
behaves identically and the repository is ready for a Worker that can only
touch two files.

---

## A. Exact file plan

### CREATE

| Path | Why |
|---|---|
| `src/data/hours.json` | The seven opening-hours rows, as the only mutable hours source. A file containing nothing else cannot be corrupted by editing it. |
| `src/data/clinic-photography.json` | Clinic photo records with lifecycle state. Starts as `[]` — see §D, there is nothing to migrate. |
| `src/data/media-types.ts` | `MediaAsset`, the category unions and `StoredClinicPhotograph`, moved out of `media.ts`. The future Worker must import these types **without** importing the manifest that holds `treatmentWork`. |
| `src/lib/data-schema.ts` | Runtime shape validation for both JSON files, called at build. JSON has no compile-time guarantee — a hand-edit or a bad CMS write must fail the build loudly, not render wrongly. |
| `tests/unit/data-schema.test.ts` | Tests for the above. |

### MODIFY

| Path | Change | Why |
|---|---|---|
| `src/data/clinic.ts` | `hours` imports the JSON; `VERIFICATION.hours.published` becomes a getter | Single authoritative value (§F) |
| `src/data/media.ts` | `clinicPhotography` imports the JSON and filters to published; types re-exported from `media-types.ts`; **`treatmentWork` untouched and still inline** | The structural boundary (§C) |
| `scripts/check-assets.mjs` | Read registrations from **both** sources; add the new checks | Release blocker (§E) |
| `scripts/serve-qa-fixtures.mjs` | Rewrite the JSON rather than `media.ts` | Its `substitute()` guard throws on a missed pattern, so this fails loudly if forgotten — but it would fail the whole e2e suite |
| `tests/unit/assets.test.ts` | Add the six regression cases | Acceptance criterion |
| `tests/unit/form.test.ts` | Media-manifest assertions follow the moved data | They import from `media.ts`, which still re-exports |
| `tests/unit/clinic.test.ts` | Add derived-verification assertions | §F |
| `docs/ASSETS.md` | Document the two sources and the lifecycle | The guard's instructions currently name only `media.ts` |

### DELETE

None. Nothing is removed in this phase.

### UNCHANGED BUT RELEVANT

| Path | Why it matters that it does not change |
|---|---|
| `src/lib/images.ts` | `import.meta.glob` scans `src/assets/images/` by path, not by manifest. Image optimisation is unaffected. |
| `src/components/sections/ClinicGallery.astro` | Consumes `galleryFor(kind)`. The kind API and the values it returns are unchanged. |
| `src/lib/verify.ts` | Reads `v.published !== false`. A getter satisfies that transparently — no change needed. |
| `.github/workflows/*.yml` | The gates are the point. Phase 1 must pass them as they are. |
| `astro.config.mjs` | JSON import needs no configuration in Astro/Vite. |
| `workers/appointment-email/**` | Entirely separate. |

---

## B. Old → new data model

### B.1 Opening hours

**Current** — `src/data/clinic.ts`, inline, and **every value is empty today**:

```ts
hours: [
  { day: 'Sunday',    opens: '', closes: '', closed: false },
  { day: 'Monday',    opens: '', closes: '', closed: false },
  { day: 'Tuesday',   opens: '', closes: '', closed: false },
  { day: 'Wednesday', opens: '', closes: '', closed: false },
  { day: 'Thursday',  opens: '', closes: '', closed: false },
  { day: 'Friday',    opens: '', closes: '', closed: false },
  { day: 'Saturday',  opens: '', closes: '', closed: true  },
],
```

**Proposed** — `src/data/hours.json`, identical values:

```json
[
  { "day": "Sunday",    "opens": "", "closes": "", "closed": false },
  { "day": "Monday",    "opens": "", "closes": "", "closed": false },
  { "day": "Tuesday",   "opens": "", "closes": "", "closed": false },
  { "day": "Wednesday", "opens": "", "closes": "", "closed": false },
  { "day": "Thursday",  "opens": "", "closes": "", "closed": false },
  { "day": "Friday",    "opens": "", "closes": "", "closed": false },
  { "day": "Saturday",  "opens": "", "closes": "", "closed": true  }
]
```

| Aspect | Decision |
|---|---|
| Day representation | English day name, the existing convention. Display names are already translated in `FindTheClinic.astro`; changing the stored form would be a needless second migration. |
| Closed day | `closed: true`, `opens` and `closes` `""`. Matches today exactly. |
| Time format | `"HH:MM"`, 24-hour, zero-padded. Lexical comparison is then equivalent to chronological, so `opens < closes` needs no parsing. |
| Ordering | Array order is Sunday→Saturday and is **significant**. The Israeli week starts Sunday and the renderer trusts the order. Validation asserts it. |
| Typing | `OpeningHours` interface exported from `clinic.ts`; the import is cast once at the boundary. |
| Runtime validation | `assertHoursShape()` in `src/lib/data-schema.ts`, called from the existing build hook alongside `assertLaunchReadiness`. |

### B.2 Clinic photography

**Current** — `src/data/media.ts`: `export const clinicPhotography: ClinicPhotograph[] = [];`

An **empty array**. There is no data to migrate.

**Proposed** — `src/data/clinic-photography.json`, starting as `[]`. A populated
record will look like:

```json
[
  {
    "file": "reception-01.jpg",
    "category": "reception",
    "width": 2400,
    "height": 1600,
    "status": "published",
    "needsEnglishReview": true,
    "alt": {
      "he": "אזור ההמתנה במרפאה",
      "ar": "منطقة الانتظار في العيادة",
      "en": "منطقة الانتظار في العيادة"
    }
  }
]
```

| Aspect | Decision |
|---|---|
| **Stable identity** | **`file`. No separate `id` field.** Filenames are generated server-side, unique per category, and never renamed — so they are already a stable key. An `id` would be a field added because a future CMS might want one, which you explicitly ruled out. |
| File reference | Bare filename, resolved through the existing `resolveImage()`. The client never sees or supplies a path. |
| Category | `ClinicPhotographyCategory` only. Validated against the union at build and by the guard. |
| Localised text | `alt: Record<Locale, string>`, unchanged from `MediaAsset`. |
| Published state | `status: 'published' \| 'unpublished'`. Required — an absent state would be ambiguous. |
| English review | `needsEnglishReview?: boolean`. **Optional**, because it marks a temporary condition: a developer writing real English deletes the key. Its absence is the normal end state. |
| Ordering | Array order is display order, matching `treatmentWork` today. No `sortIndex` field. |
| `caption` / `feature` | Carried over from `MediaAsset` as optional, already supported by the renderer. The CMS does not set them in V1. |

**Deliberately absent:** `id`, `uploadedAt`, `uploadedBy`, `sortIndex`, `tags`,
`altReviewedAt`. Each is plausible for a future CMS and none is needed now. Git
already records when and by whom.

---

## C. Structural security boundary

```
                    ┌───────────── Worker path allow-list (Phase 4) ─────────┐
CAN eventually write │ src/data/hours.json                                   │
                     │ src/data/clinic-photography.json                      │
                     │ src/assets/images/<server-generated filename>          │
                     └───────────────────────────────────────────────────────┘

CANNOT write         src/data/media.ts        ← treatmentWork, illustrations,
                                                heroImage, portrait
                     src/content/treatments/  ← treatment descriptions
                     src/i18n/ui.ts           ← bio, FAQ, all UI copy
                     src/data/clinic.ts       ← phone, address, name, email config
                     workers/                 ← including the mail relay
                     .github/workflows/       ← the gates themselves
                     everything else
```

**Phase 1's contribution to this is the separation itself.** After this phase,
`treatmentWork` and `clinicPhotography` live in different files with different
mutability. The Phase 4 allow-list then becomes a three-line constant rather
than a judgement call, and "the CMS cannot create treatment work" is true
because of where bytes live, not because a validator says so.

Three independent layers, strongest first:

1. **Structural** — `treatmentWork` is in a file the Worker may not write.
2. **Type** — the Worker's payload type is `ClinicPhotographyCategory`.
3. **Runtime** — category checked against an explicit allow-list; the asset
   guard rejects a disallowed category in the CMS JSON (case F).

Layer 1 survives someone deleting layers 2 and 3.

---

## D. Migration

### Opening hours

```
src/data/clinic.ts  (inline array, all values empty)
        │  values copied verbatim
        ▼
src/data/hours.json
        │  imported and cast
        ▼
src/data/clinic.ts  →  hasHours()  →  FindTheClinic.astro
```

`hasHours()` returns `false` before and after, because every value is still
empty. **The hours block stays hidden. No visual change is even possible.**

### Clinic photography

```
src/data/media.ts   clinicPhotography = []
        ▼
src/data/clinic-photography.json   []
        ▼
src/data/media.ts   filter(status === 'published')  →  galleryFor('clinic')
```

Empty before, empty after. `ClinicGallery` with `kind="clinic"` is not rendered
on any page today, so there is no output to change.

### Treatment work — explicitly not migrated

`treatmentWork`'s twelve entries **stay inline in `media.ts`**. They are
developer-managed, owner-approved per ADR 0009, and must remain outside the
CMS's writable surface. A test asserts the CMS JSON contains no
`treatment-work` category (case F).

**This is the migration's single most dangerous mistake**: moving the treatment
entries into the CMS JSON "for consistency" would silently hand the admin panel
the ability to publish patient before/after material. It must not happen, and
case F is what proves it did not.

---

## E. Asset guard — the release blocker

### Current behaviour

```
candidateFiles()      staged files, or ALL tracked files when CI=true
   ↓ filter to MEDIA_EXT (17 extensions incl. .svg, .mp4)
   ↓ skip ALLOWED_PATHS: public/favicon, src/assets/brand/
   ↓ must live under src/assets/images/      → else reject
   ↓ basename must appear in registeredFiles() → else reject

registeredFiles()  =  regex /\bfile:\s*['"]([^'"]+)['"]/g
                      over `git show :src/data/media.ts`   ← the INDEX, so an
                      unstaged registration cannot approve a commit
Bypass: ASSETS_ALLOW=1, disabled in CI
```

**The migration breaks this silently.** Clinic photographs registered in JSON
would not match the regex over `media.ts`, so the guard would reject every
legitimate CMS upload — or worse, if someone "fixed" it by loosening the check,
it would stop protecting anything.

### Required change

`registeredFiles()` reads **both** sources from the git index:

| Source | Extraction |
|---|---|
| `src/data/media.ts` | Existing `file:` regex — `treatmentWork`, `illustrations` |
| `src/data/clinic-photography.json` | `JSON.parse`, collect `file` — robust, no regex |

A missing JSON file is treated as an empty list, so the guard keeps working
during the migration itself.

### The six regression cases

| # | Case | Expected | Status today |
|---|---|---|---|
| A | Registered clinic photograph (JSON) staged | **pass** | would fail after migration |
| B | Registered developer image (`media.ts`) staged | **pass** | ✅ works today |
| C | Unregistered image under `src/assets/images/` | **reject** | ✅ works today |
| D | JSON record referencing a missing file | **reject** | ❌ **no such check today** |
| E | Same filename registered twice, or in both sources | **reject** | ❌ **no such check today** |
| F | `treatment-work` category in the CMS JSON | **reject** | ❌ **no such check today** |

**Being honest about the bar:** A, B and C preserve today's strength. **D, E
and F are new protections.** "At least as strong as today" is met by A–C;
D–F make it stronger, and all three exist because the CMS is about to start
writing this file automatically.

### The additional checks you asked about

| Check | Phase 1? | Reasoning |
|---|---|---|
| Duplicate `file` references | **Yes** (case E) | Server-side filename generation must never collide. A duplicate would make two records address the same image, and unpublishing one would appear to do nothing. |
| Duplicate IDs | **N/A** | There is no `id` field (§B.2). `file` *is* the identity, so case E covers it. |
| Malformed paths / traversal | **Yes** | Reject any registered name containing `/`, `\`, or `..`. Three lines, and it closes the path-traversal surface before the Worker exists rather than after. |
| Unsupported extensions | **Yes** | Registered names must end `.jpg`, `.jpeg` or `.png`. **This also bans `.svg` from the CMS path**, which matters: SVG can carry script, and no clinic photograph is a vector. |
| Orphaned files (image present, no record) | Already covered by case C |

All belong in Phase 1: each is a few lines inside one function, and every one
of them is a rule the Worker will depend on being true.

---

## F. Verification manifest

**Current** — a stored literal that will be wrong the moment hours are filled:

```ts
hours: { tier: 'placeholder', blocking: true, published: false, note: '…' },
```

**Proposed** — derived from the data:

```ts
hours: {
  tier: 'placeholder',
  blocking: true,
  /**
   * Derived, never stored. hasHours() decides whether hours actually render,
   * so a literal here drifts the moment they are filled in. One authoritative
   * value; the CMS writes hours.json and nothing else.
   */
  get published() { return hasHours(); },
  note: 'Owner must supply. hasHours() hides the block.',
},
```

**What else changes:** nothing. `src/lib/verify.ts` evaluates
`v.published !== false`; reading a getter returns a boolean transparently.
`hasHours` is a hoisted function declaration, so the getter can call it despite
being defined earlier in the file.

**Tested by:** asserting `published === false` with empty hours, then
`=== true` after filling one day — proving it tracks the data rather than a
literal.

---

## G. Compatibility — zero intentional public change

| Behaviour | Why it is preserved |
|---|---|
| Opening hours | Values identical; `hasHours()` still `false`; block still hidden |
| Clinic gallery | `[]` before and after; `kind="clinic"` is rendered on no page |
| **Treatment-work gallery** | `treatmentWork` not touched at all — same 12 entries, same order, same film strip |
| Localisation | `alt: Record<Locale, string>` unchanged; no i18n file touched |
| RTL/LTR | No component, no CSS, no logical property touched |
| Routes | No page, no route, no `getStaticPaths` touched |
| SEO | `schema.ts` reads `clinic`, whose shape is unchanged. Hours are absent from output before and after |
| Image optimisation | `import.meta.glob` scans by path, not manifest. Identical derivatives |

---

## H. Before/after equivalence

```
1. git stash -u                        (clean tree at origin/main)
2. npm run build                       (production env vars)
3. cp -R dist /tmp/dist-before
4. apply Phase 1
5. npm run build
6. cp -R dist /tmp/dist-after
7. compare
```

### What is compared

| Invariant | Expectation | Why it should hold exactly |
|---|---|---|
| **Every HTML file, byte-for-byte** | **Identical, 0 of 47 differing** | Data values are unchanged, so rendered output has no reason to differ |
| Set of files in `dist/` | Identical | No page added or removed |
| Filenames in `dist/_astro/` | Identical | Astro hashes from content; content unchanged |
| `sitemap-index.xml` + children | Identical | Route set unchanged |
| Count of emitted image derivatives | Identical | Same images, same widths |

**Byte-identical HTML is achievable here** and is the primary gate — the same
method used successfully for the media-collection split. If any file differs,
that is a finding to explain, not a threshold to relax.

Should a difference prove legitimate (a build-tool nondeterminism unrelated to
this change), the fallback invariants are: identical set of `data-*` hooks,
identical text content per page after whitespace normalisation, and identical
`<link>`/`<meta>` sets. **Any fallback would be reported, not applied quietly.**

---

## I. Test changes

### ADD — `tests/unit/data-schema.test.ts`

Hours: valid week accepted · exactly seven rows, Sunday→Saturday, rejects
wrong count, wrong order, duplicate day · closed day requires empty times ·
open day requires both times · rejects `24:00`, `9:00`, `0900` · rejects
`opens >= closes` · rejects malformed JSON.

Clinic photography: valid record accepted · `status` required and constrained
to the two values · rejects a category outside `ClinicPhotographyCategory`,
**including `treatment-work`** · requires `alt.he`, `alt.ar`, `alt.en`
non-empty · `needsEnglishReview` optional, both present and absent accepted ·
rejects a `file` containing `/`, `..` or an extension other than jpg/jpeg/png ·
rejects duplicate `file` values.

### ADD — `tests/unit/assets.test.ts` (extends the existing fixture harness)

The six cases A–F from §E, plus traversal and extension rejection.

### ADD — `tests/unit/clinic.test.ts`

`VERIFICATION.hours.published` is `false` with empty hours and `true` once a
day is filled — proving derivation, not a literal.

### MODIFY

| File | Change |
|---|---|
| `tests/unit/form.test.ts` | The media-manifest block keeps asserting through `media.ts`'s exports; add an assertion that `clinicPhotography` excludes `unpublished` records |
| `tests/unit/assets.test.ts` | Existing fixtures write `src/data/media.ts`; they must also create the JSON so the guard sees both sources |

### REMOVE

**None.** No existing test becomes invalid — that is itself evidence the
migration preserves behaviour. Any test that *needed* removing would be a
signal the change is larger than described.

---

## J. Acceptance criteria — Definition of Done

Phase 1 is complete when **all** hold:

1. `npx astro check` — 0 errors, 0 warnings, 0 hints
2. `npm test` — all pass, including every new test in §I
3. `npm run lint:assets` — clean, **and the six cases A–F pass**
4. `npm run lint:claims` and `lint:scripts` — clean
5. `npm run verify` — clean
6. Production build with the real launch gate — 47 pages
7. `npm run lint:a11y` — 47/47 clean
8. `npx playwright test` — 34/34, including the QA-fixture suite that rewrites
   the data files
9. **Equivalence: 0 of 47 HTML files differ** (§H)
10. `treatmentWork` still inline in `media.ts`, 12 entries, unchanged
11. The CMS JSON contains no `treatment-work` record, asserted by test
12. Asset-guard coverage demonstrably **not weaker**: A–C preserved, D–F added
13. No secret created, read or committed
14. No Cloudflare, DNS, Worker, Access or production configuration touched
15. No push, no merge, no deploy

---

## K. Rollback

Phase 1 is pure repository change with no external state, so rollback is a
revert. Nothing is deployed and no infrastructure exists yet.

| Failure | Recovery | Cost |
|---|---|---|
| JSON import breaks the build | `git revert` the commit range | Minutes; caught before merge by criterion 6 |
| Asset guard misbehaves | Revert the guard commit alone — it is separate (§L) | The guard returns to today's behaviour, which is known-good |
| Gallery output changes | Caught by criterion 9 **before merge**; revert | Never reaches `main` |
| Hours rendering regresses | Caught by criteria 6 and 9; revert | Never reaches `main` |
| Discovered after merge | `git revert`, push, CI redeploys the previous content | One deploy cycle, ~3 minutes |

Because the work lives on `feat/admin-cms` and `main` is untouched, the
strongest rollback is simply not merging.

---

## L. Commit strategy

Five commits, ordered by **dependency**, each independently reviewable and
leaving the repository green.

| # | Commit | Contents | Why here |
|---|---|---|---|
| 1 | `refactor(data): extract media types` | `src/data/media-types.ts`; `media.ts` re-exports | Pure move, zero behaviour change. Reviewable in isolation. |
| 2 | `feat(guard): read registrations from both sources` | `check-assets.mjs` + cases A–F | **Before the JSON exists.** The guard handles an absent file as an empty list, so it is ready and tested *before* anything depends on it. Inverting this order leaves a window where the guard covers less. |
| 3 | `refactor(data): move opening hours to JSON` | `hours.json`, `clinic.ts`, derived verification, `data-schema.ts` + tests | Depends on nothing above; smallest independently verifiable migration. |
| 4 | `refactor(data): move clinic photography to JSON` | `clinic-photography.json`, `media.ts`, schema + tests | Depends on 1 (types) and 2 (guard). |
| 5 | `chore: QA fixtures and asset documentation` | `serve-qa-fixtures.mjs`, `docs/ASSETS.md` | Last because the fixture server must target the final shape. |

The equivalence check (§H) runs against the **whole series**, since
intermediate commits are not deployed.

---

## M. Risks

| Risk | Severity | Mitigation |
|---|---|---|
| Asset guard silently covers less | **Critical** | Commit 2 lands before the JSON; cases A–F are acceptance criteria, not follow-up |
| Treatment work migrated by accident | **Critical** | Case F; §D states it explicitly; `treatmentWork` is simply not in scope of any edit |
| Build output changes unnoticed | High | Criterion 9: 0 of 47 files may differ |
| `serve-qa-fixtures.mjs` missed | Medium | Its `substitute()` helper throws on an unmatched pattern — it fails loudly, though it takes the whole e2e suite with it |
| JSON hand-edited into an invalid shape | Medium | `data-schema.ts` runs at build; malformed data fails the build rather than rendering wrongly |
| Scope creep into Phase 2 | Low | No `status` UI, no Worker, no admin anything in this phase |

---

## N. Decisions you may still want to make

1. **`src/lib/data-schema.ts` placement** — I propose calling it from the same
   Astro build hook that runs `assertLaunchReadiness`. Alternative: a separate
   `npm run lint:data` step in CI. The build hook fails earlier and needs no
   workflow change; say if you would rather see it as its own visible gate.
2. **Should the guard also run over `--all` locally?** Today CI scans all
   tracked files and local runs scan staged only. Unchanged by this proposal,
   but now is a cheap moment to reconsider.
3. Nothing else is blocking. The two email addresses remain
   `NEEDS OWNER CONFIGURATION` and are not needed until Phase 9.
