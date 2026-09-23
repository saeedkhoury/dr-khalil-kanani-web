# Admin CMS — implementation plan

> **Status: PLAN ONLY. Nothing implemented, deployed or configured.**
> Design spec: [`2026-09-22-admin-cms-design.md`](./2026-09-22-admin-cms-design.md)

**Goal:** A two-job management interface at `admin.drkhalilkanani.com` letting
Dr. Kanani change opening hours and manage gallery photographs without a
developer.

**Architecture:** A Cloudflare Worker behind Cloudflare Access writes JSON data
files to the repository through the GitHub API. The existing deploy workflow
publishes. Every current quality gate still applies, because the CMS enters
through the same door a developer does.

**Tech stack:** Cloudflare Workers · Cloudflare Access · GitHub Contents API ·
Astro 7.3 (unchanged) · no new runtime dependencies.

---

## Global constraints

- **V1 is two jobs only.** Hours and gallery photographs. No analytics, charts,
  CRM, appointments, treatment editor, FAQ editor, review uploader, page
  builder, theme editor or SEO editor.
- **No second design system.** The panel uses `src/styles/global.css` verbatim.
- **The admin may only create `clinicPhotography` entries.** Never
  `treatmentWork`. Enforced structurally, not by convention — see §F.
- **Reviews remain impossible.** ADR 0005.
- **The admin Worker never receives** `RESEND_API_KEY`, `MAIL_TO`, or any
  appointment-relay secret. Separate Worker, separate secret store.
- **No email address hardcoded in frontend code.** Allow-list lives in Worker
  configuration.
- **No new npm dependency** unless a task states otherwise and justifies it.

---

## 0. Two findings that reshape this plan

### 0.1 The data must move to JSON — and that solves more than it costs

You forbade fragile regex mutation. The alternatives were AST manipulation
(`ts-morph`, a heavy new dependency) or something better.

Better exists: **extract the mutable data into JSON files that the TypeScript
imports.** The Worker then only ever does `JSON.parse` → mutate → 
`JSON.stringify`, which cannot corrupt neighbouring content because there is no
neighbouring content.

```
src/data/clinic.ts              imports  src/data/hours.json          ← CMS writable
src/data/media.ts               imports  src/data/clinic-photography.json ← CMS writable
src/data/media.ts               keeps    treatmentWork inline in TS   ← NOT writable
```

This also delivers requirement **F** for free. The admin cannot create a
`treatmentWork` entry because those entries do not live in any file the Worker
is permitted to write. That is a structural guarantee, not a validation rule
somebody could later weaken.

**Ripple effects, all of which must be handled:**

| Consumer | Today | Change needed |
|---|---|---|
| `scripts/check-assets.mjs` | Regexes `file:` out of `media.ts` via `git show :path` | Must also read `clinic-photography.json` from the index |
| `scripts/serve-qa-fixtures.mjs` | Rewrites `media.ts` and `clinic.ts` | Must rewrite the JSON instead |
| `tests/unit/*.ts` | Import from `media.ts` / `clinic.ts` | Unchanged — the TS re-exports |
| `src/lib/images.ts` | `import.meta.glob` over `src/assets/images` | Unchanged |

### 0.2 `VERIFICATION.hours` should be derived, not synchronised

The design spec said the Worker should update `VERIFICATION.hours.published`
when hours are saved. On inspection that is the wrong fix: it makes the Worker
write a second file, and leaves two sources of truth that can drift.

`hasHours()` is already content-driven. The manifest entry should be derived
from it rather than stored as a literal:

```ts
hours: {
  tier: 'placeholder',
  blocking: true,
  // Derived, not stored. hasHours() decides whether hours actually render,
  // so a literal here would drift the moment the CMS filled them in.
  get published() { return hasHours(); },
  note: 'Owner must supply. hasHours() hides the block.',
},
```

**This supersedes design spec §3.1's "the verification manifest is updated
too".** One file for the Worker to write instead of two, and the drift the
manifest exists to prevent becomes impossible rather than merely handled.

---

## A. Architecture

```
┌── BROWSER (the doctor's phone) ──────────────────────────────┐
│ Server-rendered HTML from the Worker. Minimal vanilla JS:    │
│ form state, client-side validation, image preview, status    │
│ polling. Holds NO secret. Knows no repository path.          │
└───────────────┬──────────────────────────────────────────────┘
                │ HTTPS, same-origin
┌───────────────▼── CLOUDFLARE ACCESS ─────────────────────────┐
│ Email one-time code. Allow-list of two identities. Issues a  │
│ signed JWT in Cf-Access-Jwt-Assertion. Keeps its own audit   │
│ log. Rejects everyone else before the Worker is reached.     │
└───────────────┬──────────────────────────────────────────────┘
┌───────────────▼── ADMIN WORKER (drkanani-admin) ─────────────┐
│ 1. Independently verifies the Access JWT against Cloudflare's│
│    public keys. Access in front is not treated as sufficient.│
│ 2. Checks the email claim against ALLOWED_EMAILS.            │
│ 3. Validates every field. Generates filenames. Refuses any   │
│    path outside the allow-list.                              │
│ 4. Reads current JSON + SHA, mutates, commits via GitHub API.│
│ 5. Reports workflow status by commit SHA.                    │
│ Secrets: GITHUB_TOKEN only. Never the relay's secrets.       │
└───────────────┬──────────────────────────────────────────────┘
┌───────────────▼── GITHUB ────────────────────────────────────┐
│ Contents API commit to main. Fine-grained token: this repo,  │
│ Contents:write + Actions:read for deployment status.         │
└───────────────┬──────────────────────────────────────────────┘
┌───────────────▼── GITHUB ACTIONS (existing deploy.yml) ──────┐
│ claims linter · mixed-script linter · asset guard ·          │
│ astro check · 118 unit tests · build (launch gate) ·         │
│ a11y audit · Playwright e2e                                  │
└───────────────┬──────────────────────────────────────────────┘
┌───────────────▼── GITHUB PAGES ──────────────────────────────┐
│ Static site. Reads the JSON at BUILD time. No runtime        │
│ dependency on the Worker, Access, or GitHub.                 │
└──────────────────────────────────────────────────────────────┘
```

**The public site gains no runtime dependency.** If the admin Worker, Access,
or GitHub are all down, `drkhalilkanani.com` is unaffected — it is still a pile
of static files.

### Separation from the appointment relay

Two Workers, two secret stores, two hostnames.

| | `drkanani-appointment-email` | `drkanani-admin` |
|---|---|---|
| Secrets | `RESEND_API_KEY`, `MAIL_TO` | `GITHUB_TOKEN` |
| Auth | Origin check, public endpoint | Cloudflare Access |
| Can send mail | Yes | **No** |
| Can write the repo | **No** | Yes |

Neither can reach the other's secrets. A compromise of one does not yield the
other's capability.

---

## B. Repository plan

### CREATE

| Path | Responsibility |
|---|---|
| `src/data/hours.json` | The seven opening-hours rows. CMS-writable. |
| `src/data/clinic-photography.json` | Clinic photo entries with status. CMS-writable. |
| `src/data/media-types.ts` | `MediaAsset` + category unions, moved out of `media.ts` so the Worker can import types without importing the manifest. |
| `workers/admin/wrangler.toml` | Worker config. No secrets. |
| `workers/admin/src/index.ts` | Router, entry point. |
| `workers/admin/src/auth.ts` | Access JWT verification + allow-list. |
| `workers/admin/src/github.ts` | Contents API client, path allow-list, SHA concurrency. |
| `workers/admin/src/hours.ts` | Hours validation + JSON mutation. |
| `workers/admin/src/media.ts` | Photo validation, filename generation, JSON mutation. |
| `workers/admin/src/status.ts` | Workflow status by commit SHA. |
| `workers/admin/src/ui/*.ts` | Server-rendered HTML for the two screens. |
| `workers/admin/README.md` | Setup, secrets, DNS, Access configuration. |
| `tests/unit/admin-hours.test.ts` | Hours validation and serialisation. |
| `tests/unit/admin-media.test.ts` | Media state, filenames, English-review flag. |
| `tests/unit/admin-auth.test.ts` | JWT and allow-list. |
| `tests/unit/admin-security.test.ts` | Path allow-list, traversal, magic bytes, secret leakage. |
| `tests/e2e/admin.spec.ts` | Both screens, RTL, mobile, keyboard. |

### MODIFY

| Path | Change |
|---|---|
| `src/data/clinic.ts` | `hours` imports `hours.json`; `VERIFICATION.hours.published` becomes derived (§0.2). |
| `src/data/media.ts` | `clinicPhotography` imports and filters the JSON; types move to `media-types.ts`; `treatmentWork` stays inline. |
| `scripts/check-assets.mjs` | Read registered filenames from **both** `media.ts` and `clinic-photography.json`. |
| `scripts/serve-qa-fixtures.mjs` | Rewrite the JSON rather than `media.ts`. |
| `docs/ASSETS.md` | Document the JSON split and the published/unpublished states. |
| `docs/specs/2026-09-22-admin-cms-design.md` | Correct §3.1 per §0.2 below. |

### LEAVE UNCHANGED

`src/components/**` · `src/pages/**` · `src/styles/global.css` ·
`src/lib/images.ts` · `workers/appointment-email/**` ·
`.github/workflows/*.yml` · `astro.config.mjs` · all existing tests

The public site's rendering code does not change at all. That is deliberate:
it means the CMS cannot break the website by construction.

---

## C. Admin UI

As approved in design spec §§9–15. No changes. Summary of the binding rules:

- `global.css` verbatim — no second design system
- Mobile-first, Hebrew-first RTL, logical properties only
- Two tabs (`שעות פתיחה`, `גלריה`), no sidebar, no dashboard, no stat cards,
  no charts, no gradients
- Body text `--text-base` (17px), touch targets ≥48px
- Depth from layered tint and hairlines, never drop shadows
- `--color-signal` for icons only, never text

---

## D. Opening hours

### Data shape

`src/data/hours.json`:

```json
[
  { "day": "Sunday",    "opens": "09:00", "closes": "18:00", "closed": false },
  { "day": "Monday",    "opens": "09:00", "closes": "18:00", "closed": false },
  { "day": "Tuesday",   "opens": "09:00", "closes": "18:00", "closed": false },
  { "day": "Wednesday", "opens": "09:00", "closes": "18:00", "closed": false },
  { "day": "Thursday",  "opens": "09:00", "closes": "18:00", "closed": false },
  { "day": "Friday",    "opens": "",      "closes": "",      "closed": true  },
  { "day": "Saturday",  "opens": "",      "closes": "",      "closed": true  }
]
```

`src/data/clinic.ts`:

```ts
import hoursData from './hours.json';

export interface OpeningHours {
  day: 'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';
  opens: string;
  closes: string;
  closed: boolean;
}

// ...inside `clinic`:
  hours: hoursData as OpeningHours[],
```

### Safe mutation

The Worker never edits TypeScript. It:

1. `GET /repos/:owner/:repo/contents/src/data/hours.json` → content + `sha`
2. `JSON.parse`, validate the incoming seven rows, replace wholesale
3. `JSON.stringify(rows, null, 2) + '\n'`
4. `PUT` with the `sha` it read

Because the file contains nothing but hours, there is no adjacent content to
corrupt. **No regex. No AST. No new dependency.**

### Validation (identical rules client and server; the server is the control)

| Rule | Message (he) |
|---|---|
| Exactly 7 rows, days in order, no duplicates | — (structural; a malformed payload is rejected outright) |
| `closed: true` → both times must be `""` | — (server normalises) |
| `closed: false` → both times required | `יש למלא שעת פתיחה וסגירה` |
| Times match `^([01]\d|2[0-3]):[0-5]\d$` | `שעה לא תקינה` |
| `opens < closes` (string compare is safe for `HH:MM`) | `שעת הפתיחה חייבת להיות לפני שעת הסגירה` |

### VERIFICATION synchronisation

Solved by derivation, not synchronisation — see §0.2. The Worker writes one
file.

---

## E. Photo management

### Screen

Two groups, published first, each photo showing its state in **text** as well
as position:

| State | Actions |
|---|---|
| מפורסם (published) | הסתרה (unpublish) |
| מוסתר (unpublished) | פרסום (publish) · **מחיקה לצמיתות** |

**Zero published photographs is valid.** Unpublishing the last one is allowed;
the gallery section already hides itself when empty. No minimum is enforced.
Permanent delete is reachable only from the unpublished state, so a photograph
can never be destroyed in a single click.

Permanent delete is visually separated — placed apart, `--color-danger` text on
the site's normal surface, **not** a red-filled button and not a dramatic
modal. It opens the site's standard `<dialog>` naming the specific photograph.

### Add flow

Order is binding: **pick → preview → category → Hebrew → Arabic → confirm →
save**. Preview precedes the description fields because he cannot describe a
photograph he has not seen, and seeing it is when he would notice a patient.

### Validation

| Check | Client | Server |
|---|---|---|
| Extension | ✅ fast feedback | — |
| **Magic bytes** (`FF D8 FF` / `89 50 4E 47`) | — | ✅ **the control** |
| Size ≤ 8 MB | ✅ | ✅ |
| Long edge ≥ 1200px | ✅ | ✅ |
| Category ∈ `ClinicPhotographyCategory` | ✅ | ✅ |
| Both descriptions non-empty | ✅ | ✅ |
| Confirmation ticked | ✅ gates the button | ✅ rejected without it |

**SVG is rejected outright** — it can carry script, and no clinic photograph is
a vector.

**Filenames are generated server-side**: `<category>-<nn>.jpg`, `nn` being the
lowest free two-digit index for that category. The client never sends, sees, or
influences a repository path.

---

## F. Photo data model

### Smallest clean change

`MediaAsset` gains **one** optional field; the rest is expressed by where the
data lives.

```ts
// src/data/media-types.ts
export interface MediaAsset<C extends MediaCategory = MediaCategory> {
  file: string;
  category: C;
  alt: Record<Locale, string>;
  caption?: Record<Locale, string>;
  width: number;
  height: number;
  feature?: boolean;
  sourcePostUrl?: string;
  provenance?: 'instagram-post' | 'owner-supplied';
}

/**
 * A clinic photograph as STORED. `status` and `needsEnglishReview` exist only
 * in the JSON the CMS owns; they never reach a rendering component, which
 * receives ordinary ClinicPhotograph values.
 */
export interface StoredClinicPhotograph extends MediaAsset<ClinicPhotographyCategory> {
  status: 'published' | 'unpublished';
  /** English alt is a copy of the Arabic until a human replaces it. */
  needsEnglishReview?: boolean;
}
```

`src/data/media.ts`:

```ts
import stored from './clinic-photography.json';

const all = stored as StoredClinicPhotograph[];

/** What the site renders. Unpublished entries are invisible to every component. */
export const clinicPhotography: ClinicPhotograph[] = all.filter(
  (asset) => asset.status === 'published',
);
```

**Why `status` in JSON rather than a separate "archive" array:** unpublishing
must preserve metadata and allow re-publishing. A status field does that with
one edit and no data movement, and keeps the file the single source of truth
for what exists.

**Why `needsEnglishReview` is optional:** it marks a temporary state. When a
developer writes proper English alt text they delete the flag. The architecture
does not change — the field simply stops being present.

### Which categories the admin may create

**Only** `ClinicPhotographyCategory`: `exterior`, `reception`,
`treatment-room`, `equipment`, `doctor-working`, `team`, `atmosphere`.

**Never** `treatment-work`, `illustration`, `hero`, `portrait`.

Enforced three ways, in order of strength:

1. **Structurally** — `treatmentWork` lives inline in `media.ts`, which is not
   on the Worker's path allow-list. The Worker *cannot* write it.
2. **By type** — the Worker's payload type is `ClinicPhotographyCategory`.
3. **At runtime** — the category is checked against an explicit allow-list
   before any GitHub call.

A test asserts all three.

---

## G. Publishing experience

**A commit is not a publication.** Four states, and the UI never conflates
them:

| State | Trigger | Shown |
|---|---|---|
| `saving` | Request in flight | `שומר…` |
| `committed` | GitHub returned a SHA | `נשמר. מתפרסם…` |
| `published` | Workflow `conclusion: success` | `פורסם באתר` + time |
| `failed` | Workflow `conclusion: failure` | Plain reason + next step |

### Status must survive a locked phone

Keyed on **commit SHA**, not browser state:

1. The save response returns `{ sha }`.
2. The client stores `sha` in `localStorage` — a convenience, not the mechanism.
3. `GET /api/status?sha=<sha>` asks the Worker, which queries
   `GET /repos/:owner/:repo/actions/runs?head_sha=<sha>` and maps
   `status`/`conclusion` to one of the four states.
4. **If `localStorage` is empty** — new device, cleared storage, different
   browser — the panel calls `GET /api/status/latest`, which returns the most
   recent `cms(...)` commit and its run state. The doctor always sees where
   his last change got to.

Polling every 5s, backing off to 15s after a minute, stopping at 10 minutes
with "still publishing — check back shortly".

No toast. The region persists until the next save.

### A failed publication never claims the content is live

GitHub Pages keeps serving the **last successful deployment** when a build
fails, so a rejected change cannot break the live site. The UI must say so
precisely: on failure it states that the change is **not** live and the
previous version is still being served.

`published` is set **only** on `conclusion: success`. A commit being accepted
by GitHub is never sufficient — that is the `committed` state, and the two are
never conflated.

---

## H. Concurrency

| Scenario | Strategy |
|---|---|
| Two admin sessions save hours | GitHub rejects the stale `sha` with 409. Worker refetches and **retries once** — safe because hours are replaced wholesale, so a retry re-applies the user's complete intent. |
| Admin saves while a developer pushes | Same 409 path. |
| Second conflict | **Stop.** Return `conflict`; the UI says `התוכן השתנה בינתיים. רעננו את הדף ונסו שוב.` and reloads current values. |
| Photo add during a conflict | **Never auto-retried.** A retry could double-add. The user is told to reload. |

**Rule: retry only where the operation is idempotent.** Hours replacement is;
appending a photo is not.

---

## I. Security threat model

**Assets:** the ability to publish to a medical website; the GitHub token.
**Not at risk:** patient data (none stored), the mail relay (separate Worker).

| Vector | Control |
|---|---|
| Stranger reaches the panel | Cloudflare Access, allow-list of two |
| Access bypassed / misconfigured | Worker **independently verifies** the JWT against `/cdn-cgi/access/certs`: signature, `aud`, `iss`, `exp`. Access in front is not trusted alone |
| Unauthorised identity | `email` claim checked against `ALLOWED_EMAILS` (config, not code) |
| Wrong HTTP method | Explicit allow-list per route; everything else 405 |
| Path traversal | Client never supplies a path. Worker builds every path from a fixed prefix + generated filename; `..`, `/`, `\` rejected |
| Arbitrary repo write | Hard allow-list: `src/data/hours.json`, `src/data/clinic-photography.json`, `src/assets/images/<generated>`. Anything else refused before the API call |
| Arbitrary GitHub API call | The client cannot name a repo, owner, ref or path. All are Worker constants |
| Token exposure | `GITHUB_TOKEN` is a Wrangler secret, used only server-side, never rendered, never returned in a response |
| Token blast radius | Fine-grained PAT: **one repository, `Contents: Read and write` plus `Actions: Read`** for authenticated deployment status. No Workflows write, packages, actions:write, or account scope |
| Malicious upload | Magic-byte check; **SVG rejected**; 8 MB cap; dimension floor |
| XSS | All user text HTML-escaped on render. Alt text is escaped at build by Astro too |
| Commit-message injection | Message built from a fixed template; user text never interpolated into it. Only the authenticated email and an action verb |
| CSRF | Access JWT required on every mutating request; the cookie alone is insufficient because the Worker verifies the assertion header |
| Replay / duplicate submit | In-flight guard client-side; server-side the SHA check makes a replayed hours write a no-op |
| Rate limiting | Cloudflare WAF rule on the hostname, as with the relay |
| Error leakage | Generic codes to the client; detail to `console.error` only |

### What a successful compromise still achieves

Publishing photographs and changing opening hours. It cannot read patient data,
send mail as the clinic, alter DNS, modify workflows, or reach another
repository. The build gates still reject prohibited claims. Small, but not
zero — which is why the token is scoped this tightly.

---

## J. Git and CI behaviour

**Every existing gate continues to run.** The CMS commits to `main` exactly as
a developer does, and `deploy.yml` is untouched.

| Gate | Can a CMS change fail it? |
|---|---|
| Claims linter | No — hours and alt text carry no treatment claims |
| Mixed-script linter | **Yes** — if he pastes text mixing scripts |
| Asset guard | **Yes** — if the JSON entry and the image file disagree |
| `astro check` | Only on a malformed JSON write (which validation prevents) |
| Unit tests | **Yes** — e.g. a test asserting category constraints |
| Launch gate | No |
| a11y audit | Unlikely |
| Playwright e2e | **Yes, and this is the fragility risk you flagged** |

### The fragility problem, stated honestly

The deploy runs a full Playwright suite. A flaky browser test would fail the
doctor's hours change for a reason unrelated to his content — and he would have
no way to tell the difference.

**Mitigation, not gate removal:** the Worker classifies the failed job against
an **explicit allow-list of known content failures**. Everything else — 
including anything unrecognised — is technical.

```
CONTENT failure  (a known job whose failure can only mean rejected content)
  lint:claims | lint:scripts | lint:assets
  + server-side validation refusals raised before the commit
  → "התוכן לא עבר את הבדיקה" + the specific reason + what to change

TECHNICAL failure  (everything else, and the default)
  build | test:e2e | lint:a11y | check | test | infrastructure | UNKNOWN
  → "הפרסום נכשל מסיבה טכנית. זו לא בעיה בתוכן שלכם."
     + developer-support path
```

**A unit-test failure is NOT automatically a content failure.** Most unit tests
have nothing to do with his input; `npm test` failing almost always means a
developer broke something. It is classified technical.

**Unknown job names default to technical.** If a future workflow step is added
and the classifier does not recognise it, the doctor must not be blamed for it.
Failing toward "our problem" is the only safe default.

He is never shown a raw log, and never blamed for an infrastructure failure.
Gates stay; the *message* does the work.

---

## K. Audit history

Commit message template:

```
cms(hours): update opening hours

Changed by: <authenticated email>
```

```
cms(media): publish clinic photo reception-03.jpg

Changed by: <authenticated email>
Patient-content confirmed: yes
```

Verbs: `update opening hours` · `add clinic photo` · `publish clinic photo` ·
`unpublish clinic photo` · `delete clinic photo`.

The `cms(` prefix makes the whole history queryable —
`git log --grep '^cms('` — which is what a future "Recent changes" screen would
read. **V1 does not build that screen**, but nothing here prevents it: the
Worker already queries commits for `/api/status/latest`.

Only the authenticated email is recorded. No IP, no user agent, no patient
data.

---

## L. Test matrix

### Unit

| Test | Asserts |
|---|---|
| Hours: valid week serialises | Exactly 7 rows, day order preserved, 2-space JSON + trailing newline |
| Hours: closed day | Times normalised to `""`, `closed: true` |
| Hours: open day missing a time | Rejected with the field named |
| Hours: opens ≥ closes | Rejected |
| Hours: malformed time | Rejected |
| Hours: 6 or 8 rows, or duplicate days | Rejected |
| `VERIFICATION.hours.published` | Tracks `hasHours()` — false when empty, true when filled |
| Media: publish / unpublish | Only `status` changes; alt, caption, dimensions preserved byte-for-byte |
| Media: delete | Entry **and** file removed together |
| Media: filename generation | `reception-01` → `-02`; gaps reused; never collides |
| Media: English review | `alt.en === alt.ar` and `needsEnglishReview: true` on create; clearing the flag leaves alt intact |
| Media: site view | `clinicPhotography` excludes `unpublished` |

### Worker

Unauthenticated → 401 · malformed JWT → 401 · valid JWT, wrong `aud` → 401 ·
valid JWT, email not allow-listed → 403 · GET on a mutating route → 405 ·
unknown category → 400 · 9 MB upload → 413 · `.jpg` extension with PNG bytes →
accepted as PNG; `.jpg` with **text** bytes → 400 · 400×300 image → 400 ·
`../../.github/workflows/deploy.yml` in any field → 400 and no API call ·
stale SHA → one retry, then `conflict` · GitHub 500 → `{ok:false}`, never a
false success · workflow failure → classified per §J.

### Security

Token absent from every response body and every rendered page · no secret in
served HTML · client-supplied `path`/`repo`/`owner`/`ref` ignored · a payload
naming `treatment-work` rejected · SVG rejected · `<script>` in a description
escaped on render · commit message contains no user-controlled text.

### E2E

Hours: load current values, edit, save, status appears · closed day disables
times · invalid hours blocked with a focusable error summary · Photos: upload,
preview shows, save disabled until confirmation ticked, publish, unpublish,
delete asks for confirmation naming the photo · status survives reload ·
failure state renders · RTL at 375px · full keyboard traverse with visible
focus.

---

## M. Phases

Each phase is independently reviewable and leaves the repository working.

### Phase 1 — Extract data to JSON

**Objective:** Move hours and clinic photography into JSON with no behaviour
change.
**Files:** create `src/data/hours.json`, `src/data/clinic-photography.json`,
`src/data/media-types.ts`; modify `src/data/clinic.ts`, `src/data/media.ts`,
`scripts/check-assets.mjs`, `scripts/serve-qa-fixtures.mjs`.
**Tests:** existing 118 must pass unchanged; new tests for the derived
`VERIFICATION.hours.published` and for the asset guard reading JSON.
**Acceptance — all of the following, none optional:**

1. `npm run verify`, `npm test`, build, a11y audit and e2e all pass.
2. **The built HTML is byte-identical to before** the migration, compared file
   by file across all 47 pages (the method already used for the media split).
3. **The asset guard is demonstrably no weaker than today.** These six
   regression tests must exist and pass:

   | | Case | Expected |
   |---|---|---|
   | A | Registered clinic photograph (JSON) staged | **accepted** |
   | B | Registered developer-managed treatment image (`media.ts`) staged | **accepted** |
   | C | Unregistered image staged under `src/assets/images/` | **rejected** |
   | D | JSON record referencing a missing image file | **rejected** |
   | E | Same filename registered twice, or in both sources | **rejected** |
   | F | A `treatmentWork` entry written into the CMS JSON | **rejected** |

**Phase 1 is not complete until the asset-safety guarantees are at least as
strong as they are today.** Case F matters beyond tidiness: it proves the CMS
cannot smuggle treatment work in through the one file it is allowed to write.

**Risks:** the guard silently stops covering photographs — the single most
dangerous side effect of this migration, because that guard exists precisely
because thirteen patient photographs were once committed unreviewed. Mitigated
by the six cases above being acceptance criteria rather than follow-up work.
**Dependencies:** none.
**Rollback:** revert the commit; nothing external changed.

### Phase 2 — Photo state model

**Objective:** `status` and `needsEnglishReview`; site renders published only.
**Files:** `src/data/media-types.ts`, `src/data/media.ts`,
`src/data/clinic-photography.json`, `tests/unit/admin-media.test.ts`.
**Acceptance:** an `unpublished` entry does not render; `treatmentWork`
untouched; built output unchanged (no clinic photos exist yet).
**Risks:** none material — the collection is empty today.
**Rollback:** revert.

### Phase 3 — Worker auth foundation

**Objective:** A Worker that authenticates and does nothing else.
**Files:** `workers/admin/{wrangler.toml,src/index.ts,src/auth.ts}`,
`tests/unit/admin-auth.test.ts`.
**Implementation:** fetch and cache Cloudflare's certs; verify RS256, `aud`,
`iss`, `exp`; check `email` against `ALLOWED_EMAILS`; `GET /api/me` returns the
identity. No GitHub access at all in this phase.
**Acceptance:** all auth tests pass; the Worker holds no GitHub token yet.
**Risks:** JWT verification is easy to get subtly wrong. Mitigated by testing
wrong-`aud`, expired and unsigned tokens explicitly.
**Rollback:** delete the Worker; nothing else references it.

### Phase 4 — GitHub client + path allow-list

**Objective:** Safe, minimal repository access.
**Files:** `workers/admin/src/github.ts`, `tests/unit/admin-security.test.ts`.
**Acceptance:** every security test in §L passes; a write outside the
allow-list is impossible.
**Risks:** the highest-consequence code in the plan. Reviewed against §I line
by line before merge.
**Rollback:** revert; the token can also be revoked in GitHub.

### Phase 5 — Hours API + UI

**Objective:** The first end-to-end job.
**Files:** `workers/admin/src/hours.ts`, `src/ui/hours.ts`,
`tests/unit/admin-hours.test.ts`.
**Acceptance:** editing hours in a local Worker produces a correct commit on a
**test branch**, never `main`.
**Risks:** a bad write corrupts hours. Mitigated by wholesale replacement plus
schema validation before commit.
**Rollback:** `git revert` the content commit; the site rebuilds.

### Phase 6 — Media API + gallery UI

**Objective:** The second job.
**Files:** `workers/admin/src/media.ts`, `src/ui/gallery.ts`.
**Acceptance:** upload, publish, unpublish and delete all produce correct
commits on a test branch; confirmation gates the upload.
**Risks:** the patient-photograph path. The confirmation is implemented and
tested **before** upload is wired.
**Rollback:** revert; delete any committed test image.

### Phase 7 — Publish status

**Objective:** The four states, recoverable by SHA.
**Files:** `workers/admin/src/status.ts`.
**Acceptance:** status survives reload and an empty `localStorage`; a failing
workflow is classified per §J.
**Rollback:** revert; saves still work, only the status display is lost.

### Phase 8 — Accessibility, security and E2E review

**Objective:** Meet the same bar as the public site.
**Files:** `tests/e2e/admin.spec.ts`; extend `scripts/audit-html.mjs` to the
panel's output.
**Acceptance:** axe clean, keyboard traverse complete, RTL correct at 375px.
**Rollback:** n/a — tests only.

### Phase 9 — Infrastructure (**requires you**)

**Objective:** Custom domain, Access, secrets, rate limiting.
**Acceptance:** only the two allow-listed identities can reach it.
**Risks:** a misconfigured Access policy exposes the panel. Verified by
attempting access from a non-allow-listed identity **before** the token is
installed.
**Rollback:** delete the Access application and the Worker route; the public
site is unaffected.

### Phase 10 — Supervised first real change

**Objective:** The doctor changes his own hours, watched.
**Acceptance:** he completes it unaided on his phone.
**Rollback:** `git revert`.

---

## N. Deployment plan

| Step | Who |
|---|---|
| Create the Worker and deploy it | **Claude** (with approval) |
| Add `admin.drkhalilkanani.com` custom domain + DNS | **Claude** (with approval; I have Cloudflare API access) |
| Create the Cloudflare **Access application**, email OTP, allow-list | **You** — Zero Trust config is not reliably reachable from my tooling, and the identity list is yours to own |
| Create the fine-grained **GitHub PAT** | **You** — I must never see it |
| `wrangler secret put GITHUB_TOKEN` | **You** — hidden prompt |
| Set `ALLOWED_EMAILS` | **You or Claude** — not a secret, but it is your identity list |
| WAF rate-limit rule | **You** — dashboard |

**`NEEDS OWNER CONFIGURATION`:** both email addresses. `wrangler.toml` will
ship with `ALLOWED_EMAILS = ""` and a comment saying the Worker refuses all
requests until it is set — fail-closed, not fail-open.

---

## O. Migration and rollback

**The public site keeps working throughout.** Phases 1–8 are additive or
internal; the site's rendering code is never touched.

| Situation | Recovery |
|---|---|
| Phase 1 changes output unexpectedly | Byte-comparison catches it pre-merge; revert |
| Bad content commit from the CMS | `git revert <sha>` — it is an ordinary commit |
| Admin Worker misbehaving | `wrangler delete`, or remove the route. Public site unaffected |
| Need to disable admin access immediately | Remove the identity from the Access policy. Takes seconds, no deploy |
| Token compromised | Revoke in GitHub. The Worker fails closed; the site is untouched |

Data migration is a one-time lift-and-shift of existing values into JSON, with
byte-identical output as the acceptance test.

---

## P. Decisions and remaining questions

### Decided by the owner, 2026-09-22

1. **`ALLOWED_EMAILS`** — both addresses remain `NEEDS OWNER CONFIGURATION`.
   The doctor is the primary identity, the developer the fallback. Neither is
   to be invented, guessed or hardcoded. The Worker ships with an empty
   allow-list and **refuses every request until it is configured** — fail
   closed, never fail open.
2. **Zero published photographs is allowed.** Unpublishing the last published
   clinic photograph is permitted; the gallery section already hides itself
   when the collection is empty. No minimum is enforced.
3. **Permanent delete is current-tree only.** It removes the record and the
   current file in one ordinary auditable commit. It does **not** rewrite
   history, force-push, purge historical objects, or change repository
   visibility. Historical git objects are outside the CMS's responsibility.

### Still open

None blocking Phase 1. The two email addresses are needed before Phase 9
(infrastructure), not before implementation begins.

## Risks and trade-offs

| Risk | Severity | Mitigation |
|---|---|---|
| E2E flake fails an innocent content change | Medium | §J classification; he is told it is not his fault |
| 2–4 min publish feels broken | Medium | §G status; expected duration stated in the UI |
| Doctor uploads a patient photo anyway | **High** | Confirmation at point of upload; recorded in the commit; no software can detect it |
| JWT verification subtly wrong | High | Explicit negative tests |
| Phase 1 changes rendered output | Medium | Byte-comparison acceptance |
| Scope creep toward a generic CMS | Medium | V1 scope is a global constraint |

## Definition of done

Both jobs work from the doctor's phone, in Hebrew, unaided · every gate still
runs and the CMS bypasses none · unauthorised identities cannot reach the panel
· the token is never in the browser, the repo, or a log · the admin cannot
create `treatmentWork` · status survives a locked phone · the public site's
rendered output is unchanged except for intended content · the full test matrix
passes · `workers/admin/README.md` documents the setup end to end.

## Changes needed to the design document

1. **§3.1** — "the verification manifest is updated too" is **superseded** by
   §0.2. The Worker does not write the manifest; `published` is derived.
2. **§3.2** — "Removal deletes the manifest entry and the image file in one
   commit" is **superseded** by the three-state model in §E.
3. **§12** — the removal paragraph needs the published / unpublished / delete
   states added.
